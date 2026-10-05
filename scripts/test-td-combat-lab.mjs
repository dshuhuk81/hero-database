import assert from "node:assert/strict";
import campaign from "../src/data/tdCampaign.json" with { type: "json" };
import heroes from "../src/data/gameBalance.json" with { type: "json" };
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };

const combatLab = await import("../src/game/td/combat-lab.js").catch(() => ({}));

assert.equal(
  typeof combatLab.levelHero,
  "function",
  "combat lab exposes level-aware hero stats",
);

const duel = combatLab.createCombatLabDuel({
  heroes,
  tuning,
  campaign,
  heroId: "atlas",
  heroLevel: 20,
  enemyKind: "grunt",
  heroStats: { hp: 1500, atk: 125, armor: 300, magicRes: 200, aps: 1.25 },
  enemyStats: { hp: 900, atk: 80, armor: 50, magicRes: 40, attackPeriod: 1.5 },
  seed: 3,
});
assert.deepEqual(
  duel.snapshot(),
  {
    status: "ready",
    time: 0,
    hero: { id: "atlas", hp: 1500, maxHp: 1500, atk: 125, armor: 300, magicRes: 200, aps: 1.25 },
    enemy: { kind: "grunt", hp: 900, maxHp: 900, atk: 80, armor: 50, magicRes: 40, attackPeriod: 1.5 },
    stats: { dps: 0, totalDamage: 0, damageTaken: 0 },
  },
  "a duel starts ready with exact hero and enemy overrides",
);

const base = heroes.find((hero) => hero.id === "odin");
const level10 = combatLab.levelHero(base, campaign, 10);
assert.deepEqual(
  { level: level10.campaignLevel, atk: level10.atk, hp: level10.hp },
  { level: 10, atk: 69, hp: 981 },
  "level 10 applies the campaign's first-band HP and ATK growth",
);

assert.equal(
  typeof combatLab.createCombatLabDuel,
  "function",
  "combat lab exposes an isolated duel",
);
