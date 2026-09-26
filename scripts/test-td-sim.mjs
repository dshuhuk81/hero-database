import assert from "node:assert/strict";
import { createRng, pointOnPath, resolveDamage, TowerDefenseGame } from "../src/game/td/sim.js";
import { computeFavor } from "../src/game/td/favor.js";
import heroes from "../src/data/gameBalance.json" with { type: "json" };
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import maps from "../src/data/tdMaps.json" with { type: "json" };
import { mapLanes } from "../src/game/td/lanes.js";
import waves from "../src/data/tdWaves.json" with { type: "json" };
import { buildWave, isBossWave, wavesForMode } from "../src/game/td/waves.js";

assert.equal(resolveDamage(100, 260, "physical", false), 50, "physical mitigation");
assert.equal(resolveDamage(100, 79503, "true", false), 100, "true damage");
assert.deepEqual(Array.from({ length: 8 }, createRng(42)), Array.from({ length: 8 }, createRng(42)), "seeded RNG");
assert.deepEqual(pointOnPath([[0, 0], [100, 0], [100, 100]], 150), { x: 100, y: 50 }, "path interpolation");

const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-6, `${message}: ${actual} vs ${expected}`);

const game = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 7 });
assert.equal(game.setTeam(["nuwa", "zeus", "diana", "caishen", "poseidon"]), true, "valid team");
game.gold = 10000;
assert.equal(game.place("nuwa", "road", 0), true, "road placement");
assert.equal(game.place("zeus", "road", 1), false, "class-gated placement");
assert.equal(game.place("zeus", "platform", 0), true, "platform placement");
assert.equal(game.startWave(), true, "wave starts");
for (let i = 0; i < 60 * 90 && game.running; i += 1) game.step(1 / 60);
assert.equal(game.running, false, "wave terminates");
assert.equal(game.wave, 1, "wave advances once");

// --- 1A combat rules ---

// Hero armor mitigates incoming enemy damage.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 11 });
  g.setTeam(["nuwa", "zeus", "diana", "caishen", "poseidon"]);
  g.gold = 10000;
  g.place("nuwa", "road", 0);
  const nuwa = g.heroes[0];
  g.startWave();
  g.enemies = []; g.spawnQueue = [];
  g.spawnEnemy("grunt");
  const grunt = g.enemies[0];
  grunt.x = nuwa.x - 20; grunt.y = nuwa.y; // contact range
  const before = nuwa.hpLeft;
  for (let i = 0; i < 30; i += 1) g.step(1 / 60); // exactly one attack lands (period 0.9s)
  // Tanks also shrug off their class guard share (M6 class kit).
  const expected = resolveDamage(grunt.attack, nuwa.armor, "physical") * (1 - g.guardFor(nuwa));
  assert.ok(g.guardFor(nuwa) > 0, "Tank guard applies");
  assert.ok(nuwa.hpLeft < before, "blocker takes damage");
  assert.ok(Math.abs((before - nuwa.hpLeft) - expected) < 1e-6, `armor mitigation applied (${expected})`);
  assert.ok(expected < grunt.attack, "mitigation reduces raw attack");
}

// Road heroes cannot target flyers; flyers leak past full road coverage.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 12 });
  g.setTeam(["nuwa", "zeus", "diana", "caishen", "poseidon"]);
  g.gold = 10000;
  g.place("nuwa", "road", 0);
  g.startWave(); g.enemies = []; g.spawnQueue = [];
  g.spawnEnemy("flyer");
  const flyer = g.enemies[0];
  flyer.x = g.heroes[0].x - 30; flyer.y = g.heroes[0].y;
  assert.equal(g.findTarget(g.heroes[0]), null, "road hero cannot target flyer");
  const livesBefore = g.lives;
  let leaked = false;
  g.onChange = (type) => { if (type === "leak") leaked = true; };
  for (let i = 0; i < 60 * 60 && g.enemies.length; i += 1) g.step(1 / 60);
  assert.ok(leaked, "leak event fires");
  assert.equal(g.lives, livesBefore - 1, "flyer leaks for its damage value");
  assert.ok(g.heroes[0].hpLeft === g.heroes[0].hp, "flyer never fights blockers");
}

// Enemy archers stop and shoot from range instead of contact, for holdSeconds.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 13 });
  g.setTeam(["nuwa", "zeus", "diana", "caishen", "poseidon"]);
  g.gold = 10000;
  g.place("nuwa", "road", 2); // (410, 290), near path point (410, 180)
  const nuwa = g.heroes[0];
  g.startWave(); g.enemies = []; g.spawnQueue = [];
  g.spawnEnemy("archer");
  const archer = g.enemies[0];
  for (let i = 0; i < 60 * 30 && nuwa.hpLeft === nuwa.hp; i += 1) g.step(1 / 60);
  assert.ok(nuwa.hpLeft < nuwa.hp, "archer damages blocker");
  const distance = Math.hypot(archer.x - nuwa.x, archer.y - nuwa.y);
  assert.ok(distance > 42 && distance <= archer.attackRange, `archer fires from range (${Math.round(distance)}px)`);
  for (let i = 0; i < 60 * 5; i += 1) g.step(1 / 60);
  assert.ok(Math.hypot(archer.x - nuwa.x, archer.y - nuwa.y) > 42, "archer holds position at range");
  // After holdSeconds it closes in and is blocked in contact like a melee enemy (no standoff).
  archer.hp = archer.maxHp = 1e9;
  for (let i = 0; i < 60 * (tuning.enemies.archer.holdSeconds + 5); i += 1) g.step(1 / 60);
  assert.ok(Math.hypot(archer.x - nuwa.x, archer.y - nuwa.y) <= 42 + 1e-6, "archer closes in after holdSeconds");
  assert.equal(archer.held, true, "and the blocker holds it");
}

// Blocker death frees enemies and fires a death event.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 14 });
  g.setTeam(["nuwa", "zeus", "diana", "caishen", "poseidon"]);
  g.gold = 10000;
  g.place("nuwa", "road", 0);
  const nuwa = g.heroes[0];
  let deaths = 0;
  g.onChange = (type) => { if (type === "death") deaths += 1; };
  g.startWave(); g.enemies = []; g.spawnQueue = [];
  g.spawnEnemy("boss");
  const boss = g.enemies[0];
  boss.x = nuwa.x - 30; boss.y = nuwa.y;
  nuwa.hpLeft = 50;
  const distanceBefore = boss.distance;
  for (let i = 0; i < 60 * 10 && g.heroes.length; i += 1) g.step(1 / 60);
  assert.equal(deaths, 1, "death event fires once");
  for (let i = 0; i < 60; i += 1) g.step(1 / 60);
  assert.ok(boss.distance > distanceBefore, "enemy resumes walking after blocker dies");
}

// Support heal is limited to allies inside the support's range.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 15 });
  g.setTeam(["caishen", "nuwa", "poseidon", "zeus", "diana"]);
  g.gold = 10000;
  g.place("caishen", "platform", 0); // (82, 225)
  g.place("nuwa", "road", 0);        // (168, 230) - 86px away, inside 150 range
  g.place("poseidon", "road", 2);    // (410, 290) - far away
  const [support, near, far] = g.heroes;
  near.hpLeft = 100; far.hpLeft = 100;
  g.startWave(); g.enemies = []; g.spawnQueue = [];
  g.spawnEnemy("grunt");
  const target = g.enemies[0];
  target.x = support.x + 50; target.y = support.y;
  g.castUltimate(support, target);
  assert.ok(near.hpLeft > 100, "ally in range is healed");
  assert.equal(far.hpLeft, 100, "ally out of range is not healed");
}

// Cleave respects facing: enemies behind the hero are spared when the cone is occupied.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 16 });
  g.setTeam(["poseidon", "zeus", "diana", "caishen", "nuwa"]);
  g.gold = 10000;
  g.place("poseidon", "road", 0);
  const warrior = g.heroes[0];
  warrior.rotation = 0; // facing +x
  g.startWave(); g.enemies = []; g.spawnQueue = [];
  g.spawnEnemy("grunt"); g.spawnEnemy("grunt");
  const [ahead, behind] = g.enemies;
  ahead.x = warrior.x + 40; ahead.y = warrior.y;
  behind.x = warrior.x - 40; behind.y = warrior.y;
  g.castUltimate(warrior, ahead);
  assert.ok(ahead.hp < ahead.maxHp, "enemy in cone is hit");
  assert.equal(behind.hp, behind.maxHp, "enemy outside cone is spared");
}

// Full run, win: a fully deployed squad survives all ten waves, upgrading between waves.
// Mechanics check at base difficulty; balance at the shipped difficulty is covered by test:td-balance.
{
  const g = new TowerDefenseGame({ heroes, tuning: { ...tuning, difficulty: { enemyHp: 1 } }, map: maps[0], waves, seed: 21 });
  g.setTeam(["nuwa", "poseidon", "zeus", "diana", "caishen"]);
  g.gold = 10000;
  g.place("nuwa", "road", 0); g.place("poseidon", "road", 3);
  g.place("zeus", "platform", 1); g.place("diana", "platform", 2); g.place("caishen", "platform", 0);
  let upgraded = false;
  while (!g.complete) {
    if (!g.running) {
      for (const hero of g.heroes) if (g.upgrade(hero.entityId, "attack").ok) upgraded = true;
      g.startWave();
    }
    for (let i = 0; i < 60 * 120 && g.running && !g.complete; i += 1) g.step(1 / 60);
    if (!g.running && !g.complete && g.wave >= waves.length) break;
  }
  assert.equal(g.complete, true, "full run terminates");
  assert.equal(g.won, true, "deployed squad wins");
  assert.ok(g.lives > 0, "winner has lives left");
  assert.ok(upgraded, "run used upgrades");
}

// Full run, loss: an empty defense loses every leak and the run ends.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 22 });
  g.setTeam(["nuwa", "poseidon", "zeus", "diana", "caishen"]);
  while (!g.complete) {
    if (!g.running) g.startWave();
    for (let i = 0; i < 60 * 120 && g.running && !g.complete; i += 1) g.step(1 / 60);
  }
  assert.equal(g.complete, true, "loss run terminates");
  assert.equal(g.won, false, "undefended run is lost");
  assert.equal(g.lives, 0, "loss reaches zero lives");
}

// Wave preview agrees with the spawn data.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 23 });
  for (let w = 0; w < waves.length; w += 1) {
    const info = g.wavePreview(w);
    assert.equal(info.wave, w + 1, "preview reports the 1-based wave number");
    const expected = {};
    for (const group of waves[w].spawns) expected[group.kind] = (expected[group.kind] || 0) + group.count;
    assert.deepEqual(info.counts, expected, `wave ${w + 1} preview matches spawn data`);
  }
  assert.equal(g.wavePreview(waves.length), null, "no preview past the final wave");
}

// Attacks and enemy strikes emit visible tracer effects.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 51 });
  g.setTeam(["nuwa", "zeus", "diana", "caishen", "poseidon"]);
  g.gold = 10000;
  g.place("zeus", "platform", 1);
  g.startWave(); g.enemies = []; g.spawnQueue = [];
  g.spawnEnemy("brute");
  const brute = g.enemies[0];
  brute.speed = 0; brute.distance = 320; brute.x = 168; brute.y = 240; // inside zeus's range
  g.step(1 / 60);
  assert.ok(g.effects.some((effect) => effect.type === "shot" && effect.color !== "red"), "hero attacks emit a tracer");
}

// --- 2B positional support aura ---

// Aura applies in range, not out of range, and never stacks.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 41 });
  g.setTeam(["caishen", "yuelao", "nuwa", "poseidon", "zeus"]);
  g.gold = 10000;
  g.place("caishen", "platform", 0); // (82, 225)
  g.place("yuelao", "platform", 1);  // (274, 292) - also in range of nuwa
  g.place("nuwa", "road", 0);        // (168, 230) - inside both support ranges
  g.place("poseidon", "road", 4);    // (650, 300) - outside all support ranges
  const [, , nuwa, poseidon] = g.heroes;
  const auraBonus = 1 + tuning.support.passiveAuraBonus;
  const synBonusNuwa = g.synergyBonusFor(nuwa);
  assert.ok(Math.abs(g.attackValue(nuwa) - nuwa.atk * auraBonus * (1 + synBonusNuwa)) < 1e-9, "ally in range gains aura bonus plus synergy");
  assert.equal(g.supportAuraFor(poseidon), null, "ally out of range gains nothing");
  assert.equal(g.synergyBonusFor(poseidon), 0, "poseidon out of synergy range");
  assert.equal(g.attackValue(poseidon), poseidon.atk, "out-of-range attack unchanged");
}

// Aura ends immediately when the support falls.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 42 });
  g.setTeam(["caishen", "nuwa", "poseidon", "zeus", "diana"]);
  g.gold = 10000;
  g.place("caishen", "platform", 0);
  g.place("nuwa", "road", 0);
  const [caishen, nuwa] = g.heroes;
  assert.ok(g.supportAuraFor(nuwa), "aura active while support lives");
  g.damageHero(caishen, 99999);
  assert.equal(g.supportAuraFor(nuwa), null, "aura gone when support falls");
  assert.equal(g.attackValue(nuwa), nuwa.atk, "attack returns to base");
}

// Aura bonus affects real damage dealt.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 43 });
  g.setTeam(["caishen", "zeus", "diana", "nuwa", "poseidon"]);
  g.gold = 10000;
  g.place("caishen", "platform", 0);
  g.place("zeus", "platform", 1);
  const [caishen, zeus] = g.heroes;
  caishen.aps = 0; // isolate zeus's damage from the support's own attacks
  caishen.x = zeus.x - 100; caishen.y = zeus.y; // well inside the aura, whatever the ring spacing
  g.startWave(); g.enemies = []; g.spawnQueue = [];
  g.spawnEnemy("brute");
  const brute = g.enemies[0];
  brute.speed = 0; brute.distance = 320; // path point (168, 240): inside zeus's and caishen's range
  brute.x = 168; brute.y = 240;
  const before = brute.hp;
  for (let i = 0; i < 60; i += 1) g.step(1 / 60);
  const unbuffedHit = resolveDamage(zeus.atk, brute.magicRes, "magical", false);
  const buffedHit = resolveDamage(zeus.atk * (1 + tuning.support.passiveAuraBonus), brute.magicRes, "magical", false);
  assert.ok(buffedHit > unbuffedHit, "aura raises attack damage");
  assert.ok(before - brute.hp >= buffedHit - 1e-6, "buffed attack deals aura-increased damage");
}

// --- 3B virtue choices ---

function runWaveOne(g) {
  g.setTeam(["nuwa", "poseidon", "zeus", "diana", "caishen"]);
  g.gold = 10000;
  g.place("nuwa", "road", 0); g.place("poseidon", "road", 3);
  g.place("zeus", "platform", 1); g.place("diana", "platform", 2); g.place("caishen", "platform", 0);
  g.startWave();
  for (let i = 0; i < 60 * 120 && g.running; i += 1) g.step(1 / 60);
}

// Offers are seeded and reproducible.
{
  const a = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 61 });
  const b = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 61 });
  runWaveOne(a); runWaveOne(b);
  assert.deepEqual(a.virtueOffer, b.virtueOffer, "same seed yields the same offer");
  assert.equal(a.virtueOffer.length, 3, "three picks offered");
}

// One selection per gap; the rest of the offer expires.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 62 });
  runWaveOne(g);
  const [first, second] = g.virtueOffer;
  assert.equal(g.chooseVirtue(first), true, "first selection accepted");
  assert.equal(g.chooseVirtue(second), false, "second selection in the same gap rejected");
  assert.deepEqual(g.virtues, [first], "exactly one blessing active");
}

// The chosen effect is applied to combat math.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 63 });
  g.setTeam(["nuwa", "poseidon", "zeus", "diana", "caishen"]);
  g.gold = 10000;
  g.place("zeus", "platform", 1);
  g.virtueOffer = ["Wildness", "Mercy", "Gnosis"];
  g.chooseVirtue("Wildness");
  const zeus = g.heroes[0];
  assert.ok(Math.abs(g.attackValue(zeus) - zeus.atk * 1.15) < 1e-9, "Wildness adds +15% attack");
  const hpBefore = zeus.hp;
  g.virtueOffer = ["Defiance"];
  g.chooseVirtue("Defiance");
  assert.equal(zeus.hp, Math.round(zeus.baseHp * 1.15), "Defiance raises max health for deployed heroes");
  assert.ok(zeus.hpLeft > hpBefore - 1 && zeus.hpLeft === zeus.hp, "health bonus granted as current health");
}

// Unclaimed offers expire when the next wave starts; restart clears everything.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 64 });
  runWaveOne(g);
  assert.ok(g.virtueOffer, "offer present after wave clear");
  g.startWave();
  assert.equal(g.virtueOffer, null, "offer expires on next wave");
  g.virtues.push("Wildness");
  g.reset();
  assert.deepEqual(g.virtues, [], "restart clears chosen blessings");
  assert.equal(g.virtueOffer, null, "restart clears the offer");
}

// --- 2A upgrades ---

// Exact cost, stat math, and no free full heal.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 31 });
  g.setTeam(["nuwa", "zeus", "diana", "caishen", "poseidon"]);
  g.gold = 10000;
  g.place("nuwa", "road", 0);
  const nuwa = g.heroes[0];
  nuwa.hpLeft = 200; // damaged: upgrade must not fully heal
  g.gold = tuning.upgrades.costs[1];
  const info = g.upgrade(nuwa.entityId);
  assert.equal(info.ok, true, "exact-cost purchase is allowed");
  assert.equal(g.gold, 0, "gold deducted exactly");
  assert.equal(nuwa.level, 2, "level increases");
  assert.equal(nuwa.atk, Math.round(nuwa.baseAtk * 1.1), "attack gains 10% of base");
  const expectedHp = Math.round(nuwa.baseHp * 1.2);
  assert.equal(nuwa.hp, expectedHp, "max health gains 20% of base");
  assert.equal(nuwa.hpLeft, 200 + (expectedHp - nuwa.baseHp), "max health gain granted without full heal");
}

// Rejections carry reasons: insufficient funds, level cap. Upgrades are allowed mid-wave.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 32 });
  g.setTeam(["nuwa", "zeus", "diana", "caishen", "poseidon"]);
  g.gold = 10000;
  g.place("nuwa", "road", 0);
  const nuwa = g.heroes[0];
  g.gold = tuning.upgrades.costs[1] - 1;
  assert.equal(g.upgrade(nuwa.entityId).ok, false, "insufficient funds rejected");
  assert.equal(g.gold, tuning.upgrades.costs[1] - 1, "failed purchase keeps gold");
  g.gold = 10000;
  g.startWave();
  assert.equal(g.upgrade(nuwa.entityId).ok, true, "mid-wave upgrade allowed");
  assert.equal(nuwa.level, 2, "mid-wave upgrade applied");
  g.enemies = []; g.spawnQueue = []; g.step(1 / 60);
  assert.equal(g.running, false, "wave cleared");
  while (nuwa.level < tuning.upgrades.maxLevel) assert.ok(g.upgrade(nuwa.entityId, "health").ok);
  assert.equal(nuwa.level, tuning.upgrades.maxLevel, "level cap reached");
  const capped = g.upgradeInfo(nuwa.entityId);
  assert.equal(capped.awaken, true, "past the level cap only Awakening is offered");
  g.gold = 10000;
  g.upgrade(nuwa.entityId);
  const done = g.upgrade(nuwa.entityId);
  assert.equal(done.ok, false, "after Awakening only training, which needs a stat");
  assert.equal(done.train, true, "training is offered");
  assert.ok(done.reason.includes("train"), "reason is stated");
}

// A fallen hero re-enters at level 1.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 33 });
  g.setTeam(["nuwa", "zeus", "diana", "caishen", "poseidon"]);
  g.gold = 10000;
  g.place("nuwa", "road", 0);
  g.upgrade(g.heroes[0].entityId);
  g.damageHero(g.heroes[0], 99999);
  assert.equal(g.heroes.length, 0, "fallen hero leaves the field");
  g.place("nuwa", "road", 1);
  assert.equal(g.heroes[0].level, 1, "re-recruited hero starts at level 1");
  assert.equal(g.heroes[0].atk, g.heroes[0].baseAtk, "re-recruited hero uses base stats");
}

// Wave result totals agree with the simulation.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 24 });
  g.setTeam(["nuwa", "poseidon", "zeus", "diana", "caishen"]);
  g.gold = 10000;
  g.place("nuwa", "road", 0); g.place("poseidon", "road", 3);
  g.place("zeus", "platform", 1); g.place("diana", "platform", 2); g.place("caishen", "platform", 0);
  const goldBefore = g.gold;
  g.startWave();
  for (let i = 0; i < 60 * 120 && g.running; i += 1) g.step(1 / 60);
  const stats = g.waveStats;
  assert.ok(stats, "wave stats exist after the wave");
  const totalSpawned = waves[0].spawns.reduce((sum, group) => sum + group.count, 0);
  assert.equal(stats.kills + stats.leaks, totalSpawned, "kills + leaks account for every spawn");
  assert.equal(g.gold - goldBefore, stats.goldEarned, "gold earned matches the simulation");
}

// --- 6A favor economy ---

// favor_earn_perfect_win: 10 perfect waves + boss kill + 25 remaining lives = 195.
{
  const result = computeFavor({ waves: 10, perfectWaves: 10, bossKilled: true, livesLeft: 25 }, tuning);
  assert.equal(result, 195, "perfect win earns 195 Favor");
}

// favor_earn_loss_wave5: loss at wave 5 with 0 lives = 50.
{
  const result = computeFavor({ waves: 5, perfectWaves: 0, bossKilled: false, livesLeft: 0 }, tuning);
  assert.equal(result, 50, "loss at wave 5 earns 50 Favor");
}

// Divine Blessings tree rules and effects: scripts/test-td-favor.mjs.

// --- 5B virtue pairs ---

// virtue_pair_triggered: choosing both pair virtues activates the pair.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 41 });
  g.setTeam(["nuwa", "zeus", "diana", "caishen", "poseidon"]);
  g.startWave();
  for (let i = 0; i < 60 * 120 && g.running; i += 1) g.step(1 / 60);
  // Manually inject an offer with the Storm Bond pair virtues.
  g.virtueOffer = ["Wildness", "Desire"];
  g.chooseVirtue("Wildness");
  g.virtueOffer = ["Desire", "Resolve"];
  g.chooseVirtue("Desire");
  assert.equal(g.activePairs.length, 1, "Storm Bond pair triggered after both virtues chosen");
  assert.equal(g.activePairs[0].name, "Storm Bond", "correct pair name");
}

// virtue_pair_bonus_applied: pair bonus stacks on top of individual virtue bonuses.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 42 });
  g.setTeam(["nuwa", "zeus", "diana", "caishen", "poseidon"]);
  g.startWave();
  for (let i = 0; i < 60 * 120 && g.running; i += 1) g.step(1 / 60);
  g.virtueOffer = ["Wildness", "Resolve"];
  g.chooseVirtue("Wildness");
  const atkAfterFirst = g.modifiers().atk;
  g.virtueOffer = ["Desire", "Resolve"];
  g.chooseVirtue("Desire");
  const atkAfterPair = g.modifiers().atk;
  // Wildness +0.15, Desire +0.10, Storm Bond +0.05 = 0.30
  assert.ok(Math.abs(atkAfterPair - (atkAfterFirst + 0.15)) < 1e-9, "pair atk bonus adds 0.05 on top of Desire 0.10");
}

// virtue_pair_not_double: same pair cannot be triggered twice.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 43 });
  g.setTeam(["nuwa", "zeus", "diana", "caishen", "poseidon"]);
  g.startWave();
  for (let i = 0; i < 60 * 120 && g.running; i += 1) g.step(1 / 60);
  g.virtueOffer = ["Wildness", "Resolve"];
  g.chooseVirtue("Wildness");
  g.virtueOffer = ["Desire", "Resolve"];
  g.chooseVirtue("Desire");
  assert.equal(g.activePairs.length, 1, "pair triggered once");
  // Simulate a second attempt to trigger (e.g. via manual manipulation).
  g.activePairs.push(...g.activePairs); // would be 2 if the guard failed
  // Verify the guard: direct call to chooseVirtue with an already-chosen virtue does nothing.
  g.virtueOffer = ["Wildness", "Mercy"];
  const result = g.chooseVirtue("Wildness");
  assert.equal(result, false, "already-chosen virtue cannot be selected again");
}

// virtue_pair_order_independent: pair triggers regardless of which virtue is chosen first.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 44 });
  g.setTeam(["nuwa", "zeus", "diana", "caishen", "poseidon"]);
  g.startWave();
  for (let i = 0; i < 60 * 120 && g.running; i += 1) g.step(1 / 60);
  g.virtueOffer = ["Desire", "Resolve"];
  g.chooseVirtue("Desire");
  g.virtueOffer = ["Wildness", "Resolve"];
  g.chooseVirtue("Wildness");
  assert.equal(g.activePairs.length, 1, "Storm Bond triggers when Desire chosen before Wildness");
}

// --- 5D run stats: per-hero kills, duration, gold tracking ---

// hero_kills_tracked: kills attributed to the attacking hero.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 55 });
  g.setTeam(["nuwa", "zeus", "diana", "caishen", "poseidon"]);
  g.gold = 10000;
  g.place("nuwa", "road", 0);
  g.place("zeus", "platform", 0);
  g.startWave();
  g.enemies = []; g.spawnQueue = [];
  const gruntsKilled = 3;
  for (let i = 0; i < gruntsKilled; i += 1) {
    g.spawnEnemy("grunt");
    const grunt = g.enemies.at(-1);
    grunt.hp = 1; grunt.x = g.heroes[0].x; grunt.y = g.heroes[0].y; // road hero contact
  }
  for (let i = 0; i < 60 * 5 && g.enemies.some((e) => !e.dead); i += 1) g.step(1 / 60);
  const killValues = Object.values(g.heroKills);
  assert.ok(killValues.some((entry) => entry.kills > 0), "at least one hero has kills");
  const total = killValues.reduce((sum, entry) => sum + entry.kills, 0);
  assert.ok(total >= gruntsKilled, `total kills (${total}) >= enemies killed (${gruntsKilled})`);
  killValues.forEach((entry) => assert.equal(typeof entry.name, "string", "kill entry has name"));
}

// run_duration_set_on_finish: runDuration reflects sim time at end of run.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 56 });
  g.setTeam(["nuwa", "zeus", "diana", "caishen", "poseidon"]);
  g.gold = 10000;
  g.place("nuwa", "road", 0);
  g.startWave();
  assert.equal(g.runDuration, 0, "runDuration 0 before finish");
  for (let i = 0; i < 60 * 90 && g.running; i += 1) g.step(1 / 60);
  // Force finish to check duration is set regardless of winning.
  if (!g.complete) g.finish(false);
  assert.ok(g.runDuration > 0, `runDuration (${g.runDuration}) > 0 after finish`);
  assert.ok(Math.abs(g.runDuration - g.time) < 1e-9, "runDuration equals g.time at finish");
}

// gold_spent_tracked: totalGoldSpent accumulates placement and upgrade costs.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 57 });
  g.setTeam(["nuwa", "zeus", "diana", "caishen", "poseidon"]);
  g.gold = 10000;
  assert.equal(g.totalGoldSpent, 0, "totalGoldSpent zero before any placement");
  const nuwaHero = heroes.find((h) => h.id === "nuwa");
  g.place("nuwa", "road", 0);
  assert.equal(g.totalGoldSpent, nuwaHero.cost, "placement cost tracked");
  // Upgrade between waves (no wave running).
  const eid = g.heroes[0].entityId;
  g.gold = 10000;
  const upgradeCost = tuning.upgrades.costs[1]; // hero is level 1 after placement; upgradeInfo uses costs[hero.level]
  g.upgrade(eid);
  assert.equal(g.totalGoldSpent, nuwaHero.cost + upgradeCost, "upgrade cost accumulates");
}

// gold_earned_tracked: totalGoldEarned accumulates kill rewards and wave clear bonuses.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 58 });
  g.setTeam(["nuwa", "zeus", "diana", "caishen", "poseidon"]);
  g.gold = 10000;
  g.place("nuwa", "road", 0);
  // Manually kill one grunt to verify kill reward is tracked.
  g.startWave();
  g.enemies = []; g.spawnQueue = [];
  g.spawnEnemy("grunt");
  const grunt = g.enemies[0];
  const gruntReward = grunt.reward;
  grunt.hp = 1; grunt.x = g.heroes[0].x; grunt.y = g.heroes[0].y;
  // Step until grunt dies (not until wave ends).
  for (let i = 0; i < 60 * 5 && grunt.hp > 0 && !grunt.dead; i += 1) g.step(1 / 60);
  // kill reward should be in totalGoldEarned now.
  assert.ok(g.totalGoldEarned >= gruntReward, `kill reward (${gruntReward}) in totalGoldEarned (${g.totalGoldEarned})`);
  // The wave also ended when enemies ran out; clear bonus was included.
  // Run a second wave to see another clear bonus stack.
  const beforeSecond = g.totalGoldEarned;
  g.startWave();
  g.enemies = []; g.spawnQueue = [];
  for (let i = 0; i < 10; i += 1) g.step(1 / 60); // no enemies => wave clears next tick
  assert.ok(g.totalGoldEarned > beforeSecond, "second wave clear bonus adds to totalGoldEarned");
}

// reset_clears_run_stats: heroKills, totalGoldSpent, totalGoldEarned, runDuration reset to zero.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 59 });
  g.heroKills = { 1: { name: "Test", kills: 5 } };
  g.totalGoldSpent = 200;
  g.totalGoldEarned = 300;
  g.runDuration = 123;
  g.reset();
  assert.deepEqual(g.heroKills, {}, "heroKills cleared on reset");
  assert.equal(g.totalGoldSpent, 0, "totalGoldSpent cleared on reset");
  assert.equal(g.totalGoldEarned, 0, "totalGoldEarned cleared on reset");
  assert.equal(g.runDuration, 0, "runDuration cleared on reset");
}

// --- 5C synergy visibility ---

// synergy_no_shared_tags: heroes with no overlapping tags get zero bonus.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 70 });
  g.setTeam(["nuwa", "zeus", "diana", "caishen", "poseidon"]);
  g.gold = 10000;
  g.place("nuwa", "road", 0);
  g.place("zeus", "platform", 0); // (82, 225) — close to nuwa (168, 230), dist ~86
  // Force no shared tags between nuwa and zeus for this test.
  g.heroes[0].synergies = ["TAG_A"];
  g.heroes[1].synergies = ["TAG_B"];
  assert.equal(g.synergyBonusFor(g.heroes[0]), 0, "no shared tags = 0 bonus");
  assert.deepEqual(g.synergyLinksFor(g.heroes[0]), [], "no synergy links when no shared tags");
}

// synergy_one_shared: one shared tag within range yields bonusPerTag.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 71 });
  g.setTeam(["nuwa", "zeus", "diana", "caishen", "poseidon"]);
  g.gold = 10000;
  g.place("nuwa", "road", 0);
  g.place("zeus", "platform", 0);
  g.heroes[0].synergies = ["TAG_X", "TAG_Y"];
  g.heroes[1].synergies = ["TAG_X", "TAG_Z"];
  const bonus = g.synergyBonusFor(g.heroes[0]);
  assert.ok(Math.abs(bonus - tuning.synergy.bonusPerTag) < 1e-9, `one shared tag = ${tuning.synergy.bonusPerTag} (got ${bonus})`);
  const links = g.synergyLinksFor(g.heroes[0]);
  assert.equal(links.length, 1, "one synergy link");
  assert.deepEqual(links[0].shared, ["TAG_X"], "shared tag listed");
}

// synergy_cap: many shared tags are capped at tuning.synergy.cap.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 72 });
  g.setTeam(["nuwa", "zeus", "diana", "caishen", "poseidon"]);
  g.gold = 10000;
  g.place("nuwa", "road", 0);
  g.place("zeus", "platform", 0);
  const manyTags = ["T1", "T2", "T3", "T4", "T5", "T6"];
  g.heroes[0].synergies = manyTags;
  g.heroes[1].synergies = manyTags;
  assert.equal(g.synergyBonusFor(g.heroes[0]), tuning.synergy.cap, "bonus capped at synergy.cap");
}

// synergy_out_of_range: shared tags beyond range yield zero.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 73 });
  g.setTeam(["nuwa", "zeus", "diana", "caishen", "poseidon"]);
  g.gold = 10000;
  g.place("nuwa", "road", 0); // (168, 230)
  g.place("zeus", "platform", 4); // (850, 292) — dist ~686 >> 250
  g.heroes[0].synergies = ["SHARED_TAG"];
  g.heroes[1].synergies = ["SHARED_TAG"];
  assert.equal(g.synergyBonusFor(g.heroes[0]), 0, "out of range = 0 bonus");
  assert.equal(g.activeSynergyCount(), 0, "activeSynergyCount 0 when out of range");
}

// synergy_dead_hero: a fallen hero does not contribute synergy bonus.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 74 });
  g.setTeam(["nuwa", "zeus", "diana", "caishen", "poseidon"]);
  g.gold = 10000;
  g.place("nuwa", "road", 0);
  g.place("zeus", "platform", 0);
  g.heroes[0].synergies = ["SHARED_TAG"];
  g.heroes[1].synergies = ["SHARED_TAG"];
  assert.ok(g.synergyBonusFor(g.heroes[0]) > 0, "synergy present before death");
  g.heroes[1].hpLeft = 0; // mark dead (sim removes from array on death but test simulates it)
  assert.equal(g.synergyBonusFor(g.heroes[0]), 0, "dead hero contributes no synergy");
}

// --- P2 hero skill variants ---

// variant_loaded: heroSkills merged into placed heroes.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 80 });
  g.setTeam(["nyx", "poseidon", "zeus", "medusa", "freya"]);
  g.gold = 10000;
  g.place("nyx", "road", 0);
  g.place("poseidon", "road", 1);
  g.place("medusa", "platform", 0);
  g.place("freya", "platform", 1);
  g.place("zeus", "platform", 2);
  const nyx = g.heroes.find((h) => h.id === "nyx");
  const poseidon = g.heroes.find((h) => h.id === "poseidon");
  const medusa = g.heroes.find((h) => h.id === "medusa");
  const freya = g.heroes.find((h) => h.id === "freya");
  const zeus = g.heroes.find((h) => h.id === "zeus");
  assert.equal(nyx.variant, "shadow_step", "nyx variant loaded");
  assert.equal(poseidon.variant, "knockback", "poseidon variant loaded");
  assert.equal(medusa.variant, "petrify_shot", "medusa variant loaded");
  assert.equal(freya.variant, "valkyrie_call", "freya variant loaded");
  assert.equal(zeus.variant, "chain_lightning", "zeus variant loaded");
  assert.ok(nyx.skillName, "nyx has skill name");
  assert.ok(zeus.skillName, "zeus has skill name");
}

// variant_knockback: Poseidon cleave reduces enemy distance.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 81 });
  g.setTeam(["poseidon", "nuwa", "zeus", "diana", "caishen"]);
  g.gold = 10000;
  g.place("poseidon", "road", 0);
  g.startWave(); g.enemies = []; g.spawnQueue = [];
  g.spawnEnemy("grunt");
  const poseidon = g.heroes[0];
  const grunt = g.enemies[0];
  grunt.x = poseidon.x; grunt.y = poseidon.y; grunt.distance = 200;
  const distBefore = grunt.distance;
  g.castUltimate(poseidon, grunt);
  assert.ok(grunt.distance < distBefore, "knockback reduces enemy distance");
  assert.ok(grunt.distance >= 0, "distance cannot go below 0");
}

// variant_petrify_shot: Medusa petrifies up to petrifyTargets enemies in her facing cone for petrifyDuration seconds.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 82 });
  g.setTeam(["medusa", "nuwa", "zeus", "diana", "caishen"]);
  g.gold = 10000;
  g.place("medusa", "platform", 0);
  g.startWave(); g.enemies = []; g.spawnQueue = [];
  const medusa = g.heroes[0];
  const skill = tuning.heroSkills.medusa;
  assert.equal(g.castUltimate(medusa, null), false, "no target in the cone keeps the ultimate ready");
  for (let i = 0; i < skill.petrifyTargets + 1; i += 1) g.spawnEnemy("brute");
  g.enemies.forEach((enemy, i) => {
    const reach = 30 + i * 5;
    enemy.x = medusa.x + Math.cos(medusa.rotation) * reach;
    enemy.y = medusa.y + Math.sin(medusa.rotation) * reach;
    enemy.distance = 100 + i;
  });
  g.castUltimate(medusa, g.enemies[0]);
  const stoned = g.enemies.filter((enemy) => (enemy.petrifiedUntil ?? 0) > g.time);
  assert.equal(stoned.length, skill.petrifyTargets, "petrifies up to petrifyTargets enemies");
  assert.ok(stoned.every((enemy) => Math.abs(enemy.petrifiedUntil - (g.time + skill.petrifyDuration)) < 1e-9), "petrify lasts petrifyDuration");
  const target = stoned[0];
  const before = target.distance;
  g.step(1 / 60);
  assert.equal(target.distance, before, "petrified enemy does not move");
}

// variant_shadow_step: Nyx can target enemies outside normal range.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 83 });
  g.setTeam(["nyx", "nuwa", "zeus", "diana", "caishen"]);
  g.gold = 10000;
  g.place("nyx", "road", 0);
  g.startWave(); g.enemies = []; g.spawnQueue = [];
  g.spawnEnemy("grunt");
  const nyx = g.heroes[0];
  const grunt = g.enemies[0];
  grunt.x = 900; grunt.y = 500; // far away
  grunt.hp = 1; grunt.maxHp = 100;
  assert.equal(g.findTarget(nyx), null, "normal attacks stay within range");
  assert.ok(g.findUltTarget(nyx) === grunt, "shadow_step targets enemy outside normal range");
  nyx.ultClock = nyx.ultCooldown;
  nyx.attackClock = 1; // the step moves the grunt onto the path; keep the dash basic out of it
  g.step(1 / 60);
  assert.equal(nyx.ultClock < nyx.ultCooldown, true, "ultimate fires with no enemy in normal range");
  assert.ok(grunt.hp <= 0 || grunt.dead, "far low-HP enemy is executed");
}

// variant_valkyrie_call: Freya revives a fallen hero.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 84 });
  g.setTeam(["freya", "nuwa", "zeus", "diana", "caishen"]);
  g.gold = 10000;
  g.place("freya", "platform", 0);
  g.place("nuwa", "road", 0);
  g.startWave(); g.enemies = []; g.spawnQueue = [];
  const nuwa = g.heroes.find((h) => h.id === "nuwa");
  const slotType = nuwa.slotType; const slotIndex = nuwa.slotIndex;
  // Kill nuwa directly
  g.fallenHeroes.push({ id: "nuwa", slotType, slotIndex });
  g.heroes = g.heroes.filter((h) => h.id !== "nuwa");
  assert.equal(g.heroes.filter((h) => h.id === "nuwa").length, 0, "nuwa fallen");
  const freya = g.heroes.find((h) => h.id === "freya");
  g.spawnEnemy("grunt");
  g.castUltimate(freya, g.enemies[0]);
  const revived = g.heroes.find((h) => h.id === "nuwa");
  assert.ok(revived, "nuwa revived by valkyrie_call");
  assert.ok(revived.hpLeft <= revived.hp * 0.55, "revived hero has at most 55% HP");
  assert.ok(revived.hpLeft >= revived.hp * 0.45, "revived hero has at least 45% HP");
}

// valkyrie_call edge cases: the revived hero rejoins the team; heroes already
// back on the field and occupied rings are skipped (fallback: heal).
{
  const make = () => {
    const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 85 });
    g.gold = 100000;
    return g;
  };
  const kill = (g, id) => { const unit = g.heroes.find((h) => h.id === id); g.damageHero(unit, unit.hpLeft + 1, null); };
  const castFreya = (g) => {
    const freya = g.heroes.find((h) => h.id === "freya");
    g.startWave(); g.enemies = []; g.spawnQueue = [];
    g.spawnEnemy("grunt");
    g.castUltimate(freya, g.enemies[0]);
  };

  // A: five fielded, one falls, Freya revives it; more heroes can still join (no cap).
  {
    const g = make();
    for (const [id, type, index] of [["freya", "platform", 0], ["nuwa", "road", 0], ["zeus", "platform", 1], ["diana", "platform", 2], ["poseidon", "road", 1]]) g.place(id, type, index);
    kill(g, "nuwa");
    castFreya(g);
    assert.ok(g.heroes.some((h) => h.id === "nuwa"), "A: nuwa revived");
    assert.ok(g.team.includes("nuwa"), "A: revived hero is back in the team");
    assert.equal(g.place("caishen", "platform", 3), true, "A: sixth hero after a revive");
  }

  // B: the fallen hero was redeployed elsewhere first: no second copy.
  {
    const g = make();
    g.place("freya", "platform", 0); g.place("nuwa", "road", 0);
    kill(g, "nuwa");
    g.place("nuwa", "road", 2);
    castFreya(g);
    assert.equal(g.heroes.filter((h) => h.id === "nuwa").length, 1, "B: no duplicate hero");
  }

  // C: another hero took the fallen hero's ring: no stacking on that ring.
  {
    const g = make();
    g.place("freya", "platform", 0); g.place("nuwa", "road", 0);
    kill(g, "nuwa");
    g.place("poseidon", "road", 0);
    castFreya(g);
    assert.equal(g.heroes.filter((h) => h.slotType === "road" && h.slotIndex === 0).length, 1, "C: one hero per ring");
    assert.ok(!g.heroes.some((h) => h.id === "nuwa"), "C: nuwa stays fallen");
  }

  // D: five alive plus a fallen hero: the revive adds a sixth (no team cap).
  {
    const g = make();
    g.place("freya", "platform", 0); g.place("nuwa", "road", 0);
    kill(g, "nuwa");
    for (const [id, type, index] of [["zeus", "platform", 1], ["diana", "platform", 2], ["poseidon", "road", 1], ["caishen", "platform", 3]]) g.place(id, type, index);
    castFreya(g);
    assert.equal(g.heroes.length, 6, "D: revive past five heroes");
  }

  // E: an older eligible fallen hero is revived when the newest one is not eligible.
  {
    const g = make();
    g.place("freya", "platform", 0); g.place("nuwa", "road", 0); g.place("poseidon", "road", 1);
    kill(g, "nuwa");
    kill(g, "poseidon");
    g.place("poseidon", "road", 3); // newest fallen is back on the field
    castFreya(g);
    assert.ok(g.heroes.some((h) => h.id === "nuwa" && h.slotIndex === 0), "E: older fallen hero revived on its ring");
  }
}

// variant_expose: Prometheus-exposed enemies take 30% more damage.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 85 });
  g.setTeam(["prometheus", "nuwa", "zeus", "diana", "caishen"]);
  g.gold = 10000;
  g.place("prometheus", "road", 0);
  g.startWave(); g.enemies = []; g.spawnQueue = [];
  g.spawnEnemy("grunt"); g.spawnEnemy("grunt");
  const prometheus = g.heroes[0];
  const [g1, g2] = g.enemies;
  g1.x = prometheus.x; g1.y = prometheus.y;
  g2.x = 900; g2.y = 500; // far, not exposed
  g.castUltimate(prometheus, g1);
  assert.ok(g1.exposed && g1.exposed > g.time, "nearby enemy exposed");
  assert.equal(g2.exposed, undefined, "far enemy not exposed");
  const hpBefore = g1.hp;
  g.hit(g1, 100, prometheus);
  assert.ok(g1.hp <= hpBefore - 119, "exposed enemy takes at least 120 damage from 100 hit");
}

// No team cap (M5): every ring can hold a distinct hero; rings, gold and uniqueness still apply.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 91 });
  g.gold = 100000;
  const road = heroes.filter((h) => h.slot === "road").slice(0, maps[0].roadSlots.length);
  const platform = heroes.filter((h) => h.slot === "platform").slice(0, maps[0].platformSlots.length);
  road.forEach((h, i) => assert.equal(g.place(h.id, "road", i), true, `road ring ${i} filled`));
  platform.forEach((h, i) => assert.equal(g.place(h.id, "platform", i), true, `platform ring ${i} filled`));
  assert.equal(g.heroes.length, maps[0].roadSlots.length + maps[0].platformSlots.length, "every ring holds a hero");
  assert.equal(g.team.length, g.heroes.length, "team lists every fielded hero");
  const spare = heroes.find((h) => h.slot === "road" && !g.team.includes(h.id));
  assert.equal(g.place(spare.id, "road", 0), false, "occupied ring rejected");
  assert.equal(g.place(spare.id, "road", maps[0].roadSlots.length), false, "missing ring rejected");
  const fielded = g.heroes.find((h) => h.slotType === "road");
  g.damageHero(fielded, fielded.hpLeft + 1, null);
  assert.equal(g.team.includes(fielded.id), false, "dead hero leaves the team roster");
  assert.equal(g.place(spare.id, "road", fielded.slotIndex), true, "freed ring takes a new hero");
  const poor = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 91 });
  poor.gold = road[0].cost - 1;
  assert.equal(poor.place(road[0].id, "road", 0), false, "gold still limits deploys");
}

// --- 6B run quests ---

// One quest per wave, none on the final wave, none without tuning.quests.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 91 });
  g.place("zeus", "platform", 0);
  g.startWave();
  assert.ok(g.quest, "quest rolled at wave start");
  assert.equal(g.quest.status, "active");
  assert.notEqual(g.quest.type, "heroSurvival", "no survival quest without a road hero");
  assert.equal(g.quest.gold, tuning.quests.goldBase, "wave 1 quest pays goldBase");
  g.running = false; g.wave = waves.length - 1;
  g.startWave();
  assert.equal(g.quest, null, "no quest on the final wave");
  const off = new TowerDefenseGame({ heroes, tuning: { ...tuning, quests: undefined }, map: maps[0], waves, seed: 91 });
  off.place("zeus", "platform", 0);
  off.startWave();
  assert.equal(off.quest, null, "no quests without config");
}

// Quests do not touch the combat RNG: same seed, same virtue offer with or without quests.
{
  const a = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 92 });
  const b = new TowerDefenseGame({ heroes, tuning: { ...tuning, quests: undefined }, map: maps[0], waves, seed: 92 });
  runWaveOne(a); runWaveOne(b);
  assert.deepEqual(a.virtueOffer, b.virtueOffer, "quest rolls leave combat randomness unchanged");
}

// Fail and complete paths per quest type.
{
  const setup = (type) => {
    const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 93 });
    g.gold = 10000;
    g.place("nuwa", "road", 0); g.place("zeus", "platform", 0);
    g.startWave();
    g.quest = { ...g.quest, type, seconds: 5 };
    return g;
  };
  // A leak fails No leaks.
  let g = setup("noLeaks");
  g.spawnQueue = []; g.spawnEnemy("runner"); g.enemies[0].distance = g.path.total - 1;
  g.heroes = g.heroes.filter((h) => h.slotType !== "road");
  g.step(1 / 60);
  assert.equal(g.quest.status, "failed", "leak fails noLeaks");
  // A fallen hero fails survival.
  g = setup("heroSurvival");
  const nuwa = g.heroes.find((h) => h.id === "nuwa");
  g.damageHero(nuwa, nuwa.hpLeft + 1, null);
  assert.equal(g.quest.status, "failed", "hero death fails heroSurvival");
  // Speed clear fails once the clock runs out after the last spawn.
  g = setup("speedClear");
  g.spawnQueue = [{ at: 0, kind: "brute" }];
  g.step(1 / 60);
  assert.ok(g.waveStats.lastSpawnAt != null, "last spawn time recorded");
  g.enemies[0].hp = g.enemies[0].maxHp = 1e9; // keep the wave open past the limit
  for (let i = 0; i < 60 * 6; i += 1) g.step(1 / 60);
  assert.equal(g.quest.status, "failed", "speedClear fails after its limit");
  // Clearing the wave with the quest active pays its gold once.
  g = setup("noLeaks");
  g.spawnQueue = []; g.enemies = [];
  const gold = g.gold;
  const clearBonus = tuning.run.waveClearBonus.base;
  g.step(1 / 60);
  assert.equal(g.quest.status, "done", "cleared wave completes the quest");
  assert.equal(g.gold, gold + clearBonus + g.quest.gold, "quest gold paid on top of the clear bonus");
  assert.equal(g.questsDone, 1);
}

// Speed clear limit scales with the map: a longer path gives more time.
{
  const limit = (map) => {
    const g = new TowerDefenseGame({ heroes, tuning, map, waves, seed: 94 });
    g.startWave();
    g.quest = null;
    return Math.round((g.path.total / tuning.enemies.grunt.speed) * tuning.quests.speedClearTravel);
  };
  const [short, long] = [...maps].sort((m1, m2) => new TowerDefenseGame({ heroes, tuning, map: m1, waves }).path.total - new TowerDefenseGame({ heroes, tuning, map: m2, waves }).path.total);
  const g = new TowerDefenseGame({ heroes, tuning, map: long, waves, seed: 94 });
  g.place("zeus", "platform", 0);
  for (let seed = 0; seed < 50 && g.quest?.type !== "speedClear"; seed += 1) {
    g.questRng = createRng(seed); g.running = false; g.wave = 0; g.startWave();
  }
  assert.equal(g.quest.type, "speedClear", "found a speed clear roll");
  assert.equal(g.quest.seconds, limit(long), "limit = slowest enemy path time x speedClearTravel");
  assert.ok(limit(long) > limit(short), "longer map allows more time");
}

// Slayer (heroKills): a named deployed hero must land a target share of the wave's kills.
{
  const rollSlayer = () => {
    const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 95 });
    g.gold = 10000;
    g.place("nuwa", "road", 0); g.place("zeus", "platform", 0);
    for (let seed = 0; seed < 50 && g.quest?.type !== "heroKills"; seed += 1) {
      g.questRng = createRng(seed); g.running = false; g.wave = 0; g.startWave();
    }
    return g;
  };
  let g = rollSlayer();
  assert.equal(g.quest.type, "heroKills", "found a slayer roll");
  const named = g.heroes.find((h) => h.entityId === g.quest.heroEntityId);
  assert.ok(named, "slayer names a deployed hero");
  assert.equal(g.quest.heroName, named.name);
  const enemies = waves[0].spawns.reduce((sum, group) => sum + group.count, 0);
  assert.equal(g.quest.target, Math.max(1, Math.round((enemies / 2) * tuning.quests.heroKillsShare)), "target = even split x heroKillsShare");
  // Kills by other heroes do not count; kills by the named hero do.
  const other = g.heroes.find((h) => h !== named);
  g.spawnQueue = []; g.spawnEnemy("grunt"); g.spawnEnemy("grunt");
  g.hit(g.enemies[0], 1e9, other);
  assert.equal(g.quest.kills, 0, "other hero's kill does not count");
  g.hit(g.enemies[1], 1e9, named);
  assert.equal(g.quest.kills, 1, "named hero's kill counts");
  // Clearing short of the target fails; reaching it pays.
  g.quest.target = 2;
  g.enemies = [];
  g.step(1 / 60);
  assert.equal(g.quest.status, "failed", "clear below target fails the quest");
  assert.equal(g.questsDone, 0);
  g = rollSlayer();
  g.spawnQueue = [];
  g.quest.kills = g.quest.target;
  g.enemies = [];
  const before = g.gold;
  g.step(1 / 60);
  assert.equal(g.quest.status, "done", "reaching the target completes the quest");
  assert.equal(g.gold, before + tuning.run.waveClearBonus.base + g.quest.gold);
  // The named hero falling before the target fails it at once.
  g = rollSlayer();
  const nuwa = g.heroes.find((h) => h.id === "nuwa");
  g.quest.heroEntityId = nuwa.entityId;
  g.damageHero(nuwa, nuwa.hpLeft + 1, null);
  assert.equal(g.quest.status, "failed", "named hero falling fails slayer");
}

// Slayer needs two deployed heroes.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 96 });
  g.place("zeus", "platform", 0);
  for (let seed = 0; seed < 50; seed += 1) {
    g.questRng = createRng(seed); g.running = false; g.wave = 0; g.startWave();
    assert.notEqual(g.quest.type, "heroKills", "no slayer with a single hero");
  }
}

// --- M5 ultimates audit: edge cases for every variant ---

// Every roster ultimate survives awkward states: dead target, lone target,
// crowd, nobody in range. No throw, no NaN, nobody above max health.
{
  const roster = heroes.map((h) => h.id);
  const scenarios = {
    deadTarget: (g) => { g.spawnEnemy("grunt"); const e = g.enemies[0]; e.hp = 0; e.dead = true; return e; },
    lone: (g) => { g.spawnEnemy("brute"); return g.enemies[0]; },
    crowd: (g) => { for (const k of ["grunt", "runner", "flyer", "archer", "brute", "grunt"]) g.spawnEnemy(k); return g.enemies[0]; },
  };
  for (const id of roster) {
    for (const [name, setup] of Object.entries(scenarios)) {
      const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 96 });
      g.gold = 100000;
      const base = g.heroesById.get(id);
      assert.ok(g.place(id, base.slot, 0), `${id} placed`);
      g.place(base.slot === "road" ? "zeus" : "nuwa", base.slot === "road" ? "platform" : "road", 0);
      g.startWave(); g.spawnQueue = []; g.enemies = [];
      const hero = g.heroes.find((h) => h.id === id);
      const target = setup(g);
      // Put everyone on the hero so range and cone checks can pass.
      for (const e of g.enemies) { e.x = hero.x + 20; e.y = hero.y; }
      hero.hpLeft = hero.hp * 0.5;
      assert.doesNotThrow(() => g.castUltimate(hero, target), `${id} ult (${name})`);
      for (const e of g.enemies) assert.ok(Number.isFinite(e.hp) && Number.isFinite(e.x) && Number.isFinite(e.distance), `${id} (${name}) enemy state finite`);
      for (const h of g.heroes) assert.ok(h.hpLeft <= h.hp + 1e-9, `${id} (${name}) ${h.id} not overhealed`);
    }
  }
}

// A normal attack that kills its target must not spend the ultimate on the corpse.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 97 });
  g.gold = 10000;
  g.place("horus", "road", 0);
  const horus = g.heroes[0];
  g.startWave(); g.spawnQueue = []; g.enemies = [];
  g.spawnEnemy("grunt"); g.spawnEnemy("grunt");
  const [weak, other] = g.enemies;
  for (const e of g.enemies) { e.x = horus.x + 20; e.y = horus.y; e.distance = 1; }
  weak.hp = 1; weak.distance = 2; // furthest along: the attack target, dies to the basic hit
  other.petrifiedUntil = 1e9; // keep it in range (an Assassin blocks only one enemy)
  horus.attackClock = 0;
  horus.ultClock = horus.ultCooldown + 1;
  const hpBefore = other.hp;
  g.step(1 / 60);
  assert.ok(weak.dead, "basic attack killed the weak grunt");
  assert.ok(other.hp < hpBefore, "ultimate went to a living enemy instead of the corpse");
}

// Poseidon's knockback moves the enemy on the map, not just its path distance,
// so a blocked enemy is actually pushed out of the pile.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 98 });
  g.gold = 10000;
  g.place("poseidon", "road", 1);
  const pos = g.heroes[0];
  g.startWave(); g.spawnQueue = []; g.enemies = [];
  g.spawnEnemy("brute");
  const e = g.enemies[0];
  // Park the brute on the path next to Poseidon.
  let best = 0;
  for (let d = 0; d < g.path.total; d += 2) {
    const p = pointOnPath(maps[0].path, d);
    if (Math.hypot(p.x - pos.x, p.y - pos.y) < Math.hypot(pointOnPath(maps[0].path, best).x - pos.x, pointOnPath(maps[0].path, best).y - pos.y)) best = d;
  }
  e.distance = best + 20;
  Object.assign(e, pointOnPath(maps[0].path, e.distance));
  e.hp = e.maxHp = 1e9;
  const before = { x: e.x, y: e.y };
  g.castUltimate(pos, e);
  const expected = pointOnPath(maps[0].path, e.distance);
  assert.ok(Math.hypot(e.x - expected.x, e.y - expected.y) < 0.01, "knocked-back enemy position matches its new path distance");
  assert.ok(Math.hypot(e.x - before.x, e.y - before.y) > 1, "enemy visibly moved");
}

// Zeus: chain bounces go to enemies the primary blast did not already hit.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 99 });
  g.gold = 10000;
  g.place("zeus", "platform", 0);
  const zeus = g.heroes[0];
  g.startWave(); g.spawnQueue = []; g.enemies = [];
  for (let i = 0; i < 3; i += 1) g.spawnEnemy("brute");
  const [a, near, far] = g.enemies;
  for (const e of g.enemies) e.hp = e.maxHp = 1e9;
  a.x = 400; a.y = 300; near.x = 430; near.y = 300; far.x = 520; far.y = 300; // near is inside the 72px blast, far only bounce range
  g.castUltimate(zeus, a);
  const lost = (e) => 1e9 - e.hp;
  assert.ok(lost(far) > 0, "bounce reached the enemy outside the blast");
  assert.ok(Math.abs(lost(near) - lost(a)) < lost(a) * 0.3, "enemy inside the blast is not hit again by the bounce");
}

// Entering an authored map's visible base damages it exactly once, without a kill reward.
for (const map of maps.filter((entry) => entry.base)) mapLanes(map).forEach((route, lane) => {
  assert.deepEqual(route.path[0], [route.spawn.x, route.spawn.y], `${map.id} route starts at the spawn aperture`);
  assert.deepEqual(route.path.at(-1), [map.base.x, map.base.y], `${map.id} route ends at the base threshold`);
  const g = new TowerDefenseGame({ heroes, tuning, map, waves, seed: 104 });
  g.startWave(); g.spawnQueue = []; g.enemies = [];
  g.spawnEnemy("runner", { lane });
  const enemy = g.enemies[0];
  assert.deepEqual({ x: enemy.x, y: enemy.y }, route.spawn, "enemy emerges from the visible spawn");
  const lives = g.lives;
  const score = g.score;
  const dt = 1 / 60;
  enemy.distance = g.laneOf(enemy).total - enemy.speed * dt * 1.5;
  g.step(dt);
  assert.equal(g.lives, lives, "approaching the doorway does not damage the base early");
  g.step(dt);
  assert.equal(g.lives, lives - enemy.damage, "crossing the doorway removes enemy damage from integrity");
  assert.equal(enemy.exitReason, "base", "renderer can distinguish ingress from death");
  assert.deepEqual({ x: enemy.x, y: enemy.y }, map.base, "movement terminates inside the base");
  const hits = g.effects.filter((effect) => effect.type === "baseHit");
  assert.equal(hits.length, 1, "one breach produces one base impact");
  assert.equal(hits[0].enemyId, enemy.entityId, "impact identifies the entering enemy");
  assert.equal(hits[0].damage, enemy.damage, "impact reports actual integrity loss");
  assert.equal(g.score, score, "entering the base does not award kill score");
  assert.equal(g.waveStats.kills, 0, "entering the base does not count as a kill");
  assert.equal(g.waveStats.leaks, 1, "entry still counts for wave statistics and quests");
  g.step(dt);
  assert.equal(g.lives, lives - enemy.damage, "removed enemy cannot damage the base again");
});

// Multi-entrance maps: gates alternate, lanes are equally long and merge before the base.
for (const map of maps.filter((entry) => entry.lanes)) {
  const g = new TowerDefenseGame({ heroes, tuning, map, waves, seed: 105 });
  assert.ok(g.lanes.length >= 2, `${map.id} has several entrances`);
  // Targeting ranks enemies by distance walked, which is only fair when every lane is as long.
  for (const lane of g.lanes) assert.equal(lane.total, g.path.total, `${map.id} lanes share one length`);
  const tail = (path) => JSON.stringify(path.slice(-2));
  assert.ok(g.lanes.every((lane) => tail(lane.path) === tail(g.lanes[0].path)), `${map.id} lanes merge into one approach`);
  g.startWave();
  const perLane = g.lanes.map((_, i) => g.spawnQueue.filter((item) => item.lane === i).length);
  assert.ok(Math.min(...perLane) > 0, "every gate sends enemies");
  assert.ok(Math.max(...perLane) - Math.min(...perLane) <= 1, "gates share each wave evenly");
  g.spawnQueue = []; g.enemies = [];
  const second = g.spawnEnemy("grunt", { lane: 1 });
  const [x, y] = mapLanes(map)[1].path[0];
  assert.deepEqual({ x: second.x, y: second.y }, { x, y }, "second lane starts at its own gate");
  second.distance = 60;
  g.step(1 / 60);
  assert.ok(second.x > x + 55 && Math.abs(second.y - y) < 1, "second lane walks its own road");
}

// Final-life impacts arrive before finish; invincibility reports zero damage; legacy maps stay unchanged.
for (const scenario of ["last-life", "invincible", "legacy"]) {
  const moonlit = maps.find((entry) => entry.id === "moonlit-pass");
  // Legacy: a map without spawn/base metadata keeps the old offscreen leak behavior.
  const { spawn: _spawn, base: _base, ...legacy } = maps.find((entry) => entry.id === "verdant-crossing");
  const map = scenario === "legacy" ? legacy : moonlit;
  const order = [];
  const g = new TowerDefenseGame({ heroes, tuning, map, waves, seed: 105,
    onChange: (type) => { if (type === "finish") order.push(type); } });
  g.onEffect = (effect) => { if (effect.type === "baseHit") order.push(effect.type); };
  g.startWave(); g.spawnQueue = []; g.enemies = [];
  g.lives = 1;
  g.difficulty.invincible = scenario === "invincible";
  g.spawnEnemy("brute");
  const enemy = g.enemies[0];
  enemy.damage = 5;
  enemy.distance = g.path.total - 0.01;
  g.step(1 / 60);
  const hit = g.effects.find((effect) => effect.type === "baseHit");
  if (scenario === "legacy") {
    assert.equal(hit, undefined, "maps without a base do not emit sanctuary effects");
    assert.equal(enemy.exitReason, undefined, "legacy removal behavior stays intact");
    assert.equal(g.lives, 0, "legacy leak still deducts lives");
  } else if (scenario === "invincible") {
    assert.equal(g.lives, 1, "debug invincibility protects integrity");
    assert.equal(hit.damage, 0, "invincible ingress cannot trigger false damage feedback");
  } else {
    assert.equal(hit.damage, 1, "overkill effect is capped to actual remaining integrity");
    assert.equal(g.complete, true, "last-life breach ends the run");
    assert.deepEqual(order, ["baseHit", "finish"], "final impact is emitted before the result screen");
    assert.ok(hit.life > 0, "final impact survives the finishing simulation step");
  }
}

// Nothing changes after the run is over, even later in the same step.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 100 });
  g.gold = 10000;
  g.place("zeus", "platform", 0);
  const zeus = g.heroes[0];
  g.startWave(); g.spawnQueue = []; g.enemies = [];
  g.lives = 1;
  g.spawnEnemy("runner"); g.spawnEnemy("grunt");
  const [leaker, victim] = g.enemies;
  leaker.distance = g.path.total - 0.01;
  victim.x = zeus.x + 20; victim.y = zeus.y; victim.distance = 5;
  victim.petrifiedUntil = 1e9; // hold it in Zeus's range
  zeus.attackClock = 0; zeus.ultClock = zeus.ultCooldown + 1;
  const score = g.score;
  g.step(1 / 60);
  assert.equal(g.complete, true, "run lost on the leak");
  assert.equal(g.score, score, "no score after the run ended");
  assert.equal(zeus.ultClock > zeus.ultCooldown, true, "no ultimate after the run ended");
}

// Road heroes' ultimates skip flyers (damage, slows, pushes, debuffs); platform ultimates still hit them.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 103 });
  g.gold = 100000;
  g.place("amunra", "road", 0); g.place("momus", "road", 2); g.place("zeus", "platform", 0);
  const [amunra, momus, zeus] = ["amunra", "momus", "zeus"].map((id) => g.heroes.find((h) => h.id === id));
  g.startWave(); g.spawnQueue = []; g.enemies = [];
  g.spawnEnemy("grunt"); g.spawnEnemy("flyer");
  const [grunt, flyer] = g.enemies;
  for (const e of g.enemies) { e.hp = e.maxHp = 1e9; e.x = amunra.x + 20; e.y = amunra.y; }
  g.castUltimate(amunra, grunt);
  assert.ok(grunt.hp < 1e9, "warrior cleave hits the ground enemy");
  assert.equal(flyer.hp, 1e9, "warrior cleave skips the flyer");
  flyer.slow = 0; flyer.x = momus.x + 10; flyer.y = momus.y;
  g.castUltimate(momus, grunt);
  assert.equal(flyer.slow, 0, "tank taunt does not slow flyers");
  flyer.x = zeus.x + 20; flyer.y = zeus.y;
  g.castUltimate(zeus, flyer);
  assert.ok(flyer.hp < 1e9, "platform ultimate still hits flyers");
}

// --- Awakening: level-5 step (tuning.awakening), stronger ultimate, lost on death ---
{
  const aw = tuning.awakening;
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 104 });
  g.gold = 100000;
  g.place("zeus", "platform", 0);
  const zeus = g.heroes[0];
  for (let i = 1; i < tuning.upgrades.maxLevel; i += 1) assert.ok(g.upgrade(zeus.entityId, "range").ok);
  const info = g.upgradeInfo(zeus.entityId);
  assert.equal(info.awaken, true, "past the level cap the next step is Awakening");
  assert.equal(info.cost, aw.cost);
  const atk = zeus.atk, hp = zeus.hp, gold = g.gold;
  assert.ok(g.upgrade(zeus.entityId).ok);
  assert.equal(zeus.awakened, true);
  assert.equal(zeus.level, tuning.upgrades.maxLevel, "awakening does not add a level");
  assert.equal(g.gold, gold - aw.cost);
  assert.ok(Math.abs(zeus.atk - atk * (1 + aw.attackBonus)) <= 1, "attack bonus");
  assert.ok(Math.abs(zeus.hp - hp * (1 + aw.healthBonus)) <= 1, "health bonus");
  assert.notEqual(g.upgradeInfo(zeus.entityId).awaken, true, "only once (training follows)");
  g.damageHero(zeus, zeus.hpLeft + 1, null);
  assert.ok(g.place("zeus", "platform", 0));
  const back = g.heroes.find((h) => h.id === "zeus");
  assert.equal(!!back.awakened, false, "lost on death");
  assert.equal(back.level, 1);
}

// Every roster ultimate still survives the edge cases when awakened.
{
  for (const id of heroes.map((h) => h.id)) {
    const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 105 });
    g.gold = 100000;
    const base = g.heroesById.get(id);
    g.place(id, base.slot, 0);
    g.startWave(); g.spawnQueue = []; g.enemies = [];
    const hero = g.heroes[0];
    hero.awakened = true;
    for (const k of ["grunt", "runner", "flyer", "archer", "brute", "grunt"]) g.spawnEnemy(k);
    for (const e of g.enemies) { e.x = hero.x + 20; e.y = hero.y; }
    hero.hpLeft = hero.hp * 0.5;
    assert.doesNotThrow(() => g.castUltimate(hero, g.enemies[0]), `${id} awakened ult`);
    for (const e of g.enemies) assert.ok(Number.isFinite(e.hp) && Number.isFinite(e.x), `${id} awakened state finite`);
    for (const h of g.heroes) assert.ok(h.hpLeft <= h.hp + 1e-9, `${id} awakened no overheal`);
  }
}

// Awakened numbers for a few ultimates: more hits, bounces, targets, gold, revive health.
{
  const setup = (id, awakened, count = 6) => {
    const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 106 });
    g.gold = 100000;
    const base = g.heroesById.get(id);
    g.place(id, base.slot, 0);
    g.startWave(); g.spawnQueue = []; g.enemies = [];
    const hero = g.heroes[0];
    hero.awakened = awakened;
    hero.rotation = 0;
    for (let i = 0; i < count; i += 1) g.spawnEnemy("brute");
    g.enemies.forEach((e, i) => { e.hp = e.maxHp = 1e9; e.x = hero.x + 30 + i * 60; e.y = hero.y; e.distance = 500 - i; });
    return { g, hero };
  };
  const hitCount = (g) => g.enemies.filter((e) => e.hp < 1e9).length;
  let r = setup("zeus", false); r.g.castUltimate(r.hero, r.g.enemies[0]); const zeusNormal = hitCount(r.g);
  r = setup("zeus", true); r.g.castUltimate(r.hero, r.g.enemies[0]);
  assert.equal(hitCount(r.g), zeusNormal + 2, "awakened Zeus bounces twice more");
  for (const [id, normal, awake] of [["medusa", 3, 5], ["poseidon", 3, 5]]) {
    r = setup(id, false); for (const e of r.g.enemies) { e.x = r.hero.x + 25; e.y = r.hero.y; } r.g.castUltimate(r.hero, r.g.enemies[0]);
    assert.equal(hitCount(r.g), normal, `${id} normal targets`);
    r = setup(id, true); for (const e of r.g.enemies) { e.x = r.hero.x + 25; e.y = r.hero.y; } r.g.castUltimate(r.hero, r.g.enemies[0]);
    assert.equal(hitCount(r.g), awake, `${id} awakened targets`);
  }
  r = setup("caishen", true, 1);
  const gold = r.g.gold; r.g.castUltimate(r.hero, r.g.enemies[0]);
  assert.equal(r.g.gold, gold + 15, "awakened Caishen pays 15 gold");
  r = setup("horus", true, 1);
  const horus = r.hero; const e = r.g.enemies[0];
  const single = r.g.attackValue(horus) * 2.5 * horus.ultPower * 0.5;
  r.g.castUltimate(horus, e);
  assert.ok(Math.abs((1e9 - e.hp) - single * 5 * (e.exposed > r.g.time ? 1.2 : 1)) < 1, "awakened Horus hits 5 times");
}

// Anubis, soul_drain: stuns a survivor for 2s; a kill refunds 60% of the charge.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 102 });
  g.gold = 10000;
  assert.ok(g.place("anubis", "road", 0), "anubis is playable");
  const anubis = g.heroes[0];
  assert.equal(anubis.variant, "soul_drain");
  g.startWave(); g.spawnQueue = []; g.enemies = [];
  g.spawnEnemy("brute");
  const tough = g.enemies[0];
  tough.hp = tough.maxHp = 1e9; tough.x = anubis.x + 20; tough.y = anubis.y;
  g.castUltimate(anubis, tough);
  assert.ok(tough.stunnedUntil > g.time + 1.9, "survivor stunned for 2s");
  const pos = tough.distance;
  for (let i = 0; i < 60; i += 1) g.step(1 / 60);
  assert.equal(tough.distance, pos, "stunned enemy does not move");
  g.spawnEnemy("grunt");
  const weak = g.enemies.at(-1);
  weak.hp = 1; weak.x = anubis.x + 10; weak.y = anubis.y; weak.distance = pos + 1;
  anubis.attackClock = 99; // only the ultimate acts
  anubis.ultClock = anubis.ultCooldown + 1;
  g.step(1 / 60);
  assert.ok(weak.dead, "ultimate killed the weakest enemy");
  assert.ok(Math.abs(anubis.ultClock - anubis.ultCooldown * 0.6) < 0.05, "kill refunds 60% of the charge");
}

// --- M5 blocking switches (tuning.blocking; absent = old behavior) ---
{
  const setup = (blocking) => {
    const g = new TowerDefenseGame({ heroes, tuning: { ...tuning, blocking: blocking ?? undefined }, map: maps[0], waves, seed: 101 });
    g.gold = 10000;
    g.place("nuwa", "road", 1);
    g.startWave(); g.spawnQueue = []; g.enemies = [];
    const nuwa = g.heroes[0];
    for (let i = 0; i < 4; i += 1) g.spawnEnemy("grunt");
    for (const e of g.enemies) { e.x = nuwa.x + 10; e.y = nuwa.y; e.hp = e.maxHp = 1e9; }
    return g;
  };
  // A: block limit. Nuwa (Tank) holds 2 here; the other two walk on.
  let g = setup({ blockLimit: { Tank: 2 } });
  g.step(1 / 60);
  assert.equal(g.enemies.filter((e) => e.held).length, 2, "tank holds its limit");
  g = setup(null);
  g.step(1 / 60);
  assert.equal(g.enemies.filter((e) => e.held).length, 4, "no limit without config");
  // C: held enemies take bonus damage.
  g = setup({ heldDamageBonus: 0.5 });
  g.step(1 / 60);
  const e = g.enemies[0];
  const hp = e.hp;
  g.hit(e, 100, g.heroes[0], { showShot: false });
  assert.equal(hp - e.hp, 150, "held enemy takes +50%");
  // B: fallen heroes redeploy at a discount.
  g = setup({ redeployCostFactor: 0.5 });
  const nuwa = g.heroes[0];
  const full = g.deployCost("nuwa");
  g.damageHero(nuwa, nuwa.hpLeft + 1, null);
  assert.equal(g.deployCost("nuwa"), Math.round(full * 0.5), "redeploy at half price");
  const gold = g.gold;
  assert.ok(g.place("nuwa", "road", 1));
  assert.equal(gold - g.gold, Math.round(full * 0.5), "discounted price charged");
}

// --- P5 effect hierarchy: sim flags that the renderer tiers on ---
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 95 });
  g.gold = 10000;
  g.place("zeus", "platform", 0);
  const zeus = g.heroes[0];
  g.startWave(); g.spawnQueue = []; g.enemies = [];
  g.spawnEnemy("grunt");
  g.hit(g.enemies[0], 1, zeus, { crit: true });
  assert.equal(g.effects.find((e) => e.type === "hit")?.crit, true, "crit flag on hit effect");
  g.spawnEnemy("boss");
  const boss = g.enemies.find((e) => e.kind === "boss");
  g.hit(boss, boss.hp + 1, zeus);
  assert.ok(g.effects.some((e) => e.type === "bossDown"), "boss kill emits bossDown");
}

// --- Final boss per map: Lilith (Garden of Flesh / Flesh Growth) ---
{
  const lilithMap = maps.find((m) => m.boss === "lilith");
  const baphMap = maps.find((m) => m.boss === "baphomet");
  assert.ok(lilithMap && baphMap, "one map per boss");
  const cfg = tuning.bosses.lilith;
  const setup = (map) => {
    const g = new TowerDefenseGame({ heroes, tuning, map, waves, seed: 97 });
    g.gold = 10000;
    g.place("zeus", "platform", 0);
    g.startWave(); g.spawnQueue = []; g.enemies = [];
    return g;
  };
  // Baphomet: plain stat block, no summons, targetable.
  let g = setup(baphMap);
  let boss = g.spawnEnemy("boss");
  assert.equal(boss.bossId, "baphomet");
  assert.equal(g.enemies.length, 1, "baphomet summons nothing");
  assert.ok(!boss.untargetable);
  // A map without a boss field falls back to Baphomet.
  const legacy = new TowerDefenseGame({ heroes, tuning, map: { ...lilithMap, boss: undefined }, waves, seed: 97 });
  assert.equal(legacy.bossId, "baphomet", "missing boss field falls back to baphomet");

  // Lilith: tougher stat block, summons her children around her, cannot be hit.
  g = setup(lilithMap);
  boss = g.spawnEnemy("boss");
  const scale = g.difficulty.enemyHp; // wave 1
  assert.equal(boss.bossId, "lilith");
  assert.equal(boss.maxHp, cfg.stats.hp * scale, "lilith uses her own hp");
  assert.ok(cfg.stats.hp > tuning.enemies.boss.hp, "lilith is tougher than baphomet");
  const children = () => g.enemies.filter((e) => e.parentId === boss.entityId && !e.dead);
  assert.equal(children().length, cfg.summon.count, "summons her children on entry");
  assert.equal(children()[0].maxHp, tuning.enemies.brood.hp * scale, "first children at full strength");
  assert.ok(children().every((c) => Math.abs(c.distance - boss.distance) >= cfg.summon.spacing), "no child spawns on her at the path start");
  const midBoss = g.spawnEnemy("boss", { distance: 300 });
  const midChildren = g.enemies.filter((e) => e.parentId === midBoss.entityId);
  assert.ok(midChildren.some((c) => c.distance < 300) && midChildren.some((c) => c.distance > 300), "mid-path summons surround her");
  for (const e of [midBoss, ...midChildren]) g.enemies.splice(g.enemies.indexOf(e), 1);
  assert.ok(g.effects.some((e) => e.type === "summon"), "summon emits an effect");
  assert.ok(boss.untargetable, "lilith cannot be targeted");
  const zeus = g.heroes[0];
  const hpBefore = boss.hp;
  g.hit(boss, 1e9, zeus);
  assert.equal(boss.hp, hpBefore, "direct hits do nothing");
  assert.ok(!g.canHit(zeus, boss), "heroes skip her when choosing targets");
  // Damage to a child is shared with Lilith, capped at the child's remaining hp.
  const child = children()[0];
  g.hit(child, 100, zeus);
  assert.equal(boss.hp, hpBefore - 100, "child damage reaches lilith");
  const left = child.hp;
  g.hit(child, 1e9, zeus);
  assert.equal(boss.hp, hpBefore - 100 - left, "overkill on a child is not shared");
  // When all children fall, she summons them again at resummonScale.
  for (const c of children()) g.hit(c, 1e9, zeus);
  g.step(1 / 60);
  const second = children();
  assert.equal(second.length, cfg.summon.count, "children return when all have fallen");
  assert.ok(Math.abs(second[0].maxHp - tuning.enemies.brood.hp * scale * cfg.summon.resummonScale) < 1e-6, "re-summoned children are weaker");
  assert.ok(Math.abs(second[0].attack - tuning.enemies.brood.attack * cfg.summon.resummonScale) < 1e-6);
  // Killing her through her children ends her (kill credited, bossDown emitted).
  boss.hp = 1;
  g.hit(second[0], 50, zeus);
  assert.ok(boss.dead, "lilith dies from shared damage");
  assert.ok(g.effects.some((e) => e.type === "bossDown"));
  g.step(1 / 60);
  assert.ok(!g.enemies.some((e) => e.entityId === boss.entityId), "dead lilith leaves the field");
}

// --- Level focus: the step to focus.level asks for attack, health or range ---
{
  const f = tuning.upgrades.focus;
  const setup = () => {
    const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 98 });
    g.gold = 10000;
    g.place("zeus", "platform", 0);
    const zeus = g.heroes[0];
    while (zeus.level < f.level - 1) assert.ok(g.upgrade(zeus.entityId).ok, "levels before the focus need no choice");
    return { g, zeus };
  };
  let { g, zeus } = setup();
  const info = g.upgradeInfo(zeus.entityId);
  assert.equal(info.needsFocus, true, "focus level asks for a choice");
  const gold = g.gold;
  const refused = g.upgrade(zeus.entityId);
  assert.equal(refused.ok, false, "no upgrade without a focus");
  assert.ok(refused.reason.includes("focus"));
  assert.equal(g.gold, gold, "refused choice costs nothing");
  assert.equal(g.upgrade(zeus.entityId, "speed").ok, false, "unknown focus rejected");
  // Each option previews and applies only its own stat.
  const plain = { atk: info.nextAtk, hp: info.nextHp, range: zeus.range };
  for (const focus of ["attack", "health", "range"]) {
    ({ g, zeus } = setup());
    const option = g.upgradeInfo(zeus.entityId).focusOptions[focus];
    assert.ok(g.upgrade(zeus.entityId, focus).ok);
    assert.equal(zeus.focus, focus);
    assert.equal(zeus.level, f.level);
    assert.equal(zeus.atk, option.nextAtk); assert.equal(zeus.hp, option.nextHp); assert.equal(zeus.range, option.nextRange);
    assert.equal(zeus.atk > plain.atk, focus === "attack", `${focus}: attack bonus only for attack`);
    assert.equal(zeus.hp > plain.hp, focus === "health", `${focus}: health bonus only for health`);
    assert.equal(zeus.range > plain.range, focus === "range", `${focus}: range bonus only for range`);
    // The focus carries into later levels and Awakening, and is asked only once.
    const next = g.upgradeInfo(zeus.entityId);
    assert.ok(!next.needsFocus, "focus is asked once");
    while (zeus.level < tuning.upgrades.maxLevel) assert.ok(g.upgrade(zeus.entityId).ok);
    assert.ok(g.upgrade(zeus.entityId).ok, "awaken");
    const expected = Math.round(zeus.baseAtk * (1 + tuning.upgrades.attackPerLevel * (zeus.level - 1)) * (1 + tuning.awakening.attackBonus) * (focus === "attack" ? 1 + f.attack : 1));
    assert.equal(zeus.atk, expected, `${focus}: attack focus kept through awakening`);
  }
  // A fallen hero re-enters without its focus.
  ({ g, zeus } = setup());
  g.upgrade(zeus.entityId, "attack");
  g.place("nuwa", "road", 0);
  const nuwa = g.heroes.find((h) => h.id === "nuwa");
  assert.equal(nuwa.focus, undefined, "new units start without a focus");
}

// --- M2 run modes: 20 waves and endless ---
{
  const bossAt = (table) => table.flatMap((w, i) => (w.spawns.some((g) => g.kind === "boss") ? [i + 1] : []));
  assert.deepEqual(wavesForMode(waves, "classic"), waves, "classic keeps tdWaves.json");
  const long = wavesForMode(waves, "long", tuning.waveGen);
  assert.equal(long.length, 20, "20-wave table");
  assert.deepEqual(bossAt(long), [5, 10, 15, 20], "boss every 5th wave");
  const bossScale = (w) => w.spawns.find((g) => g.kind === "boss").scale ?? 1;
  assert.deepEqual([5, 10, 15, 20].map((n) => bossScale(long[n - 1])), [tuning.waveGen.midBossScale, tuning.waveGen.midBossScale, tuning.waveGen.midBossScale, 1], "mid bosses scaled, final boss full");
  assert.deepEqual(long.slice(0, 4), waves.slice(0, 4), "early waves unchanged");
  assert.deepEqual(buildWave(waves, 37, "endless", tuning.waveGen), buildWave(waves, 37, "endless", tuning.waveGen), "generator is deterministic");
  assert.ok(isBossWave(35, "endless") && !isBossWave(36, "endless"), "endless boss cadence");
  const count = (w) => w.spawns.reduce((sum, g) => sum + g.count, 0);
  // Waves 19 and 27 cycle the same base wave, eight waves apart.
  assert.ok(count(buildWave(waves, 27, "endless", tuning.waveGen)) > count(long[18]), "later waves bring more enemies");

  // Mid-boss stat scale reaches the boss and Lilith's children.
  const lilithMap = maps.find((m) => m.boss === "lilith");
  const g = new TowerDefenseGame({ heroes, tuning, map: lilithMap, waves, mode: "long", seed: 3 });
  assert.equal(g.totalWaves, 20, "long mode total");
  g.wave = 4; g.startWave();
  g.spawnQueue.find((e) => e.kind === "boss").at = 0;
  g.step(1 / 60);
  const boss = g.enemies.find((e) => e.kind === "boss");
  assert.equal(boss.statScale, tuning.waveGen.midBossScale, "wave 5 boss scaled");
  const child = g.enemies.find((e) => e.parentId === boss.entityId);
  assert.equal(child.statScale, tuning.waveGen.midBossScale, "children share the boss scale");

  // A finite long run ends in a win after wave 20; endless keeps going.
  const finish = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, mode: "long", seed: 5 });
  finish.wave = 19; finish.startWave(); finish.spawnQueue = []; finish.enemies = [];
  finish.step(1 / 60);
  assert.equal(finish.won, true, "long mode won after wave 20");
  const endless = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, mode: "endless", seed: 5 });
  assert.equal(endless.totalWaves, Infinity, "endless total");
  endless.wave = 29; endless.startWave(); endless.spawnQueue = []; endless.enemies = [];
  endless.step(1 / 60);
  assert.equal(endless.complete, false, "endless does not end on a cleared wave");
  assert.ok(endless.wavePreview(), "endless always previews the next wave");
  assert.equal(new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, mode: "bogus" }).mode, "classic", "unknown mode falls back to classic");
}

// --- M6 class kits (tuning.classes): each class attacks, blocks and supports in its own way ---
{
  const setup = (...ids) => {
    const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 140 });
    g.gold = 1e6;
    for (const id of ids) {
      const base = heroes.find((h) => h.id === id);
      const rings = base.slot === "road" ? maps[0].roadSlots : maps[0].platformSlots;
      for (let i = 0; i < rings.length && !g.place(id, base.slot, i); i += 1);
    }
    g.startWave(); g.spawnQueue = []; g.enemies = [];
    for (const hero of g.heroes) hero.critChance = 0;
    return { g, units: ids.map((id) => g.heroes.find((h) => h.id === id)) };
  };
  const enemyAt = (g, kind, x, y, hp = 1e6) => { const e = g.spawnEnemy(kind); e.x = x; e.y = y; e.hp = e.maxHp = hp; return e; };
  const hurt = (e) => e.hp < e.maxHp;
  const kit = tuning.classes;

  // Enemy resistances: armored kinds carry their own magic resistance (magic beats armor).
  {
    const { g } = setup("zeus");
    const brute = g.spawnEnemy("brute");
    assert.equal(brute.magicRes, tuning.enemies.brute.magicRes, "brute magic resistance from tuning");
    assert.ok(brute.magicRes < brute.armor, "brutes are armored, not warded");
  }

  // Mage splash: enemies next to the target take a share, farther ones none.
  {
    const { g, units: [mage] } = setup("phoenix");
    assert.equal(mage.damageType, "magical", "Mages deal magic damage");
    const t = enemyAt(g, "grunt", mage.x + 60, mage.y);
    const near = enemyAt(g, "grunt", t.x + kit.Mage.splash.radius - 5, t.y);
    const far = enemyAt(g, "grunt", t.x + kit.Mage.splash.radius + 30, t.y);
    assert.equal(g.basicAttack(mage, t), true);
    assert.ok(hurt(t) && hurt(near), "splash hits the target and its neighbour");
    assert.ok(!hurt(far), "splash stops at its radius");
    assert.ok(t.maxHp - t.hp > near.maxHp - near.hp, "neighbours take a share");
    assert.ok(g.effects.some((e) => e.type === "splash" && e.radius === kit.Mage.splash.radius), "splash effect at its real radius");
  }

  // Zeus (basic "chain"): bounces enemy to enemy instead of splashing.
  {
    const { g, units: [zeus] } = setup("zeus");
    assert.equal(zeus.basic, "chain");
    const t = enemyAt(g, "grunt", zeus.x + 60, zeus.y);
    const a = enemyAt(g, "grunt", t.x + 80, t.y);
    const b = enemyAt(g, "grunt", a.x + 80, a.y);
    const c = enemyAt(g, "grunt", b.x + 80, b.y);
    g.basicAttack(zeus, t);
    assert.ok(hurt(t) && hurt(a) && hurt(b), "chain reaches two bounces");
    assert.ok(!hurt(c), `chain stops after ${kit.Mage.chain.falloff.length} bounces`);
  }

  // Warrior cleave: up to `targets` enemies next to the target.
  {
    const { g, units: [warrior] } = setup("amunra");
    const t = enemyAt(g, "grunt", warrior.x + 30, warrior.y);
    const others = Array.from({ length: kit.Warrior.cleave.targets + 2 }, (_, i) => enemyAt(g, "grunt", t.x + Math.cos(i) * 20, t.y + Math.sin(i) * 20));
    g.basicAttack(warrior, t);
    assert.equal(others.filter(hurt).length, kit.Warrior.cleave.targets, "cleave hits exactly its target count");
    assert.ok(g.effects.some((e) => e.type === "cleave"), "cleave effect");
  }

  // Archer: pierces armor, bonus against flyers, snipes the toughest enemy in range.
  {
    const { g, units: [archer] } = setup("artemis");
    const value = g.attackValue(archer);
    const brute = enemyAt(g, "brute", archer.x + 60, archer.y);
    g.basicAttack(archer, brute);
    close(brute.maxHp - brute.hp, resolveDamage(value, brute.armor * (1 - kit.Archer.pierce), archer.damageType), "armor pierce");
    const flyer = enemyAt(g, "flyer", archer.x + 60, archer.y);
    g.basicAttack(archer, flyer);
    close(flyer.maxHp - flyer.hp, resolveDamage(value * (1 + kit.Archer.airBonus), flyer.armor * (1 - kit.Archer.pierce), archer.damageType), "anti-air bonus");
    g.enemies = [];
    enemyAt(g, "grunt", archer.x + 40, archer.y, 50);
    const tough = enemyAt(g, "grunt", archer.x + 50, archer.y, 5000);
    assert.equal(g.findTarget(archer), tough, "Archers snipe the toughest enemy");
  }

  // Assassin dash: strikes a loose enemy beyond its range, leaves held ones to the line.
  {
    const { g, units: [nyx] } = setup("nyx");
    const loose = enemyAt(g, "runner", nyx.x + (nyx.range + kit.Assassin.dash) / 2, nyx.y);
    assert.equal(g.findTarget(nyx), loose, "dash reaches a loose enemy");
    loose.held = true;
    assert.equal(g.findTarget(nyx), null, "a held enemy beyond range is left alone");
    loose.held = false;
    g.basicAttack(nyx, loose);
    assert.ok(g.effects.some((e) => e.type === "dash"), "dash trail effect");
    close(loose.maxHp - loose.hp, resolveDamage(g.attackValue(nyx) * (1 + kit.Assassin.looseBonus), loose.armor, nyx.damageType), "runners take the full loose bonus");
  }

  // Target priority (M1): each mode picks its enemy, "auto" keeps the class rule.
  {
    const { g, units: [zeus, nyx] } = setup("zeus", "nyx");
    const near = (e, x, y, dist, hp) => { const u = enemyAt(g, e, x, y, hp); u.distance = dist; return u; };
    const front = near("grunt", zeus.x + 20, zeus.y, 300, 500);
    const back = near("grunt", zeus.x - 20, zeus.y, 100, 400);
    const tank = near("brute", zeus.x, zeus.y + 20, 200, 3000);
    const runner = near("runner", zeus.x, zeus.y - 20, 150, 50);
    const flyer = near("flyer", zeus.x + 10, zeus.y + 10, 50, 60);
    assert.equal(zeus.targeting, "auto", "placed heroes start on the class rule");
    assert.equal(g.findTarget(zeus), front, "auto: Mage takes the enemy furthest along");
    const expect = { first: front, last: flyer, strongest: tank, weakest: runner, fastest: runner, flying: flyer, ground: front };
    for (const [mode, target] of Object.entries(expect)) {
      assert.equal(g.setTargeting(zeus.entityId, mode), true, `${mode} accepted`);
      assert.equal(g.findTarget(zeus), target, `${mode} picks its enemy`);
    }
    g.setTargeting(zeus.entityId, "boss");
    assert.equal(g.findTarget(zeus), front, "boss falls back to the class rule without a boss");
    const boss = near("boss", zeus.x, zeus.y, 10, 5000);
    assert.equal(g.findTarget(zeus), boss, "boss first");
    boss.untargetable = true;
    assert.equal(g.findTarget(zeus), front, "an untargetable boss is skipped");
    assert.equal(g.setTargeting(zeus.entityId, "nonsense"), false, "unknown mode rejected");
    assert.equal(g.setTargeting(nyx.entityId, "flying"), false, "road heroes cannot pick flyers");
    // Explicit modes keep the Assassin dash reach for loose enemies.
    g.enemies = [];
    const loose = enemyAt(g, "runner", nyx.x + (nyx.range + kit.Assassin.dash) / 2, nyx.y, 80);
    g.setTargeting(nyx.entityId, "strongest");
    assert.equal(g.findTarget(nyx), loose, "strongest still dashes to loose enemies");
    loose.held = true;
    assert.equal(g.findTarget(nyx), null, "held enemies beyond range stay out of reach");
  }

  // A revived hero keeps its target priority.
  {
    const { g, units: [nuwa] } = setup("nuwa");
    g.setTargeting(nuwa.entityId, "weakest");
    g.damageHero(nuwa, 1e9, null);
    assert.equal(g.fallenHeroes.at(-1)?.targeting, "weakest", "fallen record keeps the priority");
  }

  // Tank ultimate holds every ground enemy in taunt range; flyers are not held.
  {
    const { g, units: [tank] } = setup("momus");
    const grunt = enemyAt(g, "grunt", tank.x + tank.range, tank.y);
    const flyer = enemyAt(g, "flyer", tank.x + 20, tank.y);
    g.castUltimate(tank, grunt);
    assert.ok(grunt.stunnedUntil >= g.time + kit.Tank.hold - 1e-9, "Tank ultimate holds ground enemies");
    assert.ok(!(flyer.stunnedUntil > g.time), "flyers are not held");
    assert.ok(g.effects.some((e) => e.type === "hold"), "hold effect");
  }

  // Assassin veil: after its ultimate the blocked enemy stays blocked but deals no damage.
  {
    const { g, units: [nyx] } = setup("nyx");
    const grunt = enemyAt(g, "grunt", nyx.x - 20, nyx.y);
    grunt.distance = 50;
    g.castUltimate(nyx, grunt);
    assert.equal(g.isVeiled(nyx), true, "veiled after the ultimate");
    const hp = nyx.hpLeft, distance = grunt.distance;
    for (let i = 0; i < 60; i += 1) g.step(1 / 60);
    assert.equal(nyx.hpLeft, hp, "veiled Assassin takes no damage");
    assert.equal(grunt.distance, distance, "the blocked enemy stays blocked");
    for (let i = 0; i < 60 * kit.Assassin.veil.seconds; i += 1) g.step(1 / 60);
    assert.equal(g.isVeiled(nyx), false, "veil ends");
  }

  // Support: heals the most injured ally in range; otherwise a weak attack.
  {
    const { g, units: [support, tank] } = setup("caishen", "nuwa");
    assert.ok(Math.hypot(support.x - tank.x, support.y - tank.y) <= support.range, "test layout: ally in range");
    const grunt = enemyAt(g, "grunt", support.x + 60, support.y);
    tank.hpLeft = tank.hp / 2;
    g.basicAttack(support, grunt);
    assert.ok(tank.hpLeft > tank.hp / 2, "heal pulse on the injured ally");
    assert.ok(!hurt(grunt), "healing replaces the attack");
    assert.ok(g.effects.some((e) => e.type === "beam"), "heal beam effect");
    tank.hpLeft = tank.hp;
    g.basicAttack(support, grunt);
    close(grunt.maxHp - grunt.hp, resolveDamage(g.attackValue(support) * kit.Support.damageShare, grunt.armor, support.damageType), "weak attack when nobody is hurt");
    assert.equal(g.basicAttack(support, null), false, "nothing to do: attack stays ready");
  }
}

// --- M9: selling heroes and slowing enemies that squeeze past a full blocker ---
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 150 });
  g.gold = 1000;
  g.place("nuwa", "road", 0);
  const nuwa = g.heroes[0];
  const deploy = heroes.find((h) => h.id === "nuwa").cost;
  const up = g.upgrade(nuwa.entityId);
  assert.equal(nuwa.invested, deploy + up.cost, "invested tracks deploy and upgrades");
  assert.equal(g.sellValue(nuwa.entityId), Math.floor((deploy + up.cost) * tuning.run.sellRefund), "refund is the sell share");
  const gold = g.gold;
  g.startWave(); // selling works mid-wave too
  const result = g.sell(nuwa.entityId);
  assert.equal(result.ok, true);
  assert.equal(g.gold, gold + result.refund, "refund paid");
  assert.equal(g.heroes.length, 0, "unit leaves the field");
  assert.equal(g.fallenHeroes.length, 0, "a sold hero did not fall (no revive, no redeploy discount)");
  assert.equal(g.deployCost("nuwa"), deploy, "redeploy at full price");
  assert.equal(g.place("nuwa", "road", 0), true, "ring and hero free again");
  assert.equal(g.sell(-1).ok, false, "unknown unit");
}
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 151 });
  g.gold = 1000;
  g.place("nyx", "road", 0); // Assassin: holds 1
  const nyx = g.heroes[0];
  g.startWave(); g.enemies = []; g.spawnQueue = [];
  const held = g.spawnEnemy("grunt"); const passer = g.spawnEnemy("grunt");
  for (const e of [held, passer]) { e.hp = e.maxHp = 1e9; e.x = nyx.x; e.y = nyx.y; }
  nyx.attackClock = 99; nyx.ultClock = -99;
  g.step(1 / 60);
  assert.equal(held.held, true, "the first enemy is held");
  assert.equal(passer.held, false, "the second walks past the full blocker");
  assert.ok(passer.squeeze >= tuning.blocking.passSlow - 1 / 60, "and is slowed while squeezing by");
}

// --- Tuning M1: spawn spacing, endless ramp, training after Awakening ---
{
  // Enemies on one lane spawn at least waveGen.minSpacing px apart and spread sideways.
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves: [{ wave: 1, spawns: [{ kind: "grunt", count: 6, gapMs: 50 }] }], seed: 160 });
  g.startWave();
  const gaps = g.spawnQueue.slice(1).map((e, i) => e.at - g.spawnQueue[i].at);
  const minGap = tuning.waveGen.minSpacing / tuning.enemies.grunt.speed;
  assert.ok(gaps.every((gap) => gap >= minGap - 1e-9), "tight groups are spread to the minimum spacing");
  assert.ok(new Set(g.spawnQueue.map((e) => e.sway)).size > 1, "spawns spread sideways");
  for (let i = 0; i < 60 * 3; i += 1) g.step(1 / 60);
  const [a, b] = g.enemies;
  // Spawns land on 1/60 s steps, so allow one step of walking.
  assert.ok(a.distance - b.distance >= tuning.waveGen.minSpacing - tuning.enemies.grunt.speed / 60 - 1e-6, "neighbours stay apart along the path");
}
{
  const endless = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, mode: "endless", seed: 161 });
  assert.equal(endless.endlessRamp(20), 1, "no ramp up to wave 20");
  close(endless.endlessRamp(25), (1 + tuning.waveGen.endlessRamp) ** 5, "compounding past wave 20");
  endless.wave = 24;
  const boss = endless.spawnEnemy("grunt");
  const plain = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, mode: "long", seed: 161 });
  plain.wave = 24;
  const ref = plain.spawnEnemy("grunt");
  close(boss.maxHp / ref.maxHp, endless.endlessRamp(24), "HP ramp");
  close(boss.attack / ref.attack, endless.endlessRamp(24), "attack ramp");
}
{
  const t = tuning.training;
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 162 });
  g.gold = 1e5;
  g.place("zeus", "platform", 0);
  const zeus = g.heroes[0];
  while (zeus.level < tuning.upgrades.maxLevel) g.upgrade(zeus.entityId, "attack");
  assert.equal(g.upgradeInfo(zeus.entityId).awaken, true, "Awakening first");
  g.upgrade(zeus.entityId);
  const info = g.upgradeInfo(zeus.entityId);
  assert.equal(info.train, true, "after Awakening the next step is training");
  assert.equal(info.cost, t.cost);
  const atk = zeus.atk, hp = zeus.hp, range = zeus.range;
  assert.equal(g.upgrade(zeus.entityId).ok, false, "training needs a stat");
  assert.equal(g.upgrade(zeus.entityId, "attack").ok, true);
  assert.ok(zeus.atk > atk, "attack trained");
  assert.equal(zeus.trained.attack, 1);
  assert.equal(g.upgradeInfo(zeus.entityId).cost, Math.round(t.cost * t.costGrowth), "each training costs more");
  g.upgrade(zeus.entityId, "health");
  assert.ok(zeus.hp > hp, "health trained");
  for (let i = 0; i < t.rangeCap; i += 1) assert.equal(g.upgrade(zeus.entityId, "range").ok, true);
  assert.ok(zeus.range > range, "range trained");
  assert.equal(g.upgradeInfo(zeus.entityId).focusOptions.range, undefined, "range stops at its cap");
  assert.equal(g.upgrade(zeus.entityId, "range").ok, false);
  assert.equal(zeus.level, tuning.upgrades.maxLevel, "training adds no level");
}

console.log("Tower defense checks passed");
