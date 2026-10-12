import { AutoModel, AutoProcessor, env, pipeline, RawImage, SamModel } from "@huggingface/transformers";
import { exitPoints, lassoRegions, pickSamMask, samPrompts } from "./lasso.js";
env.allowLocalModels = false;
if (env.backends?.onnx?.wasm) {
  env.backends.onnx.wasm.numThreads = 1;
  env.backends.onnx.wasm.proxy = false;
}
let segmenterPromise = null;
let matterPromise = null;
let matterDtype = null;
let samPromise = null;
const MATTE_ID = "onnx-community/BiRefNet_lite-ONNX";
// SlimSAM : SAM allégé (~40 Mo), suit les points donnés par le tracé.
const SAM_ID = "Xenova/slimsam-77-uniform";
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
    matterDtype = dtype;
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
async function inferMatte(image, side, dtype) {
  const matter = await getMatter(dtype);
  const small = await toRgb(image).resize(side, side);
  const ip = matter.processor.image_processor;
  if (ip) {
    ip.size = { width: side, height: side };
    ip.do_resize = false;
  }
  const { pixel_values } = await matter.processor(small);
  const dims = pixel_values.dims;
  if (dims[dims.length - 1] !== side) throw new Error(`taille d'entr\xE9e ${dims.join("x")} au lieu de ${side}`);
  const out = await matter.model({ input_image: pixel_values });
  return maskFromOutput(out.output_image, image.width, image.height);
}
function getSam(dtype) {
  if (!samPromise) {
    const progress_callback = (update) => {
      postProgress(update.status ?? "download", update.progress);
    };
    samPromise = Promise.all([
      SamModel.from_pretrained(SAM_ID, { dtype, device: "wasm", progress_callback }),
      AutoProcessor.from_pretrained(SAM_ID, { progress_callback })
    ]).then(([model, processor]) => ({ model, processor })).catch((error) => {
      samPromise = null;
      throw error;
    });
  }
  return samPromise;
}
/**
 * SlimSAM guidé par le tracé (lasso en 0..1 de la zone utile ox/oy/sw/sh).
 * L'image est encodée une seule fois, puis le décodeur (rapide) tourne :
 * 1. avec les points du tracé ;
 * 2. si le masque sort du tracé (objet voisin collé à la pièce), avec des points « fond » posés sur cette sortie.
 */
async function samFromLasso(image, message) {
  const { ox, oy, sw, sh, lasso } = message;
  const sam = await getSam(message.dtype);
  const ip = sam.processor.image_processor ?? sam.processor;
  const rgb = toRgb(image);
  const base = await sam.processor(rgb);
  const embeddings = await sam.model.get_image_embeddings(base);
  const regions = lassoRegions(lasso, sw, sh);
  const toPx = (p) => [ox + p.x * sw, oy + p.y * sh];

  async function decode(points, labels) {
    const input_points = ip.reshape_input_points([[points.map(toPx)]], base.original_sizes, base.reshaped_input_sizes);
    const input_labels = ip.add_input_labels([[labels]], input_points);
    const out = await sam.model({ ...embeddings, input_points, input_labels });
    const [logits] = await ip.post_process_masks(out.pred_masks, base.original_sizes, base.reshaped_input_sizes, {
      binarize: false
    });
    const count = logits.dims[1];
    const W = image.width;
    const plane = W * image.height;
    const src = logits.data;
    const masks = [];
    for (let m = 0; m < count; m++) {
      // Seule la zone utile est gardée ; logit → probabilité adoucie pour le filtre guidé.
      const mask = new Uint8Array(sw * sh);
      const off = m * plane;
      for (let y = 0; y < sh; y++) {
        const row = off + (oy + y) * W + ox;
        for (let x = 0; x < sw; x++) mask[y * sw + x] = Math.round(255 / (1 + Math.exp(-src[row + x] * 0.5)));
      }
      masks.push(mask);
    }
    const scores = Array.from(out.iou_scores.data).slice(0, count);
    const best = pickSamMask(masks, scores, lasso, sw, sh, regions);
    return best ? { ...best, mask: masks[best.index] } : null;
  }

  const prompts = samPrompts(lasso, sw / sh);
  let best = await decode(prompts.points, prompts.labels);
  let passes = 1;
  if (best && best.exit > 0.01) {
    const extra = exitPoints(best.mask, regions, sw, sh, 3);
    if (extra.length) {
      const retry = await decode([...prompts.points, ...extra], [...prompts.labels, ...extra.map(() => 0)]);
      passes = 2;
      // On garde la seconde passe si elle sort nettement moins du tracé sans perdre la pièce.
      if (retry && retry.exit < best.exit * 0.6 && retry.fill >= best.fill * 0.5) best = retry;
    }
  }
  if (!best) return null;
  return { mask: best.mask, fill: best.fill, exit: best.exit, passes };
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
    if (message.kind === "sam") {
      postProgress("segment");
      const result = await samFromLasso(image, message);
      if (!result) {
        scope.postMessage({ type: "result", id: message.id, matte: null });
        return;
      }
      const buffer = result.mask.buffer;
      scope.postMessage(
        {
          type: "result",
          id: message.id,
          matte: buffer,
          width: message.sw,
          height: message.sh,
          fill: result.fill,
          exit: result.exit,
          passes: result.passes
        },
        [buffer]
      );
      return;
    }
    if (message.kind === "matte") {
      postProgress("segment");
      const mask = await inferMatte(image, message.side, message.dtype);
      const matte = cropGray(mask, message.width, message.height, message.ox, message.oy, message.sw, message.sh);
      const buffer = matte.buffer.slice(0);
      scope.postMessage(
        { type: "result", id: message.id, matte: buffer, width: message.sw, height: message.sh },
        [buffer]
      );
      return;
    }
    postProgress("segment");
    const segmenter = await getSegmenter();
    const output = await segmenter(image);
    const mapped = classMap(output, message.width, message.height, message.ox, message.oy, message.sw, message.sh);
    const buffer = mapped.classIds.buffer.slice(0);
    scope.postMessage(
      { type: "result", id: message.id, buffer, width: message.sw, height: message.sh, labels: mapped.labels },
      [buffer]
    );
  } catch (error) {
    const text = error instanceof Error ? error.message : "D\xE9coupe impossible";
    scope.postMessage({ type: "error", id: message.id, message: text });
  }
};
