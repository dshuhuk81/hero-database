import assert from "node:assert/strict";
import heroes from "../src/data/gameBalance.json" with { type: "json" };
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import { TowerDefenseGame } from "../src/game/td/sim.js";
import { maps } from "./lib/td-runner.mjs";

const map = maps.find((m) => (m.lanes?.length ?? 1) === 2) ?? maps[0];
const timeline = [
  { startMs: 1000, kind: "grunt", count: 2 },
  { startMs: 4000, kind: "flyer", count: 1 },
  { startMs: 6000, kind: "boss", count: 1 },
];
const make = (extra = {}) => new TowerDefenseGame({ heroes, tuning, map, timeline, seed: 7, hpScale: 0.01, ...extra });

// start() once, no waves left on the object.
{
  const g = make();
  assert.equal(g.started, false);
  assert.equal(g.start(), true);
  assert.equal(g.started && g.running, true);
  assert.equal(g.start(), false, "a running stage cannot be started again");
  for (const key of ["wave", "waves", "totalWaves", "startWave", "wavePreview", "waveStats"]) assert.equal(key in g, false, `${key} is gone`);
}

// Forecast: total, live ETA, counter.
{
  const g = make();
  const before = g.stageForecast();
  assert.equal(before.total, 4);
  assert.equal(before.down, 0);
  assert.equal(g.start(), true);
  assert.equal(g.stageForecast().ahead[0].eta, 1, "first group in 1 s");
  g.step(1.5);
  assert.ok(g.stageForecast().ahead[0].eta <= 3, "ETA ticks down with the simulation clock");
}

// Wave hold: a later group waits while more than maxAlive enemies stand, at most maxHoldMs, and pushes the queue back.
{
  const hold = tuning.timeline.waveHold;
  const waves = [{ startMs: 1000, kind: "grunt", count: 4 }, { startMs: 3100 + hold.gapMs + 2000, kind: "runner", count: 2 }];
  const run = (cfg) => {
    const g = new TowerDefenseGame({ heroes, tuning: { ...tuning, timeline: { ...tuning.timeline, waveHold: cfg } }, map, timeline: waves, seed: 7, hpScale: 1e6, lives: 999 });
    g.start();
    let runnerAt = null;
    while (g.time < 60 && runnerAt == null) { g.step(1 / 60); if (g.enemies.some((e) => e.kind === "runner")) runnerAt = g.time; }
    return runnerAt;
  };
  const authored = (3100 + hold.gapMs + 2000) / 1000;
  const free = run(null);
  const held = run(hold);
  assert.ok(Math.abs(free - authored) < 0.05, "without waveHold the group comes on time");
  assert.ok(Math.abs(held - (authored + hold.maxHoldMs / 1000)) < 0.1, `four grunts alive hold the next group ${hold.maxHoldMs} ms (${held})`);
  const cleared = new TowerDefenseGame({ heroes, tuning, map, timeline: waves, seed: 7, hpScale: 1e6, lives: 999 });
  cleared.start();
  while (cleared.time < authored - 0.5) cleared.step(1 / 60);
  for (const e of cleared.enemies) e.dead = true;
  while (cleared.time < authored + 0.1) cleared.step(1 / 60);
  assert.ok(cleared.enemies.some((e) => e.kind === "runner" && !e.dead), "a cleared field lets the next group in on time");
}

// A deterministic run: same spawn times and kinds at 1x and at 4x speed.
{
  const spawnLog = (stepsPerFrame) => {
    const g = make();
    g.start();
    const log = [];
    const seen = new Set();
    for (let i = 0; i < 60 * 60 && !g.complete; i += stepsPerFrame) {
      g.advance(stepsPerFrame / 60);
      for (const e of g.enemies) if (!seen.has(e.entityId)) { seen.add(e.entityId); log.push([e.kind, e.entityId, e.lane]); }
    }
    return { log, seconds: Math.round(g.time) };
  };
  assert.deepEqual(spawnLog(1), spawnLog(4), "speed does not change the spawn order, ids, gates or the stage length");
}

// Win waits for the last enemy; summons and splits never count toward the total.
{
  const g = make({ hpScale: 0.001 });
  g.start();
  for (let i = 0; i < 60 * 120 && !g.complete; i += 1) g.step(1 / 60);
  assert.equal(g.complete, true, "the stage ends");
  assert.ok(g.enemiesDown <= g.stageForecast().total, "defeated never exceeds the authored total");
}

// Boss spawns after bossWaitMs even when another enemy never dies.
{
  const t = structuredClone(tuning);
  t.timeline.bossWaitMs = 5000;
  const g = new TowerDefenseGame({ heroes, tuning: t, map, timeline: [{ startMs: 0, kind: "brute", count: 1 }, { startMs: 1000, kind: "boss", count: 1 }], seed: 3, hpScale: 1e6 });
  g.start();
  for (let i = 0; i < 60 * 30 && !g.enemies.some((e) => e.kind === "boss"); i += 1) g.step(1 / 60);
  assert.ok(g.enemies.some((e) => e.kind === "boss"), "boss spawned although a brute is still alive");
}

console.log("Timeline sim checks passed.");
