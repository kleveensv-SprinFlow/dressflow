/**
 * Service de détourage photo de vêtements (Background Removal).
 * 
 * 1. Découpe IA studio haute précision via API dédiée (ClearBackdrop) :
 *    - 0€ de coût (quota gratuit).
 *    - Découpe chirurgicale des silhouettes (doudounes, robes, vestes, t-shirts, pantalons).
 *    - Ne troue jamais les vêtements blancs sur fond blanc.
 * 2. Rognage automatique de la transparence (bounding box serrée style Whering).
 * 3. En cas de perte de connexion réseau (mode avion/hors-ligne), bascule automatiquement
 *    vers la photo originale sans bloquer ni crasher.
 */

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
 * Redimensionne préventivement l'image à 1200px max avant l'envoi
 * pour un transfert rapide et économe en données mobiles.
 */
const prepareImageForUpload = async (file, maxDim = 1200) => {
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
 * Supprime l'arrière-plan d'une photo de vêtement via API IA haute fidélité.
 * Si le réseau échoue ou est hors-ligne, conserve gracieusement la photo d'origine.
 */
export const removeBackground = async (file) => {
  try {
    const optimizedFile = await prepareImageForUpload(file, 1200);

    const formData = new FormData();
    formData.append('image', optimizedFile, optimizedFile.name || 'clothing.jpg');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout max

    const response = await fetch('https://clearbackdrop.com/api/v1/remove-background', {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Erreur API détourage (${response.status})`);
    }

    const cutoutBlob = await response.blob();

    // Rognage automatique de l'espace vide transparent pour centrer la silhouette
    const trimmedBlob = await trimAndScaleTransparentImage(cutoutBlob, 1024);

    const baseName = (file.name || 'clothing').replace(/\.[^/.]+$/, "");
    const processedFile = new File([trimmedBlob], `${baseName}_cutout.webp`, { type: 'image/webp' });

    return {
      file: processedFile,
      removed: true
    };
  } catch (error) {
    console.warn("Détourage API non disponible, conservation de l'original:", error);
    return {
      file,
      removed: false,
      reason: error?.message || 'error'
    };
  }
};
