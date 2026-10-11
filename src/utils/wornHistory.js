const DEFAULT_BUCKET_MS = 2 * 60 * 1000;

export const groupWornOutfits = (items, { bucketMs = DEFAULT_BUCKET_MS, limit = 8 } = {}) => {
  const groups = new Map();
  for (const item of items || []) {
    if (!item?.last_worn_date) continue;
    const at = new Date(item.last_worn_date).getTime();
    if (!Number.isFinite(at)) continue;
    const key = Math.round(at / bucketMs);
    const group = groups.get(key) || { key, at, items: [] };
    group.items.push(item);
    group.at = Math.max(group.at, at);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => b.at - a.at).slice(0, limit);
};

export const formatWornAt = (timestamp) => new Date(timestamp).toLocaleDateString('fr-FR', {
  day: 'numeric',
  month: 'short'
});
