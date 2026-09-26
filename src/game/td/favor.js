import blessingTree from "../../data/blessingTree.json" with { type: "json" };

// Divine Blessings 2.0 (docs/tower-defense-blessings-research.md): a Divine trunk
// paid with Favor plus one branch per hero class paid with that class's Insight.
// Nodes have levels; `levels` is { nodeId: level } from the save.
export const TREE = blessingTree;
export const CLASSES = blessingTree.classes;

export function computeFavor(runStats, tuning) {
  const earn = tuning.favorEarn;
  let total = runStats.waves * earn.perWave;
  total += (runStats.perfectWaves || 0) * earn.perPerfectWave;
  if (runStats.bossKilled) total += earn.bossKill;
  total += Math.min(runStats.livesLeft || 0, earn.remainingLifeCap) * earn.perRemainingLife;
  return total;
}

// Insight per class from the sim's run log ({ Tank: { waves, kills } }): one per
// wave a hero of that class was on the field at wave clear, one per killsPerPoint kills.
export function computeInsight(log, tree = TREE) {
  const cfg = tree.insight;
  const out = {};
  for (const [cls, entry] of Object.entries(log || {})) {
    const points = (entry.waves || 0) * cfg.perWave + Math.floor((entry.kills || 0) / cfg.killsPerPoint);
    if (points > 0) out[cls] = points;
  }
  return out;
}

export const findNode = (id, tree = TREE) => tree.nodes.find((node) => node.id === id);

// The currency a node is paid with: "favor" for the trunk, else the class name.
export const nodeCurrency = (node) => (node.tree === "trunk" ? "favor" : node.tree);

// Price of buying `level` (1-based) of a node.
export function levelCost(node, level, tree = TREE) {
  return Math.round(node.cost * tree.costGrowth ** (level - 1));
}

// Total spent on a node up to `level`.
export function nodeSpent(node, level, tree = TREE) {
  let sum = 0;
  for (let i = 1; i <= level; i += 1) sum += levelCost(node, i, tree);
  return sum;
}

// Spent per currency: { favor, Tank, Warrior, ... }.
export function spentByCurrency(levels, tree = TREE) {
  const spent = { favor: 0 };
  for (const [id, level] of Object.entries(levels || {})) {
    const node = findNode(id, tree);
    if (!node || !level) continue;
    const key = nodeCurrency(node);
    spent[key] = (spent[key] || 0) + nodeSpent(node, Math.min(level, node.maxLevel), tree);
  }
  return spent;
}

// Levels bought in one tree ("trunk" or a class); deeper stages need a number of them.
export function pointsIn(levels, treeName, tree = TREE) {
  let sum = 0;
  for (const [id, level] of Object.entries(levels || {})) {
    const node = findNode(id, tree);
    if (node?.tree === treeName) sum += Math.min(level || 0, node.maxLevel);
  }
  return sum;
}

// Whether the next level of a node can be bought, ignoring the price.
// Returns { ok, reason } so the UI can explain a locked node.
export function canBuy(nodeId, levels, tree = TREE) {
  const node = findNode(nodeId, tree);
  if (!node) return { ok: false, reason: "Unknown blessing." };
  const owned = levels?.[nodeId] || 0;
  if (owned >= node.maxLevel) return { ok: false, reason: "Fully unlocked." };
  const have = (id) => (levels?.[id] || 0) > 0;
  const need = node.requiresPoints || 0;
  const points = pointsIn(levels, node.tree, tree);
  if (points < need) return { ok: false, reason: `Needs ${need} levels in this tree (${points} so far).` };
  const missing = (node.requires || []).filter((id) => !have(id));
  if (missing.length) return { ok: false, reason: `Needs ${missing.map((id) => findNode(id, tree)?.name ?? id).join(" and ")}.` };
  if (node.requiresAny?.length && !node.requiresAny.some(have)) {
    return { ok: false, reason: `Needs ${node.requiresAny.map((id) => findNode(id, tree)?.name ?? id).join(" or ")}.` };
  }
  if (node.exclusive) {
    const rival = tree.nodes.find((other) => other.id !== nodeId && other.tree === node.tree && other.exclusive === node.exclusive && have(other.id));
    if (rival) return { ok: false, reason: `Excludes ${rival.name}; pick one of the two.` };
  }
  return { ok: true, reason: "" };
}

// Tree version 3 (M3) raised prices (trunk x1.6, class branches x3) and replaced each
// class's Surge with an Infusion. Saves from version 2 keep every level they own: the
// price increase is credited back per currency, so nothing they own costs them more.
// Surge levels simply drop out (their node is gone), which returns that Insight too.
const V2_TRUNK_COSTS = { demeter_bounty: 30, freya_blessing: 40, horus_sight: 30, jormungandr_hide: 40, caishen_treasury: 80, amunra_surge: 100, yuelao_bond: 90, nyx_veil: 60, zeus_dominion: 200, poseidon_tide: 180, nuwa_wall: 150, fengyi_favor: 900, anubis_judgment: 400, set_command: 3000 };
const V2_CLASS_COSTS = { might: 5, vigor: 5, swiftness: 5, reach: 5, ascension: 40, special: 60, wrath: 80, rite: 100, apotheosis: 140 };
const v2Cost = (node) => (node.tree === "trunk" ? V2_TRUNK_COSTS[node.id] : V2_CLASS_COSTS[node.id.slice(node.tree.length + 1)]);

export function repriceCredit(levels, tree = TREE) {
  const credit = {};
  for (const [id, rawLevel] of Object.entries(levels || {})) {
    const node = findNode(id, tree);
    const old = node && v2Cost(node);
    if (!old || !rawLevel) continue;
    const level = Math.min(rawLevel, node.maxLevel);
    let before = 0;
    for (let i = 1; i <= level; i += 1) before += Math.round(old * tree.costGrowth ** (i - 1));
    const key = nodeCurrency(node);
    credit[key] = (credit[key] || 0) + nodeSpent(node, level, tree) - before;
  }
  return credit;
}

// Old saves stored bought node ids of the first tree (favTree, 12 nodes). Those are
// refunded: dropping them frees the Favor, because available Favor is earned minus
// spent. The old prices only serve the one-time "refunded" notice.
const LEGACY_COSTS = { demeter_bounty: 25, freya_blessing: 25, horus_sight: 25, jormungandr_hide: 25, nuwa_wall: 60, zeus_dominion: 60, caishen_treasury: 60, bastet_edge: 60, amunra_surge: 120, yuelao_bond: 120, poseidon_tide: 120, nyx_veil: 120 };
export function legacyRefund(favTree) {
  return (favTree || []).reduce((sum, id) => sum + (LEGACY_COSTS[id] || 0), 0);
}

// Tuning bonuses from the bought levels. Global ones sit on the object, class
// ones under classBonus[className]; the simulator reads both from tuning.favor.
export function applyBlessings(levels, tree = TREE) {
  const bonuses = { classBonus: {} };
  const add = (target, key, value) => { target[key] = (target[key] || 0) + value; };
  for (const [id, rawLevel] of Object.entries(levels || {})) {
    const node = findNode(id, tree);
    if (!node || !rawLevel) continue;
    const level = Math.min(rawLevel, node.maxLevel);
    const value = node.effect.value * level;
    if (node.tree !== "trunk") {
      const cls = (bonuses.classBonus[node.tree] ||= {});
      // Infusion (Divine III): the class's attacks apply a status (M3, tuning.statuses).
      if (node.effect.type === "infuse") cls.infuse = node.effect.status;
      else add(cls, node.effect.type, value);
      continue;
    }
    switch (node.effect.type) {
      case "startingGold": add(bonuses, "startingGoldBonus", value); break;
      case "lives": add(bonuses, "livesBonus", value); break;
      case "showHp": bonuses.showEnemyHp = true; break;
      case "heroHp": add(bonuses, "heroHpBonus", value); break;
      case "killGold": add(bonuses, "killGoldBonus", value); break;
      case "ultCharge": add(bonuses, "ultChargeBonus", value); break;
      case "synergyTag": add(bonuses, "synergyTagBonus", value); break;
      case "wave1Speed": add(bonuses, "wave1SpeedDebuff", value); break;
      case "upgradeDiscount": add(bonuses, "upgradeDiscount", value); break;
      case "clearBonus": add(bonuses, "clearBonus", value); break;
      case "contactRange": add(bonuses, "contactRangeBonus", value); break;
      case "extraOffer": add(bonuses, "extraOffer", value); break;
      case "bossDamage": add(bonuses, "bossDamage", value); break;
      default: break;
    }
  }
  return bonuses;
}

// Snapshot of tuning for one run with the bought blessings applied. Start
// resources are folded into run; everything else is read by the
// simulator from tuning.favor. `boost` is a pending run-end shard (6C):
// { type: "gold", gold } or { type: "virtue", virtue }.
/** @param {any} tuning @param {Record<string, number>} levels @param {{ type: string, gold?: number, virtue?: string } | null} [boost] */
export function buildRunTuning(tuning, levels, boost = null) {
  const bonuses = applyBlessings(levels);
  const run = {
    ...tuning.run,
    startingGold: tuning.run.startingGold + (bonuses.startingGoldBonus || 0) + (boost?.type === "gold" ? boost.gold : 0),
    lives: tuning.run.lives + (bonuses.livesBonus || 0),
  };
  if (boost?.type === "virtue") run.startVirtue = boost.virtue;
  return { ...tuning, favor: bonuses, run };
}

// Run-end shards (6C). Runs that reach tuning.shards.minWave earn a pick; the
// Favor shard is worth favorPct of the run's Favor, at least favorMin.
export function shardEligible(wave, tuning) {
  return !!tuning.shards && wave >= tuning.shards.minWave;
}

export function shardFavor(earnedFavor, tuning) {
  const cfg = tuning.shards;
  return Math.max(cfg.favorMin, Math.round(earnedFavor * cfg.favorPct));
}
