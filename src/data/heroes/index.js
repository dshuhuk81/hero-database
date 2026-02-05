/*
// // Auto-Import aller Hero JSON Dateien
const heroModules = import.meta.glob("./*.json", { eager: true });

// Rohdaten sammeln
const rawHeroes = Object.values(heroModules).map(m => m.default);

/* ============================
   ADAPTER / NORMALIZER
   ============================ */
   /*
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
    /* 👇 BACKWARD COMPAT (nur für Cards) *//*
    rating: raw.ratings?.overall ?? null,

    stats: {
      hp: raw.stats?.hp ?? 0,
      atk: raw.stats?.atk ?? 0,
      armor: raw.stats?.armor ?? 0,
      magicRes: raw.stats?.magicRes ?? 0,

      dodgeRate: raw.stats?.dodgeRate ?? 0,
      hitBonus: raw.stats?.hitBonus ?? 0,

      critRate: raw.stats?.critRate ?? 0,
      critRes: raw.stats?.critRes ?? 0,
      critDmgBonus: raw.stats?.critDmgBonus ?? 0,
      critDmgReduction: raw.stats?.critDmgReduction ?? 0,

      energy: raw.stats?.energy ?? 0,
    },

    skills: raw.skills ?? [],
    relic: raw.relic ?? null,
  };
}

/* ============================
   PUBLIC API
   ============================ *//*
export const heroes = rawHeroes.map(adaptHero);

export function getHeroById(id) {
  return heroes.find(hero => hero.id === id);
}
*/

/* Neuer Adapter Code */
// Auto-Import aller Hero JSON Dateien 
/*
const heroModules = import.meta.glob("./*.json", { eager: true });
const rawHeroes = Object.values(heroModules).map(m => m.default);

// Base-Stats importieren
import baseStats from "../stats/base-stats.json";
*/
/* ============================
   ADAPTER / NORMALIZER
   ============================ *//*
function adaptHero(raw) {
  const classStats = baseStats[raw.class] ?? {};

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

    /* BACKWARD COMPAT (für Cards) */
    /*
    rating: raw.ratings?.overall ?? null,

    // 👇 HIER passiert die Magie
    stats: {
      ...classStats,
      ...raw.stats, // optionales Override pro Hero
    },

    skills: raw.skills ?? [],
    relic: raw.relic ?? null,
  };
}
*/
/* ============================
   PUBLIC API
   ============================ *//*
export const heroes = rawHeroes.map(adaptHero);

export function getHeroById(id) {
  return heroes.find(hero => hero.id === id);
}
*/

// src/data/heroes/index.js

// Auto-Import aller Hero-JSON-Dateien
const heroModules = import.meta.glob("./*.json", { eager: true });
const rawHeroes = Object.values(heroModules).map(m => m.default);

// Base-Stats pro Klasse
import baseStats from "../stats/base-stats.json";

/* ============================
   ADAPTER / NORMALIZER
   ============================ */
function adaptHero(raw) {
  const classStats = baseStats[raw.class] ?? {};

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

    // 🔁 Backward-Compat für Grid / Cards
    rating: raw.ratings?.overall ?? null,

    // 🧠 Stats = Klassen-Basis + optional Hero-Overrides
    stats: {
      ...classStats,
      ...(raw.stats ?? {}),
    },

    skills: raw.skills ?? [],
    relic: raw.relic ?? null,
  };
}

/* ============================
   PUBLIC API
   ============================ */
export const heroes = rawHeroes.map(adaptHero);

export function getHeroById(id) {
  return heroes.find(hero => hero.id === id);
}
