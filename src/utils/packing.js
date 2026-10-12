const TOP_TYPES = new Set(['T-shirt', 'Chemise', 'Pull', 'Sweat', 'Top / Blouse', 'Blouse', 'Robe', 'Gilet']);
const BOTTOM_TYPES = new Set(['Pantalon', 'Short', 'Jogging', 'Jean', 'Jupe', 'Legging', 'Chino']);
const LAYER_TYPES = new Set(['Veste', 'Manteau', 'Cardigan', 'Blazer', 'Parka', 'Trench']);
const SHOE_TYPES = new Set(['Baskets', 'Basket', 'Bottes', 'Sandales', 'Talons', 'Ville', 'Chaussures']);
const HEAD_TYPES = new Set(['Bonnet', 'Casquette', 'Chapeau', 'Bob']);
const WARM_TOPS = new Set(['Pull', 'Sweat', 'Chemise']);
const LIGHT_TOPS = new Set(['T-shirt', 'Top / Blouse', 'Blouse']);
const LIGHT_BOTTOMS = new Set(['Short', 'Jupe']);
const SPORT_BOTTOMS = new Set(['Jogging', 'Legging']);
const SPORT_SHOES = new Set(['Baskets', 'Basket']);
const EVENING_TOPS = new Set(['Chemise', 'Blouse', 'Top / Blouse']);
const EVENING_BOTTOMS = new Set(['Pantalon', 'Jean', 'Chino', 'Jupe']);
const EVENING_SHOES = new Set(['Ville', 'Talons']);

const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);

const isRainy = (weather) => {
  const code = Number(weather?.code ?? weather?.current_weather?.weathercode);
  return RAIN_CODES.has(code) || /pluie|averse|orage|neige/i.test(String(weather?.description ?? ''));
};

const lastWorn = (item) => {
  const timestamp = new Date(item?.last_worn_date || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const seasonName = (temp) => {
  if (temp < 10) return 'Hiver';
  if (temp < 18) return 'Automne';
  if (temp < 24) return 'Printemps';
  return 'Été';
};

function rank(item, context) {
  const { temp, rainy, sport, evening } = context;
  const type = item?.type || '';
  let score = 0;
  if (temp < 14 && WARM_TOPS.has(type)) score += 28;
  if (temp >= 24 && (LIGHT_TOPS.has(type) || LIGHT_BOTTOMS.has(type))) score += 24;
  if (temp < 16 && type === 'Short') score -= 30;
  if (temp <= 8 && (type === 'Manteau' || type === 'Parka')) score += 18;
  if (rainy && LAYER_TYPES.has(type)) score += 16;
  if (sport && (SPORT_BOTTOMS.has(type) || SPORT_SHOES.has(type) || /sport/i.test(String(item?.activity || '')))) score += 22;
  if (evening && (EVENING_TOPS.has(type) || EVENING_BOTTOMS.has(type) || EVENING_SHOES.has(type))) score += 18;
  if (String(item?.season || '').includes(seasonName(temp))) score += 10;
  return score;
}

function byUsefulness(context) {
  return (a, b) => rank(b, context) - rank(a, context) || lastWorn(a) - lastWorn(b);
}

/**
 * Règles de valise, sans modèle. La météo décide les couches,
 * la machine décide combien de pièces, le sport et la soirée réservent une tenue.
 */
export const generatePackingList = (items, weather, duration, options = {}) => {
  const days = Number(duration);
  if (!Array.isArray(items) || !items.length || !weather || !Number.isFinite(days) || days < 1) return [];

  const tempValue = Number(weather.temp ?? weather.current_weather?.temperature);
  const temperature = Number.isFinite(tempValue) ? tempValue : 18;
  const rainy = isRainy(weather);
  const laundry = Boolean(options.laundry);
  const sport = Boolean(options.sport);
  const evening = Boolean(options.evening);
  const context = { temp: temperature, rainy, sport, evening };

  const tops = items.filter(item => TOP_TYPES.has(item.type) || (item.main_category === 'Haut' && !LAYER_TYPES.has(item.type)));
  const bottoms = items.filter(item => BOTTOM_TYPES.has(item.type) || item.main_category === 'Bas');
  const layers = items.filter(item => LAYER_TYPES.has(item.type));
  const shoes = items.filter(item => SHOE_TYPES.has(item.type) || item.main_category === 'Chaussures');
  const hats = items.filter(item => HEAD_TYPES.has(item.type) || item.main_category === 'Chapeau');

  const selected = [];
  const selectedIds = new Set();
  const pick = (candidates, count, category) => {
    const available = candidates
      .filter(item => item && !selectedIds.has(String(item.id)))
      .sort(byUsefulness(context));
    for (const item of available.slice(0, Math.max(0, count))) {
      selectedIds.add(String(item.id));
      selected.push({
        ...item,
        category,
        qty: 1,
        icon: item.icon || '👕'
      });
    }
  };
  const ensure = (candidates, category) => {
    if (candidates.some(item => selectedIds.has(String(item.id)))) return;
    pick(candidates, 1, category);
  };

  const topCount = laundry
    ? Math.min(tops.length, Math.max(3, Math.ceil(days * 0.5)))
    : Math.min(tops.length, days);
  const bottomCount = laundry
    ? Math.min(bottoms.length, Math.max(2, Math.ceil(days / 3)))
    : Math.min(bottoms.length, Math.max(1, Math.ceil(days / 2)));

  if (evening) {
    ensure(tops.filter(item => EVENING_TOPS.has(item.type)), 'Haut');
    ensure(bottoms.filter(item => EVENING_BOTTOMS.has(item.type)), 'Bas');
  }
  if (sport) {
    ensure(bottoms.filter(item => SPORT_BOTTOMS.has(item.type) || item.type === 'Short'), 'Bas');
    ensure(shoes.filter(item => SPORT_SHOES.has(item.type)), 'Chaussures');
  }

  pick(tops, topCount - selected.filter(item => item.category === 'Haut').length, 'Haut');
  pick(bottoms, bottomCount - selected.filter(item => item.category === 'Bas').length, 'Bas');

  const shoeCount = Math.min(shoes.length, (days >= 6 ? 2 : 1) + (sport ? 1 : 0));
  pick(shoes, shoeCount - selected.filter(item => item.category === 'Chaussures').length, 'Chaussures');
  if (rainy) ensure(shoes.filter(item => item.type === 'Bottes'), 'Chaussures');

  if (temperature <= 17 || rainy) pick(layers, temperature <= 6 ? 2 : 1, 'Couche');
  if (temperature <= 6 || temperature >= 27) pick(hats, 1, 'Accessoire');

  if (selected.length === 0) {
    pick(items, Math.min(items.length, Math.max(1, Math.ceil(days / 2))), 'Vêtement');
  }

  return selected;
};

export const describePacking = (weather, duration, options = {}) => {
  const days = Number(duration);
  const tempValue = Number(weather?.temp ?? weather?.current_weather?.temperature);
  const temperature = Number.isFinite(tempValue) ? Math.round(tempValue) : null;
  const rainy = isRainy(weather);
  const bits = [
    Number.isFinite(days) ? `${days} jour${days > 1 ? 's' : ''}` : null,
    temperature == null ? null : `${temperature}°`,
    rainy ? 'pluie' : 'sec',
    options.laundry ? 'machine sur place' : 'sans machine',
    options.sport ? 'sport' : null,
    options.evening ? 'soirée' : null
  ].filter(Boolean);
  return bits.join(' · ');
};
