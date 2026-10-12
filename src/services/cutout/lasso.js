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
