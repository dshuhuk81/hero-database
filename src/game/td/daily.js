// Daily Trial (M19): one fixed setup per UTC day, the same for every player. The date
// seeds the map, the allowed heroes, two mutators active from the start and the goal.
// Runs play the map's timeline at Normal without Divine Blessings or shard boosts, so scores are
// comparable. Pure logic; the page module is page/daily.ts, the save record lives in td:v1.
import { createRng } from "./sim.js";
import { timelineForMap } from "./stage-for-map.js";
import { timelineTotals } from "./timeline.js";
import campaignData from "../../data/tdCampaign.json" with { type: "json" };

export const DAILY = {
  heroes: 5, // allowed heroes: at least `perSlot` road and `perSlot` platform, the rest from either
  perSlot: 2,
  mutators: 2,
  goalShare: 0.6, // the goal: defeat this share of the stage's enemies (first guess, tune with the owner's playtest)
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

// { date, seed, mapId, heroIds, mutators, goal, timeline }. heroIds lists road heroes first; goal is enemies to defeat.
export function dailySetup(date, { heroes, maps, tuning }) {
  const seed = dateSeed(date);
  const rng = createRng(seed);
  // Campaign-only battlefields (tdMaps.json campaignOnly) stay out of the Daily Trial.
  const battlefields = maps.filter((entry) => !entry.campaignOnly);
  const map = battlefields[Math.floor(rng() * battlefields.length)];
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
  const timeline = timelineForMap(map, campaignData);
  return { date, seed, mapId: map.id, heroIds, mutators, goal: Math.max(5, Math.round(timelineTotals(timeline).total * DAILY.goalShare)), timeline };
}

// Options for new TowerDefenseGame(...) on top of heroes, tuning and map.
export const dailyGameOptions = (setup) => ({ timeline: setup.timeline, tier: "normal", seed: setup.seed, allowedHeroes: setup.heroIds, mutators: setup.mutators });

// Enemies defeated so far (killed or through the gates), summons excluded.
export const defeatedCount = (game) => game.enemiesDown;

// Save record per day: { date, bestDefeated, bestScore, goalReached }, newest first. Older records had bestWave, now ignored.
export function sanitizeDaily(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const out = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || !isDailyDate(entry.date) || seen.has(entry.date)) continue;
    seen.add(entry.date);
    out.push({ date: entry.date, bestDefeated: Math.max(0, Math.floor(Number(entry.bestDefeated) || 0)), bestScore: Math.max(0, Math.floor(Number(entry.bestScore) || 0)), goalReached: !!entry.goalReached });
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, DAILY.history);
}

export const dailyRecord = (records, date) => (records ?? []).find((entry) => entry.date === date) ?? null;

// Records a finished trial run ({ defeated, score }). Returns the updated list, the day's record, whether the
// run set a new best and the one-time goal Favor (0 once the goal was already reached that day).
export function recordDaily(records, setup, run) {
  const prev = dailyRecord(records, setup.date);
  const reached = run.defeated >= setup.goal;
  const record = {
    date: setup.date,
    bestDefeated: Math.max(prev?.bestDefeated ?? 0, run.defeated),
    bestScore: Math.max(prev?.bestScore ?? 0, run.score),
    goalReached: !!prev?.goalReached || reached,
  };
  const reward = reached && !prev?.goalReached ? DAILY.rewardFavor : 0;
  const newBest = !prev || run.score > prev.bestScore;
  const list = sanitizeDaily([record, ...(records ?? []).filter((entry) => entry.date !== setup.date)]);
  return { records: list, record, reward, reached, newBest };
}
