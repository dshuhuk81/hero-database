/**
 * Reworked Skill Analyzer - Role-aware, Scaling-aware, Quality-aware
 * 
 * Considers:
 * - Damage quality tiers (weak: 50-150%, normal: 150-250%, strong: 250%+)
 * - Team-wide vs personal effects
 * - Scaling mechanics (state-based, stacks, per-ally, per-class)
 * - Role-specific value (DPS wants damage, Support wants buffs/heals)
 * - Skill maturity (upgrades indicate progression)
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
  "strikes enemies",
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

// NEW: Scaling detection keywords indicating exponential/multiplicative value
// CONSERVATIVE: Only match keywords that clearly indicate scaling/stacking
const SCALING_KEYWORDS = [
  "stack",
  "stacks",
  "per ally",
  "per class",
  "per unit",
  "unique ally",
  "scales with",
];

// NEW: Team-wide effect keywords (multiply value by 3-5x)
const TEAM_KEYWORDS = [
  "all allies",
  "all friendly",
  "entire team",
];

// NEW: Carry/DPS indicators for basic-attack scalers and uptime damage
const CARRY_KEYWORDS = [
  "normal attack",
  "normal attacks",
  "basic attack",
  "basic attacks",
  "atk spd",
  "atk speed",
  "attack speed",
  "armor pen",
  "armor penetration",
  "damage taken",
  "takes more dmg",
  "true dmg",
  "true damage",
  "attack range",
  "range becomes",
];

/**
 * NEW: Utility keywords with actual weights
 * Shields increased (1.3), Immunity strong (1.2), Healing good (1.2)
 */
const UTILITY_WEIGHT_MAP = {
  "heal": 1.2,
  "shield": 1.3,        // INCREASED: was implicit 0.6
  "buff": 0.8,
  "increase": 0.5,      // Generic, low value
  "atk spd": 1.1,
  "atk speed": 1.1,
  "attack speed": 1.1,
  "atk by": 1.0,
  "armor pen": 1.0,
  "armor penetration": 1.0,
  "attack range": 0.7,
  "range becomes": 0.7,
  "energy": 0.9,
  "cooldown": 0.9,      // Important resource
  "reflect": 1.0,
  "lifesteal": 1.1,
  "dodge": 0.8,
  "crit": 0.7,
  "regenerate": 1.0,
  "restore": 0.9,
  "recovery": 0.9,
  "recharge": 0.9,
  "immunity": 1.2,      // NEW: Very strong defensive
  "debuff": 0.6,
};

/**
 * NEW: Extracts MAX damage from skill INCLUDING all upgrade levels
 * Returns the highest damage % found across base + all upgrades
 */
export function extractMaxDamageFromSkill(skill) {
  let maxDamage = 0;
  
  // Check base description
  if (skill.description) {
    const baseMatches = skill.description.match(/(\d+)%\s*(?:of|ATK|DMG|atk|dmg)/gi);
    if (baseMatches) {
      baseMatches.forEach(m => {
        const num = parseInt(m.match(/\d+/)[0]);
        maxDamage = Math.max(maxDamage, num);
      });
    }
  }
  
  // Check ALL upgrade levels for higher damage values
  if (skill.upgrades) {
    Object.values(skill.upgrades).forEach(upgrade => {
      if (typeof upgrade === 'string') {
        const upgradeMatches = upgrade.match(/(\d+)%\s*(?:of|ATK|DMG|atk|dmg)/gi);
        if (upgradeMatches) {
          upgradeMatches.forEach(m => {
            const num = parseInt(m.match(/\d+/)[0]);
            maxDamage = Math.max(maxDamage, num);
          });
        }
      } else if (typeof upgrade === 'object' && upgrade.description) {
        const upgradeMatches = upgrade.description.match(/(\d+)%\s*(?:of|ATK|DMG|atk|dmg)/gi);
        if (upgradeMatches) {
          upgradeMatches.forEach(m => {
            const num = parseInt(m.match(/\d+/)[0]);
            maxDamage = Math.max(maxDamage, num);
          });
        }
      }
    });
  }
  
  return maxDamage;
}

/**
 * NEW: Rates damage quality tier instead of raw percentage
 * Weak: 50-150%, Normal: 150-250%, Strong: 250-400%, Exceptional: 400%+
 * Returns 0-3 points based on quality tier
 */
export function rateDamageQuality(dmgPercentage) {
  if (dmgPercentage < 100) return 0.3;    // Tiny damage
  if (dmgPercentage < 150) return 0.7;    // Weak
  if (dmgPercentage < 250) return 1.2;    // Normal
  if (dmgPercentage < 350) return 1.8;    // Strong
  if (dmgPercentage < 450) return 2.3;    // Very strong
  return 2.8;                              // Exceptional
}

/**
 * NEW: Extracts healing/shield percentages and rates quality
 */
export function extractHealingValue(description) {
  const healMatch = description.match(/heal[a-z\s]*equal to (\d+)%|shield[a-z\s]*equal to (\d+)%/i);
  if (!healMatch) return 0;
  
  const percent = parseInt(healMatch[1] || healMatch[2]);
  
  // Similar tiering for healing/shields
  if (percent < 100) return 0.4;
  if (percent < 200) return 0.9;
  if (percent < 300) return 1.4;
  return 2.0;
}

/**
 * NEW: Detects team-wide effects and returns multiplier
 * Personal effect: 1.0x
 * Team effect: 3.0x (applies to all allies)
 * Stack/Scaling effect: 5.0x (exponential potential)
 */
export function getTeamEffectMultiplier(description) {
  const desc = description.toLowerCase();
  
  // Detect stacking/scaling (exponential value)
  const hasScaling = SCALING_KEYWORDS.some(kw => desc.includes(kw));
  if (hasScaling) return 5.0;
  
  // Detect team-wide (multiplicative value)
  const isTeamWide = TEAM_KEYWORDS.some(kw => desc.includes(kw));
  if (isTeamWide) return 3.0;
  
  return 1.0; // Personal effect only
}

/**
 * NEW: Detects carry/DPS mechanics (basic-attack scaling, ATK SPD, armor pen, etc)
 * Applies only to DPS-ish classes to avoid inflating supports/tanks.
 */
export function getCarryDpsMultiplier(description, heroClass) {
  const dpsClasses = new Set(["Mage", "Archer", "Assassin", "Warrior"]);
  if (!dpsClasses.has(heroClass)) return 1.0;

  const desc = description.toLowerCase();
  let bonus = 0;

  if (desc.includes("normal attack") || desc.includes("basic attack")) bonus += 0.25;
  if (desc.includes("atk spd") || desc.includes("atk speed") || desc.includes("attack speed")) bonus += 0.2;
  if (desc.includes("armor pen") || desc.includes("armor penetration")) bonus += 0.15;
  if (desc.includes("damage taken") || desc.includes("takes more dmg")) bonus += 0.15;
  if (desc.includes("true dmg") || desc.includes("true damage")) bonus += 0.15;
  if (desc.includes("attack range") || desc.includes("range becomes")) bonus += 0.1;

  if (bonus === 0) return 1.0;
  return Math.min(1.0 + bonus, 1.6);
}

/**
 * NEW: Detects state-uptime carry boost for heroes with persistent states that enhance DPS
 * E.g., "while in [Lotus Embodied] state, ATK +30%" -> sustained carry damage boost
 * Applies additional multiplier only if state + carry buff are both present
 */
export function getStateCarryMultiplier(description, heroClass) {
  const dpsClasses = new Set(["Mage", "Archer", "Assassin", "Warrior"]);
  if (!dpsClasses.has(heroClass)) return 1.0;

  const desc = description.toLowerCase();
  
  // Check for state mention (e.g., "[Lotus Embodied]", "[Slumber]", "[Omniscient]")
  const hasState = /\[.*?\]/.test(desc) && (
    desc.includes("while") || desc.includes("in the") || desc.includes("state")
  );
  
  if (!hasState) return 1.0;

  // Check for carry-favorable buffs within same sentence/skill
  let carryBonus = 0;
  if (desc.includes("atk") || desc.includes("attack")) carryBonus += 0.2;
  if (desc.includes("atk spd") || desc.includes("atk speed") || desc.includes("attack speed")) carryBonus += 0.15;
  if (desc.includes("dmg") || desc.includes("damage")) carryBonus += 0.1;
  if (desc.includes("lifesteal") || desc.includes("life steal")) carryBonus += 0.1;

  if (carryBonus === 0) return 1.0;
  return Math.min(1.0 + carryBonus, 1.5);
}

/**
 * NEW: Role-based weighting to align skill power with hero effectiveness
 */
export function getClassWeights(heroClass) {
  const weights = {
    // DPS Heroes: Prioritize damage and AoE
    Mage: { damage: 2.5, aoe: 1.8, cc: 0.6, utility: 0.5, healing: 0.0 },
    Archer: { damage: 2.5, aoe: 1.6, cc: 0.5, utility: 0.8, healing: 0.0 },
    Assassin: { damage: 2.6, aoe: 1.0, cc: 0.8, utility: 0.6, healing: 0.0 },
    
    // Tanks: Prioritize defense and CC
    Tank: { damage: 0.6, aoe: 0.8, cc: 1.4, utility: 1.5, healing: 1.2 },
    
    // Warriors: Mixed - damage and tankiness
    Warrior: { damage: 1.5, aoe: 1.2, cc: 1.0, utility: 1.0, healing: 0.8 },
    
    // Support: Prioritize utility and heals
    Support: { damage: 0.2, aoe: 0.5, cc: 0.6, utility: 2.5, healing: 2.5 },
  };
  
  return weights[heroClass] || { damage: 1, aoe: 1, cc: 1, utility: 1, healing: 1 };
}

/**
 * NEW: Counts unique CC types (stun + slow = 2, better than just keyword count)
 */
export function countUniqueCCTypes(description) {
  const ccTypes = new Set();
  const desc = description.toLowerCase();
  
  CC_KEYWORDS.forEach(keyword => {
    if (desc.includes(keyword)) ccTypes.add(keyword);
  });
  
  return ccTypes.size;
}

/**
 * Helper: Prüft ob der Skill AoE ist
 */
export function isAoE(description) {
  return AOE_KEYWORDS.some((keyword) =>
    description.toLowerCase().includes(keyword)
  );
}

/**
 * NEW: Extract utility keywords with weighted values
 */
export function countUtilityWithWeights(description) {
  const desc = description.toLowerCase();
  let totalWeight = 0;
  
  Object.entries(UTILITY_WEIGHT_MAP).forEach(([keyword, weight]) => {
    if (desc.includes(keyword)) {
      totalWeight += weight;
    }
  });
  
  return totalWeight;
}

/**
 * NEW: Hero level cap multiplier - uses RARITY not level field
 * Epic heroes (Rarity:Epic, cap 140) shouldn't score as high as Legends (Rarity:Legendary, cap 300)
 * Normalizes: Legendary=1.0x, Mythic=0.82x, Epic=0.65x, Rare=0.45x
 */
export function getHeroLevelMultiplier(hero) {
  // Use rarity as source of truth (more reliable than level field)
  const rarity = hero.rarity || 'Legendary';
  
  const rarityMultipliers = {
    'Legendary': 1.0,
    'Mythic': 0.82,
    'Epic': 0.65,
    'Rare': 0.45,
    'Uncommon': 0.30,
    'Common': 0.20,
  };
  
  return rarityMultipliers[rarity] || 1.0;
}

/**
 * NEW: Role-aware ATK damage penalty
 * DPS classes benefit from ATK%, Tanks/Supports don't
 */
export function getATKDamagePenalty(heroClass) {
  const penalties = {
    Mage: 1.0,           // Full value
    Archer: 1.0,         // Full value
    Assassin: 1.0,       // Full value
    Warrior: 0.85,       // 15% penalty
    Tank: 0.60,          // 40% penalty
    Support: 0.40,       // 60% penalty
  };
  
  return penalties[heroClass] || 1.0;
}

/**
 * NEW: Comprehensive skill rating with upgrade extraction & rarity normalization
 */
export function rateSkill(skill, heroClass = "Warrior", isUltimate = false, hero = null) {
  const description = skill.description || "";
  if (!description) return 0;
  
  const classWeights = getClassWeights(heroClass);
  const atkPenalty = getATKDamagePenalty(heroClass);
  const rarityMult = hero ? getHeroLevelMultiplier(hero) : 1.0;

  // === DAMAGE QUALITY (with upgrade extraction) ===
  const maxDamage = extractMaxDamageFromSkill(skill);
  const damageQuality = rateDamageQuality(maxDamage);
  const multiHitBonus = description.toLowerCase().includes("multi") ? 0.3 : 0;
  const damageComponent = (damageQuality + multiHitBonus) * atkPenalty * classWeights.damage;

  // === AoE DETECTION ===
  const hasAoE = isAoE(description);
  const aoeComponent = hasAoE ? 1.0 * classWeights.aoe : 0;

  // === CC EFFECTS ===
  const ccCount = countUniqueCCTypes(description);
  const ccComponent = Math.min(ccCount * 0.5, 1.5) * classWeights.cc;

  // === HEALING/SHIELDS (with new weights) ===
  const healValue = extractHealingValue(description);
  const healComponent = healValue * classWeights.healing;
  
  // === UTILITY (now with weighted keywords) ===
  const utilityWeight = countUtilityWithWeights(description);
  const utilityComponent = Math.min(utilityWeight * 0.25, 1.5) * classWeights.utility;

  // === TEAM EFFECT MULTIPLIER ===
  const teamMultiplier = getTeamEffectMultiplier(description);

  // === CARRY/DPS MULTIPLIER ===
  const carryMultiplier = getCarryDpsMultiplier(description, heroClass);

  // === STATE-CARRY MULTIPLIER (for persistent state buffs) ===
  const stateCarryMultiplier = getStateCarryMultiplier(description, heroClass);

  // === ULTIMATE BONUS ===
  const ultimateBonus = isUltimate ? 1.15 : 1.0;

  // === SKILL MATURITY ===
  const hasUpgrades = skill.upgrades && 
    (skill.upgrades.level2 || skill.upgrades.level3 || skill.upgrades.level4);
  const maturityBonus = hasUpgrades ? 1.1 : 1.0;

  // FINAL CALCULATION with rarity normalization
  const score = (
    damageComponent +
    aoeComponent +
    ccComponent +
    healComponent +
    utilityComponent
  ) * teamMultiplier * carryMultiplier * stateCarryMultiplier * ultimateBonus * maturityBonus * rarityMult;

  return Math.round(score * 100) / 100;
}

/**
 * NEW: Debug version to understand skill scoring
 */
export function rateSkillDebug(skill, heroClass = "Warrior", isUltimate = false, hero = null) {
  const description = skill.description || "";
  if (!description) return { name: skill.name, score: 0, reason: "No description" };
  
  const classWeights = getClassWeights(heroClass);
  const atkPenalty = getATKDamagePenalty(heroClass);
  const rarityMult = hero ? getHeroLevelMultiplier(hero) : 1.0;

  const maxDamage = extractMaxDamageFromSkill(skill);
  const damageQuality = rateDamageQuality(maxDamage);
  const multiHitBonus = description.toLowerCase().includes("multi") ? 0.3 : 0;
  const damageComponent = (damageQuality + multiHitBonus) * atkPenalty * classWeights.damage;

  const hasAoE = isAoE(description);
  const aoeComponent = hasAoE ? 1.0 * classWeights.aoe : 0;

  const ccCount = countUniqueCCTypes(description);
  const ccComponent = Math.min(ccCount * 0.5, 1.5) * classWeights.cc;

  const healValue = extractHealingValue(description);
  const healComponent = healValue * classWeights.healing;

  const utilityWeight = countUtilityWithWeights(description);
  const utilityComponent = Math.min(utilityWeight * 0.25, 1.5) * classWeights.utility;

  const teamMultiplier = getTeamEffectMultiplier(description);
  const carryMultiplier = getCarryDpsMultiplier(description, heroClass);
  const stateCarryMultiplier = getStateCarryMultiplier(description, heroClass);
  const ultimateBonus = isUltimate ? 1.15 : 1.0;
  const hasUpgrades = skill.upgrades && (skill.upgrades.level2 || skill.upgrades.level3 || skill.upgrades.level4);
  const maturityBonus = hasUpgrades ? 1.1 : 1.0;

  const baseScore = damageComponent + aoeComponent + ccComponent + healComponent + utilityComponent;
  const finalScore = baseScore * teamMultiplier * carryMultiplier * stateCarryMultiplier * ultimateBonus * maturityBonus * rarityMult;

  return {
    name: skill.name,
    description: description.substring(0, 60) + "...",
    maxDamageMultiplier: maxDamage,
    damageQuality: damageQuality.toFixed(2),
    atkPenalty: atkPenalty.toFixed(2),
    damageComponent: damageComponent.toFixed(2),
    hasAoE,
    aoeComponent: aoeComponent.toFixed(2),
    ccCount,
    ccComponent: ccComponent.toFixed(2),
    healValue: healValue.toFixed(2),
    healComponent: healComponent.toFixed(2),
    utilityWeight: utilityWeight.toFixed(2),
    utilityComponent: utilityComponent.toFixed(2),
    teamMultiplier: teamMultiplier.toFixed(1),
    carryMultiplier: carryMultiplier.toFixed(2),
    stateCarryMultiplier: stateCarryMultiplier.toFixed(2),
    ultimateBonus: ultimateBonus.toFixed(2),
    maturityBonus: maturityBonus.toFixed(2),
    rarityMult: rarityMult.toFixed(2),
    baseScore: Math.round(baseScore * 100) / 100,
    finalScore: Math.round(finalScore * 100) / 100,
  };
}

/**
 * Rate all hero skills with level cap consideration
 * Epic heroes at 140 get 0.65x multiplier, Legendaries at 300 get 1.0x
 */
export function rateHeroSkills(hero) {
  if (!hero.skills || hero.skills.length === 0) {
    return 0;
  }

  // Only mark as ultimate if hero has 3+ skills
  const skillScores = hero.skills.map((skill, index) => {
    const isUltimate = index === hero.skills.length - 1 && hero.skills.length >= 3;
    return rateSkill(skill, hero.class, isUltimate, hero);
  });

  // Average skill score
  const avgSkillScore = skillScores.reduce((a, b) => a + b, 0) / skillScores.length;
  
  return Math.round(avgSkillScore * 100) / 100;
}

/**
 * Get hero skill profile for UI display
 * Returns: { topSkill: {name, score}, archetype: string }
 */
export function getHeroSkillProfile(hero) {
  if (!hero.skills || hero.skills.length === 0) {
    return { topSkill: null, archetype: "Unknown" };
  }

  // Rate each skill with debug info
  const skillDebugInfo = hero.skills.map((skill, index) => {
    const isUltimate = index === hero.skills.length - 1 && hero.skills.length >= 3;
    return rateSkillDebug(skill, hero.class, isUltimate, hero);
  });

  // Find top skill
  const topSkillIndex = skillDebugInfo.reduce((maxIdx, skill, idx) => {
    return skill.finalScore > skillDebugInfo[maxIdx].finalScore ? idx : maxIdx;
  }, 0);

  const topSkill = {
    name: skillDebugInfo[topSkillIndex].name,
    score: skillDebugInfo[topSkillIndex].finalScore,
  };

  // Determine archetype from skill composition
  const avgCarryMult = skillDebugInfo.reduce((sum, s) => sum + parseFloat(s.carryMultiplier), 0) / skillDebugInfo.length;
  const avgStateCarryMult = skillDebugInfo.reduce((sum, s) => sum + parseFloat(s.stateCarryMultiplier), 0) / skillDebugInfo.length;
  const avgHealComponent = skillDebugInfo.reduce((sum, s) => sum + parseFloat(s.healComponent), 0) / skillDebugInfo.length;
  const avgCCComponent = skillDebugInfo.reduce((sum, s) => sum + parseFloat(s.ccComponent), 0) / skillDebugInfo.length;
  const avgDamageComponent = skillDebugInfo.reduce((sum, s) => sum + parseFloat(s.damageComponent), 0) / skillDebugInfo.length;
  const avgUtilityComponent = skillDebugInfo.reduce((sum, s) => sum + parseFloat(s.utilityComponent), 0) / skillDebugInfo.length;

  let archetype = "Balanced";

  // Strong carry/DPS indicator
  if (avgCarryMult > 1.15 || avgStateCarryMult > 1.15) {
    archetype = "Strong Basic-Attack Carry";
  }
  // State-carry indicator
  else if (avgStateCarryMult > 1.05) {
    archetype = "State-Based Carry Buff";
  }
  // Support/Healer
  else if (avgHealComponent > 1.0 && hero.role === "Support") {
    archetype = "Support Healer";
  }
  // CC-focused
  else if (avgCCComponent > 1.2) {
    archetype = "Crowd Control Specialist";
  }
  // Damage-focused
  else if (avgDamageComponent > 3.0) {
    archetype = "High Burst Damage";
  }
  // Tank/Utility
  else if (avgUtilityComponent > 1.2 && hero.role === "Tank") {
    archetype = "Defensive Tank";
  }
  // Support utility
  else if (avgUtilityComponent > 1.0) {
    archetype = "Support Utility";
  }

  return {
    topSkill,
    archetype,
  };
}
