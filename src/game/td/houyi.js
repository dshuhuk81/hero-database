// Pure targeting and allocation rules for Hou Yi's Nine Suns Fall.
// Combat state and damage resolution remain owned by sim.js.

const eligible = (enemy) => enemy && !enemy.dead && !enemy.untargetable;

const entityOrder = (left, right) => {
  const a = left.entityId;
  const b = right.entityId;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
};

/**
 * Flyers first, then greatest path progress, then stable entity order.
 * The input is never mutated.
 */
export function houYiTargetOrder(enemies = []) {
  return enemies
    .filter(eligible)
    .slice()
    .sort((a, b) => {
      const flyer = Number(b.kind === "flyer") - Number(a.kind === "flyer");
      if (flyer) return flyer;
      const progress = (Number(b.distance) || 0) - (Number(a.distance) || 0);
      return progress || entityOrder(a, b);
    });
}

const allocationCounts = (plan) => {
  const counts = new Map();
  for (const entry of plan) {
    const id = entry?.enemy?.entityId;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
};

/**
 * Plans nominal arrows, or one-at-a-time Sun Hunter continuation requests.
 *
 * `existingPlan` is optional for a normal cast. For a Sun Hunter request it is
 * the cast's already resolved allocation; only newly requested entries are
 * returned. This keeps repeat limits and the nine-bonus-arrow safety cap pure.
 */
export function houYiArrowPlan(enemies = [], options = {}) {
  const ordered = houYiTargetOrder(enemies);
  if (!ordered.length) return [];

  const requested = Math.max(0, Math.floor(Number(options.arrows) || 0));
  const repeatCap = Math.max(1, Math.floor(Number(options.repeatCap) || 3));
  const existingPlan = Array.isArray(options.existingPlan) ? options.existingPlan : [];
  const bonus = options.sunHunter === true;
  const maxBonusArrows = Math.max(0, Math.floor(Number(options.maxBonusArrows) || 0));
  const priorBonusArrows = existingPlan.filter((entry) => entry?.bonus === true).length;
  const arrowLimit = bonus ? Math.min(requested, Math.max(0, maxBonusArrows - priorBonusArrows)) : requested;
  if (!arrowLimit) return [];

  const counts = allocationCounts(existingPlan);
  const plan = [];

  if (options.awakened === true && ordered.length === 1) {
    const enemy = ordered[0];
    for (let index = 0; index < arrowLimit; index += 1) {
      const priorHits = (counts.get(enemy.entityId) ?? 0) + index;
      plan.push({ enemy, share: priorHits < 3 ? 1 : 0.45, bonus });
    }
    return plan;
  }

  while (plan.length < arrowLimit) {
    let allocated = false;
    for (const enemy of ordered) {
      if (plan.length >= arrowLimit) break;
      const count = counts.get(enemy.entityId) ?? 0;
      if (count >= repeatCap) continue;
      plan.push({ enemy, share: 1, bonus });
      counts.set(enemy.entityId, count + 1);
      allocated = true;
    }
    if (!allocated) break;
  }

  return plan;
}
