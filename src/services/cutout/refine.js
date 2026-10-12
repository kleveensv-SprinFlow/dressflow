const GROUP_LABELS = {
  haut: ["Upper-clothes", "Dress"],
  bas: ["Pants", "Skirt"],
  chaussures: ["Left-shoe", "Right-shoe"],
  chapeau: ["Hat"],
  accessoires: ["Bag", "Scarf"],
  tout: ["Upper-clothes", "Dress", "Pants", "Skirt", "Left-shoe", "Right-shoe"]
};
const ATTACH_LABELS = {
  haut: [],
  bas: [],
  chaussures: [],
  chapeau: [],
  accessoires: [],
  tout: []
};
const ZONE_FR = {
  Background: "Fond",
  Hat: "Chapeau ou capuche",
  Hair: "Cheveux",
  Sunglasses: "Lunettes",
  "Upper-clothes": "Haut",
  Skirt: "Jupe",
  Pants: "Pantalon",
  Dress: "Robe",
  Belt: "Ceinture",
  "Left-shoe": "Chaussure gauche",
  "Right-shoe": "Chaussure droite",
  Face: "Visage",
  "Left-leg": "Jambe",
  "Right-leg": "Jambe",
  "Left-arm": "Bras",
  "Right-arm": "Bras",
  Bag: "Sac",
  Scarf: "\xC9charpe"
};
function countGroupPixels(labels, classIds) {
  const idOf = new Map(labels.map((label, index) => [label, index]));
  const sets = {
    haut: idsFor(GROUP_LABELS.haut, idOf),
    bas: idsFor(GROUP_LABELS.bas, idOf),
    chaussures: idsFor(GROUP_LABELS.chaussures, idOf),
    tout: idsFor(GROUP_LABELS.tout, idOf)
  };
  const counts = { haut: 0, bas: 0, chaussures: 0, tout: 0 };
  for (let i = 0; i < classIds.length; i++) {
    const id = classIds[i];
    if (sets.haut.has(id)) counts.haut++;
    if (sets.bas.has(id)) counts.bas++;
    if (sets.chaussures.has(id)) counts.chaussures++;
    if (sets.tout.has(id)) counts.tout++;
  }
  return counts;
}
function dominantGroup(labels, classIds) {
  const counts = countGroupPixels(labels, classIds);
  const order = ["haut", "bas", "chaussures"];
  let best = "tout";
  let bestN = 0;
  for (const group of order) {
    if (counts[group] > bestN) {
      best = group;
      bestN = counts[group];
    }
  }
  if (bestN === 0 && counts.tout > 0) return "tout";
  return best;
}
function idsFor(names, idOf) {
  const set = /* @__PURE__ */ new Set();
  for (const name of names) {
    const id = idOf.get(name);
    if (id !== void 0) set.add(id);
  }
  return set;
}
function resizeIds(src, sw, sh, dw, dh) {
  if (sw === dw && sh === dh) return src;
  const out = new Uint8Array(dw * dh);
  for (let y = 0; y < dh; y++) {
    const sy = Math.min(sh - 1, Math.floor((y + 0.5) * sh / dh));
    const row = sy * sw;
    const dst = y * dw;
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(sw - 1, Math.floor((x + 0.5) * sw / dw));
      out[dst + x] = src[row + sx];
    }
  }
  return out;
}
function dilateBin(bin, w, h, r) {
  if (r <= 0) return bin;
  const tmp = new Uint8Array(w * h);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(w - 1, x + r);
      let on = 0;
      for (let xx = x0; xx <= x1; xx++) {
        if (bin[row + xx]) {
          on = 1;
          break;
        }
      }
      tmp[row + x] = on;
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      const y0 = Math.max(0, y - r);
      const y1 = Math.min(h - 1, y + r);
      let on = 0;
      for (let yy = y0; yy <= y1; yy++) {
        if (tmp[yy * w + x]) {
          on = 1;
          break;
        }
      }
      out[y * w + x] = on;
    }
  }
  return out;
}
function erodeBin(bin, w, h, r) {
  if (r <= 0) return bin;
  const tmp = new Uint8Array(w * h);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(w - 1, x + r);
      let on = 1;
      for (let xx = x0; xx <= x1; xx++) {
        if (!bin[row + xx]) {
          on = 0;
          break;
        }
      }
      tmp[row + x] = on;
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      const y0 = Math.max(0, y - r);
      const y1 = Math.min(h - 1, y + r);
      let on = 1;
      for (let yy = y0; yy <= y1; yy++) {
        if (!tmp[yy * w + x]) {
          on = 0;
          break;
        }
      }
      out[y * w + x] = on;
    }
  }
  return out;
}
function keepLarge(bin, w, h, minRatio) {
  const n = w * h;
  const parent = new Int32Array(n);
  const rank = new Uint8Array(n);
  for (let i = 0; i < n; i++) parent[i] = i;
  const find = (a) => {
    let root = a;
    while (parent[root] !== root) root = parent[root];
    while (parent[a] !== a) {
      const next = parent[a];
      parent[a] = root;
      a = next;
    }
    return root;
  };
  const union = (a, b) => {
    let pa = find(a);
    let pb = find(b);
    if (pa === pb) return;
    if (rank[pa] < rank[pb]) {
      const swap = pa;
      pa = pb;
      pb = swap;
    }
    parent[pb] = pa;
    if (rank[pa] === rank[pb]) rank[pa]++;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!bin[i]) continue;
      if (x + 1 < w && bin[i + 1]) union(i, i + 1);
      if (y + 1 < h && bin[i + w]) union(i, i + w);
    }
  }
  const area = /* @__PURE__ */ new Map();
  let largest = 0;
  for (let i = 0; i < n; i++) {
    if (!bin[i]) continue;
    const root = find(i);
    const next = (area.get(root) ?? 0) + 1;
    area.set(root, next);
    if (next > largest) largest = next;
  }
  const minArea = Math.max(24, Math.floor(largest * minRatio));
  const out = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    if (!bin[i]) continue;
    if ((area.get(find(i)) ?? 0) >= minArea) out[i] = 1;
  }
  return out;
}
function fillSmallHoles(bin, w, h, maxHole) {
  const n = w * h;
  const seen = new Uint8Array(n);
  const out = bin.slice();
  const stack = new Int32Array(n);
  for (let start = 0; start < n; start++) {
    if (bin[start] || seen[start]) continue;
    let sp = 0;
    stack[sp++] = start;
    seen[start] = 1;
    let touches = false;
    let store = true;
    const cells = [];
    while (sp > 0) {
      const p = stack[--sp];
      const x = p % w;
      const y = (p - x) / w;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) touches = true;
      if (store) {
        cells.push(p);
        if (touches || cells.length > maxHole) {
          store = false;
          cells.length = 0;
        }
      }
      const push = (q) => {
        if (!seen[q] && !bin[q]) {
          seen[q] = 1;
          stack[sp++] = q;
        }
      };
      if (x > 0) push(p - 1);
      if (x + 1 < w) push(p + 1);
      if (y > 0) push(p - w);
      if (y + 1 < h) push(p + w);
    }
    if (store && !touches) {
      for (const p of cells) out[p] = 1;
    }
  }
  return out;
}
function refineEdgeBand(bin, photo, w, h, radius) {
  const sureFg = erodeBin(bin, w, h, radius);
  const reach = dilateBin(bin, w, h, radius);
  const out = bin.slice();
  const win = Math.max(4, Math.round(radius * 0.8));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (sureFg[i]) {
        out[i] = 1;
        continue;
      }
      if (!reach[i]) {
        out[i] = 0;
        continue;
      }
      let fr = 0;
      let fg = 0;
      let fb = 0;
      let fn = 0;
      let br = 0;
      let bg = 0;
      let bb = 0;
      let bn = 0;
      const y0 = Math.max(0, y - win);
      const y1 = Math.min(h - 1, y + win);
      const x0 = Math.max(0, x - win);
      const x1 = Math.min(w - 1, x + win);
      for (let yy = y0; yy <= y1; yy++) {
        for (let xx = x0; xx <= x1; xx++) {
          const j = yy * w + xx;
          const o = j * 4;
          if (sureFg[j]) {
            fr += photo[o];
            fg += photo[o + 1];
            fb += photo[o + 2];
            fn++;
          } else if (!reach[j]) {
            br += photo[o];
            bg += photo[o + 1];
            bb += photo[o + 2];
            bn++;
          }
        }
      }
      if (fn < 3 || bn < 3) continue;
      const o = i * 4;
      const dFg = Math.hypot(photo[o] - fr / fn, photo[o + 1] - fg / fn, photo[o + 2] - fb / fn);
      const dBg = Math.hypot(photo[o] - br / bn, photo[o + 1] - bg / bn, photo[o + 2] - bb / bn);
      if (dFg + 14 < dBg) out[i] = 1;
      else if (dBg + 14 < dFg) out[i] = 0;
    }
  }
  return out;
}
function boxMean(src, w, h, r) {
  const iw = w + 1;
  const ii = new Float64Array(iw * (h + 1));
  for (let y = 1; y <= h; y++) {
    let row = 0;
    const srcRow = (y - 1) * w;
    const iiRow = y * iw;
    const prev = (y - 1) * iw;
    for (let x = 1; x <= w; x++) {
      row += src[srcRow + x - 1];
      ii[iiRow + x] = ii[prev + x] + row;
    }
  }
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - r);
    const y1 = Math.min(h - 1, y + r);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(w - 1, x + r);
      const area = (x1 - x0 + 1) * (y1 - y0 + 1);
      const sum = ii[(y1 + 1) * iw + (x1 + 1)] - ii[y0 * iw + (x1 + 1)] - ii[(y1 + 1) * iw + x0] + ii[y0 * iw + x0];
      out[y * w + x] = sum / area;
    }
  }
  return out;
}
function guidedFilter(guide, src, w, h, radius, eps) {
  const n = w * h;
  const meanI = boxMean(guide, w, h, radius);
  const meanP = boxMean(src, w, h, radius);
  const ip = new Float32Array(n);
  const ii = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const g = guide[i];
    ip[i] = g * src[i];
    ii[i] = g * g;
  }
  const meanIP = boxMean(ip, w, h, radius);
  const meanII = boxMean(ii, w, h, radius);
  const a = new Float32Array(n);
  const b = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const varI = meanII[i] - meanI[i] * meanI[i];
    const cov = meanIP[i] - meanI[i] * meanP[i];
    const av = cov / (varI + eps);
    a[i] = av;
    b[i] = meanP[i] - av * meanI[i];
  }
  const meanA = boxMean(a, w, h, radius);
  const meanB = boxMean(b, w, h, radius);
  const q = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const v = meanA[i] * guide[i] + meanB[i];
    q[i] = v < 0 ? 0 : v > 1 ? 1 : v;
  }
  return q;
}
function maskFromIds(ids, allowed) {
  const bin = new Uint8Array(ids.length);
  for (let i = 0; i < ids.length; i++) {
    if (allowed.has(ids[i])) bin[i] = 1;
  }
  return bin;
}
function coverageOf(alpha) {
  let n = 0;
  for (let i = 0; i < alpha.length; i++) if (alpha[i] > 16) n++;
  return alpha.length ? n / alpha.length : 0;
}
function zonesFromIds(labels, ids) {
  const counts = new Uint32Array(labels.length);
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (id < counts.length) counts[id]++;
  }
  const zones = [];
  for (let i = 0; i < labels.length; i++) {
    const ratio = counts[i] / ids.length;
    if (ratio < 4e-3) continue;
    const label = labels[i] ?? "Zone";
    zones.push({ label, name: ZONE_FR[label] ?? label, ratio });
  }
  zones.sort((a, b) => b.ratio - a.ratio);
  return zones;
}
function paintAlpha(photo, alpha, classIds, labels, w, h) {
  const bgId = labels.indexOf("Background");
  const tile = 28;
  const tw = Math.ceil(w / tile);
  const th = Math.ceil(h / tile);
  const tiles = tw * th;
  const sumR = new Float64Array(tiles);
  const sumG = new Float64Array(tiles);
  const sumB = new Float64Array(tiles);
  const cnt = new Uint32Array(tiles);
  let gR = 0;
  let gG = 0;
  let gB = 0;
  let gN = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (bgId >= 0 && classIds[i] !== bgId) continue;
      if (bgId < 0 && alpha[i] > 8) continue;
      const o = i * 4;
      const r = photo[o];
      const g = photo[o + 1];
      const b = photo[o + 2];
      const t = Math.floor(y / tile) * tw + Math.floor(x / tile);
      sumR[t] += r;
      sumG[t] += g;
      sumB[t] += b;
      cnt[t]++;
      gR += r;
      gG += g;
      gB += b;
      gN++;
    }
  }
  const fallbackR = gN ? gR / gN : 255;
  const fallbackG = gN ? gG / gN : 255;
  const fallbackB = gN ? gB / gN : 255;
  const colR = new Float32Array(tiles);
  const colG = new Float32Array(tiles);
  const colB = new Float32Array(tiles);
  const known = new Uint8Array(tiles);
  for (let i = 0; i < tiles; i++) {
    if (cnt[i]) {
      colR[i] = sumR[i] / cnt[i];
      colG[i] = sumG[i] / cnt[i];
      colB[i] = sumB[i] / cnt[i];
      known[i] = 1;
    }
  }
  for (let pass = 0; pass < 8; pass++) {
    for (let y = 0; y < th; y++) {
      for (let x = 0; x < tw; x++) {
        const i = y * tw + x;
        if (known[i]) continue;
        let r = 0;
        let g = 0;
        let b = 0;
        let n = 0;
        for (let yy = Math.max(0, y - 1); yy <= Math.min(th - 1, y + 1); yy++) {
          for (let xx = Math.max(0, x - 1); xx <= Math.min(tw - 1, x + 1); xx++) {
            const j = yy * tw + xx;
            if (!known[j]) continue;
            r += colR[j];
            g += colG[j];
            b += colB[j];
            n++;
          }
        }
        if (n) {
          colR[i] = r / n;
          colG[i] = g / n;
          colB[i] = b / n;
          known[i] = 1;
        }
      }
    }
  }
  const out = new Uint8ClampedArray(photo.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const o = i * 4;
      let r = photo[o];
      let g = photo[o + 1];
      let b = photo[o + 2];
      const a = alpha[i];
      if (a > 20 && a < 230) {
        const t = Math.floor(y / tile) * tw + Math.floor(x / tile);
        const br = known[t] ? colR[t] : fallbackR;
        const bg = known[t] ? colG[t] : fallbackG;
        const bb = known[t] ? colB[t] : fallbackB;
        const dist = Math.hypot(r - br, g - bg, b - bb);
        if (dist < 36) {
          const a01 = Math.max(a / 255, 0.18);
          r = clampByte((r - br * (1 - a / 255)) / a01);
          g = clampByte((g - bg * (1 - a / 255)) / a01);
          b = clampByte((b - bb * (1 - a / 255)) / a01);
        }
      }
      out[o] = r;
      out[o + 1] = g;
      out[o + 2] = b;
      out[o + 3] = a;
    }
  }
  return out;
}
function clampByte(v) {
  if (v < 0) return 0;
  if (v > 255) return 255;
  return Math.round(v);
}
function alphaFromBinary(bin, guide, w, h, softness) {
  const alpha = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) alpha[i] = bin[i] ? 255 : 0;
  return alpha;
}
function growAlongColor(bin, photo, w, h) {
  const n = w * h;
  const maxR = 110;
  const dist = new Int16Array(n);
  dist.fill(-1);
  const q = new Int32Array(n);
  let qs = 0;
  let qe = 0;
  let seeds = 0;
  for (let i = 0; i < n; i++) {
    if (!bin[i]) continue;
    dist[i] = 0;
    q[qe++] = i;
    seeds++;
  }
  if (!seeds) return bin;
  while (qs < qe) {
    const p = q[qs++];
    if (dist[p] >= maxR) continue;
    const x = p % w;
    const y = (p - x) / w;
    const next = dist[p] + 1;
    const see = (nb) => {
      if (dist[nb] >= 0) return;
      dist[nb] = next;
      q[qe++] = nb;
    };
    if (x > 0) see(p - 1);
    if (x + 1 < w) see(p + 1);
    if (y > 0) see(p - w);
    if (y + 1 < h) see(p + w);
  }
  const out = bin.slice();
  const seedR = new Uint8ClampedArray(n);
  const seedG = new Uint8ClampedArray(n);
  const seedB = new Uint8ClampedArray(n);
  qs = 0;
  qe = 0;
  for (let i = 0; i < n; i++) {
    if (!bin[i]) continue;
    const o = i * 4;
    seedR[i] = photo[o];
    seedG[i] = photo[o + 1];
    seedB[i] = photo[o + 2];
    q[qe++] = i;
  }
  const maxAdd = seeds * 8;
  let added = 0;
  while (qs < qe && added < maxAdd) {
    const p = q[qs++];
    const x = p % w;
    const y = (p - x) / w;
    const po = p * 4;
    const take = (nb) => {
      if (out[nb] || dist[nb] < 0) return;
      const o = nb * 4;
      const step = Math.hypot(photo[o] - photo[po], photo[o + 1] - photo[po + 1], photo[o + 2] - photo[po + 2]);
      if (step > 38) return;
      const toSeed = Math.hypot(photo[o] - seedR[p], photo[o + 1] - seedG[p], photo[o + 2] - seedB[p]);
      if (toSeed > 64) return;
      out[nb] = 1;
      seedR[nb] = seedR[p];
      seedG[nb] = seedG[p];
      seedB[nb] = seedB[p];
      q[qe++] = nb;
      added++;
    };
    if (x > 0) take(p - 1);
    if (x + 1 < w) take(p + 1);
    if (y > 0) take(p - w);
    if (y + 1 < h) take(p + w);
  }
  return out;
}
function resizeGray(src, sw, sh, dw, dh) {
  const out = new Uint8Array(dw * dh);
  for (let y = 0; y < dh; y++) {
    const sy = Math.min(sh - 1, Math.max(0, Math.floor(y * sh / dh)));
    for (let x = 0; x < dw; x++) {
      const sx = Math.min(sw - 1, Math.max(0, Math.floor(x * sw / dw)));
      out[y * dw + x] = src[sy * sw + sx];
    }
  }
  return out;
}
function cutFromMatte(options) {
  const alpha = resizeGray(options.matte, options.maskW, options.maskH, options.workW, options.workH);
  for (let i = 0; i < alpha.length; i++) if (alpha[i] < 16) alpha[i] = 0;
  const rgba = rgbaFromAlpha(options.photo, alpha);
  return {
    rgba,
    alpha,
    coverage: coverageOf(alpha),
    zones: zonesFromIds(options.labels, options.classIds)
  };
}
function buildCutout(options) {
  if (options.matte && options.matte.length === options.maskW * options.maskH) {
    const cut = cutFromMatte(options);
    if (cut.coverage >= 0.01) return cut;
  }
  const { labels, photo, workW, workH, group } = options;
  const ids = resizeIds(options.classIds, options.maskW, options.maskH, workW, workH);
  const idOf = new Map(labels.map((label, index) => [label, index]));
  const allowed = idsFor(GROUP_LABELS[group], idOf);
  let bin = maskFromIds(ids, allowed);
  const attach = idsFor(ATTACH_LABELS[group], idOf);
  if (attach.size) {
    const grown = dilateBin(bin, workW, workH, 12);
    for (let i = 0; i < bin.length; i++) {
      if (attach.has(ids[i]) && grown[i]) bin[i] = 1;
    }
  }
  bin = keepLarge(bin, workW, workH, 0.008);
  const maxHole = Math.floor(workW * workH * 0.12);
  bin = fillSmallHoles(bin, workW, workH, maxHole);
  bin = growAlongColor(bin, photo, workW, workH);
  bin = fillSmallHoles(bin, workW, workH, maxHole);
  bin = keepLarge(bin, workW, workH, 0.05);
  const contract = Math.max(0, Math.round(options.contract));
  let edged = contract ? erodeBin(bin, workW, workH, contract) : bin;
  let alive = 0;
  for (let i = 0; i < edged.length; i++) if (edged[i]) alive++;
  if (alive < 80) edged = bin;
  const guide = new Float32Array(workW * workH);
  for (let i = 0; i < guide.length; i++) {
    const o = i * 4;
    guide[i] = (photo[o] * 0.2126 + photo[o + 1] * 0.7152 + photo[o + 2] * 0.0722) / 255;
  }
  const alpha = alphaFromBinary(edged, guide, workW, workH, Math.max(0, Math.round(options.softness)));
  const rgba = paintAlpha(photo, alpha, ids, labels, workW, workH);
  return {
    rgba,
    alpha,
    coverage: coverageOf(alpha),
    zones: zonesFromIds(labels, options.classIds)
  };
}
function rgbaFromAlpha(photo, alpha) {
  const out = new Uint8ClampedArray(photo.length);
  for (let i = 0; i < alpha.length; i++) {
    const o = i * 4;
    out[o] = photo[o];
    out[o + 1] = photo[o + 1];
    out[o + 2] = photo[o + 2];
    out[o + 3] = alpha[i];
  }
  return out;
}
export {
  GROUP_LABELS,
  ZONE_FR,
  buildCutout,
  dilateBin,
  fillSmallHoles,
  guidedFilter,
  keepLarge,
  countGroupPixels,
  dominantGroup,
  paintAlpha,
  resizeIds,
  rgbaFromAlpha
};
