/**
 * Analysiert Skill-Beschreibungen automatisch auf:
 * - AoE vs Single-Target
 * - Damage Multiplier
 * - CC-Effekte (Stun, Slow, etc.)
 * - Utility (Heal, Buff, Energy-Gain, etc.)
 */

const CC_KEYWORDS = [
  "stun",
  "slow",
  "root",
  "taunted",
  "taunt",
  "charm",
  "sleep",
  "freeze",
  "silence",
  "disarm",
  "petrify",
  "knockback",
  "fear",
  "debuff",
  "reduce dmg",
  "immobilize",
  "suppress",
  "numb",
  "weaken",
];

const UTILITY_KEYWORDS = [
  "heal",
  "shield",
  "buff",
  "increase",
  "energy",
  "cooldown",
  "reflect",
  "lifesteal",
  "dodge",
  "crit",
  "regenerate",
  "restore",
  "recovery",
  "recharge",
];

const AOE_KEYWORDS = [
  "all units",
  "all enemies",
  "nearby",
  "area",
  "aoe",
  "strikes 3 times",
  "strikes enemies",
  "multi-hit",
  "attacks multiple",
];

const SINGLE_TARGET_KEYWORDS = [
  "the target",
  "front enemy",
  "single",
  "one enemy",
  "lowest hp",
  "highest atk",
];

/**
 * Extrahiert den Damage-Multiplier aus der Skill-Beschreibung
 * z.B. "120% of ATK" -> 120
 */
export function extractDamageMultiplier(description) {
  const match = description.match(/(\d+)%\s*(?:of|ATK|DMG)/i);
  return match ? parseInt(match[1]) : 0;
}

/**
 * Prüft ob der Skill AoE ist
 */
export function isAoE(description) {
  return AOE_KEYWORDS.some((keyword) =>
    description.toLowerCase().includes(keyword)
  );
}

/**
 * Zählt wie viele CC-Effekte der Skill hat
 */
export function countCCEffects(description) {
  return CC_KEYWORDS.filter((keyword) =>
    description.toLowerCase().includes(keyword)
  ).length;
}

/**
 * Zählt wie viele Utility-Effekte der Skill hat
 */
export function countUtilityEffects(description) {
  return UTILITY_KEYWORDS.filter((keyword) =>
    description.toLowerCase().includes(keyword)
  ).length;
}

/**
 * Bewertet einen einzelnen Skill mit Details
 */
export function rateSkill(skill, isUltimate = false) {
  const description = skill.description || "";
  let score = 0;

  // Base Damage Score (multiplier dependent)
  const dmgMultiplier = extractDamageMultiplier(description);
  const damageScore = Math.min(dmgMultiplier / 50, 2); // Cap at 2 points

  // AoE Bonus
  const aoeBonus = isAoE(description) ? 1.5 : 1;

  // CC Effects Score
  const ccCount = countCCEffects(description);
  const ccScore = ccCount * 0.8;

  // Utility Score
  const utilityCount = countUtilityEffects(description);
  const utilityScore = utilityCount * 0.6;

  // Ultimate Bonus
  const ultimateMultiplier = isUltimate ? 1.3 : 1.0;

  score =
    (damageScore + ccScore + utilityScore) * aoeBonus * ultimateMultiplier;

  return Math.round(score * 100) / 100;
}

/**
 * Bewertet einen einzelnen Skill mit Debug-Details
 */
export function rateSkillDebug(skill, isUltimate = false) {
  const description = skill.description || "";

  const dmgMultiplier = extractDamageMultiplier(description);
  const damageScore = Math.min(dmgMultiplier / 50, 2);
  const aoeBonus = isAoE(description) ? 1.5 : 1;
  const ccCount = countCCEffects(description);
  const ccScore = ccCount * 0.8;
  const utilityCount = countUtilityEffects(description);
  const utilityScore = utilityCount * 0.6;
  const ultimateMultiplier = isUltimate ? 1.3 : 1.0;

  const baseScore = damageScore + ccScore + utilityScore;
  const finalScore = baseScore * aoeBonus * ultimateMultiplier;

  return {
    name: skill.name,
    dmgMultiplier,
    damageScore,
    isAoE: aoeBonus > 1,
    aoeBonus,
    ccCount,
    ccScore,
    utilityCount,
    utilityScore,
    isUltimate,
    ultimateMultiplier,
    baseScore,
    finalScore: Math.round(finalScore * 100) / 100,
  };
}

/**
 * Bewertet alle Skills eines Heroes
 */
export function rateHeroSkills(hero) {
  if (!hero.skills || hero.skills.length === 0) {
    return 0;
  }

  const skillScores = hero.skills.map((skill, index) => {
    const isUltimate = index === hero.skills.length - 1; // Letzter Skill ist meist Ultimate
    return rateSkill(skill, isUltimate);
  });

  // Average der Skill-Scores mit Gewichtung auf Ultimate
  const avgSkillScore = skillScores.reduce((a, b) => a + b, 0) / skillScores.length;
  
  return Math.round(avgSkillScore * 100) / 100;
}
