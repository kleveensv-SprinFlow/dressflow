import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePackingList } from '../src/utils/packing.js';

const weather = { temp: 8, code: 61, description: 'Pluie légère' };

test('lists quantities to pack, including a toothbrush, not wardrobe pieces', () => {
  const list = generatePackingList(weather, 4);
  assert.ok(list.length > 0);
  assert.ok(list.every(item => typeof item.category === 'string'));
  assert.ok(list.every(item => typeof item.qty === 'number' && item.qty >= 1));
  assert.equal(list.find(item => item.id === 'brosse').qty, 1);
  assert.ok(list.some(item => item.id === 'veste'));
  assert.equal(list.find(item => item.id === 'tshirts').qty, 4);
});

test('laundry reduces shirts and underwear stays one per day without it', () => {
  const full = generatePackingList({ temp: 18, code: 0 }, 8, { laundry: false });
  const washed = generatePackingList({ temp: 18, code: 0 }, 8, { laundry: true });
  assert.ok(washed.find(item => item.id === 'tshirts').qty < full.find(item => item.id === 'tshirts').qty);
  assert.equal(full.find(item => item.id === 'sousvetements').qty, 9);
});

test('sport and evening add their own lines', () => {
  const list = generatePackingList({ temp: 20, code: 0 }, 3, { sport: true, evening: true });
  assert.ok(list.some(item => item.id === 'sport'));
  assert.ok(list.some(item => item.id === 'chemises'));
  assert.ok(list.some(item => item.id === 'baskets'));
});

test('rejects an empty or invalid trip', () => {
  assert.deepEqual(generatePackingList({ temp: 20 }, 0), []);
  assert.deepEqual(generatePackingList(null, 3), []);
});
