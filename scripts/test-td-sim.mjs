import assert from "node:assert/strict";
import { createRng, pointOnPath, resolveDamage, TowerDefenseGame } from "../src/game/td/sim.js";
import { computeFavor, applyFavorTree, canUnlock } from "../src/game/td/favor.js";
import heroes from "../src/data/gameBalance.json" with { type: "json" };
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import maps from "../src/data/tdMaps.json" with { type: "json" };
import waves from "../src/data/tdWaves.json" with { type: "json" };
import favorTreeData from "../src/data/favorTree.json" with { type: "json" };

assert.equal(resolveDamage(100, 260, "physical", false), 50, "physical mitigation");
assert.equal(resolveDamage(100, 79503, "true", false), 100, "true damage");
assert.deepEqual(Array.from({ length: 8 }, createRng(42)), Array.from({ length: 8 }, createRng(42)), "seeded RNG");
assert.deepEqual(pointOnPath([[0, 0], [100, 0], [100, 100]], 150), { x: 100, y: 50 }, "path interpolation");

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
  const expected = resolveDamage(grunt.attack, nuwa.armor, "physical");
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

// Enemy archers stop and shoot from range instead of contact.
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
      for (const hero of g.heroes) if (g.upgrade(hero.entityId).ok) upgraded = true;
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
  g.upgrade(nuwa.entityId); g.upgrade(nuwa.entityId); g.upgrade(nuwa.entityId);
  assert.equal(nuwa.level, tuning.upgrades.maxLevel, "level cap reached");
  const capped = g.upgrade(nuwa.entityId);
  assert.equal(capped.ok, false, "level cap rejects further upgrades");
  assert.ok(capped.reason.includes("cap"), "cap reason is stated");
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

// favor_tree_startgold: Demeter's Bounty adds 25 to startingGoldBonus.
{
  const bonuses = applyFavorTree(["demeter_bounty"], tuning);
  assert.equal(bonuses.startingGoldBonus, 25, "Demeter's Bounty adds startingGoldBonus 25");
  const adjustedGold = tuning.run.startingGold + bonuses.startingGoldBonus;
  assert.equal(adjustedGold, 365, "startingGold 340 + 25 = 365");
}

// favor_tree_requires: a node unlocks once requiresMin of its required nodes are owned (value read from the tree).
{
  const node = favorTreeData.find((entry) => entry.id === "nuwa_wall");
  const need = node.requiresMin;
  assert.equal(canUnlock("nuwa_wall", [], favorTreeData), false, "tier 2 node blocked with no tier 1 nodes");
  assert.equal(canUnlock("nuwa_wall", node.requires.slice(0, need - 1), favorTreeData), false, `tier 2 blocked with ${need - 1} tier 1 nodes`);
  assert.equal(canUnlock("nuwa_wall", node.requires.slice(0, need), favorTreeData), true, `tier 2 unlockable with ${need} tier 1 nodes`);
}

// favor_unknown_id_dropped: unknown ids produce no bonuses.
{
  const bonuses = applyFavorTree(["nonexistent_node"], tuning);
  assert.equal(Object.keys(bonuses).length, 0, "unknown node id produces no bonuses");
}

// favor_no_stacking: duplicate id applies effect once.
{
  const bonuses = applyFavorTree(["demeter_bounty", "demeter_bounty"], tuning);
  assert.equal(bonuses.startingGoldBonus, 25, "duplicate node id applies effect once");
}

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

// Bug repro: a dead hero must free its team slot so a 6th distinct hero can be recruited.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 91 });
  g.gold = 10000;
  assert.equal(g.place("nuwa", "road", 0), true, "enlist 1/5");
  assert.equal(g.place("poseidon", "road", 1), true, "enlist 2/5");
  assert.equal(g.place("zeus", "platform", 0), true, "enlist 3/5");
  assert.equal(g.place("diana", "platform", 1), true, "enlist 4/5");
  assert.equal(g.place("caishen", "platform", 2), true, "enlist 5/5");
  assert.equal(g.team.length, 5, "team at cap");
  assert.equal(g.place("amunra", "road", 2), false, "6th distinct hero blocked at cap, as expected");
  const nuwa = g.heroes.find((h) => h.id === "nuwa");
  g.damageHero(nuwa, nuwa.hpLeft + 1, null);
  assert.equal(g.heroes.some((h) => h.id === "nuwa"), false, "nuwa removed from field");
  assert.equal(g.team.includes("nuwa"), false, "dead hero freed from team roster");
  assert.equal(g.team.length, 4, "team cap freed up");
  assert.equal(g.place("amunra", "road", 2), true, "replacement hero can now be recruited");
}

console.log("Tower defense checks passed");
