import * as tf from '@tensorflow/tfjs'
import * as mobilenet from '@tensorflow-models/mobilenet'

let model = null

// Chargement du modèle (une seule fois pour économiser la RAM)
const loadModel = async () => {
  if (model) return model
  await tf.ready()
  model = await mobilenet.load({
    version: 2,
    alpha: 0.5 // Modèle allégé pour mobile
  })
  return model
}

export const analyzeClothing = async (imageFile) => {
  let objectUrl = null;
  try {
    const net = await loadModel();
    objectUrl = URL.createObjectURL(imageFile);
    const imgElement = new Image();
    imgElement.src = objectUrl;
    await new Promise((resolve, reject) => {
      imgElement.onload = resolve;
      imgElement.onerror = () => reject(new Error("Impossible de lire cette image."));
    });

    const predictions = await net.classify(imgElement);
    const predictedType = mapPredictionToType((predictions[0]?.className || '').toLowerCase());
    const color = await detectDominantColor(imgElement);
    const type = predictedType || null;

    return {
      type,
      color,
      season: type ? getSeasonFromType(type) : 'Toutes saisons',
      activity: 'Quotidien',
      confidence: predictions[0]?.probability ?? null
    };
  } catch (error) {
    console.error("Erreur IA locale:", error);
    throw new Error("L’analyse automatique a échoué. Tu peux toujours saisir les détails manuellement.");
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
};

// Mappage des résultats MobileNet vers nos catégories
const mapPredictionToType = (pred) => {
  if (pred.includes('t-shirt') || pred.includes('jersey') || pred.includes('tee shirt')) return 'T-shirt';
  if (pred.includes('jean') || pred.includes('denim')) return 'Jean';
  if (pred.includes('trouser') || pred.includes('pants') || pred.includes('pant')) return 'Pantalon';
  if (pred.includes('suit') || pred.includes('coat') || pred.includes('jacket') || pred.includes('blazer')) return 'Veste';
  if (pred.includes('dress') || pred.includes('gown')) return 'Robe';
  if (pred.includes('shoe') || pred.includes('sneaker') || pred.includes('trainer')) return 'Baskets';
  if (pred.includes('sandal')) return 'Sandales';
  if (pred.includes('cardigan') || pred.includes('sweater') || pred.includes('pullover')) return 'Pull';
  if (pred.includes('short')) return 'Short';
  if (pred.includes('skirt')) return 'Jupe';
  if (pred.includes('shirt')) return 'Chemise';
  if (pred.includes('blouse')) return 'Top / Blouse';
  if (pred.includes('hat') || pred.includes('cap')) return 'Casquette';
  if (pred.includes('bag') || pred.includes('purse') || pred.includes('backpack')) return 'Sac';
  return null;
};

// Détection de couleur simplifiée (Analyse de la zone centrale de l'image)
const detectDominantColor = async (img) => {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = 100
  canvas.height = 100
  ctx.drawImage(img, 0, 0, 100, 100)
  
  // On récupère le pixel au centre (souvent la couleur du vêtement)
  const pixel = ctx.getImageData(50, 50, 1, 1).data
  const r = pixel[0], g = pixel[1], b = pixel[2]
  
  return mapRGBToColorName(r, g, b)
}

const mapRGBToColorName = (r, g, b) => {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const spread = max - min;

  // These are coarse suggestions: lighting, shadows and patterned fabric can skew them.
  if (max < 42) return 'Noir';
  if (min > 225) return 'Blanc';
  if (spread < 18) {
    if (max > 205) return 'Blanc';
    if (max < 75) return 'Noir';
    return max > 160 ? 'Argent' : 'Gris';
  }

  if (r > 135 && r > g * 1.35 && r > b * 1.3) {
    if (g > 90 && r - g < 95) return 'Orange';
    if (r > 205 && g < 70 && b < 80) return 'Rouge';
    return r > 175 && g > 65 ? 'Bordeaux' : 'Rouge';
  }
  if (r > 180 && g > 125 && b > 145 && r - g < 85) return 'Rose Poudré';
  if (r > 180 && g > 90 && b > 105 && r > g * 1.05) return 'Rose';
  if (r > 175 && g > 145 && b > 85 && b < 155) {
    if (Math.abs(r - g) < 25 && b < 125) return 'Moutarde';
    return 'Camel';
  }
  if (r > 185 && g > 165 && b < 105) return 'Jaune';
  if (r > 125 && g > 80 && b < 85 && r - b > 40) return 'Marron';
  if (r > 120 && g > 65 && b < 80 && r - b > 35) return 'Terracotta';
  if (r > 100 && b > 115 && g < 155) {
    if (b > r * 1.1 && b > g * 1.1) return g > 75 ? 'Lilas' : 'Violet';
    return 'Bordeaux';
  }
  if (g > r * 1.12 && g > b * 0.9) return g > 145 && r < 115 ? 'Vert Sapin' : 'Kaki';
  if (b > r * 1.15 && b > g * 1.02) return b > 165 && r < 125 ? 'Bleu Ciel' : 'Marine';
  if (r > 155 && g > 125 && b > 50 && r - b > 60) return 'Or';
  return 'Gris';
};
