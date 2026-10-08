// Chapter board events (G2 of TOWER_DEFENSE_GAMEPLAY_IDEAS.md): Ashen eruptions and the Tidal flood.
import assert from "node:assert/strict";
import heroes from "../src/data/gameBalance.json" with { type: "json" };
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import environments from "../src/data/tdEnvironments.json" with { type: "json" };
import { TowerDefenseGame } from "../src/game/td/sim.js";
import { boardOf, cellAt } from "../src/game/td/board.js";
import { floodAttack } from "../src/game/td/board-events.js";
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
  assert.ok(Math.abs(floodAttack(g, fake) - (1 - event.heroAttack)) < 1e-9);
  // Low tide drains it.
  while (g.environmentPhase() % 2 === 1) g.step(1 / 60);
  g.step(1 / 60);
  assert.equal(g.boardEventState.flooded, null, "low tide drains the road");
  assert.equal(floodAttack(g, fake), 1);
}

// Other environments have no event.
{
  const other = maps.find((m) => boardOf(m) && !["ashen", "tidal"].includes(m.theme));
  assert.equal(make(other).boardEvent, null);
}

assert.ok(mage, "roster has a Mage");
console.log("td board events ok");
