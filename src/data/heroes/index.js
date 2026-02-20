// src/data/heroes/index.js

// Auto-Import aller Hero-JSON-Dateien
const heroModules = import.meta.glob("./*.json", { eager: true });
const rawHeroes = Object.values(heroModules).map((m) => m.default);

import { synergyProfileForHero, synergyPotentialForHero } from "../../utils/synergyTags.js";

/* ============================
   KONFIG
   ============================ */

const RANKABLE_STATS = [
  "might",
  "hp",
  "atk",
  "armor",
  "magicRes",
  "dodgeRate",
  "hitBonus",
  "critRate",
  "critRes",
  "critDmgBonus",
  "critDmgRed",
  "energy",
  "cooldownHaste",
  "atkSpdBonus",
  "pDmgBonus",
  "pDmgRed",
  "mDmgBonus",
  "mDmgRed",
  "healEff",
  "rechargeEff",
  "lifestealEff",
  "reflectEff",
  "effectRes",
  "effectHit",
  "controlRes",
  "controlBonus",
  "normalSkillPWR",
  "ultimatePWR",
];

/* ============================
   ADAPTER
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
      pve: raw.ratings?.pve ?? null,
    },

    // Backward-Compat
    rating: raw.ratings?.overall ?? null,

    // ✅ Stats 1:1 aus Hero-JSON (Divine 5 raw in-game stats, not normalized)
    stats: raw.stats ?? {},

    skills: raw.skills ?? [],
    relic: raw.relic ?? null,

    // ✅ Synergies (manual tag assignment)
    synergies: raw.synergies ?? [],

    recommendedRelicLevel: raw.recommendedRelicLevel,
    level: raw.level,
    evolution: raw.evolution,
  };
}

/* ============================
   HEROES (BASIS)
   ============================ */
const heroesBase = rawHeroes.map(adaptHero);

/* ============================
   RANKINGS (100% RAW STATS)
   ============================ */
function computeStatRankings(heroes) {
  const rankings = {};

  for (const stat of RANKABLE_STATS) {
    const sorted = [...heroes]
      .filter((h) => typeof h.stats?.[stat] === "number")
      .sort((a, b) => b.stats[stat] - a.stats[stat]);

    sorted.forEach((hero, index) => {
      if (!rankings[hero.id]) rankings[hero.id] = {};
      rankings[hero.id][stat] = index + 1; // Rank 1 = bester Wert
    });
  }

  return rankings;
}

const statRankings = computeStatRankings(heroesBase);

const heroesWithRankings = heroesBase.map((hero) => ({
  ...hero,
  rankings: statRankings[hero.id] ?? {},
}));

/* ============================
   MAX VALUES PRO STAT (RAW)
   ============================ */
function computeStatMaxima(heroes) {
  const maxima = {};

  for (const stat of RANKABLE_STATS) {
    const values = heroes
      .map((h) => h.stats?.[stat])
      .filter((v) => typeof v === "number");

    maxima[stat] = values.length > 0 ? Math.max(...values) : null;
  }

  return maxima;
}

export const statMaxima = computeStatMaxima(heroesBase);

/* ============================
   SYNERGY (STRICT, NO SCALING)
   ============================ */
function withSynergy(h) {
  const prof = synergyProfileForHero(h);

  const evidence = {};
  for (const tag of prof.tags) {
    evidence[tag] = prof.evidenceByTag[tag];
  }

  return {
    ...h,
    synergyTags: Array.from(prof.tags),
    synergyEvidence: evidence,
    synergyPotential: synergyPotentialForHero(h),
  };
}

const heroesFinal = heroesWithRankings.map(withSynergy);

/* ============================
   PUBLIC API
   ============================ */
export function getHeroById(id) {
  return heroesFinal.find((hero) => hero.id === id);
}

// Haupt-Export: RAW Stats + Rankings + Synergy
export { heroesFinal as heroes };