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
  if (max < 42) return 'Noir';
  if (min > 225) return 'Blanc';
  if (max - min < 22) return max > 190 ? 'Gris' : 'Gris';

  if (r > 150 && g > 75 && b < 100 && r - b > 55) {
    if (g > 105) return 'Orange';
    return r > 205 ? 'Rouge' : 'Bordeaux';
  }
  if (r > 170 && g > 125 && b < 110) return r - g < 45 ? 'Moutarde' : 'Camel';
  if (r > 185 && g > 165 && b > 130 && Math.abs(r - g) < 45) return 'Beige';
  if (r > 170 && b > 115 && g < 150) return r - g > 55 ? 'Rose' : 'Violet';
  if (r > 125 && b > 125 && g < 130) return 'Lilas';
  if (g > r * 1.12 && g > b * 0.9) return g > 140 ? 'Vert Sapin' : 'Kaki';
  if (b > r * 1.15 && b > g * 1.04) return b > 155 ? 'Bleu Ciel' : 'Marine';
  if (r > 125 && g > 90 && b < 100) return 'Marron';
  return 'Gris';
};

const getSeasonFromType = (type) => {
  if (['T-shirt', 'Short', 'Robe', 'Jupe', 'Sandales'].includes(type)) return 'Été';
  if (['Manteau', 'Pull', 'Bonnet', 'Bottes'].includes(type)) return 'Hiver';
  if (['Pantalon', 'Jean', 'Veste', 'Baskets', 'Chemise'].includes(type)) return 'Printemps';
  return 'Toutes saisons';
};
