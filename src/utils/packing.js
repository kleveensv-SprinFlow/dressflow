export const generatePackingList = (items, weather, duration) => {
  if (!weather || duration <= 0) return [];
  const list = [];
  const mainTemp = weather.main.temp;
  const isRainy = weather.weather[0].main === 'Rain';

  // Logique simplifiée mais robuste
  const tops = items.filter(i => i.main_category === 'Haut');
  const bottoms = items.filter(i => i.main_category === 'Bas');
  const shoes = items.filter(i => i.main_category === 'Chaussures');

  // Quantités basées sur la durée
  const topCount = Math.min(tops.length, duration + 1);
  const bottomCount = Math.min(bottoms.length, Math.ceil(duration / 2));
  
  list.push(...tops.slice(0, topCount));
  list.push(...bottoms.slice(0, bottomCount));
  if (shoes.length > 0) list.push(shoes[0]);

  return list;
};
