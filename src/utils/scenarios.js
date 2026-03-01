/**
 * Scenario-based rating configurations
 * Each scenario defines:
 * - weights: How much stats/synergies/skills matter
 * - assumedBuild: Item stat values that heroes are assumed to have
 * - skillFilters: Multipliers for hero skill types
 * - tagWeights: How much each synergy tag type contributes
 *
 * This lets us show "what's the best hero for this specific situation?"
 * while keeping the general rating for overall power level.
 */

export const SCENARIOS = {
  general: {
    key: 'general',
    name: 'Overall Rating',
    description: 'General power level across all situations',
    icon: '⭐',
    weights: {
      stats: 1.0,
      synergies: 1.0,
      skills: 1.0,
    },
    // General assumes no/minimal items
    assumedBuild: {
      dodgeRate: 0,
      hitBonus: 0,
      critRate: 0,
      critRes: 0,
      critDmgBonus: 0,
      critDmgRed: 0,
      atkSpdBonus: 0,
      pDmgBonus: 0,
      mDmgBonus: 0,
    },
    tagWeights: {
      teamSupport: 10,
      enemyDebuff: 1,
      selfBuff: 1,
    },
    skillFilters: {
      penalizeAoe: 0.0,
      bonusStateCarry: 0.0,
      bonusSingleTarget: 0.0,
    },
  },

  boss: {
    key: 'boss',
    name: 'Boss Rating',
    description: 'Single-target sustained damage vs hard bosses',
    icon: '⚔️',
    weights: {
      stats: 1.15,    // Stats matter slightly more (sustained fight)
      synergies: 0.4, // Team synergies less relevant
      skills: 1.5,    // Skills critical (big boss mechanics)
    },
    // Boss fight: focus on survival + single-target damage
    assumedBuild: {
      dodgeRate: 0.08,         // Moderate dodge (survival)
      hitBonus: 0.12,          // Some hit (prevent immune)
      critRate: 0.25,          // Solid crit for burst windows
      critRes: 0.18,           // Good crit res (survive bursts)
      critDmgBonus: 0.32,      // Decent crit dmg
      critDmgRed: 0.28,        // Strong crit reduction (survival)
      atkSpdBonus: 0.08,       // Low AS (sustained DPS, not rush)
      pDmgBonus: 0.18,         // Physical damage
      mDmgBonus: 0.18,         // Magic damage
    },
    tagWeights: {
      teamSupport: 2,          // Heavily reduced (solo fight)
      enemyDebuff: 20,         // Debuffs critical
      selfBuff: 15,            // Self-buffs valuable (carry yourself)
    },
    skillFilters: {
      penalizeAoe: 0.6,        // -40% for AOE (waste)
      bonusStateCarry: 1.3,    // +30% for [State] mechanics
      bonusSingleTarget: 1.2,  // +20% for single-target
    },
  },

  campaign: {
    key: 'campaign',
    name: 'Campaign Rating',
    description: 'AOE damage in 5v5 team encounters',
    icon: '🌍',
    weights: {
      stats: 0.95,
      synergies: 1.8,   // Team synergies critical
      skills: 1.25,
    },
    // Campaign: maximize damage output, less defense
    assumedBuild: {
      dodgeRate: 0.06,         // Lower dodge (speed over survival)
      hitBonus: 0.22,          // Higher hit (control fights)
      critRate: 0.30,          // High crit
      critRes: 0.12,           // Lower crit res (speed over defense)
      critDmgBonus: 0.38,      // High crit dmg (burst)
      critDmgRed: 0.18,        // Lower reduction (offensive build)
      atkSpdBonus: 0.22,       // High AS (more hits = more damage)
      pDmgBonus: 0.24,         // Maximize physical
      mDmgBonus: 0.24,         // Maximize magic
    },
    tagWeights: {
      teamSupport: 18,         // Team support valuable
      enemyDebuff: 8,          // Some debuffs help
      selfBuff: 4,             // Less relevant
    },
    skillFilters: {
      bonusAoe: 1.5,           // +50% for AOE
      bonusCrowdControl: 1.35, // +35% for CC
      penalizeSingleTarget: 0.9, // -10% single-target (less relevant)
    },
  },

  pvp: {
    key: 'pvp',
    name: 'PvP Arena Rating',
    description: 'Balanced burst + survival in 5v5 arena',
    icon: '⚡',
    weights: {
      stats: 1.05,
      synergies: 1.3,    // Reduced from 2.0 to balance solo carries vs team players
      skills: 1.3,
    },
    // PvP: balanced offensive/defensive
    assumedBuild: {
      dodgeRate: 0.12,         // Decent dodge (vs player skill)
      hitBonus: 0.20,          // High hit (arena precision)
      critRate: 0.28,          // Solid crit
      critRes: 0.16,           // Moderate crit res
      critDmgBonus: 0.35,      // Balanced crit dmg
      critDmgRed: 0.22,        // Balanced defense
      atkSpdBonus: 0.14,       // Moderate AS
      pDmgBonus: 0.21,         // Balanced phys
      mDmgBonus: 0.21,         // Balanced magic
    },
    tagWeights: {
      teamSupport: 20,         // Team synergies critical
      enemyDebuff: 14,         // Debuffs important vs players
      selfBuff: 8,             // Survival buffs matter
    },
    skillFilters: {
      bonusBurstDamage: 1.25,  // +25% burst damage
      bonusShieldHeal: 1.2,    // +20% shields/heals
      bonusCrowdControl: 1.15, // +15% CC
    },
  },
};

export function getScenarioConfig(scenarioKey) {
  return SCENARIOS[scenarioKey] || SCENARIOS.general;
}

export function getAllScenarios() {
  return Object.values(SCENARIOS);
}

export function getScenarioKeys() {
  return Object.keys(SCENARIOS);
}
