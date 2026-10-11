/**
 * Détecteur algorithmique de couleur dominante locale par analyse de pixels (Canvas 2D).
 * 100% déterministe, instantané (<15ms), sans appel réseau ni modèle externe.
 */

const COLOR_MAP = [
  { name: 'Noir', test: (r, g, b, max, min, spread) => max < 45 },
  { name: 'Blanc', test: (r, g, b, max, min, spread) => min > 220 || (max > 200 && spread < 18) },
  { name: 'Gris', test: (r, g, b, max, min, spread) => spread < 20 && max <= 200 && max >= 70 },
  { name: 'Argent', test: (r, g, b, max, min, spread) => spread < 22 && max > 165 && max <= 215 },
  { name: 'Marine', test: (r, g, b, max, min, spread) => b > r * 1.15 && b > g && max < 140 },
  { name: 'Bleu Ciel', test: (r, g, b, max, min, spread) => b > r * 1.1 && b > g * 1.05 && max >= 140 },
  { name: 'Bordeaux', test: (r, g, b, max, min, spread) => r > 110 && r > g * 1.4 && r > b * 1.3 && max < 170 },
  { name: 'Rouge', test: (r, g, b, max, min, spread) => r > 160 && r > g * 1.35 && r > b * 1.3 },
  { name: 'Rose Poudré', test: (r, g, b, max, min, spread) => r > 175 && g > 130 && b > 145 && r - g < 80 },
  { name: 'Rose', test: (r, g, b, max, min, spread) => r > 175 && g > 90 && b > 105 && r > g * 1.1 },
  { name: 'Vert Sapin', test: (r, g, b, max, min, spread) => g > r * 1.15 && g > b && max < 155 },
  { name: 'Kaki', test: (r, g, b, max, min, spread) => g > b && r > b && Math.abs(r - g) < 40 && max < 165 },
  { name: 'Moutarde', test: (r, g, b, max, min, spread) => r > 160 && g > 130 && b < 105 && Math.abs(r - g) < 40 },
  { name: 'Jaune', test: (r, g, b, max, min, spread) => r > 185 && g > 165 && b < 110 },
  { name: 'Orange', test: (r, g, b, max, min, spread) => r > 175 && g > 90 && b < 90 && r - g > 50 },
  { name: 'Terracotta', test: (r, g, b, max, min, spread) => r > 130 && g > 65 && b < 85 && r - b > 45 },
  { name: 'Marron', test: (r, g, b, max, min, spread) => r > 100 && g > 60 && b < 65 && r - b > 35 && max < 150 },
  { name: 'Camel', test: (r, g, b, max, min, spread) => r > 165 && g > 120 && b < 110 && r > g },
  { name: 'Beige', test: (r, g, b, max, min, spread) => min > 160 && max < 235 && spread < 45 && r >= g && g >= b },
  { name: 'Violet', test: (r, g, b, max, min, spread) => b > g * 1.2 && r > g * 1.1 && max < 160 },
  { name: 'Lilas', test: (r, g, b, max, min, spread) => b > g * 1.1 && r > g * 1.05 && max >= 160 }
];

export const mapRGBToColorName = (r, g, b) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const spread = max - min;

  for (const rule of COLOR_MAP) {
    if (rule.test(r, g, b, max, min, spread)) {
      return rule.name;
    }
  }

  // Repli intelligent
  if (r > g && r > b) return 'Terracotta';
  if (b > r && b > g) return 'Marine';
  if (g > r && g > b) return 'Kaki';
  return 'Gris';
};

/**
 * Extrait la couleur dominante d'un fichier image via un Canvas HTML5.
 * Échantillonne la zone centrale de l'image (où se situe le vêtement photographié).
 */
export const detectDominantColor = async (imageFile) => {
  let objectUrl = null;
  try {
    objectUrl = URL.createObjectURL(imageFile);
    const img = new Image();
    img.src = objectUrl;

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Image illisible'));
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = 64;
    canvas.width = size;
    canvas.height = size;
    ctx.drawImage(img, 0, 0, size, size);

    // Échantillonne 9 points au centre pour une détection plus robuste qu'un seul pixel
    const centerOffsets = [-4, 0, 4];
    let totalR = 0, totalG = 0, totalB = 0, count = 0;

    for (const dx of centerOffsets) {
      for (const dy of centerOffsets) {
        const x = Math.floor(size / 2) + dx;
        const y = Math.floor(size / 2) + dy;
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        totalR += pixel[0];
        totalG += pixel[1];
        totalB += pixel[2];
        count += 1;
      }
    }

    const avgR = Math.round(totalR / count);
    const avgG = Math.round(totalG / count);
    const avgB = Math.round(totalB / count);

    return mapRGBToColorName(avgR, avgG, avgB);
  } catch (error) {
    console.warn('Détection couleur échouée, repli vers Blanc:', error);
    return 'Blanc';
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
};
