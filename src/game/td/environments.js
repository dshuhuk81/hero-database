import environments from "../../data/tdEnvironments.json" with { type: "json" };

export const ENVIRONMENTS = Object.fromEntries(environments.map((environment) => [environment.id, environment]));
export const environmentFor = (map) => ENVIRONMENTS[map?.theme] ?? null;

// Multipliers are evaluated at use time. Phase rules alternate every tuning.timeline.phaseSeconds of battle time:
// `phase` is 0 before the stage starts, then 1 (odd), 2 (even), 3 (odd) and so on.
export function environmentMultiplier(map, stat, ctx = {}) {
  return modsMultiplier(environmentFor(map)?.mods, stat, ctx);
}

// The same stat vocabulary for a stage rule (tdStageRules.json), which stacks on the environment.
export function modsMultiplier(mods, stat, { phase = 0, hero = null, kind = null, ring = null } = {}) {
  if (!mods) return 1;
  const odd = phase % 2 === 1;
  const road = hero?.slotType === "road";
  const platform = hero?.slotType === "platform";
  const magical = hero?.damageType === "magical";
  switch (stat) {
    case "enemySpeed": return (mods.enemySpeed ?? 1) * (kind === "flyer" ? mods.flyerSpeed ?? 1 : 1) * (phase > 0 ? (odd ? mods.oddSpeed ?? 1 : mods.evenSpeed ?? 1) : 1);
    case "enemyHp": return mods.enemyHp ?? 1;
    case "attack": return (road ? mods.roadAttack ?? 1 : 1) * (magical ? mods.magicAttack ?? 1 : 1);
    case "aps": return (mods.heroAps ?? 1) * (hero?.damageType === "physical" ? mods.physicalAps ?? 1 : 1) * (ring === "shrine" ? mods.shrineAps ?? 1 : 1) * (phase > 0 && !odd ? mods.evenAps ?? 1 : 1);
    case "range": return (platform ? mods.platformRange ?? 1 : 1) * (platform && ring === "highground" ? mods.highgroundRange ?? 1 : 1);
    case "heal": return (mods.heroHeal ?? 1) * (road ? mods.roadHeal ?? 1 : 1);
    case "charge": return (road ? mods.roadCharge ?? 1 : 1) * (phase > 0 && odd ? mods.oddCharge ?? 1 : 1);
    case "placementRate": return mods.placementRate ?? 1;
    default: return 1;
  }
}
