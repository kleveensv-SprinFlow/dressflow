import test from 'node:test';
import assert from 'node:assert/strict';
import { colorHarmonyScore, generateOutfit } from '../src/services/styleEngine.js';

const makeItem = (id, type, color, main_category, extras = {}) => ({
  id, type, color, main_category, season: ['Toutes saisons'], ...extras
});

const wardrobe = [
  makeItem('top-black', 'T-shirt', 'Noir', 'Haut'),
  makeItem('top-blue', 'Chemise', 'Bleu Ciel', 'Haut'),
  makeItem('top-pink', 'Pull', 'Rose Poudré', 'Haut'),
  makeItem('bottom-beige', 'Pantalon', 'Beige', 'Bas'),
  makeItem('bottom-green', 'Jean', 'Vert Sapin', 'Bas'),
  makeItem('layer-navy', 'Veste', 'Marine', 'Haut'),
  makeItem('shoe-white', 'Baskets', 'Blanc', 'Chaussures'),
  makeItem('hat', 'Casquette', 'Noir', 'Chapeau')
];

test('neutrals and an accent form a strong palette', () => {
  assert.ok(colorHarmonyScore('Noir', 'Orange') >= 85);
});

test('complementary colours score better than unrelated bright colours', () => {
  assert.ok(colorHarmonyScore('Bleu Ciel', 'Orange') > colorHarmonyScore('Bleu Ciel', 'Moutarde') - 5);
  assert.ok(colorHarmonyScore('Bleu Ciel', 'Orange') >= 75);
});

test('outfit generation always uses a valid top and bottom when no dress is used', async () => {
  const outfit = await generateOutfit(wardrobe, { temp: 16, code: 3 });
  assert.ok(['top-black', 'top-blue', 'top-pink'].includes(outfit.top_id));
  assert.ok(['bottom-beige', 'bottom-green'].includes(outfit.bottom_id));
  assert.ok(outfit.explanation.includes('Couleurs'));
});

test('locked IDs are respected during regeneration', async () => {
  const outfit = await generateOutfit(wardrobe, { temp: 18 }, { top: 'top-blue', bottom: 'bottom-beige' });
  assert.equal(outfit.top_id, 'top-blue');
  assert.equal(outfit.bottom_id, 'bottom-beige');
});

test('legacy locked item objects are accepted', async () => {
  const outfit = await generateOutfit(wardrobe, { temp: 22 }, { top: wardrobe[1] });
  assert.equal(outfit.top_id, 'top-blue');
});

test('layer is selected in cold weather when the wardrobe has one', async () => {
  const outfit = await generateOutfit(wardrobe, { temp: 4, code: 71 });
  assert.equal(outfit.layer_id, 'layer-navy');
});

test('generation gives a useful error when the wardrobe has no coherent base', async () => {
  await assert.rejects(
    generateOutfit([wardrobe[0]], { temp: 20 }),
    /Ajoute un bas/
  );
});

test('invalid locks are rejected instead of producing an empty outfit', async () => {
  await assert.rejects(
    generateOutfit(wardrobe, { temp: 20 }, { top: 'missing-id' }),
    /n’est plus disponible/
  );
});


test('outfit generation is deterministic for identical inputs', async () => {
  const first = await generateOutfit(wardrobe, { temp: 16, code: 3 });
  const second = await generateOutfit(wardrobe, { temp: 16, code: 3 });
  assert.deepEqual(second, first);
});

test('occasion fit prefers items tagged for the selected occasion', async () => {
  const occasionWardrobe = [
    makeItem('top-work', 'Chemise', 'Blanc', 'Haut', { activity: ['Travail'], last_worn_date: '2026-10-01T00:00:00.000Z' }),
    makeItem('top-sport', 'T-shirt', 'Noir', 'Haut', { activity: ['Sport'], last_worn_date: '2026-09-01T00:00:00.000Z' }),
    makeItem('bottom-work', 'Pantalon', 'Marine', 'Bas', { activity: ['Travail'] }),
    makeItem('bottom-sport', 'Jogging', 'Gris', 'Bas', { activity: ['Sport'] })
  ];
  const workLook = await generateOutfit(occasionWardrobe, { temp: 20 }, {}, null, 'Travail');
  assert.equal(workLook.top_id, 'top-work');
  assert.equal(workLook.bottom_id, 'bottom-work');
});
