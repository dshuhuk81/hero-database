import { rateHeroSkills } from "./skillAnalyzer.js";
import { synergyPotentialForHero } from "./synergyTags.js";

export const CLASS_WEIGHTS = {
  Tank: { hp: 1.2, atk: 0.9, def: 1.2, pct: 0.8 },
  Warrior: { hp: 1.1, atk: 1.2, def: 1.0, pct: 0.95 },
  Mage: { hp: 0.85, atk: 1.2, def: 0.9, pct: 1.05 },
  Archer: { hp: 0.9, atk: 1.25, def: 0.85, pct: 1.2 },
  Assassin: { hp: 0.85, atk: 1.25, def: 0.8, pct: 1.0 },
  Support: { hp: 1.0, atk: 0.95, def: 1.05, pct: 1.15 },
};

export const PERCENT_STATS_FOR_SCORE = [
  "dodgeRate",
  "hitBonus",
  "critRate",
  "critDmgBonus",
  "cooldownHaste",
  "atkSpdBonus",
  "pDmgBonus",
  "mDmgBonus",
];

export const PERCENT_STAT_WEIGHT = 4;
export const SYNERGY_WEIGHT = 5;
export const SKILL_WEIGHT = 35;

export async function computeScore(hero) {
  const s = hero.stats ?? {};

  const hp = Number(s.hp ?? 0);
  const atk = Number(s.atk ?? 0);
  const armor = Number(s.armor ?? 0);
  const mres = Number(s.magicRes ?? 0);

  const classWeights = CLASS_WEIGHTS[hero.class] ?? { hp: 1, atk: 1, def: 1, pct: 1 };

  const baseHp = hp * 0.000003;
  const baseAtk = atk * 0.00008;
  const baseDef = (armor + mres) * 0.002;

  const percentSum = PERCENT_STATS_FOR_SCORE.reduce(
    (sum, key) => sum + Number(s[key] ?? 0),
    0
  );

  // All stat components combined
  const baseScore =
    baseHp * classWeights.hp +
    baseAtk * classWeights.atk +
    baseDef * classWeights.def;

  const percentScore = percentSum * PERCENT_STAT_WEIGHT * classWeights.pct;
  const totalStatScore = baseScore + percentScore;

  // Non-stat scores
  const synergyScore = await synergyPotentialForHero(hero) * SYNERGY_WEIGHT;
  const skillScore = rateHeroSkills(hero) * SKILL_WEIGHT;

  return totalStatScore + synergyScore + skillScore;
}
