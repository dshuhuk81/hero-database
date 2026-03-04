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
export const SYNERGY_WEIGHT = 11;
export const SKILL_WEIGHT = 92;
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

function fullSkillText(hero) {
  const skills = Array.isArray(hero?.skills) ? hero.skills : [];
  return skills
    .map((skill) => {
      const base = String(skill?.description || "");
      const upgrades = skill?.upgrades
        ? Object.values(skill.upgrades)
            .map((value) => String(value || ""))
            .join(" ")
        : "";
      return `${base} ${upgrades}`;
    })
    .join(" ")
    .toLowerCase();
}

function getBuffDiversityMultiplier(tagSet, scenarioKey, teamContext = {}) {
  if (scenarioKey !== "boss") return 1.0;

  const families = {
    atkSpeed: ["ATK_SPD_UP", "ATK_SPEED"],
    atkAmp: ["ATK_UP", "BUFF_TEAM", "ENEMY_VULNERABILITY", "REMOVES_ARMOR"],
    critAmp: ["CRIT_RATE_UP", "CRIT_DMG_UP"],
    uptime: ["ENERGY_RESTORE_TEAM", "ENERGY_RESTORE", "CDR_TEAM"],
    sustain: ["HEAL_TEAM", "SHIELD_TEAM", "HEAL", "SHIELD"],
    mitigation: ["DAMAGE_REDUCTION_TEAM", "DMG_RED", "GAIN_ARMOR"],
  };

  const activeFamilies = Object.values(families).filter((tags) =>
    tags.some((tag) => tagSet.has(tag))
  ).length;

  let overlapPenalty = 0;
  const overlapPairs = [
    ["ATK_SPD_UP", "ATK_SPEED"],
    ["ENERGY_RESTORE_TEAM", "ENERGY_RESTORE"],
    ["HEAL_TEAM", "HEAL"],
    ["SHIELD_TEAM", "SHIELD"],
  ];
  overlapPairs.forEach(([a, b]) => {
    if (tagSet.has(a) && tagSet.has(b)) overlapPenalty += 0.04;
  });

  const diversityBonus = Math.min(activeFamilies * 0.025, 0.16);
  const existingTags = new Set(teamContext?.existingTags || []);

  // Team-context overlap penalty (item #3): if team already covers the same buff axis,
  // reduce incremental value (diminishing returns).
  // UPDATED: Reduced penalties for critical force-multipliers based on boss DPS testing
  // Multiple ATK SPD sources still valuable (better than defensive utility like Tefnut)
  if (tagSet.has("ATK_SPD_UP") && (existingTags.has("ATK_SPD_UP") || existingTags.has("ATK_SPEED"))) {
    overlapPenalty += 0.09; // Reduced from 0.14
  }
  if (tagSet.has("ATK_SPEED") && (existingTags.has("ATK_SPD_UP") || existingTags.has("ATK_SPEED"))) {
    overlapPenalty += 0.06; // Reduced from 0.1
  }
  if (
    (tagSet.has("ENERGY_RESTORE_TEAM") || tagSet.has("ENERGY_RESTORE")) &&
    (existingTags.has("ENERGY_RESTORE_TEAM") || existingTags.has("ENERGY_RESTORE"))
  ) {
    overlapPenalty += 0.05; // Reduced from 0.08 - energy always valuable
  }
  if (
    (tagSet.has("HEAL_TEAM") || tagSet.has("SHIELD_TEAM") || tagSet.has("DAMAGE_REDUCTION_TEAM")) &&
    (existingTags.has("HEAL_TEAM") || existingTags.has("SHIELD_TEAM") || existingTags.has("DAMAGE_REDUCTION_TEAM"))
  ) {
    overlapPenalty += 0.06; // Keep same - defensive stacking has true diminishing returns
  }

  const multiplier = 1 + diversityBonus - overlapPenalty;
  return clamp(multiplier, 0.86, 1.18);
}

function getCarryAmplificationBonus(hero, tagSet, scenarioKey, teamContext = {}) {
  if (scenarioKey !== "boss") return 0;

  const text = fullSkillText(hero);
  let bonus = 0;

  if (tagSet.has("ATK_SPD_UP")) bonus += 9;
  if (tagSet.has("ATK_UP")) bonus += 7;
  if (tagSet.has("REMOVES_ARMOR")) bonus += 7;
  if (tagSet.has("ENEMY_VULNERABILITY")) bonus += 8;

  if (/highest\s+atk|ally\s+with\s+the\s+highest\s+atk/.test(text)) bonus += 7;
  if (/all\s+allies/.test(text) && /atk\s*spd|attack\s*speed/.test(text)) bonus += 6;
  if (/armor\s*pen|armor\s*penetration/.test(text)) bonus += 4;
  if (/max\s*hp/.test(text)) bonus += 5;

  // Team-context carry amplification (item #2): if this hero amplifies the declared carry,
  // increase bonus, especially for %max-HP carry archetypes.
  // UPDATED based on boss DPS testing showing Yuelao/Dionysus critical for Isis (max-HP carry)
  const carry = teamContext?.mainCarry || null;
  if (carry) {
    const carryText = String(carry.skillText || "").toLowerCase();
    const carryHasMaxHpDamage = /max\s*hp/.test(carryText);
    const carryIsEnergyHungry = /lose\s+\d+\s+energy|energy\s+every\s+\d/.test(carryText);

    // Max-HP carries scale EXTREMELY well with ATK buffs (testing showed 2.1x vs stat-based DPS)
    if (carryHasMaxHpDamage && tagSet.has("ATK_UP")) bonus += 16;
    if (carryHasMaxHpDamage && (tagSet.has("REMOVES_ARMOR") || tagSet.has("ENEMY_VULNERABILITY"))) bonus += 10;
    // Energy/CDR critical for max-HP carries (Yuelao loss = -28% DPS)
    if (carryHasMaxHpDamage && (tagSet.has("ENERGY_RESTORE_TEAM") || tagSet.has("CDR_TEAM"))) bonus += 14;
    // Generic energy-hungry carries also benefit strongly
    if (carryIsEnergyHungry && (tagSet.has("ENERGY_RESTORE_TEAM") || tagSet.has("CDR_TEAM"))) bonus += 10;
  }

  return Math.min(bonus, 28);
}

function getTeamCompositionFitBonus(hero, tagSet, scenarioKey, teamContext = {}) {
  if (scenarioKey !== "boss") return 0;

  // Boss archetype needs: damage amp + uptime + survivability + debuff support.
  let fit = 0;

  const hasAmp =
    tagSet.has("ATK_SPD_UP") ||
    tagSet.has("ATK_UP") ||
    tagSet.has("REMOVES_ARMOR") ||
    tagSet.has("ENEMY_VULNERABILITY");
  if (hasAmp) fit += 8;

  const hasUptime =
    tagSet.has("ENERGY_RESTORE_TEAM") ||
    tagSet.has("CDR_TEAM") ||
    tagSet.has("ENERGY_RESTORE");
  if (hasUptime) fit += 7;

  const hasSustain =
    tagSet.has("HEAL_TEAM") ||
    tagSet.has("SHIELD_TEAM") ||
    tagSet.has("DAMAGE_REDUCTION_TEAM");
  if (hasSustain) fit += 5;

  const hasDebuff =
    tagSet.has("REMOVES_ARMOR") ||
    tagSet.has("ENEMY_VULNERABILITY") ||
    tagSet.has("REDUCES_ATTRIBUTES");
  if (hasDebuff) fit += 4;

  // Team-context fit (item #3): reward filling missing needs, penalize redundant axes.
  // UPDATED: Reduced penalties for critical force-multipliers (boss testing showed stacking valuable)
  const existingTags = new Set(teamContext?.existingTags || []);
  const teamHasAtkSpeed = existingTags.has("ATK_SPD_UP") || existingTags.has("ATK_SPEED");
  const teamHasUptime = existingTags.has("ENERGY_RESTORE_TEAM") || existingTags.has("CDR_TEAM") || existingTags.has("ENERGY_RESTORE");
  const teamHasSustain = existingTags.has("HEAL_TEAM") || existingTags.has("SHIELD_TEAM") || existingTags.has("DAMAGE_REDUCTION_TEAM");

  if (teamHasAtkSpeed && (tagSet.has("ATK_SPD_UP") || tagSet.has("ATK_SPEED"))) fit -= 7; // Reduced from 11
  if (teamHasUptime && (tagSet.has("ENERGY_RESTORE_TEAM") || tagSet.has("CDR_TEAM") || tagSet.has("ENERGY_RESTORE"))) fit -= 3; // Reduced from 5
  if (teamHasSustain && hasSustain) fit -= 4; // Keep same

  // Strong synergy: if team has ATK SPD, adding ATK buffs/armor shred = multiplicative value
  if (teamHasAtkSpeed && tagSet.has("ATK_UP")) fit += 12; // Increased from 10
  if (teamHasAtkSpeed && tagSet.has("REMOVES_ARMOR")) fit += 7; // Increased from 5

  // Light role balancing: supports that provide amp/uptime are premium in boss teams.
  if (hero?.class === "Support" && hasAmp && hasUptime) fit += 4;

  return clamp(fit, 0, 24);
}

function getUltimateUptimeBonus(hero, tagSet, scenarioKey, teamContext = {}) {
  if (scenarioKey !== "boss") return 0;

  const text = fullSkillText(hero);
  let bonus = 0;

  if (tagSet.has("ENERGY_RESTORE_TEAM")) bonus += 10;
  if (tagSet.has("CDR_TEAM")) bonus += 8;
  if (tagSet.has("ENERGY_RESTORE")) bonus += 5;

  if (/restore[s]?\s+\d+\s+energy|energy\s+regen|recharge/.test(text)) bonus += 6;
  if (/highest\s+atk/.test(text) && /energy/.test(text)) bonus += 5;
  if (/cooldown|cd\s*-|skill\s+cd/.test(text)) bonus += 4;

  // Carry uptime priority (item #4)
  const carry = teamContext?.mainCarry || null;
  if (carry?.needsUptime && (tagSet.has("ENERGY_RESTORE_TEAM") || tagSet.has("CDR_TEAM"))) {
    bonus += 6;
  }

  return Math.min(bonus, 26);
}

/**
 * Apply scenario-specific tag weights to synergy profile
 */
async function computeSynergyScoreForScenario(hero, scenarioConfig, teamContext = {}) {
  const profile = await synergyProfileForHero(hero);
  const specificTagWeights = scenarioConfig.specificTagWeights || {};
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
  
  // Count tags with specific weights first, fallback to category weights
  const tagSet = profile.tags || new Set();

  if (tagSet.size > 0) {
    tagSet.forEach((tag) => {
      // Check if there's a specific weight for this exact tag
      if (specificTagWeights[tag] !== undefined) {
        score += specificTagWeights[tag];
      }
      // Otherwise use category-based weights
      else if (TEAM_SUPPORT_TAGS.includes(tag)) {
        score += tagWeights.teamSupport || 10;
      }
      else if (ENEMY_DEBUFF_TAGS.includes(tag)) {
        score += tagWeights.enemyDebuff || 1;
      }
      else if (SELF_BUFF_TAGS.includes(tag)) {
        score += tagWeights.selfBuff || 1;
      }
    });
  }

  const diversityMult = getBuffDiversityMultiplier(tagSet, scenarioConfig.key, teamContext);
  const carryAmpBonus = getCarryAmplificationBonus(hero, tagSet, scenarioConfig.key, teamContext);
  const teamFitBonus = getTeamCompositionFitBonus(hero, tagSet, scenarioConfig.key, teamContext);
  const uptimeBonus = getUltimateUptimeBonus(hero, tagSet, scenarioConfig.key, teamContext);

  let adjusted = score * diversityMult + carryAmpBonus + teamFitBonus + uptimeBonus;

  if (scenarioConfig.key === "boss" && Array.isArray(teamContext?.existingTags)) {
    const existingTags = new Set(teamContext.existingTags);
    const carryText = String(teamContext?.mainCarry?.skillText || "").toLowerCase();
    const carryHasMaxHpDamage = /max\s*hp/.test(carryText);
    const hasCarryTargetedBuff = /highest\s+atk|ally\s+with\s+the\s+highest\s+atk/.test(fullSkillText(hero));

    // Strong context penalties for redundant buff axis in an already-covered core.
    if (tagSet.has("ATK_SPD_UP") && (existingTags.has("ATK_SPD_UP") || existingTags.has("ATK_SPEED"))) {
      adjusted -= 18;
    }
    if (
      (tagSet.has("HEAL_TEAM") || tagSet.has("SHIELD_TEAM") || tagSet.has("DAMAGE_REDUCTION_TEAM")) &&
      (existingTags.has("HEAL_TEAM") || existingTags.has("SHIELD_TEAM") || existingTags.has("DAMAGE_REDUCTION_TEAM"))
    ) {
      adjusted -= 10;
    }

    // Strong carry amplification for ATK buffs when carry scales with %max-HP or ATK cap.
    if (carryHasMaxHpDamage && tagSet.has("ATK_UP")) {
      adjusted += 22;
    }
    if (carryHasMaxHpDamage && (tagSet.has("ENERGY_RESTORE_TEAM") || tagSet.has("CDR_TEAM"))) {
      adjusted += 12;
    }

    // In a carry-centric setup, secondary DPS without direct carry amplification
    // is less valuable than supports that multiply carry uptime/damage.
    const isDamageClass = ["Archer", "Assassin", "Mage", "Warrior"].includes(hero?.class);
    if (isDamageClass && tagSet.has("ATK_SPD_UP") && (existingTags.has("ATK_SPD_UP") || existingTags.has("ATK_SPEED"))) {
      adjusted -= 14;
    }
    if (isDamageClass && !tagSet.has("HEAL_TEAM") && !tagSet.has("SHIELD_TEAM") && !tagSet.has("DAMAGE_REDUCTION_TEAM")) {
      adjusted -= 8;
    }
    if (isDamageClass && !hasCarryTargetedBuff && !tagSet.has("ATK_UP") && !tagSet.has("ENERGY_RESTORE_TEAM")) {
      adjusted -= 16;
    }
  }
  
  if (scenarioConfig.key === "boss" && Array.isArray(teamContext?.existingTags)) {
    return Math.min(adjusted, 140);
  }
  return Math.min(adjusted, 100);
}

/**
 * Compute score for a specific scenario (boss, campaign, pvp)
 * Applies scenario-specific weights, assumed item builds, and tag priorities
 */
export async function computeScoreForScenario(hero, scenarioKey = "general", teamContext = {}) {
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
  const synergyScore = await computeSynergyScoreForScenario(hero, scenario, teamContext) * SYNERGY_WEIGHT;

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
