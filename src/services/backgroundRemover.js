import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { SubjectSegmentation } from '@capacitor-mlkit/subject-segmentation';

/**
 * Convertit un File/Blob en base64
 */
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

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
          // Si rien de visible détecté, retourner l'image telle quelle
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
 * Redimensionne un File image côté Web pour limiter l'empreinte mémoire
 * avant tout transfert ou traitement natif (évite les OutOfMemory sur photos 48MP)
 */
const prepareResizedImageBase64 = async (file, maxDim = 1024) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.src = url;

    img.onload = () => {
      URL.revokeObjectURL(url);
      let w = img.naturalWidth || img.width;
      let h = img.naturalHeight || img.height;

      if (w > maxDim || h > maxDim) {
        const ratio = Math.min(maxDim / w, maxDim / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);

      // Export JPEG qualité 0.85
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const base64 = dataUrl.split(',')[1];
      resolve({ base64, width: w, height: h });
    };

    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
  });
};

/**
 * Supprime l'arrière-plan d'une photo de vêtement via Google ML Kit On-Device.
 * Si le détourage échoue ou si non supporté (navigateur), renvoie proprement le fichier original.
 */
export const removeBackground = async (file) => {
  if (!Capacitor.isNativePlatform()) {
    return { file, removed: false, reason: 'web-fallback' };
  }

  let tempInputPath = null;
  let tempFileName = null;
  try {
    // 1. Vérifier si le module ML Kit est disponible ou à installer
    try {
      const { available } = await SubjectSegmentation.isGoogleSubjectSegmentationModuleAvailable();
      if (!available) {
        await SubjectSegmentation.installGoogleSubjectSegmentationModule();
      }
    } catch (modErr) {
      console.warn("Module Google ML Kit check/install warning:", modErr);
    }

    // 2. Redimensionner l'image AVANT de l'écrire pour éviter le crash mémoire (OOM)
    // Les photos d'appareil font souvent 12-48 mégapixels ce qui fait exploser la RAM Java
    const { base64, width: scaledW, height: scaledH } = await prepareResizedImageBase64(file, 1024);

    tempFileName = `raw_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;

    const savedFile = await Filesystem.writeFile({
      path: tempFileName,
      data: base64,
      directory: Directory.Cache
    });

    tempInputPath = savedFile.uri;

    // 3. Exécuter la segmentation de sujet via ML Kit avec dimensions maîtrisées
    const result = await SubjectSegmentation.processImage({
      path: tempInputPath,
      width: scaledW,
      height: scaledH,
      confidence: 0.55
    });

    if (!result?.path) {
      throw new Error("Aucun résultat de segmentation retourné");
    }

    // 4. Lire le fichier détouré généré par ML Kit
    const response = await fetch(Capacitor.convertFileSrc(result.path));
    const segmentedBlob = await response.blob();

    // 5. Rogner et compresser en WebP léger
    const trimmedBlob = await trimAndScaleTransparentImage(segmentedBlob, 1024);

    const baseName = (file.name || 'clothing').replace(/\.[^/.]+$/, "");
    const processedFile = new File([trimmedBlob], `${baseName}_cutout.webp`, { type: 'image/webp' });

    // Nettoyage asynchrone du fichier source temporaire
    Filesystem.deleteFile({ path: tempFileName, directory: Directory.Cache }).catch(() => {});

    return {
      file: processedFile,
      removed: true
    };
  } catch (error) {
    console.warn("Échec du détourage ML Kit, conservation de l'original:", error);
    if (tempFileName) {
      Filesystem.deleteFile({ path: tempFileName, directory: Directory.Cache }).catch(() => {});
    }
    return {
      file,
      removed: false,
      reason: error?.message || 'error'
    };
  }
};
