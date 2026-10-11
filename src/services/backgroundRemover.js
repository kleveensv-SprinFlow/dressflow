/**
 * Détourage vêtement, 100 % dans le téléphone.
 *
 * SegFormer (vêtements) retire le fond, le visage, les cheveux et la peau.
 * Les pixels du tissu d’origine sont conservés, sur un fond transparent.
 * Si le modèle n’est pas encore téléchargé ou qu’aucun vêtement n’est vu,
 * la photo d’origine est gardée : l’ajout n’est jamais bloqué.
 */
import { drawModelInput, segmentSquare } from './cutout/segment-client.js'
import { buildCutout } from './cutout/refine.js'
import { detectMotif, motifName } from './cutout/facts.js'

const WORK_MAX = 960

const LABEL_PIECE = {
  'Upper-clothes': { main_category: 'Haut', type: '' },
  Dress: { main_category: 'Haut', type: 'Robe' },
  Skirt: { main_category: 'Bas', type: 'Jupe' },
  Pants: { main_category: 'Bas', type: 'Pantalon' },
  'Left-shoe': { main_category: 'Chaussures', type: 'Baskets' },
  'Right-shoe': { main_category: 'Chaussures', type: 'Baskets' },
  Hat: { main_category: 'Chapeau', type: 'Casquette' },
  Bag: { main_category: 'Accessoires', type: 'Sac' }
}

function suggestPiece(labels, classIds) {
  const counts = new Map()
  for (let i = 0; i < classIds.length; i++) {
    const label = labels[classIds[i]]
    if (!LABEL_PIECE[label]) continue
    counts.set(label, (counts.get(label) || 0) + 1)
  }
  let bestLabel = null
  let bestN = 0
  for (const [label, n] of counts) {
    if (n > bestN) {
      bestN = n
      bestLabel = label
    }
  }
  return bestLabel ? LABEL_PIECE[bestLabel] : { main_category: 'Haut', type: '' }
}

function fileToImage(file) {
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.src = url
  return new Promise((resolve, reject) => {
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Image illisible'))
    }
  })
}

async function cutoutLocally(file) {
  const img = await fileToImage(file)
  const width = img.naturalWidth || img.width
  const height = img.naturalHeight || img.height
  const scale = Math.min(1, WORK_MAX / Math.max(width, height))
  const workW = Math.max(1, Math.round(width * scale))
  const workH = Math.max(1, Math.round(height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = workW
  canvas.height = workH
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0, workW, workH)
  const photo = ctx.getImageData(0, 0, workW, workH)
  const model = drawModelInput(img, width, height)
  const seg = await segmentSquare(model.image, model.crop, () => {})
  const cut = buildCutout({
    labels: seg.labels,
    classIds: seg.classIds,
    maskW: seg.width,
    maskH: seg.height,
    photo: photo.data,
    workW,
    workH,
    group: 'tout',
    contract: 1,
    softness: 2
  })
  if (cut.coverage < 0.012) throw new Error('Aucun vêtement détecté')
  ctx.putImageData(new ImageData(cut.rgba, workW, workH), 0, 0)
  const blob = await new Promise((resolve) => canvas.toBlob((value) => resolve(value), 'image/webp', 0.92))
  if (!blob) throw new Error('Export impossible')
  const piece = suggestPiece(seg.labels, seg.classIds)
  return {
    blob,
    main_category: piece.main_category,
    type: piece.type,
    pattern: motifName(detectMotif(cut.rgba, workW, workH))
  }
}

/**
 * Rogne la transparence inutile autour du vêtement détouré
 * et redimensionne à maxDimension (par défaut 1024px)
 */
export const trimAndScaleTransparentImage = async (imageBlob, maxDimension = 1024) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(imageBlob);
    img.src = url;

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0);

      try {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        let minX = width, minY = height, maxX = 0, maxY = 0;
        let hasVisiblePixel = false;

        // Détection de la bounding box des pixels non transparents
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const alpha = data[(y * width + x) * 4 + 3];
            if (alpha > 20) { // Seuil d'opacité
              hasVisiblePixel = true;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        if (!hasVisiblePixel) {
          return resolve(imageBlob);
        }

        // Ajouter une marge de 3%
        const padding = Math.round(Math.max(width, height) * 0.03);
        const cropX = Math.max(0, minX - padding);
        const cropY = Math.max(0, minY - padding);
        const cropW = Math.min(width - cropX, (maxX - minX) + padding * 2);
        const cropH = Math.min(height - cropY, (maxY - minY) + padding * 2);

        // Calcul du redimensionnement (maxDimension)
        let finalW = cropW;
        let finalH = cropH;
        if (finalW > maxDimension || finalH > maxDimension) {
          const ratio = Math.min(maxDimension / finalW, maxDimension / finalH);
          finalW = Math.round(finalW * ratio);
          finalH = Math.round(finalH * ratio);
        }

        const outCanvas = document.createElement('canvas');
        outCanvas.width = finalW;
        outCanvas.height = finalH;
        const outCtx = outCanvas.getContext('2d');

        outCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, finalW, finalH);

        outCanvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else resolve(imageBlob);
        }, 'image/webp', 0.9);
      } catch (e) {
        console.warn('Erreur rognage Canvas, repli vers blob brut:', e);
        resolve(imageBlob);
      }
    };

    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
  });
};

/**
 * Garde uniquement le tissu, sur un fond transparent.
 * Le visage, la peau et le décor sont retirés. Les pixels du vêtement ne sont pas redessinés.
 */
export const removeBackground = async (file) => {
  try {
    const local = await cutoutLocally(file)
    const trimmedBlob = await trimAndScaleTransparentImage(local.blob, 1024)
    const baseName = (file.name || 'clothing').replace(/\.[^/.]+$/, '')
    const processedFile = new File([trimmedBlob], `${baseName}_cutout.webp`, { type: 'image/webp' })
    return {
      file: processedFile,
      removed: true,
      main_category: local.main_category,
      type: local.type,
      pattern: local.pattern
    }
  } catch (error) {
    console.warn("Détourage local indisponible, conservation de l'original:", error)
    return {
      file,
      removed: false,
      reason: error?.message || 'error'
    }
  }
}
