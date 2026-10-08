// Chapter board events (G2 of TOWER_DEFENSE_GAMEPLAY_IDEAS.md): Ashen eruptions and the Tidal flood.
import assert from "node:assert/strict";
import heroes from "../src/data/gameBalance.json" with { type: "json" };
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import environments from "../src/data/tdEnvironments.json" with { type: "json" };
import { TowerDefenseGame } from "../src/game/td/sim.js";
import { boardOf, cellAt } from "../src/game/td/board.js";
import { boardEventMarks, boardEventMultiplier } from "../src/game/td/board-events.js";
import { maps } from "./lib/td-runner.mjs";

const env = (id) => environments.find((e) => e.id === id);
const mapOf = (theme) => maps.find((m) => m.theme === theme && boardOf(m));
const timeline = [{ startMs: 0, kind: "grunt", count: 3, repeat: 20, everyMs: 3000 }];
const make = (map) => {
  const g = new TowerDefenseGame({ heroes, tuning, map, timeline, seed: 5, hpScale: 1e6, lives: 99999 });
  return g;
};
const tank = heroes.find((h) => h.class === "Tank")?.id;
const mage = heroes.find((h) => h.class === "Mage")?.id;

// Eruption: marks a hero tile first, then hurts heroes left on it.
{
  const event = env("ashen").event;
  assert.equal(event.type, "eruption");
  const map = mapOf("ashen");
  assert.ok(map, "an Ashen board exists");
  const g = make(map);
  assert.equal(g.boardEvent?.type, "eruption");
  assert.ok(g.place(heroes.find((h) => h.class === "Tank" && h.slot === "road").id, "road", 0), "tank deployed");
  g.start();
  const hero = g.heroes[0];
  hero.hp = hero.hpLeft = 1e6; // only the eruption hurts it (no enemy reaches it this early)
  const board = boardOf(map);
  const heroCell = cellAt(board, hero.x, hero.y).join(",");
  while (g.time < event.first + 0.05) g.step(1 / 60);
  const warns = g.effects.filter((e) => e.type === "lavaWarn");
  assert.equal(warns.length, event.count, "count tiles are marked");
  assert.ok(warns.some((w) => cellAt(board, w.x, w.y).join(",") === heroCell), "the hero's tile is marked first");
  const before = hero.hpLeft;
  while (g.time < event.first + event.warn + 0.05) g.step(1 / 60);
  assert.ok(g.effects.some((e) => e.type === "lavaBurst"), "lava bursts after the warning");
  assert.ok(before - hero.hpLeft >= hero.hp * event.damage - 1, "a hero left on the tile loses its share");
}

// Flood: a stretch of road at high tide slows and wets ground enemies; heroes in it hit softer.
{
  const event = env("tidal").event;
  assert.equal(event.type, "flood");
  const map = mapOf("tidal");
  assert.ok(map, "a Tidal board exists");
  const g = make(map);
  g.start();
  g.step(1 / 60);
  const flood = g.effects.find((e) => e.type === "flood");
  assert.ok(flood, "high tide floods at the start (phase 1)");
  assert.equal(flood.area.cells.length, event.count);
  const flooded = g.boardEventState.flooded;
  assert.equal(flooded.size, event.count);
  const road = boardOf(map).road;
  assert.ok(!flooded.has(road[0].join(",")) && !flooded.has(road.at(-1).join(",")), "spawn and base tiles stay dry");
  // Put an enemy into the water and check pace and Wet.
  let wet = false;
  for (let i = 0; i < 60 * 60 && !wet; i += 1) {
    g.step(1 / 60);
    wet = g.enemies.some((e) => !e.dead && (e.floodedUntil ?? 0) > g.time && g.isWet(e));
  }
  assert.ok(wet, "an enemy wading through the flood is Wet and slowed");
  // A hero standing in the flood deals less damage.
  const [c, r] = [...g.boardEventState.flooded][0].split(",").map(Number);
  const cell = boardOf(map).cell, origin = boardOf(map).origin;
  const fake = { x: origin[0] + cell * (c + 0.5), y: origin[1] + cell * (r + 0.5) };
  assert.ok(Math.abs(boardEventMultiplier(g, "attack", fake) - (1 - event.heroAttack)) < 1e-9);
  // Low tide drains it.
  while (g.environmentPhase() % 2 === 1) g.step(1 / 60);
  g.step(1 / 60);
  assert.equal(g.boardEventState.flooded, null, "low tide drains the road");
  assert.equal(boardEventMultiplier(g, "attack", fake), 1);
}

// Every chapter environment has an event; the early themes have none.
for (const e of environments) assert.ok(e.event?.type, `${e.id} has a board event`);
assert.equal(make(mapOf("moonlit")).boardEvent, null);

const road = (h) => h.slot === "road";
const platform = (h) => h.slot === "platform";
const run = (g, until) => { while (g.time < until) g.step(1 / 60); };
const field = (theme, extra = {}) => {
  const g = new TowerDefenseGame({ heroes, tuning, map: mapOf(theme), timeline, seed: 5, hpScale: 1e6, lives: 99999, ...extra });
  g.placement = 1e6;
  return g;
};
const toughen = (g) => { for (const h of g.heroes) { h.hp = h.hpLeft = 1e9; } };

// Frostbite: 15 s on one tile slows attacks; moving thaws.
{
  const event = env("frostbound").event;
  const g = field("frostbound");
  const tankId = heroes.find(road).id;
  assert.ok(g.place(tankId, "road", 0));
  g.start(); toughen(g);
  const hero = g.heroes[0];
  run(g, event.after - 1);
  assert.equal(boardEventMultiplier(g, "aps", hero), 1, "not frozen yet");
  run(g, event.after + 0.5);
  const shrine = g.ringKind("road", 0) === "shrine";
  assert.equal(boardEventMultiplier(g, "aps", hero), shrine ? 1 : 1 - event.aps, "frozen after standing still");
  assert.ok(shrine || boardEventMarks(g).some((m) => m.look === "frost"));
  const free = g.map.roadSlots.findIndex((_, i) => i > 0 && !g.heroes.some((h) => h.slotType === "road" && h.slotIndex === i) && g.ringKind("road", i) !== "shrine");
  g.relocate(hero.entityId, "road", free);
  g.step(1 / 60);
  assert.equal(boardEventMultiplier(g, "aps", hero), 1, "moving thaws");
}

// Lightning Rod: faster charge and periodic strikes on the rod tile.
{
  const event = env("stormpeak").event;
  const g = field("stormpeak");
  g.start(); g.step(1 / 60);
  const rod = g.boardEventState.rod;
  assert.ok(rod, "a rod tile each phase");
  const [c, r] = rod.split(",").map(Number);
  const b = boardOf(g.map);
  const fake = { x: b.origin[0] + b.cell * (c + 0.5), y: b.origin[1] + b.cell * (r + 0.5), hp: 100, hpLeft: 100 };
  assert.ok(Math.abs(boardEventMultiplier(g, "charge", fake) - (1 + event.charge)) < 1e-9);
  assert.ok(boardEventMarks(g).some((m) => m.look === "rod"));
}

// Spore Bloom: mushrooms grow and heal enemies on them.
{
  const event = env("mycelium").event;
  const g = field("mycelium");
  g.start();
  run(g, event.first + event.every * 2 + 0.1);
  assert.ok(g.boardEventState.spores.size >= 2 && g.boardEventState.spores.size <= event.max, "mushrooms grow up to max");
  const road = boardOf(g.map).road;
  assert.ok(![...g.boardEventState.spores].includes(road[0].join(",")), "never on the spawn tile");
}

// Prism: a hero on a prism tile refracts onto a second enemy.
{
  const g = field("crystal");
  g.start(); g.step(1 / 60);
  assert.equal(g.boardEventState.prisms.size, env("crystal").event.count);
  assert.ok(boardEventMarks(g).some((m) => m.look === "prism"));
}

// Restless Dead: some fallen enemies rise as ghosts; Assassin kills stay down.
{
  const event = env("necropolis").event;
  const g = field("necropolis", { hpScale: 0.001 });
  g.start();
  run(g, 4);
  let killed = 0;
  for (const e of g.enemies.filter((x) => !x.dead)) { g.killEnemy(e, null); killed += 1; }
  run(g, g.time + event.delay + 0.1);
  const ghosts = g.enemies.filter((e) => e.ghost && !e.dead);
  assert.ok(killed > 0);
  assert.ok(ghosts.every((e) => e.reward === 0 && e.hp <= e.maxHp), "ghosts carry no gold");
  const before = g.boardEventState.ghosts.length;
  const one = g.enemies.find((e) => !e.dead && !e.ghost);
  if (one) { g.killEnemy(one, { class: "Assassin" }); assert.equal(g.boardEventState.ghosts.length, before, "an Assassin kill stays down"); }
  for (const ghost of ghosts) g.killEnemy(ghost, null);
  assert.equal(g.boardEventState.ghosts.length, before, "ghosts never rise twice");
}

// Windfall: a fruit lands; a hero moved onto it collects Nectar.
{
  const event = env("autumn").event;
  const g = field("autumn");
  g.start();
  run(g, event.first + 0.1);
  const fruit = g.boardEventState.fruit;
  assert.ok(fruit, "a fruit fell");
  const b = boardOf(g.map);
  const [c, r] = fruit.cell.split(",").map(Number);
  const roadIndex = g.map.roadSlots.findIndex((s) => cellAt(b, s.x ?? s[0], s.y ?? s[1]).join(",") === fruit.cell);
  const platIndex = g.map.platformSlots.findIndex((s) => cellAt(b, s.x ?? s[0], s.y ?? s[1]).join(",") === fruit.cell);
  const id = roadIndex >= 0 ? heroes.find(road).id : heroes.find(platform).id;
  assert.ok(g.place(id, roadIndex >= 0 ? "road" : "platform", roadIndex >= 0 ? roadIndex : platIndex), `hero placed on the fruit ${c},${r}`);
  const before = g.placement;
  g.step(1 / 60);
  assert.equal(g.boardEventState.fruit, null, "fruit collected");
  assert.ok(g.placement >= before + event.nectar, "Nectar paid");
}

// Alignment: heroes in the aligned row or column hit harder.
{
  const event = env("celestial").event;
  const g = field("celestial");
  g.start(); g.step(1 / 60);
  const line = g.boardEventState.line;
  const b = boardOf(g.map);
  const cell = line.column ? [line.index, 0] : [0, line.index];
  const inside = { x: b.origin[0] + b.cell * (cell[0] + 0.5), y: b.origin[1] + b.cell * (cell[1] + 0.5) };
  const outside = line.column ? { x: b.origin[0] + b.cell * (((line.index + 1) % b.cols) + 0.5), y: inside.y } : { x: inside.x, y: b.origin[1] + b.cell * (((line.index + 1) % b.rows) + 0.5) };
  assert.ok(Math.abs(boardEventMultiplier(g, "attack", inside) - (1 + event.attack)) < 1e-9);
  assert.equal(boardEventMultiplier(g, "attack", outside), 1);
}

// Gear Jam: a hero left on a marked tile cannot attack for a while.
{
  const event = env("clockwork").event;
  const g = field("clockwork");
  assert.ok(g.place(heroes.find(road).id, "road", 0));
  g.start(); toughen(g);
  const hero = g.heroes[0];
  run(g, event.first + event.warn + 0.05);
  assert.ok(g.isRooted(hero), "jammed");
  assert.ok(boardEventMarks(g).some((m) => m.look === "jam"));
}

assert.ok(mage, "roster has a Mage");
console.log("td board events ok");
