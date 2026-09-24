import tree from "../../data/favorTree.json" with { type: "json" };

export function computeFavor(runStats, tuning) {
  const earn = tuning.favorEarn;
  let total = runStats.waves * earn.perWave;
  total += (runStats.perfectWaves || 0) * earn.perPerfectWave;
  if (runStats.bossKilled) total += earn.bossKill;
  total += Math.min(runStats.livesLeft || 0, earn.remainingLifeCap) * earn.perRemainingLife;
  return total;
}

export function applyFavorTree(unlockedNodes, tuning) {
  const seen = new Set();
  const bonuses = {};
  for (const id of unlockedNodes) {
    if (seen.has(id)) continue;
    seen.add(id);
    const node = tree.find((n) => n.id === id);
    if (!node) continue;
    applyEffect(bonuses, node.effect);
  }
  return bonuses;
}

// Effect types the simulator consumes. Nodes with other types are shown as
// "Not active yet" and cannot be purchased.
export const ACTIVE_FAVOR_EFFECTS = [
  "startingGold", "lives", "showHp", "heroHp", "tankHp", "mageRange",
  "killGold", "assassinExecute", "ultCharge", "synergyTag", "contactRange", "wave1Speed",
];

export function isFavorNodeActive(node) {
  return !!node && ACTIVE_FAVOR_EFFECTS.includes(node.effect?.type);
}

// Snapshot of tuning for one run with the unlocked Favor nodes applied.
// Start resources are folded into run; everything else is read by the
// simulator from tuning.favor.
export function buildRunTuning(tuning, unlockedNodes) {
  const bonuses = applyFavorTree(unlockedNodes, tuning);
  return {
    ...tuning,
    favor: bonuses,
    run: {
      ...tuning.run,
      startingGold: tuning.run.startingGold + (bonuses.startingGoldBonus || 0),
      lives: tuning.run.lives + (bonuses.livesBonus || 0),
    },
  };
}

export function canUnlock(nodeId, unlockedNodes, nodes) {
  const src = nodes || tree;
  const node = src.find((n) => n.id === nodeId);
  if (!node) return false;
  if (unlockedNodes.includes(nodeId)) return false;
  if (!node.requires || node.requires.length === 0) return true;
  const met = unlockedNodes.filter((id) => node.requires.includes(id)).length;
  return met >= (node.requiresMin !== undefined ? node.requiresMin : node.requires.length);
}

function applyEffect(bonuses, effect) {
  switch (effect.type) {
    case "startingGold":
      bonuses.startingGoldBonus = (bonuses.startingGoldBonus || 0) + effect.value;
      break;
    case "lives":
      bonuses.livesBonus = (bonuses.livesBonus || 0) + effect.value;
      break;
    case "showHp":
      bonuses.showEnemyHp = true;
      break;
    case "heroHp":
      bonuses.heroHpBonus = (bonuses.heroHpBonus || 0) + effect.value;
      break;
    case "tankHp":
      bonuses.tankHpBonus = (bonuses.tankHpBonus || 0) + effect.value;
      break;
    case "mageRange":
      bonuses.mageRangeBonus = (bonuses.mageRangeBonus || 0) + effect.value;
      break;
    case "killGold":
      bonuses.killGoldBonus = (bonuses.killGoldBonus || 0) + effect.value;
      break;
    case "assassinExecute":
      bonuses.assassinExecuteThreshold = effect.value;
      break;
    case "ultCharge":
      bonuses.ultChargeBonus = (bonuses.ultChargeBonus || 0) + effect.value;
      break;
    case "synergyTag":
      bonuses.synergyTagBonus = (bonuses.synergyTagBonus || 0) + effect.value;
      break;
    case "contactRange":
      bonuses.contactRangeBonus = (bonuses.contactRangeBonus || 0) + effect.value;
      break;
    case "wave1Speed":
      bonuses.wave1SpeedDebuff = effect.value;
      break;
    default:
      break;
  }
}
