import { getHeroLevelMultiplier, rateHeroSkills } from "./skillAnalyzer.js";
import { synergyPotentialForHero, synergyProfileForHero } from "./synergyTags.js";
import { getScenarioConfig } from "./scenarios.js";

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

export const PERCENT_STAT_WEIGHT = 1;
export const SYNERGY_WEIGHT = 12;
export const SKILL_WEIGHT = 100;
const STAT_NORMALIZATION = 300;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

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

  const statAnchor = 0.6 + 0.4 * clamp(totalStatScore / STAT_NORMALIZATION, 0, 1);
  const rarityAnchor = 0.85 + 0.15 * getHeroLevelMultiplier(hero);
  const skillScore = rateHeroSkills(hero) * statAnchor * rarityAnchor * SKILL_WEIGHT;

  return totalStatScore + synergyScore + skillScore;
}

/**
 * Merge hero base stats with assumed item build for a scenario
 * If hero stat is 0, use assumed value; otherwise use hero's value
 */
function mergeStatsWithAssumedBuild(heroStats, assumedBuild) {
  const merged = { ...heroStats };
  
  Object.keys(assumedBuild).forEach((key) => {
    const heroValue = Number(heroStats[key] ?? 0);
    const assumedValue = assumedBuild[key];
    
    // Use assumed if hero base is 0, otherwise keep hero's equipped value
    merged[key] = heroValue === 0 ? assumedValue : heroValue;
  });
  
  return merged;
}

/**
 * Apply scenario-specific tag weights to synergy profile
 */
async function computeSynergyScoreForScenario(hero, scenarioConfig) {
  const profile = await synergyProfileForHero(hero);
  const tagWeights = scenarioConfig.tagWeights;
  
  let score = 0;
  
  // Map tag names to their categories
  const TEAM_SUPPORT_TAGS = [
    "ENERGY_RESTORE_TEAM", "CDR_TEAM", "ATK_SPD_UP", "BUFF_TEAM",
    "SHIELD_TEAM", "HEAL_TEAM", "DEBUFF_CLEANSE_TEAM",
    "DAMAGE_REDUCTION_TEAM", "CC_IMMUNITY_TEAM"
  ];
  
  const ENEMY_DEBUFF_TAGS = [
    "ATK_DOWN", "ATK_SPD_DOWN", "BUFF_DISPEL", "CROWD_CONTROL",
    "ENEMY_VULNERABILITY", "ENERGY_DRAIN", "REDUCES_ATTRIBUTES",
    "REMOVES_ARMOR", "TAUNT"
  ];
  
  const SELF_BUFF_TAGS = [
    "ATK_SPEED", "ATK_UP", "CC_RESISTANCE", "DMG_RED", "DODGE_BUFF",
    "ENERGY_RESTORE", "GAIN_ARMOR", "HEAL", "HEAL_EFFECT_UP",
    "HIT_AVOID", "HP_UP", "LIFE_STEAL_UP", "SHIELD"
  ];
  
  // Count tags in each category
  if (profile.tags) {
    TEAM_SUPPORT_TAGS.forEach((tag) => {
      if (profile.tags.has(tag)) {
        score += tagWeights.teamSupport || 10;
      }
    });
    
    ENEMY_DEBUFF_TAGS.forEach((tag) => {
      if (profile.tags.has(tag)) {
        score += tagWeights.enemyDebuff || 1;
      }
    });
    
    SELF_BUFF_TAGS.forEach((tag) => {
      if (profile.tags.has(tag)) {
        score += tagWeights.selfBuff || 1;
      }
    });
  }
  
  return Math.min(score, 100);
}

/**
 * Compute score for a specific scenario (boss, campaign, pvp)
 * Applies scenario-specific weights, assumed item builds, and tag priorities
 */
export async function computeScoreForScenario(hero, scenarioKey = "general") {
  const scenario = getScenarioConfig(scenarioKey);
  const weights = scenario.weights;
  
  // Merge hero stats with assumed item build
  const mergedStats = mergeStatsWithAssumedBuild(
    hero.stats ?? {},
    scenario.assumedBuild
  );
  
  const heroWithMergedStats = { ...hero, stats: mergedStats };
  
  // Compute stat score with merged stats
  const s = mergedStats;
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

  const baseScore =
    baseHp * classWeights.hp +
    baseAtk * classWeights.atk +
    baseDef * classWeights.def;

  const percentScore = percentSum * PERCENT_STAT_WEIGHT * classWeights.pct;
  const totalStatScore = baseScore + percentScore;

  // Scenario-specific synergy score
  const synergyScore = await computeSynergyScoreForScenario(hero, scenario) * SYNERGY_WEIGHT;

  // Skill score (same calculation, but could apply scenario filters later)
  const statAnchor = 0.6 + 0.4 * clamp(totalStatScore / STAT_NORMALIZATION, 0, 1);
  const rarityAnchor = 0.85 + 0.15 * getHeroLevelMultiplier(hero);
  const skillScore = rateHeroSkills(hero) * statAnchor * rarityAnchor * SKILL_WEIGHT;

  // Apply scenario weights to all components
  return (
    totalStatScore * weights.stats +
    synergyScore * weights.synergies +
    skillScore * weights.skills
  ) / (weights.stats + weights.synergies + weights.skills);
}
