// Daily Trial (M19): one fixed setup per UTC day, the same for every player. The date
// seeds the map, the allowed heroes, two mutators active from wave 1 and the goal wave.
// Runs are endless at Normal without Divine Blessings or shard boosts, so scores are
// comparable. Pure logic; the page module is page/daily.ts, the save record lives in td:v1.
import { createRng } from "./sim.js";

export const DAILY = {
  heroes: 5, // allowed heroes: at least `perSlot` road and `perSlot` platform, the rest from either
  perSlot: 2,
  mutators: 2,
  goalWave: 5, // the first boss; the simple bot in scripts/test-td-daily.mjs --measure reaches it on ~40% of days
  rewardFavor: 100, // first goal reached on a day
  history: 7, // days kept in the save
};

// UTC calendar date ("2026-09-26"), so everyone shares the same trial at the same time.
export function dailyDate(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export const isDailyDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

// FNV-1a over the date string, mixed once more so neighbouring dates spread apart.
export function dateSeed(date) {
  let hash = 0x811c9dc5;
  for (const char of `td-daily:${date}`) hash = Math.imul(hash ^ char.charCodeAt(0), 0x01000193);
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85ebca6b);
  hash ^= hash >>> 13;
  return hash >>> 0;
}

function pickFrom(list, rng) {
  return list.splice(Math.floor(rng() * list.length), 1)[0];
}

// { date, seed, mapId, heroIds, mutators, goal }. heroIds lists road heroes first.
export function dailySetup(date, { heroes, maps, tuning }) {
  const seed = dateSeed(date);
  const rng = createRng(seed);
  const map = maps[Math.floor(rng() * maps.length)];
  const road = heroes.filter((hero) => hero.slot === "road").map((hero) => hero.id);
  const platform = heroes.filter((hero) => hero.slot === "platform").map((hero) => hero.id);
  const picked = [];
  for (let i = 0; i < DAILY.perSlot; i += 1) picked.push(pickFrom(road, rng), pickFrom(platform, rng));
  const rest = [...road, ...platform];
  while (picked.length < DAILY.heroes && rest.length) picked.push(pickFrom(rest, rng));
  const slotOf = new Map(heroes.map((hero) => [hero.id, hero.slot]));
  const heroIds = [...picked.filter((id) => slotOf.get(id) === "road"), ...picked.filter((id) => slotOf.get(id) !== "road")];
  const pool = Object.keys(tuning.mutators?.pool ?? {});
  const mutators = [];
  while (mutators.length < DAILY.mutators && pool.length) mutators.push(pickFrom(pool, rng));
  return { date, seed, mapId: map.id, heroIds, mutators, goal: DAILY.goalWave };
}

// Options for new TowerDefenseGame(...) on top of heroes, tuning, map and waves.
export const dailyGameOptions = (setup) => ({ mode: "endless", tier: "normal", seed: setup.seed, allowedHeroes: setup.heroIds, mutators: setup.mutators });

// Waves fully cleared so far: the current wave counts once it is over, and an endless
// run ends inside the wave that broke it.
export const clearedWaves = (game) => (game.won || (!game.running && !game.complete) ? game.wave : Math.max(0, game.wave - 1));

// Save record per day: { date, bestWave (waves cleared), bestScore, goalReached }, newest first.
export function sanitizeDaily(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const out = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || !isDailyDate(entry.date) || seen.has(entry.date)) continue;
    seen.add(entry.date);
    out.push({ date: entry.date, bestWave: Math.max(0, Math.floor(Number(entry.bestWave) || 0)), bestScore: Math.max(0, Math.floor(Number(entry.bestScore) || 0)), goalReached: !!entry.goalReached });
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, DAILY.history);
}

export const dailyRecord = (records, date) => (records ?? []).find((entry) => entry.date === date) ?? null;

// Records a finished trial run ({ cleared, score }). Returns the updated list, the day's record, whether the
// run set a new best and the one-time goal Favor (0 once the goal was already reached that day).
export function recordDaily(records, setup, run) {
  const prev = dailyRecord(records, setup.date);
  const reached = run.cleared >= setup.goal;
  const record = {
    date: setup.date,
    bestWave: Math.max(prev?.bestWave ?? 0, run.cleared),
    bestScore: Math.max(prev?.bestScore ?? 0, run.score),
    goalReached: !!prev?.goalReached || reached,
  };
  const reward = reached && !prev?.goalReached ? DAILY.rewardFavor : 0;
  const newBest = !prev || run.score > prev.bestScore;
  const list = sanitizeDaily([record, ...(records ?? []).filter((entry) => entry.date !== setup.date)]);
  return { records: list, record, reward, reached, newBest };
}
