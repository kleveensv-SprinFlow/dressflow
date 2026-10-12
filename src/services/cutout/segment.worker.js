import { AutoModel, AutoProcessor, env, pipeline, RawImage } from "@huggingface/transformers";
env.allowLocalModels = false;
if (env.backends?.onnx?.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
  env.backends.onnx.wasm.proxy = false;
}
let segmenterPromise = null;
let matterPromise = null;
const MATTE_ID = "onnx-community/BiRefNet_lite-ONNX";
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
function getMatter(dtype) {
  if (!matterPromise) {
    const progress_callback = (update) => {
      postProgress(update.status ?? "download", update.progress);
    };
    matterPromise = Promise.all([
      AutoModel.from_pretrained(MATTE_ID, { dtype, device: "wasm", progress_callback }),
      AutoProcessor.from_pretrained(MATTE_ID, { progress_callback })
    ]).then(([model, processor]) => ({ model, processor, dtype })).catch((error) => {
      matterPromise = null;
      throw error;
    });
  }
  return matterPromise;
}
function toRgb(image) {
  if (image.channels === 3) return image;
  const rgb = new Uint8ClampedArray(image.width * image.height * 3);
  const src = image.data;
  for (let i = 0, j = 0; i < src.length; i += 4, j += 3) {
    rgb[j] = src[i];
    rgb[j + 1] = src[i + 1];
    rgb[j + 2] = src[i + 2];
  }
  return new RawImage(rgb, image.width, image.height, 3);
}
function maskFromOutput(tensor, width, height) {
  let plane = tensor;
  if (plane.dims.length === 4) plane = plane[0][0];
  else if (plane.dims.length === 3) plane = plane[0];
  const soft = plane.sigmoid();
  const h = soft.dims[soft.dims.length - 2];
  const w = soft.dims[soft.dims.length - 1];
  const src = soft.data;
  const out = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const sy = Math.min(h - 1, Math.floor(y * h / height));
    for (let x = 0; x < width; x++) {
      const sx = Math.min(w - 1, Math.floor(x * w / width));
      out[y * width + x] = Math.max(0, Math.min(255, Math.round(src[sy * w + sx] * 255)));
    }
  }
  return { data: out, width, height };
}
async function inferMatte(image) {
  const rgb = toRgb(image);
  const run = async (current) => {
    const { pixel_values } = await current.processor(rgb);
    const out = await current.model({ input_image: pixel_values });
    return maskFromOutput(out.output_image, image.width, image.height);
  };
  try {
    return await run(await getMatter("fp16"));
  } catch (fp16Error) {
    console.warn("BiRefNet fp16 indisponible, repli fp32:", fp16Error);
    matterPromise = null;
    return run(await getMatter("fp32"));
  }
}
function cropGray(mask, sideW, sideH, ox, oy, sw, sh) {
  const cropped = new Uint8Array(sw * sh);
  const data = mask.data;
  for (let y = 0; y < sh; y++) {
    const my = Math.min(sideH - 1, Math.max(0, oy + y));
    for (let x = 0; x < sw; x++) {
      const mx = Math.min(sideW - 1, Math.max(0, ox + x));
      cropped[y * sw + x] = data[my * sideW + mx];
    }
  }
  return cropped;
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
    const pixels = new Uint8ClampedArray(message.buffer);
    const image = new RawImage(pixels, message.width, message.height, 4);
    let matte = null;
    try {
      postProgress("segment");
      const mask = await inferMatte(image);
      matte = cropGray(mask, message.width, message.height, message.ox, message.oy, message.sw, message.sh);
    } catch (matteError) {
      console.warn("BiRefNet a \xE9chou\xE9:", matteError);
      matte = null;
    }
    postProgress("segment");
    let mapped;
    try {
      const segmenter = await getSegmenter();
      const output = await segmenter(image);
      mapped = classMap(
        output,
        message.width,
        message.height,
        message.ox,
        message.oy,
        message.sw,
        message.sh
      );
    } catch (segError) {
      console.warn("SegFormer a \xE9chou\xE9:", segError);
      if (!matte) throw segError;
      mapped = { classIds: new Uint8Array(message.sw * message.sh), labels: ["Background"] };
    }
    const buffer = mapped.classIds.buffer.slice(0);
    const matteBuffer = matte ? matte.buffer.slice(0) : null;
    const transfer = matteBuffer ? [buffer, matteBuffer] : [buffer];
    scope.postMessage(
      {
        type: "result",
        id: message.id,
        buffer,
        matte: matteBuffer,
        width: message.sw,
        height: message.sh,
        labels: mapped.labels
      },
      transfer
    );
  } catch (error) {
    const text = error instanceof Error ? error.message : "D\xE9coupe impossible";
    scope.postMessage({ type: "error", id: message.id, message: text });
  }
};
