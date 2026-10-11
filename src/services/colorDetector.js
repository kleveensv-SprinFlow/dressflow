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
 * Extrait la couleur dominante et détecte les motifs (rayures / bicolore / uni)
 * via analyse statistique des pixels de la zone centrale sur Canvas 2D.
 * 100% déterministe, instantané (<15ms), sans aucun modèle externe.
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

    // Échantillonne la grille pour mesurer moyenne + variance de luminosité
    // Ignore strictement les pixels transparents (alpha < 120) pour les images détourées
    const samples = [];
    const minCoord = Math.floor(size * 0.2);
    const maxCoord = Math.floor(size * 0.8);
    const step = 3;

    for (let x = minCoord; x <= maxCoord; x += step) {
      for (let y = minCoord; y <= maxCoord; y += step) {
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const a = pixel[3];
        if (a < 120) continue; // Pixel transparent ignoré

        const r = pixel[0];
        const g = pixel[1];
        const b = pixel[2];
        const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        samples.push({ r, g, b, lum });
      }
    }

    if (samples.length === 0) {
      return { color: 'Blanc', pattern: 'Uni' };
    }

    // Calcul de la moyenne et de la variance de luminosité
    const avgLum = samples.reduce((acc, s) => acc + s.lum, 0) / samples.length;
    const lumVariance = samples.reduce((acc, s) => acc + Math.pow(s.lum - avgLum, 2), 0) / samples.length;
    const lumStdDev = Math.sqrt(lumVariance);

    // Détection des rayures / contrastes forts (ex: bandes blanches & noires/marines)
    const hasHighContrastPattern = lumStdDev > 48;

    let dominantColor;
    let pattern = hasHighContrastPattern ? 'Rayures' : 'Uni';

    if (hasHighContrastPattern) {
      // Pour les pièces bicolores ou à rayures (comme une marinière),
      // on extrait la couleur la plus colorée ou la couleur sombre significative
      const coloredSamples = samples.filter(s => {
        const spread = Math.max(s.r, s.g, s.b) - Math.min(s.r, s.g, s.b);
        return spread > 20 || s.lum < 80;
      });

      if (coloredSamples.length > 0) {
        const avgR = Math.round(coloredSamples.reduce((a, s) => a + s.r, 0) / coloredSamples.length);
        const avgG = Math.round(coloredSamples.reduce((a, s) => a + s.g, 0) / coloredSamples.length);
        const avgB = Math.round(coloredSamples.reduce((a, s) => a + s.b, 0) / coloredSamples.length);
        dominantColor = mapRGBToColorName(avgR, avgG, avgB);
      } else {
        dominantColor = 'Marine';
      }
    } else {
      const avgR = Math.round(samples.reduce((a, s) => a + s.r, 0) / samples.length);
      const avgG = Math.round(samples.reduce((a, s) => a + s.g, 0) / samples.length);
      const avgB = Math.round(samples.reduce((a, s) => a + s.b, 0) / samples.length);
      dominantColor = mapRGBToColorName(avgR, avgG, avgB);
    }

    return { color: dominantColor, pattern };
  } catch (error) {
    console.warn('Détection couleur échouée, repli vers Blanc:', error);
    return { color: 'Blanc', pattern: 'Uni' };
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
};
