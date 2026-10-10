const TOP_TYPES = new Set(['T-shirt', 'Chemise', 'Pull', 'Sweat', 'Top / Blouse', 'Blouse', 'Robe', 'Gilet']);
const BOTTOM_TYPES = new Set(['Pantalon', 'Short', 'Jogging', 'Jean', 'Jupe', 'Legging', 'Chino']);
const LAYER_TYPES = new Set(['Veste', 'Manteau', 'Cardigan', 'Blazer', 'Parka', 'Trench']);
const SHOE_TYPES = new Set(['Baskets', 'Basket', 'Bottes', 'Sandales', 'Talons', 'Ville', 'Chaussures']);
const HEAD_TYPES = new Set(['Bonnet', 'Casquette', 'Chapeau', 'Bob']);
const NEUTRALS = new Set(['blanc', 'blanc casse', 'noir', 'gris', 'beige', 'marine', 'marron', 'camel', 'kaki', 'ecru', 'creme']);
const COLOR_FAMILIES = {
  blue: new Set(['marine', 'bleu ciel']),
  green: new Set(['kaki', 'vert sapin']),
  red: new Set(['rouge', 'bordeaux']),
  pink: new Set(['rose', 'rose poudre']),
  yellow: new Set(['jaune', 'moutarde', 'or']),
  orange: new Set(['orange', 'terracotta']),
  purple: new Set(['violet', 'lilas']),
  brown: new Set(['marron', 'camel'])
};
const ANALOGOUS_FAMILIES = [
  new Set(['blue', 'green']),
  new Set(['green', 'yellow']),
  new Set(['yellow', 'orange']),
  new Set(['orange', 'red']),
  new Set(['red', 'pink']),
  new Set(['pink', 'purple']),
  new Set(['purple', 'blue']),
  new Set(['red', 'brown']),
  new Set(['orange', 'brown'])
];
const COMPLEMENTARY_FAMILIES = [
  new Set(['blue', 'orange']),
  new Set(['green', 'red']),
  new Set(['purple', 'yellow'])
];

const normalize = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const values = (value) => {
  if (Array.isArray(value)) return value.map(String).map(x => x.trim()).filter(Boolean);
  return String(value ?? '').split(/[,;|]/).map(x => x.trim()).filter(Boolean);
};

const familyFor = (color) => {
  const value = normalize(color);
  for (const [family, colors] of Object.entries(COLOR_FAMILIES)) {
    if (colors.has(value)) return family;
  }
  return null;
};

const inSameGroup = (families, first, second) =>
  first && second && families.some(group => group.has(first) && group.has(second));

/**
 * Heuristic colour harmony score (0-100), used as one factor rather than a rigid fashion rule.
 * Neutrals can anchor a look; tonal, analogous and complementary palettes remain viable.
 */
export const colorHarmonyScore = (firstColor, secondColor) => {
  const first = normalize(firstColor);
  const second = normalize(secondColor);
  if (!first || !second) return 58;
  if (first === second) return NEUTRALS.has(first) ? 92 : 84;
  if (NEUTRALS.has(first) || NEUTRALS.has(second)) return 91;

  const firstFamily = familyFor(first);
  const secondFamily = familyFor(second);
  if (firstFamily && firstFamily === secondFamily) return 86;
  if (inSameGroup(ANALOGOUS_FAMILIES, firstFamily, secondFamily)) return 82;
  if (inSameGroup(COMPLEMENTARY_FAMILIES, firstFamily, secondFamily)) return 78;
  return 48;
};

const colorHarmonyLabel = (colors) => {
  const normalizedColors = colors.map(normalize).filter(Boolean);
  if (normalizedColors.length < 2) return 'une palette simple et facile à porter';
  if (normalizedColors.every(color => NEUTRALS.has(color))) return 'une base neutre, facile à associer';
  const families = normalizedColors.map(familyFor).filter(Boolean);
  if (families.length && families.every(family => family === families[0])) return 'une harmonie tonale';
  if (normalizedColors.some(color => NEUTRALS.has(color))) return 'une base neutre avec une couleur d’accent';
  if (inSameGroup(COMPLEMENTARY_FAMILIES, families[0], families.at(-1))) return 'des couleurs complémentaires, pour un contraste maîtrisé';
  if (inSameGroup(ANALOGOUS_FAMILIES, families[0], families.at(-1))) return 'des couleurs proches, pour une harmonie douce';
  return 'un contraste de couleurs assumé';
};

const typeOf = (item) => String(item?.type ?? '').trim();
const isTop = item => TOP_TYPES.has(typeOf(item)) || (item?.main_category === 'Haut' && !LAYER_TYPES.has(typeOf(item)));
const isBottom = item => BOTTOM_TYPES.has(typeOf(item)) || item?.main_category === 'Bas';
const isLayer = item => LAYER_TYPES.has(typeOf(item));
const isShoe = item => SHOE_TYPES.has(typeOf(item)) || item?.main_category === 'Chaussures';
const isHead = item => HEAD_TYPES.has(typeOf(item)) || item?.main_category === 'Chapeau';
const isOnePiece = item => normalize(typeOf(item)) === 'robe';

const daysSinceWorn = (item) => {
  if (!item?.last_worn_date) return 30;
  const timestamp = new Date(item.last_worn_date).getTime();
  if (!Number.isFinite(timestamp)) return 30;
  return Math.max(0, (Date.now() - timestamp) / 86400000);
};

const rotationScore = (item) => Math.min(100, Math.max(8, (daysSinceWorn(item) / 21) * 100));

const seasonScore = (item, temp) => {
  const seasons = values(item?.season).map(normalize);
  if (!seasons.length || seasons.includes('toutes saisons')) return 82;
  let preferred;
  if (temp <= 8) preferred = ['hiver', 'automne'];
  else if (temp <= 17) preferred = ['automne', 'printemps', 'hiver'];
  else if (temp <= 24) preferred = ['printemps', 'ete', 'automne'];
  else preferred = ['ete', 'printemps'];
  return seasons.some(s => preferred.includes(s)) ? 100 : 36;
};

const weatherScore = (item, role, temp, rainy) => {
  const type = normalize(typeOf(item));
  let score = 76;
  if (role === 'top') {
    if (temp >= 25 && ['t-shirt', 'top / blouse', 'blouse'].includes(type)) score += 18;
    if (temp >= 25 && ['pull', 'sweat', 'gilet'].includes(type)) score -= 22;
    if (temp <= 9 && ['pull', 'sweat', 'gilet'].includes(type)) score += 18;
    if (temp <= 9 && ['t-shirt', 'top / blouse', 'blouse'].includes(type)) score -= 12;
  }
  if (role === 'bottom') {
    if (temp >= 26 && ['short', 'jupe'].includes(type)) score += 18;
    if (temp >= 26 && ['jean', 'pantalon', 'legging'].includes(type)) score -= 5;
    if (temp <= 7 && type === 'short') score -= 28;
    if (temp <= 7 && ['jean', 'pantalon', 'legging'].includes(type)) score += 12;
  }
  if (role === 'layer') {
    if (temp <= 8) score += 24;
    else if (temp <= 14) score += 18;
    else if (temp <= 18) score += 10;
    else if (temp <= 22) score -= 3;
    else score -= 24;
    if (rainy && ['manteau', 'parka', 'trench', 'veste'].includes(type)) score += 8;
  }
  if (role === 'shoes') {
    if (temp >= 26 && type === 'sandales') score += 14;
    if (temp <= 6 && ['bottes', 'ville'].includes(type)) score += 12;
    if (rainy && ['bottes', 'ville'].includes(type)) score += 9;
  }
  if (role === 'head') {
    if (temp <= 5 && type === 'bonnet') score += 22;
    if (temp >= 27 && ['casquette', 'chapeau', 'bob'].includes(type)) score += 20;
  }
  return Math.max(0, Math.min(100, score));
};

const compareFreshness = (a, b) => rotationScore(b) - rotationScore(a);
const shortlist = (list, locked, limit = 14) => {
  if (locked) return [locked];
  return [...list].sort(compareFreshness).slice(0, limit);
};

const resolveLock = (items, lockedValues, key, eligible) => {
  const supplied = lockedValues?.[key];
  if (!supplied) return null;
  const id = typeof supplied === 'object' ? supplied.id : supplied;
  const item = items.find(candidate => String(candidate.id) === String(id));
  if (!item) throw new Error('Une pièce verrouillée n’est plus disponible dans ton dressing. Déverrouille-la puis relance.');
  if (!eligible(item)) throw new Error(`La pièce verrouillée « ${typeOf(item)} » ne correspond pas à la catégorie attendue.`);
  return item;
};

const average = (numbers) => numbers.length ? numbers.reduce((sum, number) => sum + number, 0) / numbers.length : 70;
const colorsFor = (pieces) => pieces.map(piece => piece.color).filter(Boolean);
const pairwiseColorScore = (colors) => {
  if (colors.length < 2) return 70;
  const scores = [];
  for (let i = 0; i < colors.length; i += 1) {
    for (let j = i + 1; j < colors.length; j += 1) scores.push(colorHarmonyScore(colors[i], colors[j]));
  }
  return average(scores);
};

const outfitScore = (pieces, roles, temp, rainy, previousIds) => {
  const colors = colorsFor(pieces);
  const colorScore = pairwiseColorScore(colors);
  const weather = average(pieces.map(piece => weatherScore(piece, roles.get(piece.id) || 'top', temp, rainy)));
  const season = average(pieces.map(piece => seasonScore(piece, temp)));
  const rotation = average(pieces.map(rotationScore));
  const structure = pieces.some(isOnePiece) ? 95 : (pieces.some(piece => roles.get(piece.id) === 'top') && pieces.some(piece => roles.get(piece.id) === 'bottom') ? 100 : 55);
  const reused = pieces.filter(piece => previousIds.has(String(piece.id))).length;
  const variety = Math.max(0, 100 - reused * 24);
  return colorScore * 0.32 + weather * 0.22 + season * 0.14 + rotation * 0.12 + structure * 0.12 + variety * 0.08 + Math.random() * 2.2;
};

/**
 * Local, explainable outfit engine. It uses the wardrobe metadata and rules; no remote AI call is made.
 * The lock map accepts either item IDs or item objects so older UI state remains compatible.
 */
export const generateOutfit = async (items, weather = {}, lockedValues = {}, previousOutfit = null) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('Ton dressing est vide. Ajoute quelques pièces pour composer une tenue.');
  }
  const tempValue = Number(weather?.temp ?? weather?.current_weather?.temperature);
  const temp = Number.isFinite(tempValue) ? tempValue : 20;
  const code = Number(weather?.code ?? weather?.current_weather?.weathercode);
  const rainy = [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code);

  const topLock = resolveLock(items, lockedValues, 'top', isTop);
  const bottomLock = resolveLock(items, lockedValues, 'bottom', isBottom);
  const layerLock = resolveLock(items, lockedValues, 'layer', isLayer);
  const shoeLock = resolveLock(items, lockedValues, 'feet', isShoe);
  const headLock = resolveLock(items, lockedValues, 'head', isHead);

  let tops = items.filter(isTop);
  let bottoms = items.filter(isBottom);
  const layers = items.filter(isLayer);
  const shoes = items.filter(isShoe);
  const heads = items.filter(isHead);

  if (topLock) tops = [topLock];
  if (bottomLock) bottoms = [bottomLock];
  if (topLock && isOnePiece(topLock) && bottomLock) throw new Error('Une robe est déjà une tenue complète : déverrouille le bas pour la conserver.');
  if (bottomLock) tops = tops.filter(item => !isOnePiece(item));
  if (tops.length === 0) throw new Error('Ajoute un haut (T-shirt, chemise, pull…) ou une robe à ton dressing.');
  if (layerLock && !layers.some(item => String(item.id) === String(layerLock.id))) throw new Error('La pièce verrouillée ne peut pas être utilisée comme couche extérieure.');
  const hasOnePiece = tops.some(isOnePiece);
  if (bottoms.length === 0 && !hasOnePiece) throw new Error('Ajoute un bas (jean, pantalon, jupe…) pour composer une tenue complète.');

  const topChoices = shortlist(tops, topLock);
  const bottomChoices = shortlist(bottoms.filter(item => !isOnePiece(item)), bottomLock);
  const layerChoices = layerLock ? [layerLock] : temp <= 8
    ? [null, ...shortlist(layers, null, 8)]
    : temp <= 18
      ? [null, ...shortlist(layers, null, 6)]
      : [null, ...(temp <= 22 ? shortlist(layers, null, 3) : [])];
  const shoeChoices = shoeLock ? [shoeLock] : shoes.length ? shortlist(shoes, null, 8) : [null];
  const shouldConsiderHeadwear = temp <= 5 || temp >= 27;
  const headChoices = headLock ? [headLock] : shouldConsiderHeadwear ? [null, ...shortlist(heads, null, 4)] : [null];
  const previousIds = new Set(
    [previousOutfit?.top, previousOutfit?.bottom, previousOutfit?.layer, previousOutfit?.feet, previousOutfit?.head]
      .map(item => item?.id).filter(Boolean).map(String)
  );

  let best = null;
  let bestScore = -Infinity;
  for (const top of topChoices) {
    const bottomsForTop = isOnePiece(top) ? [null] : bottomChoices;
    if (!bottomsForTop.length) continue;
    for (const bottom of bottomsForTop) {
      for (const layer of layerChoices) {
        for (const shoe of shoeChoices) {
          for (const head of headChoices) {
            const pieces = [top, bottom, layer, shoe, head].filter(Boolean);
            const roles = new Map();
            roles.set(top.id, 'top');
            if (bottom) roles.set(bottom.id, 'bottom');
            if (layer) roles.set(layer.id, 'layer');
            if (shoe) roles.set(shoe.id, 'shoes');
            if (head) roles.set(head.id, 'head');
            const outerwearBonus = layer
              ? (temp <= 8 ? 20 : temp <= 14 ? 13 : temp <= 18 ? 7 : temp <= 22 ? 2 : -6)
              : (temp <= 8 && layers.length > 0 ? -14 : temp <= 14 && layers.length > 0 ? -8 : temp <= 18 && layers.length > 0 ? -4 : 0);
            const score = outfitScore(pieces, roles, temp, rainy, previousIds) + outerwearBonus;
            if (score > bestScore) {
              best = { top, bottom, layer, shoe, head, pieces };
              bestScore = score;
            }
          }
        }
      }
    }
  }
  if (!best) throw new Error('Aucune combinaison cohérente trouvée. Vérifie les catégories de tes vêtements.');

  const colors = colorsFor(best.pieces);
  const harmony = colorHarmonyLabel(colors);
  const outerwearMessage = best.layer
    ? `la couche ${best.layer.type} complète la tenue pour la météo`
    : temp > 18
      ? 'aucune couche superflue n’est ajoutée'
      : layers.length === 0
        ? 'aucune couche adaptée n’est disponible dans ton dressing'
        : 'une tenue plus légère est privilégiée';
  const colorHarmony = pairwiseColorScore(colors);
  return {
    top_id: best.top?.id ?? null,
    bottom_id: best.bottom?.id ?? null,
    layer_id: best.layer?.id ?? null,
    feet_id: best.shoe?.id ?? null,
    head_id: best.head?.id ?? null,
    color_harmony: Math.round(colorHarmony),
    explanation: `Couleurs : ${harmony}. À ${temp}°C, ${outerwearMessage}. Les pièces peu portées sont favorisées ; adapte le résultat à ton confort et à tes goûts.`
  };
};
