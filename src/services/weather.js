// Service de météo utilisant Open-Meteo (Gratuit et sans clé API)

export const getLocalWeather = async (lat = null, lon = null) => {
  try {
    // Si pas de coordonnées, on essaie la géolocalisation
    if (lat == null || lon == null) {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
      })
      lat = pos.coords.latitude
      lon = pos.coords.longitude
    }

    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=auto`
    )
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
    console.error("Erreur météo:", error);
    throw new Error("Météo indisponible. Vérifie la connexion ou réessaie dans quelques instants.");
  }
}

export const getTripWeather = async (lat, lon, startDate, endDate) => {
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto&start_date=${startDate}&end_date=${endDate}`
  );
  if (!response.ok) throw new Error('Le service météo ne répond pas.');
  const data = await response.json();
  const maxes = data?.daily?.temperature_2m_max || [];
  const mins = data?.daily?.temperature_2m_min || [];
  const codes = data?.daily?.weathercode || [];
  if (!maxes.length || !mins.length) throw new Error('Les données météo sont indisponibles.');
  const pairs = maxes.map((max, index) => (Number(max) + Number(mins[index] ?? max)) / 2);
  const temp = Math.round(pairs.reduce((sum, value) => sum + value, 0) / pairs.length);
  const code = codes.find(value => [51, 53, 55, 61, 63, 65, 80, 81, 82, 95].includes(Number(value))) ?? codes[0] ?? 0;
  return {
    temp,
    code: Number(code),
    description: getWeatherDescription(Number(code)),
    lat,
    lon
  };
};

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

export const getWeatherDescription = (code) => {
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

export const getWeatherTip = (temp, code) => {
  if (temp == null) return null;
  if ([51, 61, 63, 80, 95].includes(code)) return "Pluie prévue : prévois un imperméable ou un parapluie ☔";
  if (code === 71) return "Neige : prévois un manteau chaud et de bonnes chaussures ❄️";
  if (temp < 10) return "Temps frais : superpose les couches ou sors un bon manteau 🧥";
  if (temp < 18) return "Température douce : une veste mi-saison ou un pull léger est parfait 🌤️";
  if (temp < 24) return "Temps agréable : tenue légère, t-shirt ou chemise idéale 😎";
  return "Chaleur estivale : matières légères et respirantes recommandées ☀️";
}
