let worker = null;
let seq = 0;
const pending = /* @__PURE__ */ new Map();
let onProgress = null;
function ensureWorker() {
  if (worker) return worker;
  worker = new Worker(new URL("./segment.worker.js", import.meta.url), { type: "module" });
  worker.onmessage = (event) => {
    const data = event.data;
    if (data.type === "progress") {
      onProgress?.({ status: data.status, progress: data.progress });
      return;
    }
    const job = pending.get(data.id);
    if (!job) return;
    pending.delete(data.id);
    if (data.type === "error") {
      job.reject(new Error(data.message));
      return;
    }
    job.resolve({
      classIds: new Uint8Array(data.buffer),
      width: data.width,
      height: data.height,
      labels: data.labels
    });
  };
  worker.onerror = () => {
    const error = new Error("Le moteur de d\xE9coupe s\u2019est arr\xEAt\xE9. R\xE9essayez.");
    for (const job of pending.values()) job.reject(error);
    pending.clear();
    worker?.terminate();
    worker = null;
  };
  return worker;
}
function segmentSquare(image, crop, progress) {
  onProgress = progress;
  const id = ++seq;
  const copy = image.data.buffer.slice(0);
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ensureWorker().postMessage(
      {
        id,
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
const MODEL_SIDE = 640;
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
