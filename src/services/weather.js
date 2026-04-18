/**
 * Weather Service for Dressflow
 * Uses Open-Meteo API (Free, no key required)
 */

export const getLocalWeather = async () => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn("Géolocalisation non supportée. Utilisation de Paris par défaut.");
      fetchWeatherData(48.8566, 2.3522).then(resolve);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const data = await fetchWeatherData(latitude, longitude);
        resolve(data);
      },
      async (error) => {
        console.warn("Accès géolocalisation refusé. Utilisation de Paris par défaut.");
        const data = await fetchWeatherData(48.8566, 2.3522);
        resolve(data);
      }
    );
  });
};

const fetchWeatherData = async (lat, lon) => {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
    );
    const data = await response.json();
    
    const weather = data.current_weather;
    return {
      temp: Math.round(weather.temperature),
      code: weather.weathercode,
      description: getWeatherDescription(weather.weathercode)
    };
  } catch (error) {
    console.error("Erreur météo:", error);
    return { temp: 20, code: 0, description: "Ensoleillé" };
  }
};

const getWeatherDescription = (code) => {
  // Simplification des codes Open-Meteo
  if (code === 0) return "Ciel dégagé";
  if (code >= 1 && code <= 3) return "Partiellement nuageux";
  if (code >= 45 && code <= 48) return "Brouillard";
  if (code >= 51 && code <= 67) return "Pluie légère / Bruine";
  if (code >= 71 && code <= 77) return "Neige";
  if (code >= 80 && code <= 82) return "Averses de pluie";
  if (code >= 95) return "Orage";
  return "Variable";
};
