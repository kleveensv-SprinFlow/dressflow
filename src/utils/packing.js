const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);

const isRainy = (weather) => {
  const code = Number(weather?.code ?? weather?.current_weather?.weathercode);
  return RAIN_CODES.has(code) || /pluie|averse|orage|neige/i.test(String(weather?.description ?? ''));
};

const clampDays = (days) => {
  const value = Number(days);
  return Number.isFinite(value) && value >= 1 ? Math.round(value) : 0;
};

const between = (value, min, max) => Math.min(max, Math.max(min, value));

/**
 * Liste de quantités, pas de pièces du dressing.
 * Sans machine : un change par jour. Avec machine : on lave vers le milieu du séjour.
 */
export const generatePackingList = (weather, duration, options = {}) => {
  const days = clampDays(duration);
  if (!days || !weather) return [];

  const tempValue = Number(weather.temp ?? weather.current_weather?.temperature);
  const temperature = Number.isFinite(tempValue) ? tempValue : 18;
  const rainy = isRainy(weather);
  const laundry = Boolean(options.laundry);
  const sport = Boolean(options.sport);
  const evening = Boolean(options.evening);
  const cold = temperature <= 12;
  const cool = temperature <= 18;
  const hot = temperature >= 24;

  const shirts = laundry ? between(Math.ceil(days / 2), 3, days) : days;
  const pants = laundry ? between(Math.ceil(days / 4), 1, days) : between(Math.ceil(days / 2), 1, days);
  const underwear = laundry ? between(Math.ceil(days / 2) + 1, 3, days + 1) : days + 1;
  const socks = laundry ? between(Math.ceil(days / 2), 3, days) : days;

  const rows = [
    ['vetements', 'Vêtements', 'tshirts', 'T-shirts', shirts],
    ['vetements', 'Vêtements', 'pantalons', 'Pantalons', pants],
    ['vetements', 'Vêtements', 'shorts', 'Shorts', hot || sport ? between(Math.ceil(days / 3), 1, 3) : 0],
    ['vetements', 'Vêtements', 'pulls', 'Pulls', cold ? (days > 5 ? 2 : 1) : cool ? 1 : 0],
    ['vetements', 'Vêtements', 'chemises', 'Chemises', evening ? (days > 4 ? 2 : 1) : days >= 5 ? 1 : 0],
    ['vetements', 'Vêtements', 'veste', 'Veste', cool || rainy ? 1 : 0],
    ['vetements', 'Vêtements', 'manteau', 'Manteau', temperature <= 8 ? 1 : 0],
    ['vetements', 'Vêtements', 'pyjama', 'Pyjama', days > 7 ? 2 : 1],
    ['vetements', 'Vêtements', 'sport', 'Tenue de sport', sport ? 1 : 0],
    ['sous', 'Sous-vêtements', 'sousvetements', 'Sous-vêtements', underwear],
    ['sous', 'Sous-vêtements', 'chaussettes', 'Chaussettes', socks],
    ['chaussures', 'Chaussures', 'ville', 'Chaussures de ville', 1],
    ['chaussures', 'Chaussures', 'baskets', 'Baskets', sport || days >= 4 ? 1 : 0],
    ['chaussures', 'Chaussures', 'bottes', 'Chaussures de pluie', rainy ? 1 : 0],
    ['toilette', 'Toilette', 'brosse', 'Brosse à dents', 1],
    ['toilette', 'Toilette', 'dentifrice', 'Dentifrice', 1],
    ['toilette', 'Toilette', 'deodorant', 'Déodorant', 1],
    ['toilette', 'Toilette', 'douche', 'Gel douche', days >= 2 ? 1 : 0],
    ['toilette', 'Toilette', 'shampoing', 'Shampoing', days >= 3 ? 1 : 0],
    ['toilette', 'Toilette', 'rasoir', 'Rasoir', days >= 3 ? 1 : 0],
    ['toilette', 'Toilette', 'solaire', 'Crème solaire', hot ? 1 : 0],
    ['toilette', 'Toilette', 'medicaments', 'Médicaments', 1],
    ['divers', 'Divers', 'chargeur', 'Chargeur', 1],
    ['divers', 'Divers', 'papiers', 'Papiers et carte', 1],
    ['divers', 'Divers', 'parapluie', 'Parapluie', rainy ? 1 : 0]
  ];

  return rows
    .filter((row) => row[4] > 0)
    .map(([categoryId, category, id, label, qty]) => ({
      id,
      categoryId,
      category,
      type: label,
      label,
      qty
    }));
};

export const describePacking = (weather, duration, options = {}) => {
  const days = clampDays(duration);
  const tempValue = Number(weather?.temp ?? weather?.current_weather?.temperature);
  const temperature = Number.isFinite(tempValue) ? Math.round(tempValue) : null;
  const rainy = isRainy(weather);
  return [
    days ? `${days} jour${days > 1 ? 's' : ''}` : null,
    temperature == null ? null : `${temperature}°`,
    rainy ? 'pluie' : 'sec',
    options.laundry ? 'machine sur place' : 'sans machine',
    options.sport ? 'sport' : null,
    options.evening ? 'soirée' : null
  ].filter(Boolean).join(' · ');
};
