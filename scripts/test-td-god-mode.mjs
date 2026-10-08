import assert from "node:assert/strict";
import { TowerDefenseGame } from "../src/game/td/sim.js";
import { godChallenge, godMapFor } from "../src/game/td/god-mode.js";
import { boardOf, cellAt } from "../src/game/td/board.js";
import { resolveTilt } from "../src/game/td/render.js";
import * as godScene from "../src/game/td/god-scene.js";
import heroes from "../src/data/gameBalance.json" with { type: "json" };
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };

const challenge = godChallenge("cronus");
const map = godMapFor(challenge);
const board = boardOf(map);

// --- map: a three-row arena with an invisible boss target row ---
assert.equal(board.cols, 9, "9 columns");
assert.equal(board.rows, 3, "the visible arena has three rows");
assert.equal(map.roadSlots.length, 5, "five melee tiles");
assert.equal(map.platformSlots.length, 9, "nine platform tiles (four P, five H); no upper corner tiles");
assert.equal(Object.values(map.rings).filter((kind) => kind === "highground").length, 5, "the gallery is high ground");
assert.deepEqual(map.god.cells, [[2, -1], [3, -1], [4, -1], [5, -1], [6, -1]], "boss target cells stay above the playable board");
assert.equal(map.platformSlots.some(([, y]) => y < 300), false, "nothing is placeable in the removed upper row");

// --- the arena tilts more than Campaign without lifting its near edge ---
{
  const view = resolveTilt(map, tuning.board.tilt, { campaign: true });
  assert.ok(view.k < 0.75, "God Mode has a stronger board tilt than Campaign");
  assert.ok(Math.abs(view.offsetY + view.k * 536 - 457) < 2, "the near edge stays anchored on screen");
}

// --- area attacks get distinct impact compositions, not one identical burst per tile ---
{
  const slam = godScene.godImpactPlan?.("slam", [[1, 0], [0, 0], [1, 1], [2, 0]]);
  assert.deepEqual(slam?.burstCells, [[1, 0]], "a slam has one focal impact");
  assert.deepEqual(slam?.crackCells, [[1, 0], [0, 0], [1, 1], [2, 0]], "all damaged cells remain marked by fissures");
  const sweep = godScene.godImpactPlan?.("sweep", [[0, 0], [1, 0], [2, 0]]);
  assert.deepEqual(sweep?.burstCells, [], "a sweep does not stamp impacts across the row");
  assert.deepEqual(sweep?.sweepCells, [[0, 0], [1, 0], [2, 0]], "the sweep is one directional ground effect");
  assert.deepEqual(godScene.godImpactPlan?.("embers", [[2, 0], [6, 1]])?.burstCells, [[2, 0], [6, 1]], "separate ember strikes keep their own impacts");
}

const make = (extra = {}) => new TowerDefenseGame({ heroes, tuning, map, timeline: [], seed: 11, allowedHeroes: ["atlas", "odin", "skadi", "plutus", "aegir", "fenrir", "ymir"], ...extra });
const roadIndex = (c, r) => board.road.findIndex(([rc, rr]) => rc === c && rr === r);
const platformIndex = (c, r) => board.platforms.findIndex(([pc, pr]) => pc === c && pr === r);

// --- the stationary god ---
{
  const game = make();
  assert.equal(game.start(), true, "a god run starts without a timeline");
  assert.equal(game.enemies.length, 1, "only the god is on the field");
  const boss = game.enemies[0];
  assert.equal(boss.kind, "boss", "the god is a boss unit");
  assert.equal(boss.stationary, true, "that never walks");
  assert.deepEqual(boss.cells, map.god.cells, "and owns the five cells");
  assert.deepEqual([boss.x, boss.y], [480, 221], "centred on its middle cell");
  game.placement = 10000;
  game.step(60);
  assert.deepEqual([boss.x, boss.y], [480, 221], "it does not move");
  assert.equal(game.lives, game.maxLives, "and nothing leaks");
}

// --- reach: any covered boss cell counts, from every class ---
{
  const game = make();
  game.placement = 10000;
  // Tank pattern "plus" from (2, 0) covers the invisible boss cell (2, -1).
  assert.equal(game.place("atlas", "road", roadIndex(2, 0)), true, "Tank on the left melee tile");
  assert.equal(game.place("odin", "platform", platformIndex(1, 0)), true, "Mage on the left platform");
  assert.equal(game.place("skadi", "platform", platformIndex(4, 2)), true, "Archer in the gallery");
  assert.equal(game.place("plutus", "platform", platformIndex(6, 1)), true, "Support on a side platform");
  game.start();
  const boss = game.enemies[0];
  for (const id of ["atlas", "odin", "skadi"]) {
    const hero = game.heroes.find((entry) => entry.id === id);
    assert.equal(game.reaches(hero, boss), true, `${id} reaches a boss cell with its pattern`);
  }
  for (let i = 0; i < 60 * 10; i += 1) game.step(1 / 60);
  assert.ok(game.godDamage > 0, "heroes deal damage to the god");
  assert.equal(game.score, Math.round(game.godDamage), "the score is the total damage");
  assert.equal(boss.dead, false, "the god never dies");
  assert.equal(boss.hp, boss.maxHp, "its health stays full");
  const stat = game.heroStats.atlas;
  assert.ok(stat && stat.boss > 0, "the Tank's damage is recorded against the boss");
}

// --- an area attack hits the one unit once ---
{
  const game = make();
  game.start();
  const boss = game.enemies[0];
  const centre = { x: boss.x, y: boss.y };
  assert.equal(game.nearPoint(centre, boss, 130), true, "an area around the boss reaches it");
  assert.equal(game.nearPoint({ x: board.origin[0] + board.cell * 8.5, y: board.origin[1] + board.cell * 2.5 }, boss, 130), false, "a far area does not");
}

// --- the timer ends the run ---
{
  const game = make();
  game.start();
  for (let i = 0; i < 60 * (challenge.seconds + 5) && !game.complete; i += 1) game.step(1 / 60);
  assert.equal(game.complete, true, "the run ends on its own");
  assert.equal(game.won, true, "a finished run counts as completed");
  assert.ok(Math.abs(game.time - challenge.seconds) < 0.05, `at ${challenge.seconds} s (${game.time.toFixed(2)})`);
}

// --- the god's attacks: telegraph first, then damage on the marked cells ---
{
  const game = make();
  game.placement = 10000;
  game.place("atlas", "road", roadIndex(2, 0)); // inside the first slam's plus around (1, 0)
  game.place("skadi", "platform", platformIndex(4, 2)); // far from the first slam
  const effects = [];
  game.onEffect = (effect) => { if (String(effect.type).startsWith("god")) effects.push(effect); };
  game.start();
  const atlas = game.heroes.find((hero) => hero.id === "atlas");
  const skadi = game.heroes.find((hero) => hero.id === "skadi");
  const first = challenge.cycle[0];
  assert.equal(first.attack, "slam", "the cycle opens with a slam");
  for (let i = 0; i < 60 * (challenge.firstAttackAt + 0.2); i += 1) game.step(1 / 60);
  const telegraph = effects.find((effect) => effect.type === "godTelegraph");
  assert.ok(telegraph, "the first attack is announced");
  assert.equal(telegraph.attack, "slam");
  assert.ok(telegraph.cells.some(([c, r]) => c === 1 && r === 0), "the left slam marks the left platform cell");
  assert.equal(atlas.hpLeft, atlas.hp, "no damage during the telegraph");
  for (let i = 0; i < 60 * (first.telegraph + 0.2); i += 1) game.step(1 / 60);
  const strike = effects.find((effect) => effect.type === "godStrike");
  assert.ok(strike, "then the strike lands");
  assert.ok(atlas.hpLeft < atlas.hp || !game.heroes.includes(atlas), "a hero in a marked cell is hurt");
  assert.equal(skadi.hpLeft, skadi.hp, "a hero outside the marked cells is not");
}

// --- losing the last hero ends the challenge immediately ---
{
  const game = make();
  game.placement = 10000;
  game.place("odin", "platform", platformIndex(1, 0));
  game.start();
  const odin = game.heroes[0];
  odin.hpLeft = 1; // one more hit is fatal
  for (let i = 0; i < 60 * 30 && game.heroes.includes(odin); i += 1) game.step(1 / 60);
  assert.equal(game.heroes.includes(odin), false, "a fragile hero falls to a strike");
  assert.ok(game.fallenHeroes.some((entry) => entry.id === "odin"), "and is recorded as fallen");
  assert.equal(game.complete, true, "the run ends when the last hero falls");
  assert.equal(game.won, false, "the wipe is a defeat, not a completed timer");
  assert.ok(game.time < challenge.seconds, "the wipe ends before the timer");
}

// --- losing one of several heroes does not end the challenge ---
{
  const game = make();
  game.placement = 10000;
  game.place("odin", "platform", platformIndex(1, 0));
  game.place("skadi", "platform", platformIndex(4, 2));
  game.start();
  const odin = game.heroes.find((hero) => hero.id === "odin");
  odin.hpLeft = 1;
  for (let i = 0; i < 60 * 30 && game.heroes.includes(odin); i += 1) game.step(1 / 60);
  assert.equal(game.heroes.includes(odin), false, "one hero falls");
  assert.equal(game.complete, false, "survivors keep the run going");
}

// --- stationary units are found by cell ---
{
  const game = make();
  const [c, r] = cellAt(board, 480, 221);
  assert.deepEqual([c, r], [4, -1], "the boss's centre sits in the invisible row");
}

// --- a blow lands on the aim point of the boss cell the hero's pattern covers ---
{
  const game = make();
  game.placement = 10000;
  game.place("atlas", "road", roadIndex(2, 0)); // plus pattern: covers boss cell (2, -1) only
  game.place("odin", "platform", platformIndex(6, 1)); // diamond2 from (6, 1): covers (6, -1)
  game.start();
  const boss = game.enemies[0];
  const atlas = game.heroes.find((hero) => hero.id === "atlas");
  const odin = game.heroes.find((hero) => hero.id === "odin");
  const [leftArm, , , , rightArm] = challenge.aim;
  assert.deepEqual(Object.values(game.godAim(atlas, boss)), leftArm, "a Tank on the left hits the left arm point");
  assert.deepEqual(Object.values(game.godAim(odin, boss)), rightArm, "a Mage on the right hits the right arm point");
  assert.deepEqual(Object.values(game.godAim(null, boss)), [boss.x, boss.y], "damage over time uses the centre");
}

console.log("god mode checks passed");
