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

test('rejects invalid trip duration and empty wardrobes', () => {
  assert.deepEqual(generatePackingList(items, { temp: 20 }, 0), []);
  assert.deepEqual(generatePackingList([], { temp: 20 }, 3), []);
});
