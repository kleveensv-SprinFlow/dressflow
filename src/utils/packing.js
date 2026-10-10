const TOP_TYPES = new Set(['T-shirt', 'Chemise', 'Pull', 'Sweat', 'Top / Blouse', 'Blouse', 'Robe', 'Gilet']);
const BOTTOM_TYPES = new Set(['Pantalon', 'Short', 'Jogging', 'Jean', 'Jupe', 'Legging', 'Chino']);
const LAYER_TYPES = new Set(['Veste', 'Manteau', 'Cardigan', 'Blazer', 'Parka', 'Trench']);
const SHOE_TYPES = new Set(['Baskets', 'Basket', 'Bottes', 'Sandales', 'Talons', 'Ville', 'Chaussures']);
const HEAD_TYPES = new Set(['Bonnet', 'Casquette', 'Chapeau', 'Bob']);

const isRainy = (weather) => {
  const code = Number(weather?.code ?? weather?.current_weather?.weathercode);
  return [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code)
    || /pluie|averse|orage|neige/i.test(String(weather?.description ?? ''));
};

const lastWorn = (item) => {
  const timestamp = new Date(item?.last_worn_date || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const oldestWornFirst = (a, b) => lastWorn(a) - lastWorn(b);

/**
 * Builds a suitcase checklist from the user's own wardrobe and Open-Meteo's weather shape.
 * Each row represents one wardrobe item (qty is deliberately 1 so the same physical piece
 * is not accidentally duplicated as multiple checkbox rows).
 */
export const generatePackingList = (items, weather, duration) => {
  const days = Number(duration);
  if (!Array.isArray(items) || !items.length || !weather || !Number.isFinite(days) || days < 1) return [];

  const temp = Number(weather.temp ?? weather.current_weather?.temperature);
  const temperature = Number.isFinite(temp) ? temp : 20;
  const rainy = isRainy(weather);
  const selected = [];
  const selectedIds = new Set();
  const pick = (candidates, count, category) => {
    const available = candidates.filter(item => !selectedIds.has(String(item.id))).sort(oldestWornFirst);
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

  const tops = items.filter(item => TOP_TYPES.has(item.type) || (item.main_category === 'Haut' && !LAYER_TYPES.has(item.type)));
  const bottoms = items.filter(item => BOTTOM_TYPES.has(item.type) || item.main_category === 'Bas');
  const layers = items.filter(item => LAYER_TYPES.has(item.type));
  const shoes = items.filter(item => SHOE_TYPES.has(item.type) || item.main_category === 'Chaussures');
  const hats = items.filter(item => HEAD_TYPES.has(item.type) || item.main_category === 'Chapeau');

  pick(tops, Math.min(tops.length, Math.max(1, Math.ceil(days * 0.8))), 'Haut');
  pick(bottoms, Math.min(bottoms.length, Math.max(1, Math.ceil(days / 2))), 'Bas');

  if (shoes.length) pick(shoes, Math.min(shoes.length, days >= 6 ? 2 : 1), 'Chaussures');
  if (temperature <= 18 || rainy) pick(layers, temperature <= 7 ? 2 : 1, 'Couche');
  if (temperature <= 5 || temperature >= 27) pick(hats, 1, 'Accessoire');

  // Keep at least a useful checklist when the closet uses legacy/unknown categories.
  if (selected.length === 0) {
    pick(items, Math.min(items.length, Math.max(1, Math.ceil(days / 2))), 'Vêtement');
  }

  return selected;
};
