// Daily Trial (M19): setup from the date, sim restrictions, save record and goal reward.
// `node scripts/test-td-daily.mjs --measure [days]` plays each day's setup with a simple
// bot and prints how often the goal is reached (used to tune DAILY.goalShare).
import assert from "node:assert/strict";
import { rankedTiles } from "../src/game/td/grid.js";
import { TowerDefenseGame } from "../src/game/td/sim.js";
import { buildRunTuning } from "../src/game/td/favor.js";
import { defeatedCount, DAILY, dailyDate, dailyGameOptions, dailyRecord, dailySetup, dateSeed, recordDaily, sanitizeDaily } from "../src/game/td/daily.js";
import { emptySave, parseSaveText, encodeSaveCode, sanitizeSave } from "../src/game/td/page/save.ts";
import heroes from "../src/data/gameBalance.json" with { type: "json" };
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import maps from "../src/data/tdMaps.json" with { type: "json" };
import { timelineTotals } from "../src/game/td/timeline.js";

const data = { heroes, maps, tuning };
const heroById = new Map(heroes.map((hero) => [hero.id, hero]));
const dates = (start, count) => Array.from({ length: count }, (_, i) => dailyDate(new Date(Date.parse(`${start}T12:00:00Z`) + i * 86400000)));

// Same trial for the whole UTC day; the date rolls over at midnight UTC.
{
  assert.equal(dailyDate(new Date("2026-09-26T00:00:00Z")), "2026-09-26");
  assert.equal(dailyDate(new Date("2026-09-26T23:59:59Z")), "2026-09-26");
  assert.equal(dailyDate(new Date("2026-09-27T00:00:00Z")), "2026-09-27");
  assert.equal(dateSeed("2026-09-26"), dateSeed("2026-09-26"), "seed is stable");
  assert.notEqual(dateSeed("2026-09-26"), dateSeed("2026-09-27"), "neighbouring days differ");
}

// Same date, same setup; the setup is valid and playable; dates vary.
{
  const a = dailySetup("2026-09-26", data);
  assert.deepEqual(dailySetup("2026-09-26", data), a, "deterministic");
  const setups = dates("2026-01-01", 60).map((date) => dailySetup(date, data));
  for (const setup of setups) {
    assert.equal(setup.heroIds.length, DAILY.heroes, `${setup.date}: hero count`);
    assert.equal(new Set(setup.heroIds).size, DAILY.heroes, `${setup.date}: no repeats`);
    const slots = setup.heroIds.map((id) => heroById.get(id).slot);
    assert.ok(slots.filter((s) => s === "road").length >= DAILY.perSlot, `${setup.date}: road heroes`);
    assert.ok(slots.filter((s) => s === "platform").length >= DAILY.perSlot, `${setup.date}: platform heroes`);
    assert.deepEqual(slots, [...slots].sort((x, y) => (x === "road" ? 0 : 1) - (y === "road" ? 0 : 1)), "road heroes listed first");
    assert.equal(setup.mutators.length, DAILY.mutators, `${setup.date}: mutators`);
    assert.equal(new Set(setup.mutators).size, DAILY.mutators, `${setup.date}: distinct mutators`);
    for (const id of setup.mutators) assert.ok(tuning.mutators.pool[id], `${id} in pool`);
    assert.ok(maps.some((map) => map.id === setup.mapId), `${setup.date}: map exists`);
    const total = timelineTotals(setup.timeline).total;
    assert.equal(setup.goal, Math.max(5, Math.round(total * DAILY.goalShare)), `${setup.date}: the goal is a share of the stage's enemies`);
    assert.ok(setup.goal <= total, `${setup.date}: the goal can be reached`);
  }
  const key = (s) => `${s.mapId}|${s.heroIds.join()}|${s.mutators.join()}`;
  assert.ok(new Set(setups.map(key)).size >= 55, "setups vary from day to day");
  const open = maps.filter((map) => !map.campaignOnly);
  assert.equal(new Set(setups.map((s) => s.mapId)).size, open.length, "every open map comes up");
  assert.ok(setups.every((s) => open.some((map) => map.id === s.mapId)), "campaign-only maps never come up");
  assert.ok(new Set(setups.flatMap((s) => s.heroIds)).size >= heroes.length - 2, "most heroes come up");
}

// The sim: only allowed heroes deploy, mutators apply from the start, blessings are off.
{
  const setup = dailySetup("2026-09-26", data);
  const map = maps.find((entry) => entry.id === setup.mapId);
  const g = new TowerDefenseGame({ heroes, map, tuning: buildRunTuning(tuning, {}, null), ...dailyGameOptions(setup) });
  assert.deepEqual(g.timeline.map((group) => group.kind), setup.timeline.map((group) => group.kind), "the trial plays the map's timeline");
  assert.deepEqual(g.mutators, setup.mutators, "mutators preset");
  g.placement = 100000;
  const outsider = heroes.find((hero) => !setup.heroIds.includes(hero.id));
  assert.equal(g.place(outsider.id, outsider.slot, 0), false, "hero outside the trial rejected");
  const allowed = heroById.get(setup.heroIds[0]);
  assert.ok(g.place(allowed.id, allowed.slot, 0), "allowed hero deploys");
  assert.ok(g.start(), "the stage starts");
  for (let i = 0; i < 60 * 20; i += 1) g.step(1 / 60);
  const mods = g.mutatorMods();
  const spawned = g.enemies.filter((enemy) => enemy.kind !== "boss");
  assert.ok(spawned.length > 0, "enemies spawned");
  if (mods.hp) assert.ok(spawned.every((enemy) => enemy.maxHp > tuning.enemies[enemy.kind].hp), "Fortified active from the start");
  if (mods.armor) assert.ok(spawned.every((enemy) => enemy.armor >= tuning.enemies[enemy.kind].armor + mods.armor), "Ironclad active from the start");
  if (mods.shield) assert.ok(spawned.every((enemy) => enemy.shieldMax > 0), "Warded active from the start");
  // No blessings: buildRunTuning with no levels leaves the run at base values.
  const run = buildRunTuning(tuning, {}, null);
  assert.equal(run.run.startingPlacement, tuning.run.startingPlacement);
  assert.equal(run.run.lives, tuning.run.lives);
  assert.equal(run.run.startVirtue, undefined);
  assert.deepEqual(run.favor, { classBonus: {} }, "no Divine Blessing bonus");
  // Normal runs are unrestricted.
  const free = new TowerDefenseGame({ heroes, map, tuning, timeline: setup.timeline });
  free.placement = 100000;
  assert.ok(free.place(outsider.id, outsider.slot, 0), "normal runs allow every hero");
  assert.deepEqual(free.mutators, [], "normal runs start without mutators");
}

// Save record: best per day, one-time reward, history of 7 days, sanitize and round-trip.
{
  const setup = { ...dailySetup("2026-09-26", data), goal: 15 };
  let step = recordDaily([], setup, { defeated: 9, score: 4000 });
  assert.equal(step.reward, 0, "no reward below the goal");
  assert.deepEqual(step.record, { date: "2026-09-26", bestDefeated: 9, bestScore: 4000, goalReached: false });
  step = recordDaily(step.records, setup, { defeated: 16, score: 9000 });
  assert.equal(step.reward, DAILY.rewardFavor, "first goal pays");
  assert.ok(step.reached && step.newBest);
  step = recordDaily(step.records, setup, { defeated: 20, score: 8000 });
  assert.equal(step.reward, 0, "goal pays once per day");
  assert.deepEqual(step.record, { date: "2026-09-26", bestDefeated: 20, bestScore: 9000, goalReached: true }, "bests kept separately");
  assert.equal(step.newBest, false);
  step = recordDaily(step.records, setup, { defeated: 3, score: 100 });
  assert.equal(step.record.goalReached, true, "a worse run keeps the goal");
  // The next day pays again; only 7 days are kept.
  let records = step.records;
  for (const date of dates("2026-09-27", 8)) records = recordDaily(records, { ...setup, date }, { defeated: 15, score: 1 }).records;
  assert.equal(records.length, DAILY.history);
  assert.equal(records[0].date, "2026-10-04", "newest first");
  assert.equal(dailyRecord(records, "2026-09-26"), null, "old days dropped");
  // Sanitize: junk dropped, duplicates removed, numbers cleaned.
  assert.deepEqual(sanitizeDaily("x"), []);
  assert.deepEqual(sanitizeDaily([{ date: "bad" }, null, { date: "2026-01-02", bestDefeated: "4.7", bestScore: -3, goalReached: 1 }, { date: "2026-01-02", bestDefeated: 99 }]),
    [{ date: "2026-01-02", bestDefeated: 4, bestScore: 0, goalReached: true }]);
  // td:v1 keeps it, older saves without it load with an empty list, and it survives a reload.
  const rules = { heroIds: new Set(heroes.map((hero) => hero.id)) };
  const save = { ...emptySave(), bestScore: 10, daily: step.records };
  assert.deepEqual(sanitizeSave(JSON.parse(JSON.stringify(save)), rules).daily, step.records, "reload keeps the daily record");
  assert.deepEqual(parseSaveText(encodeSaveCode(save), rules).daily, step.records, "save code keeps the daily record");
  const old = { ...emptySave(), bestScore: 10 };
  delete old.daily;
  assert.deepEqual(sanitizeSave(old, rules).daily, [], "older saves load");
}

// Headless bot for one day's setup: deploys the allowed heroes cheapest first as placement regrows, takes the
// first blessing offered.
export function playDaily(setup, maxSeconds = 1200) {
  const map = maps.find((entry) => entry.id === setup.mapId);
  const g = new TowerDefenseGame({ heroes, map, tuning: buildRunTuning(tuning, {}, null), ...dailyGameOptions(setup) });
  const order = [...setup.heroIds].sort((a, b) => heroById.get(a).cost - heroById.get(b).cost);
  const deploy = () => {
    for (const id of order) {
      if (g.heroes.some((h) => h.id === id)) continue;
      const base = heroById.get(id);
      for (const i of rankedTiles(map, base.slot, g.rangeFor(base))) if (g.place(id, base.slot, i)) break;
    }
  };
  deploy();
  g.start();
  for (let step = 0; g.running && !g.complete && g.time < maxSeconds; step += 1) {
    g.step(1 / 60);
    if (step % 60 === 0) { deploy(); if (g.virtueOffer) g.chooseVirtue(g.virtueOffer[0]); }
  }
  return { defeated: defeatedCount(g), score: g.score, won: g.won };
}

if (process.argv.includes("--measure")) {
  const days = Number(process.argv[process.argv.indexOf("--measure") + 1]) || 20;
  const results = dates("2026-09-26", days).map((date) => {
    const setup = dailySetup(date, data);
    const run = playDaily(setup);
    console.log(`${date} ${setup.mapId.padEnd(17)} ${setup.heroIds.join(",").padEnd(40)} ${setup.mutators.join("+").padEnd(18)} defeated ${run.defeated}/${setup.goal}`);
    return run.defeated >= setup.goal;
  });
  const reached = results.filter(Boolean).length;
  console.log(`goal reached on ${reached}/${days} days (${Math.round((reached / days) * 100)}%)`);
} else {
  // Smoke check: the bot defeats at least a few enemies on today's setup.
  assert.ok(playDaily(dailySetup("2026-09-26", data), 400).defeated >= 3, "daily setup is playable");
  console.log("td daily tests passed");
}
