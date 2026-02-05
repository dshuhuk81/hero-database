// Auto-Import aller Hero-JSON-Dateien
const heroModules = import.meta.glob("./*.json", { eager: true });
const rawHeroes = Object.values(heroModules).map(m => m.default);

/* ============================
   KONFIG
   ============================ */
const RANKABLE_STATS = [
  "hp",
  "atk",
  "armor",
  "magicRes",
  "dodgeRate",
  "hitBonus",
  "critRate",
  "critRes",
  "critDmgBonus",
  "critDmgReduction",
  "energy",
];

/* ============================
   ADAPTER / NORMALIZER
   ============================ */
function adaptHero(raw) {
  return {
    id: raw.id,
    name: raw.name,

    image: raw.image ?? `/heroes/${raw.id}.webp`,

    faction: raw.faction,
    role: raw.role,
    class: raw.class,
    rarity: raw.rarity,

    description: raw.description ?? "",

    ratings: {
      overall: raw.ratings?.overall ?? null,
      grimSurge: raw.ratings?.grimSurge ?? null,
      delusionsDen: raw.ratings?.delusionsDen ?? null,
      torrentRift: raw.ratings?.torrentRift ?? null,
      pvp: raw.ratings?.pvp ?? null,
    },

    // Backward-Compat (Grid / Cards)
    rating: raw.ratings?.overall ?? null,

    // ✅ Stats kommen NUR aus Hero-JSON
    stats: raw.stats ?? {},

    skills: raw.skills ?? [],
    relic: raw.relic ?? null,
  };
}

/* ============================
   HEROES (NORMALISIERT)
   ============================ */
const heroes = rawHeroes.map(adaptHero);

/* ============================
   RANKINGS BERECHNEN
   ============================ */
function computeStatRankings(heroes) {
  const rankings = {};

  for (const stat of RANKABLE_STATS) {
    const sorted = [...heroes]
      .filter(h => typeof h.stats?.[stat] === "number")
      .sort((a, b) => b.stats[stat] - a.stats[stat]);

    sorted.forEach((hero, index) => {
      if (!rankings[hero.id]) rankings[hero.id] = {};
      rankings[hero.id][stat] = index + 1; // Rank 1 = bester Wert
    });
  }

  return rankings;
}

const statRankings = computeStatRankings(heroes);

/* ============================
   HEROES + RANKINGS
   ============================ */
export const heroesWithRankings = heroes.map(hero => ({
  ...hero,
  rankings: statRankings[hero.id] ?? {},
}));

/* ============================
   PUBLIC API
   ============================ */
export function getHeroById(id) {
  return heroesWithRankings.find(hero => hero.id === id);
}

export { heroesWithRankings as heroes };
