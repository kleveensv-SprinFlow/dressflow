import test from 'node:test'
import assert from 'node:assert/strict'
import { cropBox, cutFromLasso, lassoToCrop, pickSamMask, rasterPolygon, samPrompts } from '../src/services/cutout/lasso.js'

const W = 120
const H = 90

function photo() {
  const data = new Uint8ClampedArray(W * H * 4)
  for (let i = 0; i < W * H; i++) {
    const x = i % W
    const y = Math.floor(i / W)
    const inObject = x >= 40 && x < 80 && y >= 30 && y < 60
    data[i * 4] = inObject ? 200 : 30
    data[i * 4 + 1] = inObject ? 180 : 30
    data[i * 4 + 2] = inObject ? 160 : 30
    data[i * 4 + 3] = 255
  }
  return data
}

// Matte « modèle » : la pièce (40..80 × 30..60) + un bloc parasite hors du tracé (0..20 × 0..90).
function matte() {
  const m = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const object = x >= 40 && x < 80 && y >= 30 && y < 60
      const stray = x < 20
      if (object || stray) m[y * W + x] = 255
    }
  }
  return m
}

const lasso = [
  { x: 30 / W, y: 20 / H },
  { x: 90 / W, y: 20 / H },
  { x: 90 / W, y: 70 / H },
  { x: 30 / W, y: 70 / H }
]

function alphaAt(cut, x, y) {
  return cut.alpha[y * W + x]
}

test('rasterPolygon remplit un rectangle', () => {
  const mask = rasterPolygon(lasso, W, H)
  let area = 0
  for (const v of mask) area += v
  assert.ok(Math.abs(area - 60 * 50) < 60 * 2, `aire ${area}`)
  assert.equal(mask[45 * W + 60], 1)
  assert.equal(mask[5 * W + 5], 0)
})

test('le bloc parasite hors du tracé est retiré, la pièce reste', () => {
  const cut = cutFromLasso({ lasso, matte: matte(), maskW: W, maskH: H, photo: photo(), workW: W, workH: H })
  assert.equal(cut.usedMatte, true)
  assert.equal(alphaAt(cut, 5, 45), 0)
  assert.ok(alphaAt(cut, 60, 45) > 240)
  assert.equal(alphaAt(cut, 60, 5), 0)
  assert.ok(cut.coverage > 0.1 && cut.coverage < 0.2, `couverture ${cut.coverage}`)
})

test('sans résultat du modèle, le tracé sert de découpe', () => {
  const cut = cutFromLasso({ lasso, matte: null, maskW: W, maskH: H, photo: photo(), workW: W, workH: H })
  assert.equal(cut.usedMatte, false)
  assert.ok(alphaAt(cut, 60, 45) > 200)
  assert.equal(alphaAt(cut, 5, 5), 0)
})

test('un matte vide dans le tracé retombe sur le tracé', () => {
  const empty = new Uint8Array(W * H)
  const cut = cutFromLasso({ lasso, matte: empty, maskW: W, maskH: H, photo: photo(), workW: W, workH: H })
  assert.equal(cut.usedMatte, false)
  assert.ok(cut.coverage > 0.2)
})

test('la peau détectée est retirée de la pièce', () => {
  const classIds = new Uint8Array(W * H)
  // « bras » (id 1) sur la moitié droite de la pièce
  for (let y = 0; y < H; y++) for (let x = 70; x < 80; x++) classIds[y * W + x] = 1
  const cut = cutFromLasso({
    lasso,
    matte: matte(),
    maskW: W,
    maskH: H,
    classIds,
    labels: ['Background', 'Left-arm'],
    photo: photo(),
    workW: W,
    workH: H
  })
  assert.ok(alphaAt(cut, 50, 45) > 240)
  assert.ok(alphaAt(cut, 76, 45) < 30)
})

test('cropBox entoure le tracé avec une marge et reste dans la photo', () => {
  const box = cropBox(lasso, 1200, 900)
  assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.w <= 1200 && box.y + box.h <= 900)
  assert.ok(box.x < 300 && box.x + box.w > 900)
  const crop = lassoToCrop(lasso, box, 1200, 900)
  for (const p of crop) assert.ok(p.x > 0 && p.x < 1 && p.y > 0 && p.y < 1)
})

function inPolygon(p, poly) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

test('samPrompts : un point pièce au cœur du tracé, des points fond à l’extérieur', () => {
  const { points, labels } = samPrompts(lasso, W / H)
  const pos = points.filter((_, i) => labels[i] === 1)
  const neg = points.filter((_, i) => labels[i] === 0)
  assert.ok(pos.length >= 1)
  assert.ok(Math.abs(pos[0].x - 0.5) < 0.06 && Math.abs(pos[0].y - 0.5) < 0.06, JSON.stringify(pos[0]))
  assert.ok(neg.length >= 4, `fond ${neg.length}`)
  for (const p of neg) assert.equal(inPolygon(p, lasso), false)
  for (const p of pos) assert.equal(inPolygon(p, lasso), true)
})

test('samPrompts : un tracé allongé reçoit deux points pièce', () => {
  const long = [
    { x: 0.4, y: 0.05 },
    { x: 0.6, y: 0.05 },
    { x: 0.6, y: 0.95 },
    { x: 0.4, y: 0.95 }
  ]
  const { labels } = samPrompts(long, 1)
  assert.equal(labels.filter((l) => l === 1).length, 2)
})

test('pickSamMask : préfère la pièce entière au détail et au fond qui déborde', () => {
  const detail = new Uint8Array(W * H)
  const whole = new Uint8Array(W * H)
  const leak = new Uint8Array(W * H).fill(255)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (x >= 40 && x < 80 && y >= 30 && y < 60) whole[y * W + x] = 255
      if (x >= 55 && x < 65 && y >= 40 && y < 50) detail[y * W + x] = 255
    }
  }
  const best = pickSamMask([detail, whole, leak], [0.95, 0.9, 0.97], lasso, W, H)
  assert.equal(best.index, 1)
})
