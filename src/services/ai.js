/**
 * AI Service for Dressflow
 * Handles clothing analysis and outfit generation using Google Gemini Vision API.
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

/**
 * Converts a Blob or File to a Base64 string for Gemini API
 */
const fileToGenerativePart = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = reader.result.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type
        }
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Analyzes a clothing image using Gemini AI
 */
export const analyzeClothing = async (file) => {
  if (!GEMINI_API_KEY) return { type: 'Haut', color: 'Inconnue', season: 'Toutes saisons', activity: 'Quotidien' };

  try {
    const imagePart = await fileToGenerativePart(file);
    const prompt = `Analyse ce vêtement et retourne UNIQUEMENT un JSON: {"type": "Haut/Bas/Robe/Veste/Chaussures/Accessoire", "color": "Couleur", "season": "Printemps/Été/Automne/Hiver/Toutes saisons", "activity": "Quotidien/Travail/Sport/Soirée/Détente"}`;

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }, imagePart] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    const data = await response.json();
    return JSON.parse(data.candidates[0].content.parts[0].text);
  } catch (err) {
    return { type: 'Haut', color: 'Inconnue', season: 'Toutes saisons', activity: 'Quotidien' };
  }
};

/**
 * Generates an outfit based on weather and available clothes
 */
export const generateOutfit = async (clothes, weather) => {
  if (!GEMINI_API_KEY) throw new Error("API Key missing");

  const clothesContext = clothes.map(c => ({
    id: c.id,
    type: c.type,
    color: c.color,
    season: c.season,
    activity: c.activity
  }));

  const prompt = `
    Tu es un styliste expert pour l'application Dressflow.
    MÉTÉO : ${weather.temp}°C, ${weather.description}.
    DRESSING : ${JSON.stringify(clothesContext)}

    TA MISSION :
    Crée la meilleure tenue possible en choisissant parmi les vêtements disponibles ci-dessus.
    Respecte l'harmonie des couleurs et la température actuelle.
    
    RETOURNE UNIQUEMENT UN JSON :
    {
      "top_id": "ID du vêtement (Haut/Robe)",
      "bottom_id": "ID du vêtement (Bas - null si robe)",
      "layer_id": "ID du vêtement (Veste/Pull - optionnel)",
      "explanation": "Une phrase courte et sympa en français expliquant ton choix."
    }
  `;

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    if (!response.ok) throw new Error("Erreur Gemini");
    const data = await response.json();
    return JSON.parse(data.candidates[0].content.parts[0].text);
  } catch (error) {
    console.error("Erreur Styliste:", error);
    throw error;
  }
};
