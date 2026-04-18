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
  try {
    const net = await loadModel()
    
    // Créer un élément Image pour l'analyse
    const imgElement = document.createElement('img')
    imgElement.src = URL.createObjectURL(imageFile)
    
    await new Promise((resolve) => {
      imgElement.onload = resolve
    })

    // 1. Classification du type de vêtement (IA Locale)
    const predictions = await net.classify(imgElement)
    const topResult = predictions[0].className.toLowerCase()
    
    const type = mapPredictionToType(topResult)
    
    // 2. Détection de la couleur (Analyse de pixels locale)
    const color = await detectDominantColor(imgElement)
    
    // 3. Déduction logique (Saison/Activité)
    const season = getSeasonFromType(type)
    const activity = 'Quotidien'

    return {
      type,
      color,
      season,
      activity
    }
  } catch (error) {
    console.error("Erreur IA locale:", error)
    return {
      type: 'Haut',
      color: 'Noir',
      season: 'Toutes saisons',
      activity: 'Quotidien'
    }
  }
}

// Mappage des résultats MobileNet vers nos catégories
const mapPredictionToType = (pred) => {
  if (pred.includes('t-shirt') || pred.includes('jersey')) return 'T-shirt'
  if (pred.includes('jean') || pred.includes('denim')) return 'Jean'
  if (pred.includes('suit') || pred.includes('coat') || pred.includes('jacket')) return 'Veste'
  if (pred.includes('dress') || pred.includes('gown')) return 'Robe'
  if (pred.includes('shoe') || pred.includes('sneaker') || pred.includes('sandal')) return 'Basket'
  if (pred.includes('cardigan') || pred.includes('sweater')) return 'Pull'
  if (pred.includes('short')) return 'Short'
  if (pred.includes('skirt')) return 'Jupe'
  if (pred.includes('hat') || pred.includes('cap')) return 'Casquette'
  if (pred.includes('bag') || pred.includes('purse')) return 'Sac'
  return 'Haut' // Par défaut
}

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
  if (r > 220 && g > 220 && b > 220) return 'Blanc'
  if (r < 50 && g < 50 && b < 50) return 'Noir'
  if (r > 150 && g < 100 && b < 100) return 'Bordeaux'
  if (r > 200 && g > 150 && b < 150) return 'Rose'
  if (r < 100 && g > 150 && b < 100) return 'Kaki'
  if (r < 100 && g < 100 && b > 150) return 'Marine'
  if (Math.abs(r - g) < 20 && Math.abs(g - b) < 20) return 'Gris'
  return 'Couleur'
}

const getSeasonFromType = (type) => {
  if (['T-shirt', 'Short', 'Robe', 'Jupe', 'Sandales'].includes(type)) return 'Été'
  if (['Manteau', 'Parka', 'Pull', 'Bonnet', 'Bottes'].includes(type)) return 'Hiver'
  return 'Printemps'
}

// On garde l'autre fonction pour la compatibilité mais on peut la simplifier
export const generateOutfit = async (items, weather) => {
  // On utilise une logique interne simple pour rester gratuit
  const temp = weather.temp
  
  const tops = items.filter(i => ['T-shirt', 'Pull', 'Chemise', 'Hoodie', 'Robe'].includes(i.type))
  const bottoms = items.filter(i => ['Jean', 'Pantalon', 'Short', 'Jupe'].includes(i.type))
  const layers = items.filter(i => ['Veste', 'Manteau', 'Cardigan'].includes(i.type))
  
  const top = tops[Math.floor(Math.random() * tops.length)]
  const bottom = bottoms[Math.floor(Math.random() * bottoms.length)]
  const layer = temp < 18 ? layers[Math.floor(Math.random() * layers.length)] : null
  
  return {
    top_id: top?.id,
    bottom_id: bottom?.id,
    layer_id: layer?.id,
    explanation: `Il fait ${temp}°C. Voici une tenue adaptée à ton dressing !`
  }
}
