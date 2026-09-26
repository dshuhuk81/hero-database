// Daily Trial (M19): setup from the date, sim restrictions, save record and goal reward.
// `node scripts/test-td-daily.mjs --measure [days]` plays each day's setup with a simple
// bot and prints how often the goal is reached (used to tune DAILY.goalWave).
import assert from "node:assert/strict";
import { TowerDefenseGame } from "../src/game/td/sim.js";
import { buildRunTuning } from "../src/game/td/favor.js";
import { clearedWaves, DAILY, dailyDate, dailyGameOptions, dailyRecord, dailySetup, dateSeed, recordDaily, sanitizeDaily } from "../src/game/td/daily.js";
import { emptySave, parseSaveText, encodeSaveCode, sanitizeSave } from "../src/game/td/page/save.ts";
import heroes from "../src/data/gameBalance.json" with { type: "json" };
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import maps from "../src/data/tdMaps.json" with { type: "json" };
import waves from "../src/data/tdWaves.json" with { type: "json" };

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
    assert.equal(setup.goal, DAILY.goalWave);
  }
  const key = (s) => `${s.mapId}|${s.heroIds.join()}|${s.mutators.join()}`;
  assert.ok(new Set(setups.map(key)).size >= 55, "setups vary from day to day");
  assert.equal(new Set(setups.map((s) => s.mapId)).size, maps.length, "every map comes up");
  assert.ok(new Set(setups.flatMap((s) => s.heroIds)).size >= heroes.length - 2, "most heroes come up");
}

// The sim: only allowed heroes deploy, mutators apply from wave 1, blessings are off.
{
  const setup = dailySetup("2026-09-26", data);
  const map = maps.find((entry) => entry.id === setup.mapId);
  const g = new TowerDefenseGame({ heroes, waves, map, tuning: buildRunTuning(tuning, {}, null), ...dailyGameOptions(setup) });
  assert.equal(g.mode, "endless");
  assert.deepEqual(g.mutators, setup.mutators, "mutators preset");
  g.gold = 100000;
  const outsider = heroes.find((hero) => !setup.heroIds.includes(hero.id));
  assert.equal(g.place(outsider.id, outsider.slot, 0), false, "hero outside the trial rejected");
  const allowed = heroById.get(setup.heroIds[0]);
  assert.ok(g.place(allowed.id, allowed.slot, 0), "allowed hero deploys");
  assert.ok(g.startWave(), "wave 1 starts");
  for (let i = 0; i < 60 * 20; i += 1) g.step(1 / 60);
  const mods = g.mutatorMods();
  const spawned = g.enemies.filter((enemy) => enemy.kind !== "boss");
  assert.ok(spawned.length > 0, "wave 1 spawned enemies");
  if (mods.hp) assert.ok(spawned.every((enemy) => enemy.maxHp > tuning.enemies[enemy.kind].hp), "Fortified active on wave 1");
  if (mods.armor) assert.ok(spawned.every((enemy) => enemy.armor >= tuning.enemies[enemy.kind].armor + mods.armor), "Ironclad active on wave 1");
  if (mods.shield) assert.ok(spawned.every((enemy) => enemy.shieldMax > 0), "Warded active on wave 1");
  // A preset mutator is never offered again.
  const again = new TowerDefenseGame({ heroes, waves, map, tuning: buildRunTuning(tuning, {}, null), ...dailyGameOptions(setup) });
  again.wave = tuning.mutators.every;
  again.offerMutators();
  assert.ok(again.mutatorOffer.every((id) => !setup.mutators.includes(id)), "preset mutators not offered");
  // No blessings: buildRunTuning with no levels leaves the run at base values.
  const run = buildRunTuning(tuning, {}, null);
  assert.equal(run.run.startingGold, tuning.run.startingGold);
  assert.equal(run.run.lives, tuning.run.lives);
  assert.equal(run.run.startVirtue, undefined);
  assert.deepEqual(run.favor, { classBonus: {} }, "no Divine Blessing bonus");
  // Normal runs are unrestricted.
  const free = new TowerDefenseGame({ heroes, waves, map, tuning });
  free.gold = 100000;
  assert.ok(free.place(outsider.id, outsider.slot, 0), "normal runs allow every hero");
  assert.deepEqual(free.mutators, [], "normal runs start without mutators");
}

// Save record: best per day, one-time reward, history of 7 days, sanitize and round-trip.
{
  const setup = { ...dailySetup("2026-09-26", data), goal: 15 };
  let step = recordDaily([], setup, { cleared: 9, score: 4000 });
  assert.equal(step.reward, 0, "no reward below the goal");
  assert.deepEqual(step.record, { date: "2026-09-26", bestWave: 9, bestScore: 4000, goalReached: false });
  step = recordDaily(step.records, setup, { cleared: 16, score: 9000 });
  assert.equal(step.reward, DAILY.rewardFavor, "first goal pays");
  assert.ok(step.reached && step.newBest);
  step = recordDaily(step.records, setup, { cleared: 20, score: 8000 });
  assert.equal(step.reward, 0, "goal pays once per day");
  assert.deepEqual(step.record, { date: "2026-09-26", bestWave: 20, bestScore: 9000, goalReached: true }, "bests kept separately");
  assert.equal(step.newBest, false);
  step = recordDaily(step.records, setup, { cleared: 3, score: 100 });
  assert.equal(step.record.goalReached, true, "a worse run keeps the goal");
  // The next day pays again; only 7 days are kept.
  let records = step.records;
  for (const date of dates("2026-09-27", 8)) records = recordDaily(records, { ...setup, date }, { cleared: 15, score: 1 }).records;
  assert.equal(records.length, DAILY.history);
  assert.equal(records[0].date, "2026-10-04", "newest first");
  assert.equal(dailyRecord(records, "2026-09-26"), null, "old days dropped");
  // Sanitize: junk dropped, duplicates removed, numbers cleaned.
  assert.deepEqual(sanitizeDaily("x"), []);
  assert.deepEqual(sanitizeDaily([{ date: "bad" }, null, { date: "2026-01-02", bestWave: "4.7", bestScore: -3, goalReached: 1 }, { date: "2026-01-02", bestWave: 99 }]),
    [{ date: "2026-01-02", bestWave: 4, bestScore: 0, goalReached: true }]);
  // td:v1 keeps it, older saves without it load with an empty list, and it survives a reload.
  const rules = { heroIds: new Set(heroes.map((hero) => hero.id)) };
  const save = { ...emptySave(), bestScore: 10, daily: step.records };
  assert.deepEqual(sanitizeSave(JSON.parse(JSON.stringify(save)), rules).daily, step.records, "reload keeps the daily record");
  assert.deepEqual(parseSaveText(encodeSaveCode(save), rules).daily, step.records, "save code keeps the daily record");
  const old = { ...emptySave(), bestScore: 10 };
  delete old.daily;
  assert.deepEqual(sanitizeSave(old, rules).daily, [], "older saves load");
}

// Headless bot for one day's setup: deploys the allowed heroes cheapest first, spends
// spare gold on the cheapest upgrade, takes the first blessing and skips mutator offers.
export function playDaily(setup, maxWave = 60) {
  const map = maps.find((entry) => entry.id === setup.mapId);
  const g = new TowerDefenseGame({ heroes, waves, map, tuning: buildRunTuning(tuning, {}, null), ...dailyGameOptions(setup) });
  const order = [...setup.heroIds].sort((a, b) => heroById.get(a).cost - heroById.get(b).cost);
  const rings = { road: map.roadSlots.length, platform: map.platformSlots.length };
  while (!g.complete && g.wave < maxWave) {
    for (const id of order) {
      if (g.heroes.some((h) => h.id === id)) continue;
      const base = heroById.get(id);
      for (let i = 0; i < rings[base.slot]; i += 1) if (g.place(id, base.slot, i)) break;
    }
    for (let guard = 0; guard < 20; guard += 1) {
      const options = g.heroes.map((h) => g.upgradeInfo(h.entityId)).filter((info) => info.ok).sort((a, b) => a.cost - b.cost);
      if (!options.length) break;
      const info = options[0];
      g.upgrade(info.hero.entityId, info.needsPath ? info.pathOptions?.[0] : info.hero.slotType === "road" ? "health" : "attack");
    }
    if (g.virtueOffer) g.chooseVirtue(g.virtueOffer[0]);
    if (g.mutatorOffer) g.skipMutators();
    if (!g.startWave()) break;
    let steps = 0;
    while (g.running && !g.complete && steps < 60 * 600) { g.step(1 / 60); steps += 1; }
    if (g.running) break; // standoff guard
  }
  return { cleared: clearedWaves(g), score: g.score };
}

if (process.argv.includes("--measure")) {
  const days = Number(process.argv[process.argv.indexOf("--measure") + 1]) || 20;
  const results = dates("2026-09-26", days).map((date) => {
    const setup = dailySetup(date, data);
    const run = playDaily(setup);
    console.log(`${date} ${setup.mapId.padEnd(17)} ${setup.heroIds.join(",").padEnd(40)} ${setup.mutators.join("+").padEnd(18)} cleared ${run.cleared}`);
    return run.cleared;
  });
  const reached = results.filter((cleared) => cleared >= DAILY.goalWave).length;
  const sorted = [...results].sort((a, b) => a - b);
  console.log(`goal ${DAILY.goalWave}: reached on ${reached}/${days} days (${Math.round((reached / days) * 100)}%), median cleared ${sorted[Math.floor(days / 2)]}`);
} else {
  // Smoke check: the bot clears at least a few waves on today's setup.
  assert.ok(playDaily(dailySetup("2026-09-26", data), 6).cleared >= 3, "daily setup is playable");
  console.log("td daily tests passed");
}
