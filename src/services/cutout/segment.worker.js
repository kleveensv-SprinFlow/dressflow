import { env, pipeline, RawImage } from "@huggingface/transformers";
env.allowLocalModels = false;
if (env.backends?.onnx?.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
  env.backends.onnx.wasm.proxy = false;
}
let segmenterPromise = null;
const scope = self;
function postProgress(status, progress) {
  scope.postMessage({ type: "progress", status, progress });
}
function getSegmenter() {
  if (!segmenterPromise) {
    segmenterPromise = pipeline("image-segmentation", "Xenova/segformer_b2_clothes", {
      dtype: "q8",
      device: "wasm",
      progress_callback: (update) => {
        postProgress(update.status ?? "download", update.progress);
      }
    }).catch((error) => {
      segmenterPromise = null;
      throw error;
    });
  }
  return segmenterPromise;
}
function classMap(items, sideW, sideH, ox, oy, sw, sh) {
  const labels = ["Background"];
  const index = /* @__PURE__ */ new Map([["Background", 0]]);
  const sample = items[0]?.mask;
  const mw = sample?.width ?? sideW;
  const mh = sample?.height ?? sideH;
  const full = new Uint8Array(mw * mh);
  for (const item of items) {
    const name = item.label ?? "Unknown";
    if (name === "Background") continue;
    let id = index.get(name);
    if (id === void 0) {
      id = labels.length;
      labels.push(name);
      index.set(name, id);
    }
    const { data, width, height } = item.mask;
    const n = Math.min(data.length, width * height, full.length);
    for (let i = 0; i < n; i++) {
      if (data[i] > 127) full[i] = id;
    }
  }
  const cropped = new Uint8Array(sw * sh);
  for (let y = 0; y < sh; y++) {
    const my = Math.min(mh - 1, Math.max(0, Math.floor((oy + y) * mh / sideH)));
    for (let x = 0; x < sw; x++) {
      const mx = Math.min(mw - 1, Math.max(0, Math.floor((ox + x) * mw / sideW)));
      cropped[y * sw + x] = full[my * mw + mx];
    }
  }
  return { classIds: cropped, labels };
}
scope.onmessage = async (event) => {
  const message = event.data;
  try {
    postProgress("segment");
    const segmenter = await getSegmenter();
    const pixels = new Uint8ClampedArray(message.buffer);
    const image = new RawImage(pixels, message.width, message.height, 4);
    postProgress("segment");
    const output = await segmenter(image);
    const mapped = classMap(
      output,
      message.width,
      message.height,
      message.ox,
      message.oy,
      message.sw,
      message.sh
    );
    const buffer = mapped.classIds.buffer.slice(0);
    scope.postMessage(
      {
        type: "result",
        id: message.id,
        buffer,
        width: message.sw,
        height: message.sh,
        labels: mapped.labels
      },
      [buffer]
    );
  } catch (error) {
    const text = error instanceof Error ? error.message : "D\xE9coupe impossible";
    scope.postMessage({ type: "error", id: message.id, message: text });
  }
};
