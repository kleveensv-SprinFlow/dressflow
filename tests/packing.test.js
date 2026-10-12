import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePackingList } from '../src/utils/packing.js';

const items = [
  { id: 't1', type: 'T-shirt', main_category: 'Haut', color: 'Blanc', season: 'Été' },
  { id: 't2', type: 'Chemise', main_category: 'Haut', color: 'Bleu Ciel', season: 'Printemps' },
  { id: 'b1', type: 'Jean', main_category: 'Bas', color: 'Marine', season: 'Toutes saisons' },
  { id: 'b2', type: 'Short', main_category: 'Bas', color: 'Beige', season: 'Été' },
  { id: 's1', type: 'Baskets', main_category: 'Chaussures', color: 'Blanc', season: 'Toutes saisons' },
  { id: 'l1', type: 'Veste', main_category: 'Haut', color: 'Noir', season: 'Hiver' },
  { id: 'h1', type: 'Casquette', main_category: 'Chapeau', color: 'Noir', season: 'Été' }
];

test('uses Open-Meteo weather shape and exposes the fields TravelView renders', () => {
  const list = generatePackingList(items, { temp: 8, code: 61, description: 'Pluie légère' }, 4);
  assert.ok(list.length > 0);
  assert.ok(list.every(item => typeof item.category === 'string'));
  assert.ok(list.every(item => typeof item.qty === 'number' && item.qty >= 1));
  assert.ok(list.some(item => item.category === 'Couche'));
});

test('avoids adding the same physical wardrobe item twice', () => {
  const list = generatePackingList(items, { temp: 25, code: 0 }, 3);
  assert.equal(new Set(list.map(item => String(item.id))).size, list.length);
});

test('prefers a never-worn piece over one worn today', () => {
  const list = generatePackingList([
    { id: 'fresh', type: 'T-shirt', main_category: 'Haut', last_worn_date: null },
    { id: 'today', type: 'Chemise', main_category: 'Haut', last_worn_date: new Date().toISOString() }
  ], { temp: 22, code: 0 }, 1);
  assert.equal(list[0].id, 'fresh');
});

test('laundry packs fewer tops than a trip without a machine', () => {
  const many = [
    ...Array.from({ length: 8 }, (_, index) => ({ id: `t${index}`, type: 'T-shirt', main_category: 'Haut' })),
    { id: 'b1', type: 'Jean', main_category: 'Bas' },
    { id: 'b2', type: 'Pantalon', main_category: 'Bas' },
    { id: 'b3', type: 'Jogging', main_category: 'Bas' }
  ];
  const tops = (list) => list.filter(item => item.category === 'Haut').length;
  const full = generatePackingList(many, { temp: 18, code: 0 }, 8, { laundry: false });
  const washed = generatePackingList(many, { temp: 18, code: 0 }, 8, { laundry: true });
  assert.ok(tops(washed) < tops(full));
});

test('sport keeps a training bottom when one exists', () => {
  const list = generatePackingList([
    { id: 't', type: 'T-shirt', main_category: 'Haut' },
    { id: 'jean', type: 'Jean', main_category: 'Bas' },
    { id: 'jog', type: 'Jogging', main_category: 'Bas' }
  ], { temp: 18, code: 0 }, 3, { sport: true });
  assert.ok(list.some(item => item.id === 'jog'));
});
test('rejects invalid trip duration and empty wardrobes', () => {
  assert.deepEqual(generatePackingList(items, { temp: 20 }, 0), []);
  assert.deepEqual(generatePackingList([], { temp: 20 }, 3), []);
});
