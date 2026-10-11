// Service de météo utilisant Open-Meteo (Gratuit et sans clé API)

export const getLocalWeather = async (lat = null, lon = null) => {
  try {
    // Si pas de coordonnées, on essaie la géolocalisation
    if (lat == null || lon == null) {
      if (!globalThis.navigator?.geolocation) throw new Error('La localisation n’est pas disponible sur cet appareil. Choisis une ville manuellement.');
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, maximumAge: 600000, timeout: 15000 })
      })
      lat = pos.coords.latitude
      lon = pos.coords.longitude
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    let response;
    try {
      response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=auto`,
        { signal: controller.signal }
      );
    } finally {
      clearTimeout(timeoutId);
    }
    if (!response.ok) throw new Error('Le service météo ne répond pas.');
    const data = await response.json();
    if (!data.current_weather) throw new Error('Les données météo sont indisponibles.');

    const temp = Math.round(data.current_weather.temperature)
    const code = data.current_weather.weathercode

    return {
      temp,
      description: getWeatherDescription(code),
      code,
      city: lat && lon ? "Position actuelle" : "Lieu inconnu",
      lat,
      lon
    }
  } catch (error) {
    console.error('Erreur météo:', error);
    if (error?.name === 'AbortError') throw new Error('Le service météo met trop de temps à répondre. Réessaie ou choisis une ville.');
    if (error?.code === 1) throw new Error('Autorise la localisation dans les réglages, ou choisis une ville manuellement.');
    if (error?.code === 2 || error?.code === 3) throw new Error('Position introuvable. Réessaie ou choisis une ville manuellement.');
    if (error?.message?.includes('La localisation n’est pas disponible')) throw error;
    throw new Error('Météo indisponible. Vérifie la connexion ou choisis une ville manuellement.');
  }
}

export const searchCity = async (query) => {
  try {
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=fr&format=json`)
    const data = await response.json()
    return data.results || []
  } catch (error) {
    console.error("Erreur géocodage:", error)
    return []
  }
}

const getWeatherDescription = (code) => {
  const codes = {
    0: 'Ciel dégagé',
    1: 'Principalement dégagé',
    2: 'Partiellement nuageux',
    3: 'Couvert',
    45: 'Brouillard',
    48: 'Brouillard givrant',
    51: 'Bruine légère',
    61: 'Pluie légère',
    63: 'Pluie modérée',
    71: 'Neige légère',
    80: 'Averses de pluie',
    95: 'Orage'
  }
  return codes[code] || 'Météo variable'
}
