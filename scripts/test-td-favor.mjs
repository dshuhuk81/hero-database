import assert from "node:assert/strict";
import { TowerDefenseGame } from "../src/game/td/sim.js";
import { buildRunTuning, canUnlock, isFavorNodeActive } from "../src/game/td/favor.js";
import heroes from "../src/data/gameBalance.json" with { type: "json" };
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import maps from "../src/data/tdMaps.json" with { type: "json" };
import waves from "../src/data/tdWaves.json" with { type: "json" };
import favorTree from "../src/data/favorTree.json" with { type: "json" };

const node = (type) => favorTree.find((entry) => entry.effect.type === type);
const make = (types = []) => {
  const game = new TowerDefenseGame({ heroes, tuning: buildRunTuning(tuning, types.map((type) => node(type).id)), map: maps[0], waves, seed: 5 });
  game.gold = 100000;
  return game;
};
const heroOf = (cls) => heroes.find((hero) => hero.class === cls);
const place = (game, hero) => {
  const slots = hero.slot === "road" ? game.map.roadSlots : game.map.platformSlots;
  const index = slots.findIndex((_, i) => !game.heroes.some((h) => h.slotType === hero.slot && h.slotIndex === i));
  assert.equal(game.place(hero.id, hero.slot, index), true, `place ${hero.id}`);
  return game.heroes.at(-1);
};

// Every node in the tree now has a simulator effect.
assert.ok(favorTree.every(isFavorNodeActive), "all favor nodes active");

// Tier gates: Tier 2 needs 3 of 4 Tier 1 nodes, Tier 3 needs 3 of 4 Tier 2 nodes.
{
  const ids = (tier) => favorTree.filter((entry) => entry.tier === tier).map((entry) => entry.id);
  const [t1, t2, t3] = [ids(1), ids(2), ids(3)];
  assert.equal(canUnlock(t2[0], t1.slice(0, 2), favorTree), false, "tier 2 locked with 2 of tier 1");
  assert.equal(canUnlock(t2[0], t1.slice(0, 3), favorTree), true, "tier 2 open with 3 of tier 1");
  assert.equal(canUnlock(t3[0], [...t1, ...t2.slice(0, 2)], favorTree), false, "tier 3 locked with 2 of tier 2");
  assert.equal(canUnlock(t3[0], [...t1, ...t2.slice(0, 3)], favorTree), true, "tier 3 open with 3 of tier 2");
}

// Horus's Sight: wave preview includes total enemy HP (with per-wave scaling).
{
  assert.equal(make().wavePreview(2).totalHp, undefined, "no HP without Horus");
  const preview = make(["showHp"]).wavePreview(2);
  const scale = 1 + (3 - 1) * 0.15;
  const expected = Math.round(waves[2].spawns.reduce((sum, group) => sum + group.count * tuning.enemies[group.kind].hp * scale, 0));
  assert.equal(preview.totalHp, expected, "wave 3 total HP");
}

// Jormungandr's Hide and Nuwa's Wall: max HP bonuses (tank bonus only for Tanks, both stack).
{
  const tank = heroOf("Tank");
  const mage = heroOf("Mage");
  const plainTank = place(make(), tank).hp;
  const plainMage = place(make(), mage).hp;
  assert.equal(place(make(["heroHp"]), mage).hp, Math.round(plainMage * 1.05), "all heroes +5% HP");
  assert.equal(place(make(["tankHp"]), mage).hp, plainMage, "tank bonus skips mages");
  assert.equal(place(make(["heroHp", "tankHp"]), tank).hp, Math.round(plainTank * 1.15), "tank gets both");
  const game = make(["heroHp"]);
  const unit = place(game, mage);
  assert.equal(game.upgradeInfo(unit.entityId).nextHp, game.maxHpFor(unit.baseHp, 2, "Mage"), "upgrade preview keeps bonus");
}

// Zeus's Dominion: Mages +15 range, others unchanged.
{
  const mage = heroOf("Mage");
  const archer = heroOf("Archer");
  assert.equal(place(make(["mageRange"]), mage).range, mage.range + 15, "mage range +15");
  assert.equal(place(make(["mageRange"]), archer).range, archer.range, "archer unchanged");
}

// Caishen's Treasury: +10% kill gold, fractions carried so small rewards still gain.
{
  const reward = tuning.enemies.grunt.reward;
  let total = 0;
  const game = make(["killGold"]);
  for (let i = 0; i < 20; i += 1) total += game.killReward(reward);
  assert.equal(total, Math.round(20 * reward * 1.1), "20 kills pay +10% overall");
  assert.equal(make().killReward(reward), reward, "no bonus without node");
}

// Bastet's Edge: Assassin execute threshold 35% -> 40%; other classes stay at 35%.
{
  const game = make(["assassinExecute"]);
  assert.equal(game.executeThreshold({ class: "Assassin" }), 0.4, "assassin threshold");
  assert.equal(game.executeThreshold({ class: "Mage" }), 0.35, "mage threshold");
  assert.equal(make().executeThreshold({ class: "Assassin" }), 0.35, "default threshold");
}

// Amun-Ra's Surge: ultimates charge 15% faster.
{
  assert.equal(make(["ultCharge"]).ultChargeRate(), 1.15, "ult charge +15%");
  assert.equal(make().ultChargeRate(), 1, "default ult charge");
}

// Yuelao's Bond: +2% per shared tag, cap unchanged.
{
  const game = make(["synergyTag"]);
  assert.equal(game.synergyPerTag(), tuning.synergy.bonusPerTag + 0.02, "per-tag bonus");
  const a = { synergies: ["X", "Y", "Z", "W"], x: 0, y: 0, hpLeft: 1 };
  const b = { synergies: ["X", "Y", "Z", "W"], x: 10, y: 0, hpLeft: 1 };
  game.heroes = [a, b];
  assert.equal(game.synergyBonusFor(a), tuning.synergy.cap, "cap still applies");
}

// Poseidon's Tide: melee enemies are caught from 50 px instead of 42; ranged reach unchanged.
{
  const tank = heroOf("Tank");
  for (const [types, expectCaught] of [[[], false], [["contactRange"], true]]) {
    const game = make(types);
    const unit = place(game, tank);
    const melee = { x: unit.x + 46, y: unit.y, attackRange: undefined };
    assert.equal(!!game.findEnemyTarget(melee), expectCaught, `melee at 46px caught=${expectCaught}`);
    const ranged = { x: unit.x + 115, y: unit.y, attackRange: 110 };
    assert.equal(!!game.findEnemyTarget(ranged), false, "ranged reach unchanged");
  }
}

// Nyx's Veil: wave 1 enemies 25% slower, wave 2 normal.
{
  const game = make(["wave1Speed"]);
  place(game, heroOf("Tank"));
  game.startWave();
  game.spawnEnemy("grunt");
  assert.equal(game.enemies.at(-1).speed, tuning.enemies.grunt.speed * 0.75, "wave 1 slowed");
  game.wave = 2;
  game.spawnEnemy("grunt");
  assert.equal(game.enemies.at(-1).speed, tuning.enemies.grunt.speed, "wave 2 normal");
}

// Runs without favor keep the original numbers (balance baseline).
{
  const game = make();
  assert.deepEqual(game.favor, {}, "no favor bonuses by default");
}

console.log("Tower defense favor checks passed.");
