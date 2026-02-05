/**
 * Erzeugt Rankings für einen bestimmten Stat
 * @param {Array} heroes - adaptierte Hero-Objekte
 * @param {string} statKey - z.B. "hp", "atk", "critRate"
 * @param {"desc"|"asc"} order - Standard: desc (höher = besser)
 */
export function buildStatRanking(heroes, statKey, order = "desc") {
  const sorted = [...heroes]
    .filter(h => typeof h.stats?.[statKey] === "number")
    .sort((a, b) => {
      return order === "desc"
        ? b.stats[statKey] - a.stats[statKey]
        : a.stats[statKey] - b.stats[statKey];
    });

  const rankingMap = new Map();

  sorted.forEach((hero, index) => {
    rankingMap.set(hero.id, {
      rank: index + 1,
      value: hero.stats[statKey],
      total: sorted.length,
    });
  });

  return rankingMap;
}
