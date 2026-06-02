// src/datahttps://pub-a33abfbc3135413881a1d8eb86543559.r2.dev/heroes/index.js

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
  "baseAttackRate",
  "bossUltimatesPer90s",
];

/* ============================
   ADAPTER
   ============================ */
function adaptHero(raw) {
  return {
    id: raw.id,
    name: raw.name,
    image: raw.image ?? `https://pub-a33abfbc3135413881a1d8eb86543559.r2.dev/heroes/${raw.id}.webp`,
    release: raw.release ?? true,
    faction: raw.faction,
    role: raw.role,
    class: raw.class,
    rarity: raw.rarity,
    description: raw.description ?? "",
    // ✅ Stats 1:1 aus Hero-JSON (Divine 5 raw in-game stats, not normalized)
    stats: raw.stats ?? {},
    // Add baseAttackRate and bossUltimatesPer90s for frontend use
    baseAttackRate: raw.baseAttackRate,
    bossUltimatesPer90s: raw.bossUltimatesPer90s,
    skills: raw.skills ?? [],
    relic: raw.relic ?? null,
    // ✅ Synergies (manual tag assignment)
    synergies: raw.synergies ?? [],
    // ✅ Content Creator Guides
    "content-creator": raw["content-creator"] ?? [],
    level: raw.level,
    evolution: raw.evolution,
    newHero: raw.newHero ?? false,
    // Meta-System V2 (optional fields -- undefined if not set)
    coreMechanic: raw.coreMechanic ?? null,
    metaSources: raw.metaSources ?? null,
    relicBreakpoints: raw.relicBreakpoints ?? null,
    synergyLinks: raw.synergyLinks ?? null,
    synergyPartners: raw.synergyPartners ?? [],
    virtues: raw.virtues ?? [],
    virtueSets: raw.virtueSets ?? [],
    strengths: raw.strengths ?? [],
    weaknesses: raw.weaknesses ?? [],
    detailComps: raw.detailComps ?? [],
    // CN-vs-Global comparison block (optional, manually curated from CN client)
    cn: raw.cn ?? null,
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
      .filter((h) => typeof h.stats?.[stat] === "number" && h.stats[stat] > 0)
      .sort((a, b) => {
        const diff = b.stats[stat] - a.stats[stat];
        return diff !== 0 ? diff : a.id.localeCompare(b.id);
      });

    let previousValue = null;
    let currentRank = 0;
    sorted.forEach((hero, index) => {
      const value = hero.stats[stat];
      if (value !== previousValue) {
        currentRank = index + 1;
        previousValue = value;
      }
      if (!rankings[hero.id]) rankings[hero.id] = {};
      rankings[hero.id][stat] = currentRank; // Rank 1 = bester Wert
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
async function withSynergy(h) {
  const prof = synergyProfileForHero(h);

  const evidence = {};
  for (const tag of prof.tags) {
    evidence[tag] = prof.evidenceByTag[tag];
  }

  return {
    ...h,
    synergyTags: Array.from(prof.tags),
    synergyEvidence: evidence,
    synergyPotential: await synergyPotentialForHero(h),
  };
}

const heroesFinal = await Promise.all(heroesWithRankings.map(withSynergy));

/* ============================
   PUBLIC API
   ============================ */
export function getHeroById(id) {
  return heroesFinal.find((hero) => hero.id === id);
}

// Haupt-Export: RAW Stats + Rankings + Synergy
export { heroesFinal as heroes };
