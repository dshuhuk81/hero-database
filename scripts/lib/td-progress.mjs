// Bot progression for the campaign balance runs: what a steady player does between stages.
// Battle XP for the squad that won, then every affordable upgrade in turn: levels (lowest hero first),
// stars from duplicate copies, evolution (copies), skills (lowest first). Used by td-sweep.mjs.
import { canSkillUp, evolve, grantBattleXp, heroLevel, levelUp, skillUpCost, skillUp, starUp, starUpCost, heroStars } from "../../src/game/td/campaign.js";

export function bankBattleXp(campaign, progress, squad, stageId) {
  return grantBattleXp(campaign, progress, squad, stageId, true).progress;
}

// One pass of purchases. Returns the new progress; stops when nothing more is affordable.
export function spendAll(campaign, progress) {
  for (let guard = 0; guard < 500; guard += 1) {
    const next = spendOnce(campaign, progress);
    if (!next) return progress;
    progress = next;
  }
  return progress;
}

function spendOnce(campaign, progress) {
  const owned = [...progress.owned].sort((a, b) => heroLevel(progress, a) - heroLevel(progress, b));
  for (const id of owned) {
    const next = levelUp(campaign, progress, id);
    if (next) return next;
  }
  for (const id of owned) {
    const cost = starUpCost(campaign, heroStars(progress, id));
    if (cost && (progress.copies?.[id] ?? 0) >= cost.copies) {
      const next = starUp(campaign, progress, id, { [id]: cost.copies });
      if (next) return next;
    }
  }
  for (const id of owned) {
    const next = evolve(campaign, progress, id, false);
    if (next) return next;
  }
  for (const id of owned) {
    for (const skillId of ["passiveAttack", "passiveHealth", "ultimate"]) {
      if (canSkillUp(campaign, progress, id, skillId) && skillUpCost(campaign, progress, id, skillId)) {
        const next = skillUp(campaign, progress, id, skillId);
        if (next) return next;
      }
    }
  }
  return null;
}
