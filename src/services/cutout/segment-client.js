let seq = 0;
// Un moteur neuf par étape : la mémoire WASM ne se libère pas, il faut jeter le worker.
function runJob(payload, image, crop, progress) {
  const id = ++seq;
  const copy = image.data.buffer.slice(0);
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./segment.worker.js", import.meta.url), { type: "module" });
    const done = (fn, value) => {
      worker.terminate();
      fn(value);
    };
    worker.onmessage = (event) => {
      const data = event.data;
      if (data.type === "progress") {
        progress?.({ status: data.status, progress: data.progress });
        return;
      }
      if (data.id !== id) return;
      if (data.type === "error") {
        done(reject, new Error(data.message));
        return;
      }
      done(resolve, data);
    };
    worker.onerror = (event) => {
      done(reject, new Error(event?.message || "le moteur s\u2019est arr\xEAt\xE9"));
    };
    worker.postMessage(
      {
        id,
        ...payload,
        buffer: copy,
        width: image.width,
        height: image.height,
        ox: crop.ox,
        oy: crop.oy,
        sw: crop.sw,
        sh: crop.sh
      },
      [copy]
    );
  });
}
const MATTE_ATTEMPTS = [
  { dtype: "fp32", side: 768 },
  { dtype: "fp32", side: 512 },
  { dtype: "fp32", side: 384 },
  { dtype: "fp32", side: 256 }
];
const SAM_ATTEMPTS = ["fp32", "q8"];
// Le tracé (0..1 dans la zone rognée) sert de consigne à SlimSAM, dans le worker.
async function samFromLasso(image, crop, lasso, progress, failures) {
  for (const dtype of SAM_ATTEMPTS) {
    try {
      const data = await runJob({ kind: "sam", dtype, lasso }, image, crop, progress);
      if (!data.matte || data.fill < 0.06) {
        failures.push(`SlimSAM ${dtype}: rien de net dans le tracé`);
        return null;
      }
      return new Uint8Array(data.matte);
    } catch (error) {
      failures.push(`SlimSAM ${dtype}: ${error.message}`);
    }
  }
  return null;
}
async function segmentSquare(image, crop, progress, lasso = null) {
  let matte = null;
  let source = null;
  const failures = [];
  if (lasso) {
    matte = await samFromLasso(image, crop, lasso, progress, failures);
    if (matte) source = "slimsam";
  }
  if (!matte) {
    for (const attempt of MATTE_ATTEMPTS) {
      try {
        const data = await runJob({ kind: "matte", ...attempt }, image, crop, progress);
        matte = new Uint8Array(data.matte);
        source = "birefnet";
        break;
      } catch (error) {
        failures.push(`${attempt.dtype}@${attempt.side}: ${error.message}`);
      }
    }
  }
  let classIds = null;
  let labels = ["Background"];
  let width = crop.sw;
  let height = crop.sh;
  try {
    const data = await runJob({ kind: "classes" }, image, crop, progress);
    classIds = new Uint8Array(data.buffer);
    labels = data.labels;
    width = data.width;
    height = data.height;
  } catch (error) {
    if (!matte) throw new Error(`BiRefNet: ${failures.join(" | ")} // SegFormer: ${error.message}`);
  }
  if (!classIds) classIds = new Uint8Array(width * height);
  if (failures.length) console.warn("Détourage :", failures.join(" | "));
  return { classIds, matte, width, height, labels, source };
}
const MODEL_SIDE = 768;
function drawModelInput(source, width, height) {
  const scale = Math.min(1, MODEL_SIDE / Math.max(width, height));
  const sw = Math.max(1, Math.round(width * scale));
  const sh = Math.max(1, Math.round(height * scale));
  const side = Math.max(sw, sh);
  const canvas = document.createElement("canvas");
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas indisponible");
  const ox = Math.floor((side - sw) / 2);
  const oy = Math.floor((side - sh) / 2);
  ctx.drawImage(source, ox, oy, sw, sh);
  if (oy > 0) ctx.drawImage(canvas, ox, oy, sw, 1, ox, 0, sw, oy);
  if (oy + sh < side) ctx.drawImage(canvas, ox, oy + sh - 1, sw, 1, ox, oy + sh, sw, side - (oy + sh));
  if (ox > 0) ctx.drawImage(canvas, ox, 0, 1, side, 0, 0, ox, side);
  if (ox + sw < side) ctx.drawImage(canvas, ox + sw - 1, 0, 1, side, ox + sw, 0, side - (ox + sw), side);
  ctx.drawImage(source, ox, oy, sw, sh);
  return { image: ctx.getImageData(0, 0, side, side), crop: { ox, oy, sw, sh } };
}
export {
  drawModelInput,
  segmentSquare
};
