import { removeBackground as imglyRemoveBackground } from '@imgly/background-removal';

/**
 * Service de détourage IA professionnel On-Device (0€ de coût, embarqué dans l'APK).
 * Utilise le modèle IA de segmentation de sujet (@imgly/background-removal)
 * servi directement depuis les assets locaux (`public/imgly-data/`).
 * 
 * Avantages :
 * - Fonctionne hors-ligne sans aucun téléchargement au premier démarrage.
 * - Reconnaît la doudoune, le t-shirt ou le pantalon même si le tissu est blanc sur fond blanc.
 * - Aucun crash natif : tourne dans un Web Worker WebAssembly sécurisé.
 */

/**
 * Rogne la transparence superflue autour de la pièce détourée
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

        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const alpha = data[(y * width + x) * 4 + 3];
            if (alpha > 20) {
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

        const padding = Math.round(Math.max(width, height) * 0.03);
        const cropX = Math.max(0, minX - padding);
        const cropY = Math.max(0, minY - padding);
        const cropW = Math.min(width - cropX, (maxX - minX) + padding * 2);
        const cropH = Math.min(height - cropY, (maxY - minY) + padding * 2);

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
        console.warn('Erreur rognage Canvas:', e);
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
 * Redimensionne préventivement l'image si elle dépasse 1200px pour accélérer l'inférence IA
 */
const prepareImageForAI = async (file, maxDim = 1200) => {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;

    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;

      if (w <= maxDim && h <= maxDim) {
        return resolve(file);
      }

      const ratio = Math.min(maxDim / w, maxDim / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob((blob) => {
        if (blob) {
          const resized = new File([blob], file.name || 'clothing.jpg', { type: 'image/jpeg' });
          resolve(resized);
        } else {
          resolve(file);
        }
      }, 'image/jpeg', 0.88);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
  });
};

/**
 * Supprime l'arrière-plan avec le modèle IA embarqué localement
 */
export const removeBackground = async (file) => {
  try {
    const optimizedFile = await prepareImageForAI(file, 1200);

    // Détermination de l'URL publique locale des assets IA
    const origin = typeof window !== 'undefined' && window.location ? window.location.origin : '';
    const publicPath = `${origin}/imgly-data/`;

    const config = {
      publicPath,
      model: 'small', // Modèle IA optimisé pour mobile
      output: {
        format: 'image/webp',
        quality: 0.9
      }
    };

    const resultBlob = await imglyRemoveBackground(optimizedFile, config);

    // Rognage automatique de l'espace vide autour de la silhouette
    const trimmedBlob = await trimAndScaleTransparentImage(resultBlob, 1024);

    const baseName = (file.name || 'clothing').replace(/\.[^/.]+$/, "");
    const processedFile = new File([trimmedBlob], `${baseName}_cutout.webp`, { type: 'image/webp' });

    return {
      file: processedFile,
      removed: true
    };
  } catch (err) {
    console.warn("Échec détourage IA, repli photo d'origine:", err);
    return {
      file,
      removed: false,
      reason: err?.message || 'error'
    };
  }
};
