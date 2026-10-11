import test from 'node:test';
import assert from 'node:assert/strict';
import { groupWornOutfits } from '../src/utils/wornHistory.js';

test('groups pieces worn together and ignores clothes never worn', () => {
  const wornAt = '2026-10-10T08:00:00.000Z';
  const groups = groupWornOutfits([
    { id: 'a', type: 'T-shirt', last_worn_date: wornAt },
    { id: 'b', type: 'Jean', last_worn_date: '2026-10-10T08:00:20.000Z' },
    { id: 'c', type: 'Manteau', last_worn_date: '2026-09-01T08:00:00.000Z' },
    { id: 'd', type: 'Robe', last_worn_date: null }
  ]);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].items.map(item => item.id), ['a', 'b']);
  assert.deepEqual(groups[1].items.map(item => item.id), ['c']);
});

test('returns nothing when the wardrobe has no wear history', () => {
  assert.deepEqual(groupWornOutfits([{ id: 'a', last_worn_date: null }]), []);
});
