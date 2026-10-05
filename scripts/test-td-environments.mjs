import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { TowerDefenseGame } from "../src/game/td/sim.js";
import { ENVIRONMENTS } from "../src/game/td/environments.js";
import { MAP_SCENES } from "../src/game/td/map-scene.js";
import heroes from "../src/data/gameBalance.json" with { type: "json" };
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import maps from "../src/data/tdMaps.json" with { type: "json" };
import campaign from "../src/data/tdCampaign.json" with { type: "json" };
import classicMaps from "./fixtures/td-classic-maps.json" with { type: "json" };

// Multiplier checks on a classic map; boards turn the range rule into reach steps (test-td-sim).
const plain = classicMaps[0];
const game = (theme) => new TowerDefenseGame({ heroes, tuning, map: { ...plain, theme }, waves: [{ wave: 1, spawns: [{ kind: "grunt", count: 1, gapMs: 1000 }] }] });
const road = { ...heroes.find(h => h.slot === "road"), slotType: "road", slotIndex: 0 };
const platform = { ...heroes.find(h => h.slot === "platform"), slotType: "platform", slotIndex: 0 };
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} ≠ ${expected}`);
const baseline = game("plain");
baseline.wave = 1;
const baseSpeed = baseline.spawnEnemy("grunt").speed;
const frost = game("frostbound");
frost.wave = 1;
close(frost.spawnEnemy("grunt").speed / baseSpeed, 0.88);
close(frost.environment("aps", road), 0.92);
frost.map = { ...frost.map, rings: { "road:0": "shrine" } };
close(frost.environment("aps", road), 1);

const forge = game("ashen");
close(forge.attackValue(road) / baseline.attackValue(road), 1.15);
const target = { ...road, hp: 100, hpLeft: 0 };
assert.equal(forge.healHero(target, 50, null), 40);
assert.equal(forge.healHero({ ...platform, hp: 100, hpLeft: 0 }, 50, null), 50);

const storm = game("stormpeak");
close(storm.spawnEnemy("flyer").speed / baseline.spawnEnemy("flyer").speed, 0.8);
close(storm.deployRange(platform, "platform", 0) / baseline.deployRange(platform, "platform", 0), 0.9);
storm.map = { ...storm.map, rings: { "platform:0": "highground" } };
const sheltered = game("plain");
sheltered.map = storm.map;
// Remove the environment for a fair comparison with the same high-ground bonus.
sheltered.map = { ...sheltered.map, theme: "plain" };
close(storm.deployRange(platform, "platform", 0), sheltered.deployRange(platform, "platform", 0));

const tide = game("tidal");
tide.wave = 1;
close(tide.spawnEnemy("grunt").speed / baseSpeed, 0.85);
tide.wave = 2;
close(tide.spawnEnemy("grunt").speed / baseSpeed, 1.1);
tide.reset();
assert.equal(tide.wave, 0);
close(tide.environment("enemySpeed"), 1);
const spores = game("mycelium");
spores.wave = 1;
close(spores.spawnEnemy("grunt").maxHp / baseline.spawnEnemy("grunt").maxHp, 1.1);
assert.equal(spores.healHero({ ...road, hp: 100, hpLeft: 0 }, 40, null), 50);
close(game("crystal").environment("attack", { ...platform, damageType: "magical" }), 1.15);
close(game("crystal").environment("aps", { ...road, damageType: "physical" }), 1.1);
close(game("necropolis").environment("placementRate"), 1.2);
close(game("necropolis").healHero({ ...road, hp: 100, hpLeft: 0 }, 40, null), 34);
close(game("autumn").environment("placementRate"), 1.15);
close(game("autumn").ultChargeRate(road) / baseline.ultChargeRate(road), 1.15);
const astral = game("celestial");
astral.wave = 1;
close(astral.ultChargeRate(platform) / baseline.ultChargeRate(platform), 1.2);
astral.wave = 2;
close(astral.environment("aps", platform), 1.1);
close(astral.ultChargeRate(platform) / baseline.ultChargeRate(platform), 1);
close(game("clockwork").environment("aps", platform), 1.15);
close(game("clockwork").spawnEnemy("grunt").speed / baseSpeed, 1.1);
close(baseline.environment("heal", road), 1);

assert.equal(Object.keys(ENVIRONMENTS).length, 10);
for (const environment of Object.values(ENVIRONMENTS)) {
  const scene = MAP_SCENES[`${environment.id}-sanctuary-v1`];
  assert.ok(scene, environment.id);
  for (const asset of Object.values(scene.assets)) assert.ok(existsSync(new URL(`../public${asset}`, import.meta.url)), `Missing ${asset}`);
  const chapter = campaign.chapters.find(c => c.name === environment.chapter);
  assert.equal(chapter.stages.length, 6);
  const used = chapter.stages.map(s => maps.find(m => m.id === s.mapId));
  assert.ok(used.every(m => m?.theme === environment.id));
  assert.equal(new Set(used.map(m => m.geometryHash)).size, 6);
}
console.log("Environment combat, assets and chapter checks passed.");
