/**
 * Détourage guidé par un tracé grossier.
 * Le tracé dit où est la pièce. Le modèle (BiRefNet) trouve les bords dans cette zone,
 * puis un filtre guidé par la photo les recale au pixel près.
 * Tout est en JS pur : testable sans navigateur.
 */
import { dilateBin, fillSmallHoles, guidedFilter, keepLarge, resizeIds, rgbaFromAlpha } from './refine.js'

const SKIN = ['Face', 'Hair', 'Sunglasses', 'Left-arm', 'Right-arm', 'Left-leg', 'Right-leg']

/** Zone de la photo à garder autour du tracé (pixels de la photo d'origine). */
export function cropBox(lasso, width, height) {
  let minX = 1
  let minY = 1
  let maxX = 0
  let maxY = 0
  for (const p of lasso) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  const bw = (maxX - minX) * width
  const bh = (maxY - minY) * height
  const pad = Math.max(12, 0.08 * Math.max(bw, bh))
  const x0 = Math.max(0, Math.floor(minX * width - pad))
  const y0 = Math.max(0, Math.floor(minY * height - pad))
  const x1 = Math.min(width, Math.ceil(maxX * width + pad))
  const y1 = Math.min(height, Math.ceil(maxY * height + pad))
  return { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) }
}

/** Tracé en coordonnées de la photo entière (0..1) vers coordonnées de la zone rognée (0..1). */
export function lassoToCrop(lasso, box, width, height) {
  return lasso.map((p) => ({
    x: (p.x * width - box.x) / box.w,
    y: (p.y * height - box.y) / box.h
  }))
}

/** Remplit l'intérieur du polygone (règle pair/impair). */
export function rasterPolygon(points, w, h) {
  const out = new Uint8Array(w * h)
  const n = points.length
  if (n < 3) return out
  const xs = new Float64Array(n)
  const ys = new Float64Array(n)
  for (let i = 0; i < n; i++) {
    xs[i] = points[i].x * w
    ys[i] = points[i].y * h
  }
  const cross = []
  for (let y = 0; y < h; y++) {
    const cy = y + 0.5
    cross.length = 0
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n
      const y0 = ys[i]
      const y1 = ys[j]
      if ((y0 <= cy && y1 > cy) || (y1 <= cy && y0 > cy)) {
        cross.push(xs[i] + ((cy - y0) / (y1 - y0)) * (xs[j] - xs[i]))
      }
    }
    cross.sort((a, b) => a - b)
    for (let k = 0; k + 1 < cross.length; k += 2) {
      const from = Math.max(0, Math.ceil(cross[k] - 0.5))
      const to = Math.min(w - 1, Math.floor(cross[k + 1] - 0.5))
      for (let x = from; x <= to; x++) out[y * w + x] = 1
    }
  }
  return out
}

/** Distance (en pixels de grille) de chaque pixel intérieur au bord du masque. Chamfer 3-4. */
function insideDistance(mask, w, h) {
  const big = 1e9
  const d = new Float32Array(w * h)
  for (let i = 0; i < d.length; i++) d[i] = mask[i] ? big : 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (!d[i]) continue
      let v = d[i]
      if (x > 0) v = Math.min(v, d[i - 1] + 3)
      else v = Math.min(v, 3)
      if (y > 0) {
        v = Math.min(v, d[i - w] + 3)
        if (x > 0) v = Math.min(v, d[i - w - 1] + 4)
        if (x < w - 1) v = Math.min(v, d[i - w + 1] + 4)
      } else v = Math.min(v, 3)
      d[i] = v
    }
  }
  for (let y = h - 1; y >= 0; y--) {
    for (let x = w - 1; x >= 0; x--) {
      const i = y * w + x
      if (!d[i]) continue
      let v = d[i]
      if (x < w - 1) v = Math.min(v, d[i + 1] + 3)
      else v = Math.min(v, 3)
      if (y < h - 1) {
        v = Math.min(v, d[i + w] + 3)
        if (x < w - 1) v = Math.min(v, d[i + w + 1] + 4)
        if (x > 0) v = Math.min(v, d[i + w - 1] + 4)
      } else v = Math.min(v, 3)
      d[i] = v
    }
  }
  for (let i = 0; i < d.length; i++) d[i] /= 3
  return d
}

/**
 * Transforme le tracé en consignes pour SlimSAM (le modèle n'accepte que des points).
 * - points « pièce » (1) : le cœur du tracé, là où le doigt a clairement entouré quelque chose ;
 * - points « fond » (0) : juste à l'extérieur du tracé, pour dire où la pièce s'arrête.
 * Retourne des coordonnées 0..1 dans la zone rognée.
 */
export function samPrompts(lasso, aspect = 1, maxPositive = 2, maxNegative = 8) {
  // Grille aux proportions de la zone rognée : les distances sont de vrais pixels.
  const GW = aspect >= 1 ? 96 : Math.max(12, Math.round(96 * aspect))
  const GH = aspect >= 1 ? Math.max(12, Math.round(96 / aspect)) : 96
  const inside = rasterPolygon(lasso, GW, GH)
  const dist = insideDistance(inside, GW, GH)
  let best = -1
  let bestD = 0
  for (let i = 0; i < dist.length; i++) {
    if (dist[i] > bestD) {
      bestD = dist[i]
      best = i
    }
  }
  const at = (i) => ({ gx: (i % GW) + 0.5, gy: Math.floor(i / GW) + 0.5 })
  const norm = (g) => ({ x: g.gx / GW, y: g.gy / GH })
  const positives = []
  if (best >= 0) {
    const chosen = [at(best)]
    // Tracé allongé (pantalon, écharpe) : un second point loin du premier, bien à l'intérieur.
    while (chosen.length < maxPositive) {
      let pick = -1
      let pickScore = 0
      for (let i = 0; i < dist.length; i++) {
        if (dist[i] < bestD * 0.6) continue
        const g = at(i)
        let near = Infinity
        for (const c of chosen) near = Math.min(near, Math.hypot(g.gx - c.gx, g.gy - c.gy))
        if (near > pickScore) {
          pickScore = near
          pick = i
        }
      }
      // Seulement si le tracé est nettement plus long que large.
      if (pick < 0 || pickScore < bestD * 2.2) break
      chosen.push(at(pick))
    }
    for (const c of chosen) positives.push(norm(c))
  }

  let cx = 0
  let cy = 0
  for (const p of lasso) {
    cx += p.x
    cy += p.y
  }
  cx /= lasso.length || 1
  cy /= lasso.length || 1
  const negatives = []
  const n = lasso.length
  for (let k = 0; k < maxNegative && n; k++) {
    const p = lasso[Math.floor((k * n) / maxNegative)]
    const dx = p.x - cx
    const dy = p.y - cy
    const len = Math.hypot(dx, dy) || 1
    // 4 % de la zone vers l'extérieur : hors du tracé, mais encore dans la photo rognée.
    const q = { x: p.x + (dx / len) * 0.04, y: p.y + (dy / len) * 0.04 }
    if (q.x <= 0.005 || q.y <= 0.005 || q.x >= 0.995 || q.y >= 0.995) continue
    const gx = Math.min(GW - 1, Math.floor(q.x * GW))
    const gy = Math.min(GH - 1, Math.floor(q.y * GH))
    if (inside[gy * GW + gx]) continue
    negatives.push(q)
  }
  return {
    points: [...positives, ...negatives],
    labels: [...positives.map(() => 1), ...negatives.map(() => 0)]
  }
}

/**
 * Zones utiles autour du tracé (w×h) :
 * - inside : l'intérieur du tracé ;
 * - gate : l'intérieur un peu élargi (tolérance d'un tracé grossier) ;
 * - ring : une bande juste à l'extérieur du tracé. La pièce entourée n'y va pas ;
 *   un objet voisin coupé par le tracé (télé, bras, meuble) la traverse.
 */
export function lassoRegions(lasso, w, h) {
  const inside = rasterPolygon(lasso, w, h)
  const gate = dilateBin(inside, w, h, Math.max(2, Math.round(Math.min(w, h) * 0.015)))
  const grown = dilateBin(inside, w, h, Math.max(3, Math.round(Math.min(w, h) * 0.035)))
  const ring = new Uint8Array(w * h)
  let lassoArea = 0
  let ringArea = 0
  for (let i = 0; i < inside.length; i++) {
    lassoArea += inside[i]
    if (grown[i] && !gate[i]) {
      ring[i] = 1
      ringArea++
    }
  }
  return { inside, gate, ring, lassoArea, ringArea }
}

/**
 * SlimSAM propose 3 masques (détail, partie, objet entier). On garde celui qui
 * remplit le mieux le tracé sans en sortir. masks : Uint8Array w×h (0..255).
 */
export function pickSamMask(masks, scores, lasso, w, h, regions = lassoRegions(lasso, w, h)) {
  const { inside, gate, ring, lassoArea, ringArea } = regions
  if (!lassoArea) return null
  let best = null
  for (let m = 0; m < masks.length; m++) {
    const mask = masks[m]
    let on = 0
    let inLasso = 0
    let outGate = 0
    let crossing = 0
    for (let i = 0; i < mask.length; i++) {
      if (mask[i] <= 127) continue
      on++
      if (inside[i]) inLasso++
      if (!gate[i]) outGate++
      if (ring[i]) crossing++
    }
    if (!on) continue
    const fill = inLasso / lassoArea
    const leak = outGate / on
    const exit = ringArea ? crossing / ringArea : 0
    // Un tracé grossier contient la pièce + du fond : la pièce occupe souvent 30 à 85 % du tracé.
    const score =
      (scores[m] ?? 0) + 0.6 * Math.min(fill, 0.85) - 1.2 * leak - 3 * exit - (fill < 0.12 ? 1 : 0)
    if (!best || score > best.score) best = { index: m, score, fill, leak, exit }
  }
  return best
}

/**
 * Où le masque sort du tracé : jusqu'à `max` points bien séparés, juste à l'extérieur du tracé.
 * Ils tombent sur l'objet voisin, jamais sur la pièce entourée : on les donne à SlimSAM comme « fond ».
 */
export function exitPoints(mask, regions, w, h, max = 3) {
  const hits = []
  for (let i = 0; i < mask.length; i++) if (mask[i] > 127 && regions.ring[i]) hits.push(i)
  if (!hits.length) return []
  const minGap = Math.min(w, h) * 0.12
  const picked = []
  // Premier point : le plus central des contacts, puis le plus éloigné des points déjà pris.
  let sx = 0
  let sy = 0
  for (const i of hits) {
    sx += i % w
    sy += Math.floor(i / w)
  }
  sx /= hits.length
  sy /= hits.length
  let first = hits[0]
  let firstD = Infinity
  for (const i of hits) {
    const d = Math.hypot((i % w) - sx, Math.floor(i / w) - sy)
    if (d < firstD) {
      firstD = d
      first = i
    }
  }
  picked.push(first)
  while (picked.length < max) {
    let far = -1
    let farD = 0
    for (const i of hits) {
      let near = Infinity
      for (const j of picked) near = Math.min(near, Math.hypot((i % w) - (j % w), Math.floor(i / w) - Math.floor(j / w)))
      if (near > farD) {
        farD = near
        far = i
      }
    }
    if (far < 0 || farD < minGap) break
    picked.push(far)
  }
  return picked.map((i) => ({ x: ((i % w) + 0.5) / w, y: (Math.floor(i / w) + 0.5) / h }))
}

function resizeBilinear(src, sw, sh, dw, dh) {
  const out = new Float32Array(dw * dh)
  for (let y = 0; y < dh; y++) {
    const fy = Math.min(sh - 1, Math.max(0, ((y + 0.5) * sh) / dh - 0.5))
    const y0 = Math.floor(fy)
    const y1 = Math.min(sh - 1, y0 + 1)
    const ty = fy - y0
    for (let x = 0; x < dw; x++) {
      const fx = Math.min(sw - 1, Math.max(0, ((x + 0.5) * sw) / dw - 0.5))
      const x0 = Math.floor(fx)
      const x1 = Math.min(sw - 1, x0 + 1)
      const tx = fx - x0
      const top = src[y0 * sw + x0] * (1 - tx) + src[y0 * sw + x1] * tx
      const bottom = src[y1 * sw + x0] * (1 - tx) + src[y1 * sw + x1] * tx
      out[y * dw + x] = (top * (1 - ty) + bottom * ty) / 255
    }
  }
  return out
}

/** Retire peau, cheveux et visage vus par SegFormer, sauf si ça mangerait presque toute la pièce. */
function dropSkin(soft, options, w, h) {
  if (!options.classIds || !options.labels) return soft
  const skin = new Set()
  options.labels.forEach((label, index) => {
    if (SKIN.includes(label)) skin.add(index)
  })
  if (!skin.size) return soft
  const ids = resizeIds(options.classIds, options.maskW, options.maskH, w, h)
  let total = 0
  let cut = 0
  for (let i = 0; i < soft.length; i++) {
    if (soft[i] <= 0.5) continue
    total++
    if (skin.has(ids[i])) cut++
  }
  if (!total || cut / total > 0.45) return soft
  const out = new Float32Array(soft)
  for (let i = 0; i < out.length; i++) if (skin.has(ids[i])) out[i] = 0
  return out
}

/**
 * options : { lasso (0..1 dans la zone rognée), matte (Uint8 maskW×maskH ou null),
 *             maskW, maskH, classIds, labels, photo (RGBA), workW, workH }
 */
export function cutFromLasso(options) {
  const { photo, workW: w, workH: h } = options
  const n = w * h
  const inside = rasterPolygon(options.lasso, w, h)
  // Tolérance : un tracé « grossier » peut mordre un peu sur la pièce.
  const gate = dilateBin(inside, w, h, Math.max(2, Math.round(Math.min(w, h) * 0.015)))
  let gateArea = 0
  for (let i = 0; i < n; i++) if (gate[i]) gateArea++
  if (!gateArea) return { rgba: new Uint8ClampedArray(photo.length), alpha: new Uint8Array(n), coverage: 0, usedMatte: false }

  let soft = null
  let usedMatte = false
  if (options.matte && options.matte.length === options.maskW * options.maskH) {
    soft = resizeBilinear(options.matte, options.maskW, options.maskH, w, h)
    for (let i = 0; i < n; i++) if (!gate[i]) soft[i] = 0
    soft = dropSkin(soft, options, w, h)
    let on = 0
    for (let i = 0; i < n; i++) if (soft[i] > 0.5) on++
    if (on >= gateArea * 0.06) usedMatte = true
    else soft = null
  }
  // Le modèle n'a rien trouvé dans le tracé : le tracé lui-même sert de découpe.
  if (!soft) soft = Float32Array.from(inside)

  const before = new Uint8Array(n)
  for (let i = 0; i < n; i++) before[i] = soft[i] > 0.5 ? 1 : 0
  let bin = keepLarge(before, w, h, 0.05)
  bin = fillSmallHoles(bin, w, h, Math.floor(n * 0.015))

  const src = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    if (!bin[i]) continue
    src[i] = before[i] ? soft[i] : 1
  }
  const guide = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const o = i * 4
    guide[i] = (photo[o] * 0.2126 + photo[o + 1] * 0.7152 + photo[o + 2] * 0.0722) / 255
  }
  const radius = Math.max(2, Math.round(Math.min(w, h) * 0.006))
  const refined = guidedFilter(guide, src, w, h, radius, 4e-4)

  const alpha = new Uint8Array(n)
  let seen = 0
  for (let i = 0; i < n; i++) {
    const v = gate[i] ? refined[i] : 0
    if (v < 0.04) continue
    alpha[i] = Math.round(v * 255)
    if (alpha[i] > 16) seen++
  }
  return { rgba: rgbaFromAlpha(photo, alpha), alpha, coverage: seen / n, usedMatte }
}
