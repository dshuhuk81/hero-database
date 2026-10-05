import assert from "node:assert/strict";
import { createRng, pointOnPath, resolveDamage, TowerDefenseGame } from "../src/game/td/sim.js";
import { computeFavor } from "../src/game/td/favor.js";
import heroes from "../src/data/gameBalance.json" with { type: "json" };
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import realMaps from "../src/data/tdMaps.json" with { type: "json" };
import legacyRings from "./fixtures/td-legacy-rings.json" with { type: "json" };
import classicMaps from "./fixtures/td-classic-maps.json" with { type: "json" };
import { mapLanes } from "../src/game/td/lanes.js";
import waves from "../src/data/tdWaves.json" with { type: "json" };
import { buildWave, isBossWave, wavesForMode } from "../src/game/td/waves.js";

assert.equal(resolveDamage(100, 260, "physical", false), 50, "physical mitigation");
assert.equal(resolveDamage(100, 79503, "true", false), 100, "true damage");
assert.deepEqual(Array.from({ length: 8 }, createRng(42)), Array.from({ length: 8 }, createRng(42)), "seeded RNG");
assert.deepEqual(pointOnPath([[0, 0], [100, 0], [100, 100]], 150), { x: 100, y: 50 }, "path interpolation");

// Rule tests place heroes by ring index and rely on where those rings are, so they run on
// the hand-placed rings from before the tile grid (M22b); real tiles are checked below.
// Since every battlefield became a compact board (docs/tower-defense-board-plan.md step 3),
// the rule tests run on the classic maps as they were before the migration
// (fixtures/td-classic-maps.json); board rules have their own section at the end.
const maps = classicMaps.map((map) => ({ ...map, ...legacyRings[map.id] }));

const close = (actual, expected, message) => assert.ok(Math.abs(actual - expected) < 1e-6, `${message}: ${actual} vs ${expected}`);
const game = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 7 });
assert.equal(game.setTeam(["atlas", "odin", "skadi", "plutus", "aegir"]), true, "valid team");
game.placement = 10000;
assert.equal(game.place("atlas", "road", 0), true, "road placement");
assert.equal(game.place("odin", "road", 1), false, "class-gated placement");
assert.equal(game.place("odin", "platform", 0), true, "platform placement");
assert.equal(game.startWave(), true, "wave starts");
for (let i = 0; i < 60 * 90 && game.running; i += 1) game.step(1 / 60);
assert.equal(game.running, false, "wave terminates");
assert.equal(game.wave, 1, "wave advances once");

// --- 1A combat rules ---

// Melee enemies must move well inside a road hero's tile before they stop. The old 42 px
// contact radius left them only 6 px inside a 96 px tile, which disappeared after tilt.
{
  for (const mapId of ["proto-slabs", "moonlit-pass", "sunscar-basin"]) {
    const map = realMaps.find((entry) => entry.id === mapId);
    assert.ok(map, `${mapId}: contact test map exists`);
    const g = new TowerDefenseGame({ heroes, tuning, map, waves: [{ wave: 1, spawns: [] }], seed: 10 });
    g.placement = 10000;
    assert.equal(g.place("atlas", "road", 0), true, `${mapId}: blocker placed`);
    const atlas = g.heroes[0];
    g.startWave(); g.spawnQueue = []; g.enemies = [];
    const grunt = g.spawnEnemy("grunt");
    grunt.hp = grunt.maxHp = 1e9;
    for (let i = 0; i < 60 * 30 && !grunt.held; i += 1) g.step(1 / 60);
    const contact = Math.hypot(grunt.x - atlas.x, grunt.y - atlas.y);
    assert.equal(grunt.held, true, `${mapId}: blocker engages the grunt`);
    assert.ok(contact <= 24 + grunt.speed / 60, `${mapId}: grunt reaches deep contact (${contact.toFixed(2)} px)`);
  }
}

// Hero armor mitigates incoming enemy damage.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 11 });
  g.setTeam(["atlas", "odin", "skadi", "plutus", "aegir"]);
  g.placement = 10000;
  g.place("atlas", "road", 0);
  const atlas = g.heroes[0];
  g.startWave();
  g.enemies = []; g.spawnQueue = [];
  g.spawnEnemy("grunt");
  const grunt = g.enemies[0];
  grunt.x = atlas.x - 20; grunt.y = atlas.y; // contact range
  const before = atlas.hpLeft;
  for (let i = 0; i < 30; i += 1) g.step(1 / 60); // exactly one attack lands (period 0.9s)
  // Tanks also shrug off their class guard share (M6 class kit).
  const expected = resolveDamage(grunt.attack, atlas.armor, "physical") * (1 - g.guardFor(atlas));
  assert.ok(g.guardFor(atlas) > 0, "Tank guard applies");
  assert.ok(atlas.hpLeft < before, "blocker takes damage");
  assert.ok(Math.abs((before - atlas.hpLeft) - expected) < 1e-6, `armor mitigation applied (${expected})`);
  assert.ok(expected < grunt.attack, "mitigation reduces raw attack");
}

// Road heroes cannot target flyers; flyers leak past full road coverage.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 12 });
  g.setTeam(["atlas", "odin", "skadi", "plutus", "aegir"]);
  g.placement = 10000;
  g.place("atlas", "road", 0);
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
  g.setTeam(["atlas", "odin", "skadi", "plutus", "aegir"]);
  g.placement = 10000;
  g.place("atlas", "road", 2); // (410, 290), near path point (410, 180)
  const atlas = g.heroes[0];
  g.startWave(); g.enemies = []; g.spawnQueue = [];
  g.spawnEnemy("archer");
  const archer = g.enemies[0];
  for (let i = 0; i < 60 * 30 && atlas.hpLeft === atlas.hp; i += 1) g.step(1 / 60);
  assert.ok(atlas.hpLeft < atlas.hp, "archer damages blocker");
  const distance = Math.hypot(archer.x - atlas.x, archer.y - atlas.y);
  assert.ok(distance > tuning.blocking.contactRange && distance <= archer.attackRange, `archer fires from range (${Math.round(distance)}px)`);
  for (let i = 0; i < 60 * 5; i += 1) g.step(1 / 60);
  assert.ok(Math.hypot(archer.x - atlas.x, archer.y - atlas.y) > tuning.blocking.contactRange, "archer holds position at range");
  // After holdSeconds it closes in and is blocked in contact like a melee enemy (no standoff).
  archer.hp = archer.maxHp = 1e9;
  for (let i = 0; i < 60 * (tuning.enemies.archer.holdSeconds + 5); i += 1) g.step(1 / 60);
  assert.ok(Math.hypot(archer.x - atlas.x, archer.y - atlas.y) <= tuning.blocking.contactRange + archer.speed / 60, "archer closes in after holdSeconds");
  assert.equal(archer.held, true, "and the blocker holds it");
}

// Enemy archers (targetsPlatforms, M24 trial): a road hero in reach comes first; otherwise the
// nearest living platform hero within attackRange, for platformAttack damage; never in melee.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 19 });
  g.setTeam(["atlas", "odin", "skadi"]);
  g.placement = 10000;
  g.place("atlas", "road", 0); g.place("odin", "platform", 0); g.place("skadi", "platform", 1);
  const [atlas, odin, skadi] = ["atlas", "odin", "skadi"].map((id) => g.heroes.find((h) => h.id === id));
  g.startWave(); g.enemies = []; g.spawnQueue = [];
  const archer = g.spawnEnemy("archer");
  assert.equal(archer.targetsPlatforms, true, "archer tuning enables platform shots");
  const at = (unit, x, y) => { unit.x = x; unit.y = y; };
  at(archer, 500, 300); at(atlas, 560, 300); at(odin, 590, 300); at(skadi, 700, 300);
  assert.equal(g.findEnemyTarget(archer), atlas, "a road hero in reach comes first");
  at(atlas, 800, 300);
  assert.equal(g.findEnemyTarget(archer), odin, "no road hero in reach: nearest platform hero in range");
  odin.hpLeft = 0;
  assert.equal(g.findEnemyTarget(archer), null, "fallen and out-of-range platform heroes are skipped");
  odin.hpLeft = odin.hp;
  archer.rangedTime = tuning.enemies.archer.holdSeconds;
  assert.equal(g.findEnemyTarget(archer), null, "after the hold (melee) platforms are out of reach");
  archer.rangedTime = 0;
  archer.targetsPlatforms = false;
  assert.equal(g.findEnemyTarget(archer), null, "without the flag archers ignore platforms (old rule)");
  archer.targetsPlatforms = true;
  // One shot at the platform hero: platformAttack share of the normal hit, target marked.
  g.heroes = [odin];
  archer.attackClock = 0; archer.hp = archer.maxHp = 1e9;
  const before = odin.hpLeft;
  g.step(1 / 60);
  const expected = resolveDamage(archer.attack * tuning.enemies.archer.platformAttack, odin.armor * (1 + g.modifiers().res), "physical") * (1 - g.guardFor(odin));
  assert.ok(Math.abs(before - odin.hpLeft - expected) < 1e-6, `platform hit uses platformAttack (${(before - odin.hpLeft).toFixed(2)} vs ${expected.toFixed(2)})`);
  assert.ok(odin.aimedAt > 0, "target warning timestamp set for the renderer");
}

// Blocker death frees enemies and fires a death event.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 14 });
  g.setTeam(["atlas", "odin", "skadi", "plutus", "aegir"]);
  g.placement = 10000;
  g.place("atlas", "road", 0);
  const atlas = g.heroes[0];
  let deaths = 0;
  g.onChange = (type) => { if (type === "death") deaths += 1; };
  g.startWave(); g.enemies = []; g.spawnQueue = [];
  g.spawnEnemy("boss");
  const boss = g.enemies[0];
  boss.x = atlas.x - 20; boss.y = atlas.y;
  atlas.hpLeft = 50;
  const distanceBefore = boss.distance;
  for (let i = 0; i < 60 * 10 && g.heroes.length; i += 1) g.step(1 / 60);
  assert.equal(deaths, 1, "death event fires once");
  for (let i = 0; i < 60; i += 1) g.step(1 / 60);
  assert.ok(boss.distance > distanceBefore, "enemy resumes walking after blocker dies");
}

// Support heal is limited to allies inside the support's range.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 15 });
  g.setTeam(["plutus", "atlas", "aegir", "odin", "skadi"]);
  g.placement = 10000;
  g.place("plutus", "platform", 0); // (82, 225)
  g.place("atlas", "road", 0);        // (168, 230) - 86px away, inside 150 range
  g.place("aegir", "road", 2);    // (410, 290) - far away
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
  g.setTeam(["aegir", "odin", "skadi", "plutus", "atlas"]);
  g.placement = 10000;
  g.place("aegir", "road", 0);
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

// Automatic aiming (M24, no player rotation): cone and spread ultimates turn to their primary
// target first, so an enemy on any side is hit without manual setup; neighbours in the
// opposite direction stay outside the cone.
{
  const sides = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  const cast = (id, angle, extras = 0) => {
    const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 17 });
    g.placement = 100000;
    const base = g.heroesById.get(id);
    g.place(id, base.slot, 0);
    g.startWave(); g.enemies = []; g.spawnQueue = [];
    const hero = g.heroes[0];
    hero.rotation = angle + Math.PI; // facing away from the enemy, as a stale manual rotation would
    for (let i = 0; i < 2 + extras; i += 1) g.spawnEnemy("brute");
    const [target, opposite, ...rest] = g.enemies;
    for (const e of g.enemies) e.hp = e.maxHp = 1e9;
    const reach = base.slot === "road" ? 40 : 60;
    target.x = hero.x + Math.cos(angle) * reach; target.y = hero.y + Math.sin(angle) * reach; target.distance = 300;
    opposite.x = hero.x - Math.cos(angle) * reach; opposite.y = hero.y - Math.sin(angle) * reach; opposite.distance = 200;
    rest.forEach((e, i) => { const a = angle + (i % 2 ? 0.3 : -0.3); e.x = hero.x + Math.cos(a) * (reach + 10); e.y = hero.y + Math.sin(a) * (reach + 10); e.distance = 250 - i; });
    const result = g.castUltimate(hero, target);
    return { g, hero, target, opposite, rest, result };
  };
  for (const angle of sides) {
    for (const id of ["aegir", "helios", "surtr", "fenrir"]) {
      if (!heroes.some((h) => h.id === id)) continue;
      const r = cast(id, angle);
      assert.ok(r.target.hp < r.target.maxHp, `${id} hits a target at ${angle.toFixed(2)} rad`);
      assert.equal(r.opposite.hp, r.opposite.maxHp, `${id} spares the enemy behind at ${angle.toFixed(2)} rad`);
    }
    const m = cast("stheno", angle, 1);
    assert.notEqual(m.result, false, `stheno fires at ${angle.toFixed(2)} rad`);
    assert.ok((m.target.petrifiedUntil ?? 0) > m.g.time && (m.rest[0].petrifiedUntil ?? 0) > m.g.time, `stheno petrifies target and cone neighbour at ${angle.toFixed(2)} rad`);
    assert.ok(!((m.opposite.petrifiedUntil ?? 0) > m.g.time), `stheno misses the enemy behind at ${angle.toFixed(2)} rad`);
    const d = cast("skadi", angle, 2);
    assert.ok(d.rest.every((e) => e.hp < e.maxHp), `skadi's spread follows her target at ${angle.toFixed(2)} rad`);
    assert.equal(d.opposite.hp, d.opposite.maxHp, `skadi's spread skips the enemy behind at ${angle.toFixed(2)} rad`);
  }
  // Facing also follows the current target every step, so effects point the right way.
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 18 });
  g.placement = 100000; g.place("skadi", "platform", 0);
  g.startWave(); g.enemies = []; g.spawnQueue = [];
  const hero = g.heroes[0]; hero.rotation = 0;
  g.spawnEnemy("brute"); const e = g.enemies[0]; e.hp = e.maxHp = 1e9;
  for (let i = 0; i < 600 && !g.findTarget(hero); i += 1) g.step(1 / 30); // walk it into range
  assert.ok(g.findTarget(hero), "enemy reaches skadi's range");
  g.step(1 / 60);
  const t = g.findTarget(hero);
  assert.ok(Math.abs(hero.rotation - Math.atan2(t.y - hero.y, t.x - hero.x)) < 1e-6, "hero turns to its target during combat");
  assert.equal(typeof g.rotate, "undefined", "player rotation is gone");
}

// Full run, win: a fully deployed squad survives all ten waves.
// Mechanics check at base difficulty; balance at the shipped difficulty is covered by test:td-balance.
{
  const g = new TowerDefenseGame({ heroes, tuning: { ...tuning, difficulty: { enemyHp: 0.2 } }, map: maps[0], waves, seed: 21 });
  g.setTeam(["atlas", "aegir", "odin", "skadi", "plutus"]);
  g.placement = 10000;
  g.place("atlas", "road", 0); g.place("aegir", "road", 3);
  g.place("odin", "platform", 1); g.place("skadi", "platform", 2); g.place("plutus", "platform", 0);
  while (!g.complete) {
    if (!g.running) {
      g.startWave();
    }
    for (let i = 0; i < 60 * 120 && g.running && !g.complete; i += 1) g.step(1 / 60);
    if (!g.running && !g.complete && g.wave >= waves.length) break;
  }
  assert.equal(g.complete, true, "full run terminates");
  assert.equal(g.won, true, "deployed squad wins");
  assert.ok(g.lives > 0, "winner has lives left");
}

// Full run, loss: an empty defense loses every leak and the run ends.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 22 });
  g.setTeam(["atlas", "aegir", "odin", "skadi", "plutus"]);
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
  g.setTeam(["atlas", "odin", "skadi", "plutus", "aegir"]);
  g.placement = 10000;
  g.place("odin", "platform", 1);
  g.startWave(); g.enemies = []; g.spawnQueue = [];
  g.spawnEnemy("brute");
  const brute = g.enemies[0];
  brute.speed = 0; brute.distance = 320; brute.x = 168; brute.y = 240; // inside odin's range
  g.step(1 / 60);
  assert.ok(g.effects.some((effect) => effect.type === "shot" && effect.color !== "red"), "hero attacks emit a tracer");
}

// --- 2B positional support aura ---

// Aura applies in range, not out of range, and never stacks.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 41 });
  g.setTeam(["plutus", "harmonia", "atlas", "aegir", "odin"]);
  g.placement = 10000;
  g.place("plutus", "platform", 0); // (82, 225)
  g.place("harmonia", "platform", 1);  // (274, 292) - also in range of atlas
  g.place("atlas", "road", 0);        // (168, 230) - inside both support ranges
  g.place("aegir", "road", 4);    // (650, 300) - outside all support ranges
  const [, , atlas, aegir] = g.heroes;
  const auraBonus = 1 + tuning.support.passiveAuraBonus;
  const synBonusAtlas = g.synergyBonusFor(atlas);
  assert.ok(Math.abs(g.attackValue(atlas) - atlas.atk * auraBonus * (1 + synBonusAtlas)) < 1e-9, "ally in range gains aura bonus plus synergy");
  assert.equal(g.supportAuraFor(aegir), null, "ally out of range gains nothing");
  assert.equal(g.synergyBonusFor(aegir), 0, "aegir out of synergy range");
  assert.equal(g.attackValue(aegir), aegir.atk, "out-of-range attack unchanged");
}

// Aura ends immediately when the support falls.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 42 });
  g.setTeam(["plutus", "atlas", "aegir", "odin", "skadi"]);
  g.placement = 10000;
  g.place("plutus", "platform", 0);
  g.place("atlas", "road", 0);
  const [plutus, atlas] = g.heroes;
  assert.ok(g.supportAuraFor(atlas), "aura active while support lives");
  g.damageHero(plutus, 99999);
  assert.equal(g.supportAuraFor(atlas), null, "aura gone when support falls");
  assert.equal(g.attackValue(atlas), atlas.atk, "attack returns to base");
}

// Aura bonus affects real damage dealt.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 43 });
  g.setTeam(["plutus", "odin", "skadi", "atlas", "aegir"]);
  g.placement = 10000;
  g.place("plutus", "platform", 0);
  g.place("odin", "platform", 1);
  const [plutus, odin] = g.heroes;
  plutus.aps = 0; // isolate odin's damage from the support's own attacks
  plutus.x = odin.x - 100; plutus.y = odin.y; // well inside the aura, whatever the ring spacing
  g.startWave(); g.enemies = []; g.spawnQueue = [];
  g.spawnEnemy("brute");
  const brute = g.enemies[0];
  brute.speed = 0; brute.distance = 320; // path point (168, 240): inside odin's and plutus's range
  brute.x = 168; brute.y = 240;
  const before = brute.hp;
  for (let i = 0; i < 60; i += 1) g.step(1 / 60);
  const unbuffedHit = resolveDamage(odin.atk, brute.magicRes, "magical", false);
  const buffedHit = resolveDamage(odin.atk * (1 + tuning.support.passiveAuraBonus), brute.magicRes, "magical", false);
  assert.ok(buffedHit > unbuffedHit, "aura raises attack damage");
  assert.ok(before - brute.hp >= buffedHit - 1e-6, "buffed attack deals aura-increased damage");
}

// --- 3B virtue choices ---

function runWaveOne(g) {
  g.setTeam(["atlas", "aegir", "odin", "skadi", "plutus"]);
  g.placement = 10000;
  g.place("atlas", "road", 0); g.place("aegir", "road", 3);
  g.place("odin", "platform", 1); g.place("skadi", "platform", 2); g.place("plutus", "platform", 0);
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
  g.setTeam(["atlas", "aegir", "odin", "skadi", "plutus"]);
  g.placement = 10000;
  g.place("odin", "platform", 1);
  g.virtueOffer = ["Wildness", "Mercy", "Gnosis"];
  g.chooseVirtue("Wildness");
  const odin = g.heroes[0];
  assert.ok(Math.abs(g.attackValue(odin) - odin.atk * 1.15) < 1e-9, "Wildness adds +15% attack");
  const hpBefore = odin.hp;
  g.virtueOffer = ["Defiance"];
  g.chooseVirtue("Defiance");
  assert.equal(odin.hp, Math.round(odin.baseHp * 1.15), "Defiance raises max health for deployed heroes");
  assert.ok(odin.hpLeft > hpBefore - 1 && odin.hpLeft === odin.hp, "health bonus granted as current health");
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

// R4 battle economy: Favor discounts deployment, while relocation is an atomic between-wave
// purchase that moves the existing unit without resetting its combat state.
{
  const discounted = structuredClone(tuning);
  discounted.favor = { deployDiscount: 0.15, classBonus: { Tank: { deployDiscount: 0.1, relocateDiscount: 0.3 } } };
  assert.equal(tuning.run.relocationCost, 0, "relocation between waves is free by default (Encounter Pacing P4); the price math below uses an explicit share");
  discounted.run.relocationCost = 0.25;
  const g = new TowerDefenseGame({ heroes, tuning: discounted, map: maps[0], waves, seed: 301 });
  g.placement = 1000;
  const atlasCost = heroes.find((hero) => hero.id === "atlas").cost;
  const deployed = Math.round(atlasCost * 0.75), moved = Math.round(deployed * 0.25 * 0.7);
  assert.equal(g.deployCost("atlas"), deployed, "global and class deployment discounts add together");
  assert.equal(g.place("atlas", "road", 0), true, "discounted hero deploys");
  const atlas = g.heroes[0];
  Object.assign(atlas, { hpLeft: 321, ultClock: 7, attackClock: 0.4, stunCooldown: 2 });
  const before = { entityId: atlas.entityId, hpLeft: atlas.hpLeft, ultClock: atlas.ultClock, attackClock: atlas.attackClock, stunCooldown: atlas.stunCooldown, invested: atlas.invested };
  assert.deepEqual(g.relocationInfo(atlas.entityId), { ok: true, hero: atlas, cost: moved }, "relocation price uses discounted deployment cost and class Rite");
  assert.equal(g.relocate(atlas.entityId, "road", 1).ok, true, "valid relocation succeeds");
  assert.equal(g.placement, 1000 - deployed - moved, "deployment and relocation spend their exact costs");
  assert.equal(g.relocations, 1, "relocation is recorded for challenges");
  assert.deepEqual({ entityId: atlas.entityId, hpLeft: atlas.hpLeft, ultClock: atlas.ultClock, attackClock: atlas.attackClock, stunCooldown: atlas.stunCooldown, invested: atlas.invested }, before, "relocation preserves identity, combat state and refundable investment");
  assert.deepEqual([atlas.slotType, atlas.slotIndex], ["road", 1], "relocation changes the occupied tile");

  discounted.favor = { deployDiscount: 0.4, classBonus: { Tank: { deployDiscount: 0.3 } } };
  const capped = new TowerDefenseGame({ heroes, tuning: discounted, map: maps[0], waves, seed: 302 });
  assert.equal(capped.deployCost("atlas"), Math.round(atlasCost * 0.5), "deployment discount is capped at 50 percent");
}

// Invalid relocation destinations and timing never mutate the hero or spend gold.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 303 });
  g.placement = 1000;
  g.place("atlas", "road", 0);
  g.place("aegir", "road", 1);
  const atlas = g.heroes.find((hero) => hero.id === "atlas");
  const unchanged = () => [g.placement, atlas.slotType, atlas.slotIndex, g.relocations];
  const initial = unchanged();
  assert.equal(g.relocate(atlas.entityId, "road", 1).ok, false, "occupied relocation destination is rejected");
  assert.equal(g.relocate(atlas.entityId, "road", 999).ok, false, "missing relocation destination is rejected");
  assert.equal(g.relocate(atlas.entityId, "platform", 0).ok, false, "wrong tile type is rejected");
  assert.deepEqual(unchanged(), initial, "invalid destinations spend nothing and keep the hero in place");
  g.placement = 0;
  const freeShare = g.tuning.run.relocationCost; // free by default (Encounter Pacing P4); a priced relocation needs gold
  g.tuning = { ...g.tuning, run: { ...g.tuning.run, relocationCost: 0.25 } };
  assert.equal(g.relocate(atlas.entityId, "road", 2).ok, false, "relocation without enough gold is rejected");
  g.tuning = { ...g.tuning, run: { ...g.tuning.run, relocationCost: freeShare } };
  assert.equal(g.relocationInfo(atlas.entityId).cost, 0, "relocation is free by default");
  g.placement = 1000;
  g.startWave();
  assert.equal(g.relocate(atlas.entityId, "road", 2).ok, false, "relocation during a wave is rejected");
  g.running = false; g.complete = true;
  assert.equal(g.relocate(atlas.entityId, "road", 2).ok, false, "relocation after run completion is rejected");
  assert.deepEqual(unchanged().slice(1), initial.slice(1), "timing rejections keep the hero in place");
}

// Collection stats are the unit's base power; battle placement applies run bonuses once and
// creates no second progression layer.
{
  const permanentHeroes = heroes.map((hero) => hero.id === "atlas" ? {
    ...hero,
    atk: 777,
    hp: 888,
    campaignLevel: 23,
    campaignStars: 4,
    campaignEvolution: 3,
    campaignSkillLevels: { ultimate: 2, passiveAttack: 3, passiveHealth: 4, passiveUtility: 2 },
    awakenedUlt: true,
  } : hero);
  const permanentTuning = structuredClone(tuning);
  permanentTuning.favor = { heroHpBonus: 0.2, classBonus: { Tank: { power: 0.15 } } };
  const g = new TowerDefenseGame({ heroes: permanentHeroes, tuning: permanentTuning, map: maps[0], waves, seed: 304 });
  g.placement = 1000;
  assert.equal(g.place("atlas", "road", 0), true, "collection hero deploys");
  const atlas = g.heroes[0];
  assert.equal(atlas.baseAtk, 777, "collection attack is the permanent base attack");
  assert.equal(atlas.baseHp, 888, "collection health is the permanent base health");
  assert.equal(atlas.atk, 894, "class power applies once to collection attack");
  assert.equal(atlas.hp, 1225, "run health and class power apply once to collection health");
  assert.equal(atlas.awakenedUlt, true, "collection Evolution keeps its awakened ultimate");
  for (const key of ["level", "focus", "path", "awakened", "trained"]) assert.equal(Object.hasOwn(atlas, key), false, `placed hero has no battle ${key} state`);
  assert.equal(typeof g.upgradeInfo, "undefined", "battle upgrade preview is removed");
  assert.equal(typeof g.upgrade, "undefined", "battle upgrade purchase is removed");
}

// Wave result totals agree with the simulation.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 24 });
  g.setTeam(["atlas", "aegir", "odin", "skadi", "plutus"]);
  g.placement = 10000;
  g.place("atlas", "road", 0); g.place("aegir", "road", 3);
  g.place("odin", "platform", 1); g.place("skadi", "platform", 2); g.place("plutus", "platform", 0);
  const goldBefore = g.placement;
  g.startWave();
  for (let i = 0; i < 60 * 120 && g.running; i += 1) g.step(1 / 60);
  const stats = g.waveStats;
  assert.ok(stats, "wave stats exist after the wave");
  const totalSpawned = waves[0].spawns.reduce((sum, group) => sum + group.count, 0);
  assert.equal(stats.kills + stats.leaks, totalSpawned, "kills + leaks account for every spawn");
  assert.equal(g.placement - goldBefore, stats.placementEarned, "placement earned matches the simulation");
  assert.ok(stats.placementEarned > 0, "placement regrows during the wave");
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
  g.setTeam(["atlas", "odin", "skadi", "plutus", "aegir"]);
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
  g.setTeam(["atlas", "odin", "skadi", "plutus", "aegir"]);
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
  g.setTeam(["atlas", "odin", "skadi", "plutus", "aegir"]);
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
  g.setTeam(["atlas", "odin", "skadi", "plutus", "aegir"]);
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
  g.setTeam(["atlas", "odin", "skadi", "plutus", "aegir"]);
  g.placement = 10000;
  g.place("atlas", "road", 0);
  g.place("odin", "platform", 0);
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
  g.setTeam(["atlas", "odin", "skadi", "plutus", "aegir"]);
  g.placement = 10000;
  g.place("atlas", "road", 0);
  g.startWave();
  assert.equal(g.runDuration, 0, "runDuration 0 before finish");
  for (let i = 0; i < 60 * 90 && g.running; i += 1) g.step(1 / 60);
  // Force finish to check duration is set regardless of winning.
  if (!g.complete) g.finish(false);
  assert.ok(g.runDuration > 0, `runDuration (${g.runDuration}) > 0 after finish`);
  assert.ok(Math.abs(g.runDuration - g.time) < 1e-9, "runDuration equals g.time at finish");
}

// gold_spent_tracked: totalPlacementSpent accumulates placement and relocation costs.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 57 });
  g.setTeam(["atlas", "odin", "skadi", "plutus", "aegir"]);
  g.placement = 10000;
  assert.equal(g.totalPlacementSpent, 0, "totalPlacementSpent zero before any placement");
  const nuwaHero = heroes.find((h) => h.id === "atlas");
  g.place("atlas", "road", 0);
  assert.equal(g.totalPlacementSpent, nuwaHero.cost, "placement cost tracked");
  const eid = g.heroes[0].entityId;
  g.placement = 10000;
  const relocationCost = Math.round(nuwaHero.cost * tuning.run.relocationCost);
  g.relocate(eid, "road", 1);
  assert.equal(g.totalPlacementSpent, nuwaHero.cost + relocationCost, "relocation cost accumulates");
}

// placement_regrowth: 30 at the start, +1 per second of battle time, only while a wave runs.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 58 });
  assert.equal(g.placement, tuning.run.startingPlacement, "run starts with the starting placement");
  assert.equal(tuning.run.startingPlacement, 30);
  g.setTeam(["atlas"]);
  g.place("atlas", "road", 0);
  const afterPlace = g.placement;
  for (let i = 0; i < 60 * 5; i += 1) g.step(1 / 60);
  assert.equal(g.placement, afterPlace, "no regrowth while no wave runs");
  g.startWave();
  g.enemies = []; g.spawnQueue = [{ at: 99, kind: "grunt", scale: 1, lane: 0, sway: 0 }]; // wave stays open
  for (let i = 0; i < 60 * 10; i += 1) g.step(1 / 60);
  assert.equal(g.placement - afterPlace, 10, "one placement point per second of battle");
  assert.equal(g.totalPlacementEarned, 10, "regrowth is tracked as earned");
  assert.equal(g.place("atlas", "road", 1), false, "a hero already on the field is not placed twice");
}

// placement_gate: heroes cost placement points; not enough points means no deployment.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 60 });
  const cost = g.deployCost("atlas");
  g.placement = cost - 1;
  assert.equal(g.place("atlas", "road", 0), false, "too few placement points");
  assert.equal(g.placement, cost - 1, "a refused placement spends nothing");
  g.placement = cost;
  assert.equal(g.place("atlas", "road", 0), true, "exactly enough placement points");
  assert.equal(g.placement, 0, "the cost is spent");
  assert.equal(g.sell(g.heroes[0].entityId).ok, true);
  assert.equal(g.placement, cost, "selling refunds the full placement cost");
  assert.equal(g.gold, undefined, "the run has no gold");
}

// reset_clears_run_stats: heroKills, totalPlacementSpent, totalPlacementEarned, runDuration reset to zero.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 59 });
  g.heroKills = { 1: { name: "Test", kills: 5 } };
  g.totalPlacementSpent = 200;
  g.totalPlacementEarned = 300;
  g.runDuration = 123;
  g.reset();
  assert.deepEqual(g.heroKills, {}, "heroKills cleared on reset");
  assert.equal(g.totalPlacementSpent, 0, "totalPlacementSpent cleared on reset");
  assert.equal(g.totalPlacementEarned, 0, "totalPlacementEarned cleared on reset");
  assert.equal(g.runDuration, 0, "runDuration cleared on reset");
}

// --- 5C synergy visibility ---

// synergy_no_shared_tags: heroes with no overlapping tags get zero bonus.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 70 });
  g.setTeam(["atlas", "odin", "skadi", "plutus", "aegir"]);
  g.placement = 10000;
  g.place("atlas", "road", 0);
  g.place("odin", "platform", 0); // (82, 225) — close to atlas (168, 230), dist ~86
  // Force no shared tags between atlas and odin for this test.
  g.heroes[0].synergies = ["TAG_A"];
  g.heroes[1].synergies = ["TAG_B"];
  assert.equal(g.synergyBonusFor(g.heroes[0]), 0, "no shared tags = 0 bonus");
  assert.deepEqual(g.synergyLinksFor(g.heroes[0]), [], "no synergy links when no shared tags");
}

// synergy_one_shared: one shared tag within range yields bonusPerTag.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 71 });
  g.setTeam(["atlas", "odin", "skadi", "plutus", "aegir"]);
  g.placement = 10000;
  g.place("atlas", "road", 0);
  g.place("odin", "platform", 0);
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
  g.setTeam(["atlas", "odin", "skadi", "plutus", "aegir"]);
  g.placement = 10000;
  g.place("atlas", "road", 0);
  g.place("odin", "platform", 0);
  const manyTags = ["T1", "T2", "T3", "T4", "T5", "T6"];
  g.heroes[0].synergies = manyTags;
  g.heroes[1].synergies = manyTags;
  assert.equal(g.synergyBonusFor(g.heroes[0]), tuning.synergy.cap, "bonus capped at synergy.cap");
}

// synergy_out_of_range: shared tags beyond range yield zero.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 73 });
  g.setTeam(["atlas", "odin", "skadi", "plutus", "aegir"]);
  g.placement = 10000;
  g.place("atlas", "road", 0); // (168, 230)
  g.place("odin", "platform", 4); // (850, 292) — dist ~686 >> 250
  g.heroes[0].synergies = ["SHARED_TAG"];
  g.heroes[1].synergies = ["SHARED_TAG"];
  assert.equal(g.synergyBonusFor(g.heroes[0]), 0, "out of range = 0 bonus");
  assert.equal(g.activeSynergyCount(), 0, "activeSynergyCount 0 when out of range");
}

// synergy_dead_hero: a fallen hero does not contribute synergy bonus.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 74 });
  g.setTeam(["atlas", "odin", "skadi", "plutus", "aegir"]);
  g.placement = 10000;
  g.place("atlas", "road", 0);
  g.place("odin", "platform", 0);
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
  g.setTeam(["nott", "aegir", "odin", "stheno", "asclepius"]);
  g.placement = 10000;
  g.place("nott", "road", 0);
  g.place("aegir", "road", 1);
  g.place("stheno", "platform", 0);
  g.place("asclepius", "platform", 1);
  g.place("odin", "platform", 2);
  const nott = g.heroes.find((h) => h.id === "nott");
  const aegir = g.heroes.find((h) => h.id === "aegir");
  const stheno = g.heroes.find((h) => h.id === "stheno");
  const asclepius = g.heroes.find((h) => h.id === "asclepius");
  const odin = g.heroes.find((h) => h.id === "odin");
  assert.equal(nott.variant, "shadow_step", "nott variant loaded");
  assert.equal(aegir.variant, "knockback", "aegir variant loaded");
  assert.equal(stheno.variant, "petrify_shot", "stheno variant loaded");
  assert.equal(asclepius.variant, "valkyrie_call", "asclepius variant loaded");
  assert.equal(odin.variant, "chain_lightning", "odin variant loaded");
  assert.ok(nott.skillName, "nott has skill name");
  assert.ok(odin.skillName, "odin has skill name");
}

// variant_knockback: Aegir cleave reduces enemy distance.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 81 });
  g.setTeam(["aegir", "atlas", "odin", "skadi", "plutus"]);
  g.placement = 10000;
  g.place("aegir", "road", 0);
  g.startWave(); g.enemies = []; g.spawnQueue = [];
  g.spawnEnemy("grunt");
  const aegir = g.heroes[0];
  const grunt = g.enemies[0];
  grunt.x = aegir.x; grunt.y = aegir.y; grunt.distance = 200;
  const distBefore = grunt.distance;
  g.castUltimate(aegir, grunt);
  assert.ok(grunt.distance < distBefore, "knockback reduces enemy distance");
  assert.ok(grunt.distance >= 0, "distance cannot go below 0");
}

// variant_petrify_shot: Stheno petrifies up to petrifyTargets enemies in her facing cone for petrifyDuration seconds.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 82 });
  g.setTeam(["stheno", "atlas", "odin", "skadi", "plutus"]);
  g.placement = 10000;
  g.place("stheno", "platform", 0);
  g.startWave(); g.enemies = []; g.spawnQueue = [];
  const stheno = g.heroes[0];
  const skill = tuning.heroSkills.stheno;
  assert.equal(g.castUltimate(stheno, null), false, "no target in the cone keeps the ultimate ready");
  for (let i = 0; i < skill.petrifyTargets + 1; i += 1) g.spawnEnemy("brute");
  g.enemies.forEach((enemy, i) => {
    const reach = 30 + i * 5;
    enemy.x = stheno.x + Math.cos(stheno.rotation) * reach;
    enemy.y = stheno.y + Math.sin(stheno.rotation) * reach;
    enemy.distance = 100 + i;
  });
  g.castUltimate(stheno, g.enemies[0]);
  const stoned = g.enemies.filter((enemy) => (enemy.petrifiedUntil ?? 0) > g.time);
  assert.equal(stoned.length, skill.petrifyTargets, "petrifies up to petrifyTargets enemies");
  assert.ok(stoned.every((enemy) => Math.abs(enemy.petrifiedUntil - (g.time + skill.petrifyDuration)) < 1e-9), "petrify lasts petrifyDuration");
  const target = stoned[0];
  const before = target.distance;
  g.step(1 / 60);
  assert.equal(target.distance, before, "petrified enemy does not move");
}

// variant_shadow_step: Nott can target enemies outside normal range.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 83 });
  g.setTeam(["nott", "atlas", "odin", "skadi", "plutus"]);
  g.placement = 10000;
  g.place("nott", "road", 0);
  g.startWave(); g.enemies = []; g.spawnQueue = [];
  g.spawnEnemy("grunt");
  const nott = g.heroes[0];
  const grunt = g.enemies[0];
  grunt.x = 900; grunt.y = 500; // far away
  grunt.hp = 1; grunt.maxHp = 100;
  assert.equal(g.findTarget(nott), null, "normal attacks stay within range");
  assert.ok(g.findUltTarget(nott) === grunt, "shadow_step targets enemy outside normal range");
  nott.ultClock = nott.ultCooldown;
  nott.attackClock = 1; // the step moves the grunt onto the path; keep the dash basic out of it
  g.step(1 / 60);
  assert.equal(nott.ultClock < nott.ultCooldown, true, "ultimate fires with no enemy in normal range");
  assert.ok(grunt.hp <= 0 || grunt.dead, "far low-HP enemy is executed");
}

// variant_valkyrie_call: Asclepius revives a fallen hero.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 84 });
  g.setTeam(["asclepius", "atlas", "odin", "skadi", "plutus"]);
  g.placement = 10000;
  g.place("asclepius", "platform", 0);
  g.place("atlas", "road", 0);
  g.startWave(); g.enemies = []; g.spawnQueue = [];
  const atlas = g.heroes.find((h) => h.id === "atlas");
  const slotType = atlas.slotType; const slotIndex = atlas.slotIndex;
  // Kill atlas directly
  g.fallenHeroes.push({ id: "atlas", slotType, slotIndex });
  g.heroes = g.heroes.filter((h) => h.id !== "atlas");
  assert.equal(g.heroes.filter((h) => h.id === "atlas").length, 0, "atlas fallen");
  const asclepius = g.heroes.find((h) => h.id === "asclepius");
  g.spawnEnemy("grunt");
  g.castUltimate(asclepius, g.enemies[0]);
  const revived = g.heroes.find((h) => h.id === "atlas");
  assert.ok(revived, "atlas revived by valkyrie_call");
  assert.ok(revived.hpLeft <= revived.hp * 0.55, "revived hero has at most 55% HP");
  assert.ok(revived.hpLeft >= revived.hp * 0.45, "revived hero has at least 45% HP");
}

// valkyrie_call edge cases: the revived hero rejoins the team; heroes already
// back on the field and occupied rings are skipped (fallback: heal).
{
  const make = () => {
    const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 85 });
    g.placement = 100000;
    return g;
  };
  const kill = (g, id) => { const unit = g.heroes.find((h) => h.id === id); g.damageHero(unit, unit.hpLeft + 1, null); };
  const castAsclepius = (g) => {
    const asclepius = g.heroes.find((h) => h.id === "asclepius");
    g.startWave(); g.enemies = []; g.spawnQueue = [];
    g.spawnEnemy("grunt");
    g.castUltimate(asclepius, g.enemies[0]);
  };

  // A: five fielded, one falls, Asclepius revives it; more heroes can still join (no cap).
  {
    const g = make();
    for (const [id, type, index] of [["asclepius", "platform", 0], ["atlas", "road", 0], ["odin", "platform", 1], ["skadi", "platform", 2], ["aegir", "road", 1]]) g.place(id, type, index);
    kill(g, "atlas");
    castAsclepius(g);
    assert.ok(g.heroes.some((h) => h.id === "atlas"), "A: atlas revived");
    assert.ok(g.team.includes("atlas"), "A: revived hero is back in the team");
    assert.equal(g.place("plutus", "platform", 3), true, "A: sixth hero after a revive");
  }

  // B: the fallen hero was redeployed elsewhere first: no second copy.
  {
    const g = make();
    g.place("asclepius", "platform", 0); g.place("atlas", "road", 0);
    kill(g, "atlas");
    g.place("atlas", "road", 2);
    castAsclepius(g);
    assert.equal(g.heroes.filter((h) => h.id === "atlas").length, 1, "B: no duplicate hero");
  }

  // C: another hero took the fallen hero's ring: no stacking on that ring.
  {
    const g = make();
    g.place("asclepius", "platform", 0); g.place("atlas", "road", 0);
    kill(g, "atlas");
    g.place("aegir", "road", 0);
    castAsclepius(g);
    assert.equal(g.heroes.filter((h) => h.slotType === "road" && h.slotIndex === 0).length, 1, "C: one hero per ring");
    assert.ok(!g.heroes.some((h) => h.id === "atlas"), "C: atlas stays fallen");
  }

  // D: five alive plus a fallen hero: the revive adds a sixth (no team cap).
  {
    const g = make();
    g.place("asclepius", "platform", 0); g.place("atlas", "road", 0);
    kill(g, "atlas");
    for (const [id, type, index] of [["odin", "platform", 1], ["skadi", "platform", 2], ["aegir", "road", 1], ["plutus", "platform", 3]]) g.place(id, type, index);
    castAsclepius(g);
    assert.equal(g.heroes.length, 6, "D: revive past five heroes");
  }

  // E: an older eligible fallen hero is revived when the newest one is not eligible.
  {
    const g = make();
    g.place("asclepius", "platform", 0); g.place("atlas", "road", 0); g.place("aegir", "road", 1);
    kill(g, "atlas");
    kill(g, "aegir");
    g.place("aegir", "road", 3); // newest fallen is back on the field
    castAsclepius(g);
    assert.ok(g.heroes.some((h) => h.id === "atlas" && h.slotIndex === 0), "E: older fallen hero revived on its ring");
  }
}

// variant_expose: Ymir-exposed enemies take 30% more damage.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 85 });
  g.setTeam(["ymir", "atlas", "odin", "skadi", "plutus"]);
  g.placement = 10000;
  g.place("ymir", "road", 0);
  g.startWave(); g.enemies = []; g.spawnQueue = [];
  g.spawnEnemy("grunt"); g.spawnEnemy("grunt");
  const ymir = g.heroes[0];
  const [g1, g2] = g.enemies;
  g1.x = ymir.x; g1.y = ymir.y;
  g2.x = 900; g2.y = 500; // far, not exposed
  g.castUltimate(ymir, g1);
  assert.ok(g1.exposed && g1.exposed > g.time, "nearby enemy exposed");
  assert.equal(g2.exposed, undefined, "far enemy not exposed");
  const hpBefore = g1.hp;
  g.hit(g1, 100, ymir);
  assert.ok(g1.hp <= hpBefore - 119, "exposed enemy takes at least 120 damage from 100 hit");
}

// Restricted rosters (Campaign squad, Daily, Expedition): the cap is the roster size, and the
// life maximum is the run's own (campaign stage lives, or an explicit carried-lives maximum).
{
  const map = realMaps[0];
  const squad = heroes.slice(0, 2).map((h) => h.id);
  assert.equal(new TowerDefenseGame({ heroes, tuning, map, waves, allowedHeroes: squad }).deployCap(), 2, "cap follows a restricted roster");
  assert.equal(new TowerDefenseGame({ heroes, tuning, map, waves }).deployCap(), tuning.run.deployCap, "open roster keeps the tuned cap");
  assert.equal(new TowerDefenseGame({ heroes, tuning, map, waves, lives: 12 }).maxLives, 12, "stage lives are the maximum");
  const carried = new TowerDefenseGame({ heroes, tuning, map, waves, lives: 7, maxLives: tuning.run.lives });
  assert.deepEqual([carried.lives, carried.maxLives], [7, tuning.run.lives], "carried lives keep the run maximum");
  assert.equal(new TowerDefenseGame({ heroes, tuning, map, waves }).maxLives, tuning.run.lives, "default maximum");
}

// Recruit inspect (M24): deployPreview shows what place() fields on that tile, special tile
// range included, without spending gold.
{
  const map = realMaps[0];
  const [key] = Object.entries(map.rings).find(([, kind]) => kind === "highground");
  const [slotType, slotIndex] = [key.split(":")[0], Number(key.split(":")[1])];
  const g = new TowerDefenseGame({ heroes, tuning, map, waves, seed: 3 });
  g.placement = 9999;
  const hero = heroes.find((h) => h.slot === slotType);
  const preview = g.deployPreview(hero.id, slotType, slotIndex);
  assert.equal(g.placement, 9999, "preview spends nothing");
  assert.ok(g.place(hero.id, slotType, slotIndex), "placed after preview");
  const unit = g.heroes.at(-1);
  assert.deepEqual([preview.atk, preview.hp, preview.range, preview.aps, preview.cost], [unit.atk, unit.hp, unit.range, unit.aps, 9999 - g.placement], "preview matches the placed unit");
  assert.ok(preview.range > g.rangeFor(hero), "high ground range is in the preview");
  assert.equal(g.deployPreview(heroes.find((h) => h.slot === "road").id, "road", 0).hitsFlyers, false, "road heroes cannot hit flyers");
}

// Map enemy health (audit step 3): a map's `enemyHp` scales open modes; a mode's own stage
// scale (campaign, Expedition) replaces it, so tuned stages keep their numbers.
{
  const verdant = realMaps.find((map) => map.id === "verdant-crossing");
  assert.ok(verdant.enemyHp > 1, "Verdant is tuned harder");
  const plain = { ...verdant, enemyHp: undefined };
  const hp = (options) => new TowerDefenseGame({ heroes, tuning, waves, ...options }).waveTotalHp(0);
  assert.ok(Math.abs(hp({ map: verdant }) / hp({ map: plain }) - verdant.enemyHp) < 0.01, "map scale applies in open modes");
  assert.equal(hp({ map: verdant, hpScale: 0.9 }), hp({ map: plain, hpScale: 0.9 }), "stage scale replaces the map scale");
}

// Deploy cap (M22b): tiles line the road, so heroes on the field are capped; tiles, gold
// and uniqueness still apply. A fallen hero frees a place under the cap.
{
  const map = realMaps[0];
  const cap = tuning.run.deployCap;
  assert.ok(cap >= 1 && cap < map.roadSlots.length + map.platformSlots.length, "the cap binds before the tiles run out");
  const g = new TowerDefenseGame({ heroes, tuning, map, waves, seed: 91 });
  g.placement = 100000;
  const road = heroes.filter((h) => h.slot === "road").slice(0, Math.ceil(cap / 2));
  const platform = heroes.filter((h) => h.slot === "platform").slice(0, cap - road.length);
  road.forEach((h, i) => assert.equal(g.place(h.id, "road", i), true, `road tile ${i} filled`));
  platform.forEach((h, i) => assert.equal(g.place(h.id, "platform", i), true, `platform tile ${i} filled`));
  assert.equal(g.heroes.length, cap, "field full at the cap");
  assert.equal(g.team.length, g.heroes.length, "team lists every fielded hero");
  const spare = heroes.find((h) => h.slot === "road" && !g.team.includes(h.id));
  assert.equal(g.place(spare.id, "road", road.length), false, "no deploy past the cap");
  const fielded = g.heroes.find((h) => h.slotType === "road");
  g.damageHero(fielded, fielded.hpLeft + 1, null);
  assert.equal(g.team.includes(fielded.id), false, "dead hero leaves the team roster");
  assert.equal(g.place(spare.id, "road", 1), false, "occupied tile rejected");
  assert.equal(g.place(spare.id, "road", map.roadSlots.length), false, "missing tile rejected");
  assert.equal(g.place(spare.id, "road", fielded.slotIndex), true, "fallen hero frees a place");
  assert.equal(g.takeRevivableFallen(), null, "no revive past the cap");
  const poor = new TowerDefenseGame({ heroes, tuning, map, waves, seed: 91 });
  poor.placement = road[0].cost - 1;
  assert.equal(poor.place(road[0].id, "road", 0), false, "gold still limits deploys");
}

// Placement tiles (M22b): generated file in sync; road tiles on the route, side tiles
// clear of it, no two tiles overlapping, every special ring on a tile.
{
  const { buildGrid } = await import("../src/game/td/grid.js");
  const distance = (map, x, y) => Math.min(...mapLanes(map).flatMap(({ path }) => path.slice(1).map((b, i) => {
    const a = path[i], dx = b[0] - a[0], dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(x - a[0] - t * dx, y - a[1] - t * dy);
  })));
  for (const map of realMaps) {
    const built = buildGrid(map);
    assert.deepEqual([map.roadSlots, map.platformSlots, map.rings], [built.roadSlots, built.platformSlots, built.rings], `${map.id} tiles match the grid block (run scripts/build-td-grid.mjs)`);
    for (const [x, y] of map.roadSlots) assert.ok(distance(map, x, y) < 1, `${map.id} road tile ${x},${y} on the route`);
    for (const [x, y] of map.platformSlots) assert.ok(distance(map, x, y) >= 60, `${map.id} side tile ${x},${y} clear of the road`);
    const all = [...map.roadSlots, ...map.platformSlots];
    all.forEach(([x, y], i) => all.slice(i + 1).forEach(([u, v]) => assert.ok(Math.max(Math.abs(x - u), Math.abs(y - v)) >= 52, `${map.id} tiles ${x},${y} and ${u},${v} overlap`)));
    // Compact board prototypes (grid.board, board.js) hold few large tiles by design.
    const [minRoad, minSide] = map.grid?.board ? [6, 8] : [15, 20];
    assert.ok(map.roadSlots.length >= minRoad && map.platformSlots.length >= minSide, `${map.id} has tiles along the whole road`);
  }
}

// --- 6B run quests ---

// One quest per wave, none on the final wave, none without tuning.quests.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 91 });
  g.place("odin", "platform", 0);
  g.startWave();
  assert.ok(g.quest, "quest rolled at wave start");
  assert.equal(g.quest.status, "active");
  assert.notEqual(g.quest.type, "heroSurvival", "no survival quest without a road hero");
  assert.equal(g.quest.reward, tuning.quests.placementBase, "wave 1 quest pays placementBase");
  g.running = false; g.wave = waves.length - 1;
  g.startWave();
  assert.equal(g.quest, null, "no quest on the final wave");
  const off = new TowerDefenseGame({ heroes, tuning: { ...tuning, quests: undefined }, map: maps[0], waves, seed: 91 });
  off.place("odin", "platform", 0);
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
    g.placement = 10000;
    g.place("atlas", "road", 0); g.place("odin", "platform", 0);
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
  const atlas = g.heroes.find((h) => h.id === "atlas");
  g.damageHero(atlas, atlas.hpLeft + 1, null);
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
  const placed = g.placement, earned = g.totalPlacementEarned;
  g.step(1 / 60);
  assert.equal(g.quest.status, "done", "cleared wave completes the quest");
  assert.equal(g.totalPlacementEarned - earned, g.quest.reward, "quest pays its placement reward once");
  assert.equal(g.placement, placed + g.quest.reward, "quest placement lands in the counter");
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
  const byLength = [...maps].sort((m1, m2) => new TowerDefenseGame({ heroes, tuning, map: m1, waves }).path.total - new TowerDefenseGame({ heroes, tuning, map: m2, waves }).path.total);
  const [short, long] = [byLength[0], byLength.at(-1)]; // shortest and longest map
  const g = new TowerDefenseGame({ heroes, tuning, map: long, waves, seed: 94 });
  g.place("odin", "platform", 0);
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
    g.placement = 10000;
    g.place("atlas", "road", 0); g.place("odin", "platform", 0);
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
  const before = g.placement;
  g.step(1 / 60);
  assert.equal(g.quest.status, "done", "reaching the target completes the quest");
  assert.equal(g.placement, before + g.quest.reward);
  // The named hero falling before the target fails it at once.
  g = rollSlayer();
  const atlas = g.heroes.find((h) => h.id === "atlas");
  g.quest.heroEntityId = atlas.entityId;
  g.damageHero(atlas, atlas.hpLeft + 1, null);
  assert.equal(g.quest.status, "failed", "named hero falling fails slayer");
}

// Slayer needs two deployed heroes.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 96 });
  g.place("odin", "platform", 0);
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
      g.placement = 100000;
      const base = g.heroesById.get(id);
      assert.ok(g.place(id, base.slot, 0), `${id} placed`);
      g.place(base.slot === "road" ? "odin" : "atlas", base.slot === "road" ? "platform" : "road", 0);
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
  g.placement = 10000;
  g.place("vidar", "road", 0);
  const vidar = g.heroes[0];
  g.startWave(); g.spawnQueue = []; g.enemies = [];
  g.spawnEnemy("grunt"); g.spawnEnemy("grunt");
  const [weak, other] = g.enemies;
  for (const e of g.enemies) { e.x = vidar.x + 20; e.y = vidar.y; e.distance = 1; }
  weak.hp = 1; weak.distance = 2; // furthest along: the attack target, dies to the basic hit
  other.petrifiedUntil = 1e9; // keep it in range (an Assassin blocks only one enemy)
  vidar.attackClock = 0;
  vidar.ultClock = vidar.ultCooldown + 1;
  const hpBefore = other.hp;
  g.step(1 / 60);
  assert.ok(weak.dead, "basic attack killed the weak grunt");
  assert.ok(other.hp < hpBefore, "ultimate went to a living enemy instead of the corpse");
}

// Aegir's knockback moves the enemy on the map, not just its path distance,
// so a blocked enemy is actually pushed out of the pile.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 98 });
  g.placement = 10000;
  g.place("aegir", "road", 1);
  const pos = g.heroes[0];
  g.startWave(); g.spawnQueue = []; g.enemies = [];
  g.spawnEnemy("brute");
  const e = g.enemies[0];
  // Park the brute on the path next to Aegir.
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

// Odin: chain bounces go to enemies the primary blast did not already hit.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 99 });
  g.placement = 10000;
  g.place("odin", "platform", 0);
  const odin = g.heroes[0];
  g.startWave(); g.spawnQueue = []; g.enemies = [];
  for (let i = 0; i < 3; i += 1) g.spawnEnemy("brute");
  const [a, near, far] = g.enemies;
  for (const e of g.enemies) e.hp = e.maxHp = 1e9;
  a.x = 400; a.y = 300; near.x = 430; near.y = 300; far.x = 520; far.y = 300; // near is inside the 72px blast, far only bounce range
  g.castUltimate(odin, a);
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

// Multi-entrance maps: gates alternate and lanes merge before the base. Lanes may differ in
// length, so targeting ranks enemies by distance still to go (progress).
for (const map of maps.filter((entry) => entry.lanes)) {
  const g = new TowerDefenseGame({ heroes, tuning, map, waves, seed: 105 });
  assert.ok(g.lanes.length >= 2, `${map.id} has several entrances`);
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
  const first = g.spawnEnemy("grunt", { lane: 0 });
  first.distance = g.lanes[0].total - 30;
  second.distance = g.lanes[1].total - 60;
  assert.ok(g.progress(first) > g.progress(second), `${map.id}: the enemy closer to the base counts as further along`);
  // Along its own first leg, whichever way it leaves the gate (lattice-v2 gates sit on any
  // edge), measured mid-leg because the sim rounds corners.
  const [nx, ny] = mapLanes(map)[1].path[1];
  const [dx, dy] = [Math.sign(nx - x), Math.sign(ny - y)];
  const along = Math.min(60, Math.hypot(nx - x, ny - y) / 2);
  second.distance = along;
  g.step(1 / 60);
  assert.ok((second.x - x) * dx + (second.y - y) * dy > along - 5 && Math.abs((second.x - x) * dy - (second.y - y) * dx) < 1, "second lane walks its own road");
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
  g.placement = 10000;
  g.place("odin", "platform", 0);
  const odin = g.heroes[0];
  g.startWave(); g.spawnQueue = []; g.enemies = [];
  g.lives = 1;
  g.spawnEnemy("runner"); g.spawnEnemy("grunt");
  const [leaker, victim] = g.enemies;
  leaker.distance = g.path.total - 0.01;
  victim.x = odin.x + 20; victim.y = odin.y; victim.distance = 5;
  victim.petrifiedUntil = 1e9; // hold it in Odin's range
  odin.attackClock = 0; odin.ultClock = odin.ultCooldown + 1;
  const score = g.score;
  g.step(1 / 60);
  assert.equal(g.complete, true, "run lost on the leak");
  assert.equal(g.score, score, "no score after the run ended");
  assert.equal(odin.ultClock > odin.ultCooldown, true, "no ultimate after the run ended");
}

// Road heroes' ultimates skip flyers (damage, slows, pushes, debuffs); platform ultimates still hit them.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 103 });
  g.placement = 100000;
  g.place("helios", "road", 0); g.place("heimdall", "road", 2); g.place("odin", "platform", 0);
  const [helios, heimdall, odin] = ["helios", "heimdall", "odin"].map((id) => g.heroes.find((h) => h.id === id));
  g.startWave(); g.spawnQueue = []; g.enemies = [];
  g.spawnEnemy("grunt"); g.spawnEnemy("flyer");
  const [grunt, flyer] = g.enemies;
  for (const e of g.enemies) { e.hp = e.maxHp = 1e9; e.x = helios.x + 20; e.y = helios.y; }
  g.castUltimate(helios, grunt);
  assert.ok(grunt.hp < 1e9, "warrior cleave hits the ground enemy");
  assert.equal(flyer.hp, 1e9, "warrior cleave skips the flyer");
  flyer.slow = 0; flyer.x = heimdall.x + 10; flyer.y = heimdall.y;
  g.castUltimate(heimdall, grunt);
  assert.equal(flyer.slow, 0, "tank taunt does not slow flyers");
  flyer.x = odin.x + 20; flyer.y = odin.y;
  g.castUltimate(odin, flyer);
  assert.ok(flyer.hp < 1e9, "platform ultimate still hits flyers");
}

// Every roster ultimate still survives the edge cases with its permanent Evolution upgrade.
{
  for (const id of heroes.map((h) => h.id)) {
    const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 105 });
    g.placement = 100000;
    const base = g.heroesById.get(id);
    g.place(id, base.slot, 0);
    g.startWave(); g.spawnQueue = []; g.enemies = [];
    const hero = g.heroes[0];
    hero.awakenedUlt = true;
    for (const k of ["grunt", "runner", "flyer", "archer", "brute", "grunt"]) g.spawnEnemy(k);
    for (const e of g.enemies) { e.x = hero.x + 20; e.y = hero.y; }
    hero.hpLeft = hero.hp * 0.5;
    assert.doesNotThrow(() => g.castUltimate(hero, g.enemies[0]), `${id} awakened ult`);
    for (const e of g.enemies) assert.ok(Number.isFinite(e.hp) && Number.isFinite(e.x), `${id} awakened state finite`);
    for (const h of g.heroes) assert.ok(h.hpLeft <= h.hp + 1e-9, `${id} awakened no overheal`);
  }
}

// Evolution V numbers for a few ultimates: more hits, bounces, targets, gold, revive health.
{
  const setup = (id, awakened, count = 6) => {
    const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 106 });
    g.placement = 100000;
    const base = g.heroesById.get(id);
    g.place(id, base.slot, 0);
    g.startWave(); g.spawnQueue = []; g.enemies = [];
    const hero = g.heroes[0];
    hero.awakenedUlt = awakened;
    hero.rotation = 0;
    for (let i = 0; i < count; i += 1) g.spawnEnemy("brute");
    g.enemies.forEach((e, i) => { e.hp = e.maxHp = 1e9; e.x = hero.x + 30 + i * 60; e.y = hero.y; e.distance = 500 - i; });
    return { g, hero };
  };
  const hitCount = (g) => g.enemies.filter((e) => e.hp < 1e9).length;
  let r = setup("odin", false); r.g.castUltimate(r.hero, r.g.enemies[0]); const zeusNormal = hitCount(r.g);
  r = setup("odin", true); r.g.castUltimate(r.hero, r.g.enemies[0]);
  assert.equal(hitCount(r.g), zeusNormal + 2, "awakened Odin bounces twice more");
  for (const [id, normal, awake] of [["stheno", 3, 5], ["aegir", 3, 5]]) {
    r = setup(id, false); for (const e of r.g.enemies) { e.x = r.hero.x + 25; e.y = r.hero.y; } r.g.castUltimate(r.hero, r.g.enemies[0]);
    assert.equal(hitCount(r.g), normal, `${id} normal targets`);
    r = setup(id, true); for (const e of r.g.enemies) { e.x = r.hero.x + 25; e.y = r.hero.y; } r.g.castUltimate(r.hero, r.g.enemies[0]);
    assert.equal(hitCount(r.g), awake, `${id} awakened targets`);
  }
  r = setup("plutus", true, 1);
  const gold = r.g.placement; r.g.castUltimate(r.hero, r.g.enemies[0]);
  assert.equal(r.g.placement, gold + 3, "awakened Plutus pays 3 placement");
  r = setup("vidar", true, 1);
  const vidar = r.hero; const e = r.g.enemies[0];
  const single = r.g.attackValue(vidar) * 2.5 * vidar.ultPower * 0.5;
  r.g.castUltimate(vidar, e);
  assert.ok(Math.abs((1e9 - e.hp) - single * 5 * (e.exposed > r.g.time ? 1.2 : 1)) < 1, "awakened Vidar hits 5 times");
}

// Thanatos, soul_drain: stuns a survivor for 2s; a kill refunds 60% of the charge.
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 102 });
  g.placement = 10000;
  assert.ok(g.place("thanatos", "road", 0), "thanatos is playable");
  const thanatos = g.heroes[0];
  assert.equal(thanatos.variant, "soul_drain");
  g.startWave(); g.spawnQueue = []; g.enemies = [];
  g.spawnEnemy("brute");
  const tough = g.enemies[0];
  tough.hp = tough.maxHp = 1e9; tough.x = thanatos.x + 20; tough.y = thanatos.y;
  g.castUltimate(thanatos, tough);
  assert.ok(tough.stunnedUntil > g.time + 1.9, "survivor stunned for 2s");
  const pos = tough.distance;
  for (let i = 0; i < 60; i += 1) g.step(1 / 60);
  assert.equal(tough.distance, pos, "stunned enemy does not move");
  g.spawnEnemy("grunt");
  const weak = g.enemies.at(-1);
  weak.hp = 1; weak.x = thanatos.x + 10; weak.y = thanatos.y; weak.distance = pos + 1;
  thanatos.attackClock = 99; // only the ultimate acts
  thanatos.ultClock = thanatos.ultCooldown + 1;
  g.step(1 / 60);
  assert.ok(weak.dead, "ultimate killed the weakest enemy");
  assert.ok(Math.abs(thanatos.ultClock - thanatos.ultCooldown * 0.6) < 0.05, "kill refunds 60% of the charge");
}

// --- M5 blocking switches (tuning.blocking; absent = old behavior) ---
{
  const setup = (blocking) => {
    const g = new TowerDefenseGame({ heroes, tuning: { ...tuning, blocking: blocking ?? undefined }, map: maps[0], waves, seed: 101 });
    g.placement = 10000;
    g.place("atlas", "road", 1);
    g.startWave(); g.spawnQueue = []; g.enemies = [];
    const atlas = g.heroes[0];
    for (let i = 0; i < 4; i += 1) g.spawnEnemy("grunt");
    for (const e of g.enemies) { e.x = atlas.x + 10; e.y = atlas.y; e.hp = e.maxHp = 1e9; }
    return g;
  };
  // A: block limit. Atlas (Tank) holds 2 here; the other two walk on.
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
  const atlas = g.heroes[0];
  const full = g.deployCost("atlas");
  g.damageHero(atlas, atlas.hpLeft + 1, null);
  assert.equal(g.deployCost("atlas"), Math.round(full * 0.5), "redeploy at half price");
  const gold = g.placement;
  assert.ok(g.place("atlas", "road", 1));
  assert.equal(gold - g.placement, Math.round(full * 0.5), "discounted price charged");
}

// --- P5 effect hierarchy: sim flags that the renderer tiers on ---
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 95 });
  g.placement = 10000;
  g.place("odin", "platform", 0);
  const odin = g.heroes[0];
  g.startWave(); g.spawnQueue = []; g.enemies = [];
  g.spawnEnemy("grunt");
  const grunt = g.enemies[0];
  g.hit(grunt, 1, odin, { crit: true });
  assert.equal(g.effects.find((e) => e.type === "hit")?.crit, true, "crit flag on hit effect");
  assert.deepEqual(
    (({ enemyId, amount, crit }) => ({ enemyId, amount, crit }))(g.effects.find((e) => e.type === "damageNumber")),
    { enemyId: grunt.entityId, amount: 1, crit: true },
    "damage number identifies the enemy and actual health damage",
  );
  g.effects = [];
  grunt.shield = grunt.shieldMax = 10;
  g.hit(grunt, 4, odin);
  assert.deepEqual(
    (({ amount, shielded }) => ({ amount, shielded }))(g.effects.find((e) => e.type === "damageNumber")),
    { amount: 4, shielded: true },
    "shield damage also produces a damage number",
  );
  g.spawnEnemy("boss");
  const boss = g.enemies.find((e) => e.kind === "boss");
  g.hit(boss, boss.hp + 1, odin);
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
    g.placement = 10000;
    g.place("odin", "platform", 0);
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
  const scale = g.difficulty.enemyHp * g.tierHp; // wave 1, with the map's enemy health
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
  const odin = g.heroes[0];
  const hpBefore = boss.hp;
  g.hit(boss, 1e9, odin);
  assert.equal(boss.hp, hpBefore, "direct hits do nothing");
  assert.ok(!g.canHit(odin, boss), "heroes skip her when choosing targets");
  // Damage to a child is shared with Lilith, capped at the child's remaining hp.
  const child = children()[0];
  g.hit(child, 100, odin);
  assert.equal(boss.hp, hpBefore - 100, "child damage reaches lilith");
  const left = child.hp;
  g.hit(child, 1e9, odin);
  assert.equal(boss.hp, hpBefore - 100 - left, "overkill on a child is not shared");
  // When all children fall, she summons them again at resummonScale.
  for (const c of children()) g.hit(c, 1e9, odin);
  g.step(1 / 60);
  const second = children();
  assert.equal(second.length, cfg.summon.count, "children return when all have fallen");
  assert.ok(Math.abs(second[0].maxHp - tuning.enemies.brood.hp * scale * cfg.summon.resummonScale) < 1e-6, "re-summoned children are weaker");
  assert.ok(Math.abs(second[0].attack - tuning.enemies.brood.attack * cfg.summon.resummonScale) < 1e-6);
  // Killing her through her children ends her (kill credited, bossDown emitted).
  boss.hp = 1;
  g.hit(second[0], 50, odin);
  assert.ok(boss.dead, "lilith dies from shared damage");
  assert.ok(g.effects.some((e) => e.type === "bossDown"));
  g.step(1 / 60);
  assert.ok(!g.enemies.some((e) => e.entityId === boss.entityId), "dead lilith leaves the field");
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
  g.spawnQueue = g.spawnQueue.filter((e) => e.kind === "boss");
  g.step(1 / 60);
  const boss = g.enemies.find((e) => e.kind === "boss");
  assert.equal(boss.statScale, tuning.waveGen.midBossScale, "wave 5 boss scaled");
  const child = g.enemies.find((e) => e.parentId === boss.entityId);
  assert.equal(child.statScale, tuning.waveGen.midBossScale, "children share the boss scale");

  // The boss comes last: it waits until every other enemy of its wave is gone.
  {
    const last = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 4 });
    last.wave = waves.findIndex((w) => w.spawns.some((sp) => sp.kind === "boss") && w.spawns.length > 1);
    last.startWave();
    assert.equal(last.spawnQueue.at(-1).kind, "boss", "boss queued last");
    for (let i = 0; i < 60 * 120 && last.spawnQueue.length > 1; i += 1) last.step(1 / 60);
    assert.equal(last.spawnQueue.length, 1, "minions all spawned");
    last.step(1 / 60);
    assert.ok(!last.enemies.some((e) => e.kind === "boss") && last.spawnQueue.length === 1, "boss waits while minions stand");
    for (const e of last.enemies) e.dead = true;
    last.step(1 / 60); last.step(1 / 60);
    assert.ok(last.enemies.some((e) => e.kind === "boss"), "boss spawns once the field is clear");
  }

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
    g.placement = 1e6;
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
  const closestPathDistance = (g, hero) => {
    const lane = g.lanes[0];
    let best = { distance: 0, gap: Infinity };
    for (let distance = 0; distance <= lane.total; distance += 1) {
      const point = pointOnPath(lane.path, distance);
      const gap = Math.hypot(hero.x - point.x, hero.y - point.y);
      if (gap < best.gap) best = { distance, gap };
    }
    return best.distance;
  };
  const moveOnPath = (g, enemy, distance) => {
    enemy.distance = distance;
    Object.assign(enemy, pointOnPath(g.laneOf(enemy).path, distance, enemy.sway));
    return enemy;
  };
  const hurt = (e) => e.hp < e.maxHp;
  const kit = tuning.classes;

  // Enemy resistances: armored kinds carry their own magic resistance (magic beats armor).
  {
    const { g } = setup("odin");
    const brute = g.spawnEnemy("brute");
    assert.equal(brute.magicRes, tuning.enemies.brute.magicRes, "brute magic resistance from tuning");
    assert.ok(brute.magicRes < brute.armor, "brutes are armored, not warded");
  }

  // Mage splash: enemies next to the target take a share, farther ones none.
  {
    const { g, units: [mage] } = setup("hephaestus");
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

  // Odin (basic "chain"): bounces enemy to enemy instead of splashing.
  {
    const { g, units: [odin] } = setup("odin");
    assert.equal(odin.basic, "chain");
    const t = enemyAt(g, "grunt", odin.x + 60, odin.y);
    const a = enemyAt(g, "grunt", t.x + 80, t.y);
    const b = enemyAt(g, "grunt", a.x + 80, a.y);
    const c = enemyAt(g, "grunt", b.x + 80, b.y);
    g.basicAttack(odin, t);
    assert.ok(hurt(t) && hurt(a) && hurt(b), "chain reaches two bounces");
    assert.ok(!hurt(c), `chain stops after ${kit.Mage.chain.falloff.length} bounces`);
  }

  // Warrior cleave: up to `targets` enemies next to the target.
  {
    const { g, units: [warrior] } = setup("helios");
    const t = enemyAt(g, "grunt", warrior.x + 30, warrior.y);
    const others = Array.from({ length: kit.Warrior.cleave.targets + 2 }, (_, i) => enemyAt(g, "grunt", t.x + Math.cos(i) * 20, t.y + Math.sin(i) * 20));
    g.basicAttack(warrior, t);
    assert.equal(others.filter(hurt).length, kit.Warrior.cleave.targets, "cleave hits exactly its target count");
    assert.ok(g.effects.some((e) => e.type === "cleave"), "cleave effect");
  }

  // Archer: pierces armor, bonus against flyers, snipes the toughest enemy in range.
  {
    const { g, units: [archer] } = setup("atalanta");
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

  // Assassin attacks approaching enemies only in melee, then dashes after a loose enemy
  // that has already slipped past its tile.
  {
    const { g, units: [nott] } = setup("nott");
    const crossing = closestPathDistance(g, nott);
    const loose = moveOnPath(g, enemyAt(g, "runner", 0, 0), crossing - 70);
    assert.equal(g.findTarget(nott), null, "an approaching enemy outside melee range is not attacked");
    moveOnPath(g, loose, crossing + 70);
    assert.equal(g.findTarget(nott), loose, "dash catches a loose enemy after it passes");
    loose.held = true;
    assert.equal(g.findTarget(nott), null, "a held enemy beyond range is left alone");
    loose.held = false;
    g.basicAttack(nott, loose);
    assert.ok(g.effects.some((e) => e.type === "dash"), "dash trail effect");
    close(loose.maxHp - loose.hp, resolveDamage(g.attackValue(nott) * (1 + kit.Assassin.looseBonus), loose.armor, nott.damageType), "runners take the full loose bonus");
  }

  // Target priority (M1): each mode picks its enemy, "auto" keeps the class rule.
  {
    const { g, units: [odin, nott] } = setup("odin", "nott");
    const near = (e, x, y, dist, hp) => { const u = enemyAt(g, e, x, y, hp); u.distance = dist; return u; };
    const front = near("grunt", odin.x + 20, odin.y, 300, 500);
    const back = near("grunt", odin.x - 20, odin.y, 100, 400);
    const tank = near("brute", odin.x, odin.y + 20, 200, 3000);
    const runner = near("runner", odin.x, odin.y - 20, 150, 50);
    const flyer = near("flyer", odin.x + 10, odin.y + 10, 50, 60);
    assert.equal(odin.targeting, "auto", "placed heroes start on the class rule");
    assert.equal(g.findTarget(odin), flyer, "auto: a platform Mage shoots a flyer in reach first (only platform heroes can), then the class rule");
    const expect = { first: front, last: flyer, strongest: tank, weakest: runner, fastest: runner, flying: flyer, ground: front };
    for (const [mode, target] of Object.entries(expect)) {
      assert.equal(g.setTargeting(odin.entityId, mode), true, `${mode} accepted`);
      assert.equal(g.findTarget(odin), target, `${mode} picks its enemy`);
    }
    g.setTargeting(odin.entityId, "boss");
    assert.equal(g.findTarget(odin), front, "boss falls back to the class rule without a boss");
    const boss = near("boss", odin.x, odin.y, 10, 5000);
    assert.equal(g.findTarget(odin), boss, "boss first");
    boss.untargetable = true;
    assert.equal(g.findTarget(odin), front, "an untargetable boss is skipped");
    assert.equal(g.setTargeting(odin.entityId, "nonsense"), false, "unknown mode rejected");
    assert.equal(g.setTargeting(nott.entityId, "flying"), false, "road heroes cannot pick flyers");
    // Explicit modes keep the Assassin dash reach for loose enemies that have passed.
    g.enemies = [];
    const crossing = closestPathDistance(g, nott);
    const loose = moveOnPath(g, enemyAt(g, "runner", 0, 0, 80), crossing + 70);
    g.setTargeting(nott.entityId, "strongest");
    assert.equal(g.findTarget(nott), loose, "strongest still dashes to loose enemies");
    loose.held = true;
    assert.equal(g.findTarget(nott), null, "held enemies beyond range stay out of reach");
  }

  // M11 enemies. Mender: heals nearby enemies, not other Menders, within its budget.
  {
    const { g } = setup("odin");
    const cfg = tuning.enemies.mender.heal;
    const mender = enemyAt(g, "mender", 100, 100, 50);
    const other = enemyAt(g, "mender", 110, 100, 50);
    const brute = enemyAt(g, "brute", 120, 100, 1000);
    brute.hp = 100;
    const far = enemyAt(g, "grunt", 100 + cfg.radius + 50, 100, 1000);
    far.hp = 100;
    g.enemyTraits(mender, cfg.every);
    close(brute.hp, 100 + 1000 * cfg.share, "mender heals by share of max health");
    assert.equal(other.hp, 50, "menders do not heal each other");
    assert.equal(far.hp, 100, "out of radius is not healed");
    for (let i = 0; i < 20; i += 1) g.enemyTraits(mender, cfg.every);
    close(brute.healed, 1000 * cfg.budget, "heals stop at the budget");
  }

  // Shieldbearer: shield first, minimum chip per hit, regrows after a quiet spell.
  {
    const { g, units: [odin] } = setup("odin");
    const cfg = tuning.enemies.shieldbearer.shield;
    const sb = g.spawnEnemy("shieldbearer");
    close(sb.shieldMax, sb.maxHp * cfg.hp, "shield scales with health");
    const hp = sb.hp;
    g.hit(sb, 1, odin);
    close(sb.shield, sb.shieldMax * (1 - cfg.minChip), "a small hit still strips minChip");
    assert.equal(sb.hp, hp, "health untouched while the shield holds");
    g.hit(sb, sb.shield + 30, odin);
    assert.equal(sb.shield, 0, "shield broken");
    close(sb.hp, hp - 30, "overflow reaches health");
    g.time += cfg.regenDelay + 1;
    g.enemyTraits(sb, 1);
    close(sb.shield, sb.shieldMax * cfg.regenRate, "shield regrows after the delay");
  }

  // Broodcaller: imps per call, alive cap, lifetime total.
  {
    const { g } = setup("odin");
    const cfg = tuning.enemies.broodcaller.summon;
    const caller = g.spawnEnemy("broodcaller");
    const imps = () => g.enemies.filter((e) => e.summonerId === caller.entityId && !e.dead);
    g.enemyTraits(caller, cfg.every);
    assert.equal(imps().length, cfg.count, "one call");
    for (let i = 0; i < 5; i += 1) g.enemyTraits(caller, cfg.every);
    assert.equal(imps().length, cfg.max, "alive cap");
    for (let i = 0; i < 10; i += 1) { for (const imp of imps()) imp.dead = true; g.enemyTraits(caller, cfg.every); }
    assert.equal(caller.summoned, cfg.total, "lifetime total");
    assert.ok(!imps()[0]?.parentId, "imps do not share damage with the caller");
  }

  // Hexer: the nearest hero in range cannot act; veiled heroes are skipped.
  {
    const { g, units: [odin, nott] } = setup("odin", "nott");
    const cfg = tuning.enemies.hexer.hex;
    const hexer = enemyAt(g, "hexer", odin.x + 20, odin.y, 1e6);
    hexer.distance = 5;
    g.enemyTraits(hexer, cfg.every);
    assert.ok(g.isHexed(odin), "nearest hero hexed");
    assert.ok(!g.isHexed(nott), "one hero per hex");
    const grunt = enemyAt(g, "grunt", odin.x + 30, odin.y, 1e6);
    odin.attackClock = 0;
    const before = grunt.hp;
    g.step(1 / 60);
    assert.equal(grunt.hp, before, "a hexed hero does not attack");
    g.time = odin.hexedUntil + 0.01;
    nott.veilUntil = g.time + 10;
    hexer.x = nott.x; hexer.y = nott.y;
    g.enemyTraits(hexer, cfg.every);
    assert.ok(!g.isHexed(nott), "veiled heroes cannot be hexed");
  }

  const hp = (enemy) => enemy.maxHp - enemy.hp;

  // M13 statuses and reactions.
  {
    const S = tuning.statuses;
    const R = S.reactions;
    const { g, units: [pos, phx, odin] } = setup("aegir", "hephaestus", "odin");
    const e = enemyAt(g, "grunt", 0, 0);
    // Wet from Aegir, then Burn from Hephaestus: Steam bursts and clears both.
    g.applyHeroStatus(pos, e, 100);
    assert.ok(g.isWet(e), "Aegir applies Wet");
    const before = hp(e);
    g.applyHeroStatus(phx, e, 100);
    close(hp(e) - before, 100 * S.burn.share * R.steam.burst, "Steam burst");
    assert.ok(!g.isWet(e) && !g.isBurning(e), "Steam consumes Wet and Burn");
    assert.ok(g.reactionsSeen.has("steam") && g.lastReaction.name === "steam", "first Steam is recorded");
    // Plain Burn ticks over its duration.
    const b = enemyAt(g, "grunt", 500, 500);
    g.applyHeroStatus(phx, b, 100);
    assert.ok(g.isBurning(b), "Hephaestus applies Burn");
    close(b.burnDps, 100 * S.burn.share / S.burn.seconds, "burn damage per second");
    // Conduct: Odin's chain on a Wet target bounces further and hits Wet enemies harder.
    g.enemies = [];
    const line = Array.from({ length: 8 }, (_, i) => enemyAt(g, "grunt", odin.x + 30 + i * 25, odin.y));
    g.basicAttack(odin, line[0]);
    const dry = line.filter((x) => hp(x) > 0).length;
    line.forEach((x) => { x.hp = x.maxHp; x.wetUntil = g.time + 5; });
    g.basicAttack(odin, line[0]);
    assert.ok(line.filter((x) => hp(x) > 0).length > dry, "Conduct adds bounces");
    assert.ok(g.reactionsSeen.has("conduct"));
  }
  {
    const S = tuning.statuses;
    const R = S.reactions;
    const { g, units: [med, phx] } = setup("stheno", "hephaestus");
    // Blight: burning a poisoned enemy spreads a stronger poison.
    const a = enemyAt(g, "grunt", 100, 100);
    const n = enemyAt(g, "grunt", 100 + R.blight.radius - 10, 100);
    const far = enemyAt(g, "grunt", 100 + R.blight.radius + 40, 100);
    g.applyHeroStatus(med, a, 100);
    assert.ok(g.isPoisoned(a), "Stheno applies Poison");
    g.applyHeroStatus(phx, a, 100);
    assert.ok(g.isPoisoned(n) && !g.isPoisoned(far), "Blight spreads within its radius");
    close(n.poisonDps, a.poisonDps * R.blight.boost, "spread poison is stronger");
    // Freeze: a Wet enemy that gets chilled is stunned, then has a cooldown.
    const { g: g2, units: [pos] } = setup("aegir");
    const f = enemyAt(g2, "grunt", 0, 0);
    g2.applyHeroStatus(pos, f, 100);
    f.chill = 1;
    g2.tryFreeze(f, pos);
    assert.ok(g2.isStopped(f), "Freeze stuns");
    f.wetUntil = g2.time + 5;
    f.stunnedUntil = 0;
    g2.tryFreeze(f, pos);
    assert.ok(!g2.isStopped(f), "Freeze cooldown");
    // Soul Harvest: a poisoned enemy that dies charges Thanatos.
    const { g: g3, units: [thanatos, jor] } = setup("thanatos", "fenrir");
    const h = enemyAt(g3, "grunt", 0, 0, 10);
    g3.applyHeroStatus(jor, h, 100);
    const clock = thanatos.ultClock;
    g3.hit(h, 1e6, jor);
    close(thanatos.ultClock - clock, R.harvest.charge, "Soul Harvest charge");
    // Reactions off: statuses stay, no reactions.
    const g4 = new TowerDefenseGame({ heroes, tuning: { ...tuning, statuses: { ...S, reactions: {} } }, map: maps[0], waves, seed: 1 });
    g4.placement = 1e6; g4.place("aegir", "road", 0); g4.place("hephaestus", "platform", 0);
    const [p4, x4] = g4.heroes;
    const e4 = g4.spawnEnemy("grunt");
    g4.applyHeroStatus(p4, e4, 100); g4.applyHeroStatus(x4, e4, 100);
    assert.ok(g4.isWet(e4) && g4.isBurning(e4) && !g4.reactionsSeen.size, "no reactions when disabled");
  }

  // M14 run statistics: damage, boss damage, damage over time, heals, aura credit, kills, leaks.
  {
    const { g, units: [odin, plutus, phx] } = setup("odin", "plutus", "hephaestus");
    const e = enemyAt(g, "grunt", odin.x + 20, odin.y, 100);
    g.hit(e, 30, odin);
    assert.equal(g.heroStats.odin.damage, 30, "damage recorded");
    const aura = g.supportAuraFor(odin);
    if (aura) close(g.heroStats[aura.source.id].buff, 30 * aura.bonus / (1 + aura.bonus), "aura share credited");
    g.hit(e, 1000, odin);
    assert.equal(g.heroStats.odin.damage, 100, "overkill not counted");
    assert.equal(g.heroStats.odin.kills, 1, "kill recorded");
    const boss = g.spawnEnemy("boss");
    g.hit(boss, 50, phx);
    assert.equal(g.heroStats.hephaestus.boss, 50, "boss damage");
    g.hit(boss, 20, phx, { dot: true, showShot: false });
    assert.equal(g.heroStats.hephaestus.dot, 20, "damage over time");
    odin.hpLeft = odin.hp - 40;
    assert.equal(g.healHero(odin, 100, plutus), 40, "heal capped at max health");
    assert.ok(g.heroStats.plutus.heal >= 40, "heal credited");
    const leaker = g.spawnEnemy("flyer");
    leaker.distance = g.laneOf(leaker).total - 0.1;
    g.step(1 / 60);
    assert.equal(g.waveStats.leakKinds.flyer, 1, "leak kind per wave");
    assert.equal(g.leakKinds.flyer, 1, "leak kind per run");
  }

  // Difficulty tiers (M3): enemy health and attack scale; endless stays Normal.
  {
    const t = tuning.tiers.heroic;
    const normal = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 3 });
    const heroic = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 3, tier: "heroic" });
    const endless = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 3, tier: "heroic", mode: "endless" });
    const a = normal.spawnEnemy("grunt"), b = heroic.spawnEnemy("grunt"), c = endless.spawnEnemy("grunt");
    close(b.maxHp, a.maxHp * t.enemyHp, "Heroic health");
    close(b.attack, a.attack * t.enemyAttack, "Heroic attack");
    assert.equal(endless.tier, "normal", "endless ignores the tier");
    close(c.maxHp, a.maxHp, "endless health unchanged");
  }

  // M15 endless mutators: offered every `every` waves in endless only, stack, change enemies.
  {
    const M = tuning.mutators;
    const endless = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 8, mode: "endless" });
    endless.wave = M.every;
    endless.offerMutators();
    assert.equal(endless.mutatorOffer.length, M.offer, "offer size");
    const classic = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 8 });
    classic.wave = M.every;
    classic.offerMutators();
    assert.equal(classic.mutatorOffer, null, "no mutators outside endless");
    endless.wave = M.every + 1;
    endless.mutatorOffer = null;
    endless.offerMutators();
    assert.equal(endless.mutatorOffer, null, "only every Nth wave");
    endless.wave = M.every;
    endless.mutatorOffer = ["fortified", "haste", "elites"];
    const plain = endless.spawnEnemy("grunt");
    assert.equal(endless.chooseMutator("frenzy"), false, "only offered mutators");
    assert.ok(endless.chooseMutator("fortified"));
    assert.equal(endless.mutatorOffer, null);
    const tough = endless.spawnEnemy("grunt");
    close(tough.maxHp, plain.maxHp * (1 + M.pool.fortified.hp), "Fortified health");
    endless.mutators.push("haste", "ironclad", "elites");
    const mods = endless.mutatorMods();
    close(mods.favor, M.pool.fortified.favor + M.pool.haste.favor + M.pool.ironclad.favor + M.pool.elites.favor, "Favor shares add up");
    const spawned = Array.from({ length: M.pool.elites.elite * 2 }, () => endless.spawnEnemy("grunt"));
    const elites = spawned.filter((e) => e.elite);
    assert.equal(elites.length, 2, "every Nth enemy is an Elite");
    assert.ok(elites[0].shield > 0 && elites[0].reward === tuning.enemies.grunt.reward * M.elite.reward, "Elite shield and gold");
    close(spawned[0].speed, plain.speed * (1 + M.pool.haste.speed), "Haste speed");
    assert.equal(spawned[0].armor, plain.armor + M.pool.ironclad.armor, "Ironclad armor");
    assert.ok(!endless.spawnEnemy("boss").elite, "bosses are never Elites");
    endless.mutatorOffer = ["frenzy"];
    assert.ok(endless.skipMutators() && endless.mutatorOffer === null, "skip");
  }

  // M16 special rings: range, ultimate charge, damage and attack speed per ring.
  {
    const R = tuning.rings;
    const map = { ...maps[0], rings: { "platform:0": "highground", "platform:1": "cursed", "platform:2": "shrine" } };
    const g = new TowerDefenseGame({ heroes, tuning, map, waves, seed: 4 });
    const plain = new TowerDefenseGame({ heroes, tuning, map: { ...maps[0], rings: {} }, waves, seed: 4 });
    g.placement = plain.placement = 1e6;
    for (const [i, id] of ["odin", "hephaestus", "boreas"].entries()) { g.place(id, "platform", i); plain.place(id, "platform", i); }
    const [hg, cu, sh] = g.heroes, [p0, p1, p2] = plain.heroes;
    close(hg.range, p0.range * (1 + R.highground.range), "High ground range");
    close(g.attackValue(cu) / plain.attackValue(p1), 1 + R.cursed.atk, "Cursed damage");
    close(g.ultChargeRate(sh) / plain.ultChargeRate(p2), 1 + R.shrine.ultCharge, "Shrine charge");
    assert.equal(g.ringKind("platform", 1), "cursed");
    assert.equal(g.ringKind("road", 0), null, "plain ring");
    for (const m of maps) if (!m.grid?.board) assert.ok(Object.keys(m.rings ?? {}).length >= 1, `${m.id} has a special ring`);
    for (const m of maps) for (const [key, kind] of Object.entries(m.rings ?? {})) {
      const [type, index] = key.split(":");
      assert.ok((type === "road" ? m.roadSlots : m.platformSlots)[Number(index)], `${m.id} ${key} exists`);
      assert.ok(R[kind], `${m.id} ${key} kind ${kind} known`);
    }
  }

  // M17 rare and epic run blessings: offers, eligibility, effects.
  {
    const B = tuning.runBoons.list;
    const { g, units: [pos, odin] } = setup("aegir", "odin");
    assert.ok(g.boonEligible("tidal_pull"), "Wet source on the field");
    assert.ok(g.boonEligible("storm_surge"), "Odin chains");
    assert.ok(!g.boonEligible("venom_rot"), "no poison source");
    assert.ok(!g.boonEligible("shattering_cold"), "no chill source, no freeze");
    let rare = 0;
    for (let i = 0; i < 40; i += 1) { g.offerVirtues(); rare += g.virtueOffer.filter((n) => n.startsWith("boon:")).length; }
    assert.ok(rare > 0, "rare or epic cards show up");
    for (let i = 0; i < 40; i += 1) { g.offerVirtues(); for (const n of g.virtueOffer) if (n.startsWith("boon:")) assert.ok(g.boonEligible(n.slice(5)), `${n} eligible`); }
    g.virtueOffer = ["boon:tidal_pull"];
    assert.ok(g.chooseVirtue("boon:tidal_pull") && g.boons.includes("tidal_pull"), "boon chosen");
    assert.equal(g.virtues.length, 0, "boons are not stat blessings");
    // Tidal Pull slows Wet enemies.
    const wet = enemyAt(g, "grunt", 0, 0); wet.distance = 10; wet.wetUntil = g.time + 5;
    const dry = enemyAt(g, "grunt", 0, 0); dry.distance = 10;
    g.heroes = [];
    g.step(1);
    close((wet.distance - 10) / (dry.distance - 10), B.tidal_pull.slow, "Tidal Pull");
  }
  {
    const B = tuning.runBoons.list;
    const { g, units: [odin] } = setup("odin");
    g.boons = ["venom_rot", "shattering_cold", "drowned_burst", "soul_reaper", "wildfire_spread", "rally", "storm_surge"];
    const p = enemyAt(g, "grunt", 0, 0); p.poisonUntil = g.time + 5; p.poisonDps = 0;
    g.hit(p, 100, odin, { showShot: false });
    close(hp(p), 100 * (1 + B.venom_rot.bonus), "Venom Rot");
    const f = enemyAt(g, "grunt", 0, 0); f.frozenUntil = g.time + 1;
    g.hit(f, 100, odin, { showShot: false });
    close(hp(f), 100 * (1 + B.shattering_cold.bonus), "Shattering Cold");
    // Drowned Burst: a Wet enemy's death hurts its neighbours.
    const w = enemyAt(g, "grunt", 300, 300, 50); w.wetUntil = g.time + 5;
    const n = enemyAt(g, "grunt", 310, 300);
    g.hit(w, 1000, odin);
    close(hp(n), 50 * B.drowned_burst.share, "Drowned Burst");
    // Wildfire Spread: a burning enemy's fire passes on.
    const b = enemyAt(g, "grunt", 500, 300, 10); b.burnUntil = g.time + 3; b.burnDps = 7; b.burnBy = odin;
    const b2 = enemyAt(g, "grunt", 520, 300);
    g.hit(b, 1000, odin);
    assert.ok(g.isBurning(b2) && b2.burnDps === 7, "Wildfire Spread");
    // Soul Reaper: every Nth kill pays gold and charges ultimates.
    g.reaperKills = B.soul_reaper.every - 1;
    const gold = g.placement, clock = odin.ultClock;
    g.hit(enemyAt(g, "grunt", 700, 100, 1), 10, odin);
    assert.ok(g.placement >= gold + B.soul_reaper.placement && odin.ultClock - clock >= B.soul_reaper.charge, "Soul Reaper");
    // Storm Surge: bounces stun.
    g.enemies = [];
    const line = Array.from({ length: 3 }, (_, i) => enemyAt(g, "grunt", odin.x + 30 + i * 25, odin.y));
    g.basicAttack(odin, line[0]);
    assert.ok(g.isStopped(line[1]), "Storm Surge stuns a bounce target");
  }
  {
    const B = tuning.runBoons.list;
    const { g, units: [atlas, odin] } = setup("atlas", "odin");
    g.boons = ["rally"];
    g.damageHero(atlas, 1e9, null);
    assert.ok(g.rallyUntil > g.time, "a fallen road hero starts the rally");
    const rallied = g.attackValue(odin);
    g.rallyUntil = 0;
    close(rallied / g.attackValue(odin), 1 + B.rally.atk, "Rally attack bonus");
  }

  // M18 boss rules: Baphomet's mark and stance, Lilith's End of All.
  {
    const cfg = tuning.bosses.baphomet;
    const { g, units: [odin, phx] } = setup("odin", "hephaestus");
    const boss = g.spawnEnemy("boss");
    boss.x = 0; boss.y = 0;
    g.hit(enemyAt(g, "brute", 900, 500), 500, odin, { showShot: false });
    g.hit(enemyAt(g, "brute", 900, 500), 100, phx, { showShot: false });
    boss.markClock = 0;
    g.bossRules(boss, 0.01);
    assert.equal(boss.markTarget, odin.entityId, "marks the top recent damage dealer");
    assert.ok(!g.isSilenced(odin), "warning first");
    const hpBefore = odin.hpLeft;
    g.time = boss.markAt + 0.01;
    g.bossRules(boss, 0.01);
    assert.ok(g.isSilenced(odin), "silenced after the warning");
    close(hpBefore - odin.hpLeft, odin.hp * cfg.mark.selfDamage, "self-damage share");
    const e = enemyAt(g, "grunt", 800, 100);
    odin.attackClock = 0;
    const b0 = e.hp;
    g.heroes = [odin];
    g.step(1 / 60);
    assert.equal(e.hp, b0, "a silenced hero does not attack");
    // Stance halves (and more) incoming damage.
    boss.stanceClock = 0;
    g.bossRules(boss, 0.01);
    const before = boss.hp;
    g.hit(boss, 100, odin, { showShot: false });
    close(before - boss.hp, 100 * (1 - cfg.stance.reduction) * (1 + (g.favor.bossDamage || 0)) * (boss.held ? 1 + tuning.blocking.heldDamageBonus : 1), "Defensive Stance");
  }
  {
    const cfg = tuning.bosses.lilith;
    const map = maps.find((m) => m.boss === "lilith");
    const g = new TowerDefenseGame({ heroes, tuning, map, waves, seed: 2 });
    g.startWave(); g.spawnQueue = []; g.enemies = [];
    const lilith = g.spawnEnemy("boss");
    const child = g.enemies.find((e) => e.parentId === lilith.entityId);
    assert.equal(g.childFrenzy(child), 1, "children normal at first");
    lilith.hp = lilith.maxHp * (cfg.endOfAll.below - 0.01);
    g.bossRules(lilith, 0.01);
    assert.ok(lilith.endOfAll, "End of All below the threshold");
    assert.equal(g.childFrenzy(child), cfg.endOfAll.attackSpeed, "children attack faster");
  }
  // Ochenta: the Eighty Count, Spanish Resolve, The Final Eight.
  {
    const cfg = tuning.bosses.ochenta;
    const map = { ...maps[0], boss: "ochenta" };
    const g = new TowerDefenseGame({ heroes, tuning, map, waves, seed: 3 });
    g.startWave(); g.spawnQueue = []; g.enemies = [];
    const boss = g.spawnEnemy("boss");
    assert.equal(boss.speed, cfg.stats.speed * g.difficulty.enemySpeed, "own stats");
    const hero = { entityId: 999, x: boss.x + cfg.valor.radius - 1, y: boss.y, hp: 100, hpLeft: 100 };
    const far = { entityId: 998, x: boss.x + cfg.valor.radius + 50, y: boss.y, hp: 100, hpLeft: 100 };
    g.heroes = [hero, far];
    const src = { entityId: 997, damageType: "physical" };
    for (let i = 0; i < cfg.valor.max - 1; i += 1) g.hit(boss, 0.01, src, { showShot: false, showHit: false });
    g.hit(boss, 1, src, { showShot: false, showHit: false, dot: true });
    assert.equal(boss.valor, cfg.valor.max - 1, "damage over time grants no Valor");
    g.hit(boss, 0.01, src, { showShot: false, showHit: false });
    assert.equal(boss.valor, 0, "Valor resets at the Eighty Count");
    assert.ok(g.isHexed(hero) && !g.isHexed(far), "shockwave stuns heroes in range only");
    close(g.bossBoost(boss).speed, cfg.valor.speed, "rush speed");
    boss.stunnedUntil = g.time + 1;
    g.resistCc(boss, 0.1);
    close(boss.stunnedUntil - g.time, 1 - 0.1 * cfg.valor.ccResist / (1 - cfg.valor.ccResist), "crowd control runs out faster");
    g.time = boss.rallyUntil + 0.01;
    assert.equal(g.bossBoost(boss).speed, 0, "rush ends");
    // Spanish Resolve: one hit across two thresholds grants two steps.
    g.hit(boss, boss.maxHp * 0.45, src, { showShot: false, showHit: false });
    assert.equal(boss.resolveSteps, 2, "80% and 60% passed");
    close(g.bossBoost(boss).attack, 2 * cfg.resolve.attack, "Resolve attack");
    const before = boss.hp;
    g.hit(boss, 100, src, { showShot: false, showHit: false });
    close(before - boss.hp, 100 * (1 - 2 * cfg.resolve.reduction) * (1 + (g.favor.bossDamage || 0)), "Resolve damage reduction");
    // The Final Eight: a lethal hit leaves 1 HP for the window, then he can fall.
    g.hit(boss, boss.maxHp * 10, src, { showShot: false, showHit: false });
    assert.ok(!boss.dead && boss.hp === 1, "cannot fall below 1 HP");
    assert.equal(boss.resolveSteps, cfg.resolve.at.length, "all Resolve steps");
    close(g.bossBoost(boss).attackSpeed, cfg.resolve.at.length * cfg.resolve.attackSpeed + cfg.finalEight.attackSpeed, "Final Eight boost");
    g.time = boss.finalEightUntil + 0.01;
    g.hit(boss, 10, src, { showShot: false, showHit: false });
    assert.ok(boss.dead, "falls after the window");
  }

  // A revived hero keeps its target priority.
  {
    const { g, units: [atlas] } = setup("atlas");
    g.setTargeting(atlas.entityId, "weakest");
    g.damageHero(atlas, 1e9, null);
    assert.equal(g.fallenHeroes.at(-1)?.targeting, "weakest", "fallen record keeps the priority");
  }

  // Tank ultimate holds every ground enemy in taunt range; flyers are not held.
  {
    const { g, units: [tank] } = setup("heimdall");
    const grunt = enemyAt(g, "grunt", tank.x + tank.range, tank.y);
    const flyer = enemyAt(g, "flyer", tank.x + 20, tank.y);
    g.castUltimate(tank, grunt);
    assert.ok(grunt.stunnedUntil >= g.time + kit.Tank.hold - 1e-9, "Tank ultimate holds ground enemies");
    assert.ok(!(flyer.stunnedUntil > g.time), "flyers are not held");
    assert.ok(g.effects.some((e) => e.type === "hold"), "hold effect");
  }

  // Assassin veil: after its ultimate the blocked enemy stays blocked but deals no damage.
  {
    const { g, units: [nott] } = setup("nott");
    const grunt = enemyAt(g, "grunt", nott.x - 20, nott.y);
    grunt.distance = 50;
    g.castUltimate(nott, grunt);
    assert.equal(g.isVeiled(nott), true, "veiled after the ultimate");
    const hp = nott.hpLeft, distance = grunt.distance;
    for (let i = 0; i < 60; i += 1) g.step(1 / 60);
    assert.equal(nott.hpLeft, hp, "veiled Assassin takes no damage");
    assert.equal(grunt.distance, distance, "the blocked enemy stays blocked");
    for (let i = 0; i < 60 * kit.Assassin.veil.seconds; i += 1) g.step(1 / 60);
    assert.equal(g.isVeiled(nott), false, "veil ends");
  }

  // Support: heals the most injured ally in range; otherwise a weak attack.
  {
    const { g, units: [support, tank] } = setup("plutus", "atlas");
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
  g.placement = 1000;
  g.place("atlas", "road", 0);
  const atlas = g.heroes[0];
  const deploy = heroes.find((h) => h.id === "atlas").cost;
  assert.equal(atlas.invested, deploy, "invested tracks deployment gold");
  assert.equal(g.sellValue(atlas.entityId), Math.floor(deploy * tuning.run.sellRefund), "refund is the sell share");
  const gold = g.placement;
  g.startWave(); // selling works mid-wave too
  const result = g.sell(atlas.entityId);
  assert.equal(result.ok, true);
  assert.equal(g.placement, gold + result.refund, "refund paid");
  assert.equal(g.heroes.length, 0, "unit leaves the field");
  assert.equal(g.fallenHeroes.length, 0, "a sold hero did not fall (no revive, no redeploy discount)");
  assert.equal(g.deployCost("atlas"), deploy, "redeploy at full price");
  assert.equal(g.place("atlas", "road", 0), true, "ring and hero free again");
  assert.equal(g.sell(-1).ok, false, "unknown unit");
}
{
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 151 });
  g.placement = 1000;
  g.place("nott", "road", 0); // Assassin: holds 1
  const nott = g.heroes[0];
  g.startWave(); g.enemies = []; g.spawnQueue = [];
  const held = g.spawnEnemy("grunt"); const passer = g.spawnEnemy("grunt");
  for (const e of [held, passer]) { e.hp = e.maxHp = 1e9; e.x = nott.x; e.y = nott.y; }
  nott.attackClock = 99; nott.ultClock = -99;
  g.step(1 / 60);
  assert.equal(held.held, true, "the first enemy is held");
  assert.equal(passer.held, false, "the second walks past the full blocker");
  assert.ok(passer.squeeze >= tuning.blocking.passSlow - 1 / 60, "and is slowed while squeezing by");
}

// --- Tuning M1: spawn spacing and endless ramp ---
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
  // A formation is wide enough to separate large phone sprites, stays symmetric at every
  // entrance, and never spreads farther than a road hero can engage.
  const map = realMaps.find((entry) => entry.id === "sunscar-ruins");
  const formation = new TowerDefenseGame({ heroes, tuning, map, waves: [{ wave: 1, spawns: [{ kind: "grunt", count: 35, gapMs: 50 }] }], seed: 160 });
  formation.startWave();
  for (let lane = 0; lane < formation.lanes.length; lane += 1) {
    const sway = formation.spawnQueue.filter((entry) => entry.lane === lane).map((entry) => entry.sway);
    assert.equal(sway.length, 7, `lane ${lane + 1} gets a complete formation`);
    assert.ok(Math.max(...sway) - Math.min(...sway) >= 40, `lane ${lane + 1} formation is visibly wide`);
    assert.ok(Math.max(...sway.map(Math.abs)) < tuning.blocking.contactRange, `lane ${lane + 1} stays within melee contact`);
    close(sway.reduce((sum, value) => sum + value, 0), 0, `lane ${lane + 1} formation is centred`);
  }

  const blockerMap = realMaps.find((entry) => entry.id === "proto-slabs");
  const blocker = new TowerDefenseGame({ heroes, tuning, map: blockerMap, waves: [{ wave: 1, spawns: [] }], seed: 161 });
  blocker.placement = 10000;
  assert.equal(blocker.place("atlas", "road", 0), true, "wide formation blocker placed");
  blocker.startWave(); blocker.spawnQueue = []; blocker.enemies = [];
  const outer = blocker.spawnEnemy("grunt", { sway: Math.max(...formation.spawnQueue.map((entry) => Math.abs(entry.sway))) });
  outer.hp = outer.maxHp = 1e9;
  for (let i = 0; i < 60 * 30 && !outer.held; i += 1) blocker.step(1 / 60);
  assert.equal(outer.held, true, "the outer formation position can still be blocked");
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
// Compact board (board.js, docs/tower-defense-board-plan.md): attack patterns decide reach,
// tuning.board shapes the waves, and every gate still sends enemies.
{
  const { cellCenter, cellAt, PATTERNS, steppedPattern } = await import("../src/game/td/board.js");
  const map = realMaps.find((m) => m.id === "proto-board");
  assert.ok(map, "the prototype board exists");
  const board = map.grid.board;
  const g = new TowerDefenseGame({ heroes, tuning, map, waves, seed: 7 });
  assert.ok(g.boardRules?.patterns, "board maps get tuning.board rules");
  const mageId = heroes.find((h) => h.class === "Mage").id;
  const index = map.platformSlots.findIndex(([x, y]) => x === cellCenter(board, [1, 2])[0] && y === cellCenter(board, [1, 2])[1]);
  assert.ok(g.place(mageId, "platform", index), "Mage placed on cell 1,2");
  const mage = g.heroes[0];
  const at = (cell) => { const [x, y] = cellCenter(board, cell); return { x, y, dead: false, flying: false }; };
  assert.ok(g.reaches(mage, at([3, 2])), "diamond2 reaches two cells (208 px) away, past the Mage range circle");
  assert.ok(g.reaches(mage, at([2, 3])), "diamond2 reaches a diagonal neighbour");
  assert.ok(!g.reaches(mage, at([3, 3])), "diamond2 does not reach three steps away");
  assert.ok(!g.reaches(mage, at([4, 2])), "no reach three cells away in a line");
  // Shaped waves: swarms and runners keep enough bodies for Warrior cleave and Assassin
  // interception; small groups still send one enemy per gate with the strength split.
  assert.deepEqual(g.waveShape("grunt"), { count: 0.4, gap: 2.5, hp: 2.5, attack: 1.25, reward: 2.5, leak: 5 }, "grunt waves preserve bodies for Warrior cleave");
  assert.deepEqual(g.waveShape("runner"), { count: 0.4, gap: 2.5, hp: 2.5, attack: 1.25, reward: 2.5, leak: 5 }, "runner waves preserve loose targets for Assassin interception");
  const { count, split } = g.shapedGroup("grunt", 7);
  assert.equal(count, Math.max(g.lanes.length, Math.round(7 * tuning.board.waveShape.kinds.grunt.count)), "a shaped group sends its intended count and covers every gate");
  assert.ok(Math.abs(count * split - Math.round(7 * tuning.board.waveShape.kinds.grunt.count)) < 1e-9, "the split keeps the shaped strength");
  assert.deepEqual(g.shapedGroup("boss", 1), { count: 1, split: 1 }, "bosses are not shaped");
  // Reach steps: high ground +1, Stormpeak's headwinds -1 for platform heroes elsewhere.
  const withRing = (m, kind) => Object.entries(m.rings).find(([, k]) => k === kind)?.[0].split(":");
  const jungle = realMaps.find((m) => m.grid?.board && m.theme === "jungle" && withRing(m, "highground"));
  const jg = new TowerDefenseGame({ heroes, tuning, map: jungle, waves, seed: 7 });
  const [hgType, hgIndex] = withRing(jungle, "highground");
  const plainIndex = jungle.platformSlots.findIndex((_, i) => !jungle.rings[`platform:${i}`]);
  assert.equal(jg.patternAt({ class: "Mage" }, hgType, Number(hgIndex)), "star3", "high ground: one reach step up");
  assert.equal(jg.patternAt({ class: "Mage" }, "platform", plainIndex), "diamond2", "plain tile: class pattern");
  const storm = realMaps.find((m) => m.theme === "stormpeak");
  const sg = new TowerDefenseGame({ heroes, tuning, map: storm, waves, seed: 7 });
  const stormPlain = storm.platformSlots.findIndex((_, i) => !storm.rings[`platform:${i}`]);
  const [stType, stIndex] = withRing(storm, "highground");
  assert.equal(sg.patternAt({ class: "Mage" }, "platform", stormPlain), "block", "Stormpeak: platform heroes lose a step");
  assert.equal(sg.patternAt({ class: "Mage" }, stType, Number(stIndex)), "star3", "Stormpeak: high ground shelters and adds its step");
  assert.equal(sg.patternAt({ class: "Tank" }, "road", storm.roadSlots.findIndex((_, i) => !storm.rings[`road:${i}`])), "plus", "Stormpeak: road heroes keep their pattern");
  // Signature patterns (tuning.board.heroPatterns) replace the class pattern for that hero.
  assert.equal(jg.patternAt({ id: "boreas", class: "Mage" }, "platform", plainIndex), tuning.board.heroPatterns.boreas, "a signature pattern wins over the class pattern");
  assert.equal(jg.patternAt({ id: "odin", class: "Mage" }, "platform", plainIndex), "diamond2", "heroes without one use the class pattern");
  assert.equal(jg.patternAt({ id: "boreas", class: "Mage" }, hgType, Number(hgIndex)), steppedPattern(tuning.board.heroPatterns.boreas, 1), "signature patterns take reach steps too");
  // Pattern-shaped ultimates: a 1.8x taunt area is the hero's pattern two steps up.
  const tank = { ...mage, class: "Tank", id: "atlas" };
  const [tc, tr] = cellAt(board, tank.x, tank.y);
  assert.equal(g.inUltArea(tank, at([tc + 2, tr]), 1.8), PATTERNS[steppedPattern("plus", 2)].some(([dc, dr]) => dc === 2 && dr === 0), "taunt area follows the stepped pattern");
  assert.ok(!g.inUltArea(tank, at([tc + 3, tr]), 1.8), "taunt area ends where the stepped pattern ends");
  assert.ok(g.nearPoint(at([tc, tr]), at([tc + 1, tr]), 72) && !g.nearPoint(at([tc, tr]), at([tc + 1, tr + 1]), 72), "a 72 px blast is a plus of cells");
  assert.ok(g.nearPoint(at([tc, tr]), at([tc + 1, tr + 1]), 110), "a 110 px blast is a 3 x 3 block");
  // One shown life per leak (board.js shownLives, tuning.board.lifeUnit).
  const { shownLives } = await import("../src/game/td/board.js");
  const lg = new TowerDefenseGame({ heroes, tuning, map, waves, seed: 7 });
  lg.wave = 1;
  assert.equal(lg.lifeUnit, tuning.board.lifeUnit, "boards count lives in units");
  for (const kind of ["grunt", "runner", "flyer"]) assert.equal(lg.spawnEnemy(kind).damage, lg.lifeUnit, `a ${kind} leak costs one shown life`);
  assert.equal(lg.spawnEnemy("brute").damage, 2 * lg.lifeUnit, "a brute leak costs two");
  assert.deepEqual([shownLives(25, 5), shownLives(21, 5), shownLives(20, 5), shownLives(1, 5), shownLives(0, 5)], [5, 5, 4, 1, 0], "shown lives round up and hit 0 only at 0");
  // Maps without a board keep circles and today's waves.
  const plain = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 7 });
  assert.equal(plain.boardRules, null, "no board rules off the board");
  assert.deepEqual(plain.shapedGroup("grunt", 7), { count: 7, split: 1 }, "no wave shape off the board");
}

// Favor placement bonuses: a faster regrowth rate and a flat wave-clear payout.
{
  const fast = structuredClone(tuning);
  fast.favor = { placementRate: 0.5, clearPlacement: 2 };
  const g = new TowerDefenseGame({ heroes, tuning: fast, map: maps[0], waves, seed: 3 });
  g.startWave();
  g.enemies = []; g.spawnQueue = [{ at: 99, kind: "grunt", scale: 1, lane: 0, sway: 0 }];
  const before = g.placement;
  for (let i = 0; i < 60 * 10; i += 1) g.step(1 / 60);
  assert.equal(g.placement - before, 15, "placementRate 0.5 grows 1.5 points per second");
  g.spawnQueue = [];
  const beforeClear = g.totalPlacementEarned;
  g.step(1 / 60);
  assert.ok(g.totalPlacementEarned - beforeClear >= 2, "clearPlacement pays at wave clear");
}

// Pantheon bonds (bonds.js, tuning.bonds): tiers by heroes on the field, recruits as wildcards.
{
  const { bondsOf } = await import("../src/game/td/bonds.js");
  const cfg = tuning.bonds;
  const norse = (ids) => bondsOf(cfg, ids).find((b) => b.id === "norse");
  assert.equal(norse(["odin"]).tier, null, "one hero opens no bond");
  assert.equal(norse(["odin", "ymir"]).tier.count, 2, "two heroes reach the first tier");
  assert.equal(norse(["odin", "ymir", "recruit-bram", "recruit-elm"]).tier.count, 4, "recruits fill the larger set");
  assert.equal(bondsOf(cfg, ["odin", "atlas", "helios", "recruit-bram"]).find((b) => b.id === "greek").count, 3, "a recruit joins the set with more heroes");
  // Tag synergy off, so only the bond changes attack.
  const g = new TowerDefenseGame({ heroes, tuning: { ...tuning, synergy: null }, map: maps[0], waves, seed: 4 });
  g.placement = 9999;
  assert.ok(g.place("odin", "platform", 0));
  const before = g.attackValue(g.heroes[0]);
  assert.ok(g.place("ymir", "road", 0));
  assert.ok(Math.abs(g.attackValue(g.heroes[0]) / before - (1 + cfg.sets.norse.tiers[0].atk)) < 1e-9, "a Norse pair raises attack");
}

// Divine Interventions (tuning.interventions): charge, Thunderfall strike, Shield of the Crossing.
{
  const cfg = tuning.interventions;
  const g = new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 6, interventions: ["thunderfall", "shield"] });
  assert.equal(new TowerDefenseGame({ heroes, tuning, map: maps[0], waves, seed: 6 }).interventionState("thunderfall"), null, "no powers unless the run unlocks them");
  g.startWave();
  g.spawnQueue = [];
  assert.ok(!g.interventionState("thunderfall").ready && !g.castThunderfall(100, 100), "a fresh power is not charged");
  g.interventions.thunderfall.charge = cfg.thunderfall.charge;
  const enemy = g.spawnEnemy("brute");
  enemy.hp = enemy.maxHp = 1000;
  assert.ok(g.castThunderfall(enemy.x, enemy.y), "a charged Thunderfall casts");
  assert.ok(g.effects.some((e) => e.type === "thunderWarn" && e.life === cfg.thunderfall.delay), "R5: the target tiles warn until the bolt lands");
  assert.equal(g.interventions.thunderfall.charge, 0, "casting spends the charge");
  for (let i = 0; i < Math.ceil(cfg.thunderfall.delay * 60) + 1; i += 1) g.step(1 / 60);
  assert.ok(enemy.hp <= 1000 * (1 - cfg.thunderfall.share) + 1e-6, "the bolt takes its share of health after the delay");
  assert.ok(g.effects.some((e) => e.type === "thunderStrike"), "R5: the strike has its own effect");
  g.interventions.shield.charge = cfg.shield.charge;
  assert.ok(g.castShield(), "a charged Shield casts");
  assert.ok(g.effects.some((e) => e.type === "shieldUp" && e.life === cfg.shield.seconds), "R5: the Shield dome lasts as long as the Shield");
  g.interventions.shield.charge = cfg.shield.charge;
  assert.ok(!g.interventionState("shield").ready, "Shield works once per wave");
  const lives = g.lives;
  enemy.distance = g.laneOf(enemy).total;
  g.step(1 / 60);
  assert.equal(g.lives, lives, "a leak under the Shield costs no lives");
  assert.ok(g.effects.some((e) => e.type === "shieldBlock"), "R5: a blocked leak shows at the base");
}

console.log("Tower defense checks passed");
