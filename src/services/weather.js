// Service de météo utilisant Open-Meteo (Gratuit et sans clé API)

export const getLocalWeather = async (lat = null, lon = null) => {
  try {
    // Si pas de coordonnées, on essaie la géolocalisation
    if (!lat || !lon) {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
      })
      lat = pos.coords.latitude
      lon = pos.coords.longitude
    }

    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=auto`
    )
    const data = await response.json()

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
    console.error("Erreur météo:", error)
    return { temp: 20, description: "Ciel dégagé", code: 0, city: "Paris" }
  }
}

export const searchCity = async (query) => {
  try {
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${query}&count=5&language=fr&format=json`)
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
