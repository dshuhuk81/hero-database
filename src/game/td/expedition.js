// Expedition (M21): a roguelite chain of 10-wave stages, one per battlefield. It starts
// with three random heroes; after each won stage the camp offers three cards (a new hero,
// a relic or a veteran) and the player takes one. Lives carry over between stages, gold
// does not, and every stage is tougher than the last. Relics are the rare and epic run
// blessings of M17, active from wave 1. Pure logic; the page module is page/expedition.ts
// and the in-progress state lives in the td:v1 save.
import { createRng } from "./sim.js";

export const EXPEDITION = {
  startHeroes: 3, // at least one road and one platform hero
  stageHp: [0.35, 0.5, 0.65], // enemy health per stage, on top of the Normal difficulty
  veteranLevel: 2, // veterans enter every stage at this level (below the level 3 focus)
  completeFavor: 300, // once per finished expedition, on top of each stage's normal Favor
  recruitLives: 3, // a new hero costs this many of the carried-over lives (never below 1)
};

function pickFrom(list, rng) {
  return list.splice(Math.floor(rng() * list.length), 1)[0];
}

// Seed for a stage or camp: the expedition seed mixed with the stage number and a salt.
const mix = (seed, stage, salt) => (Math.imul(seed ^ (stage + 1) * 0x9e3779b1, 0x85ebca6b) ^ salt) >>> 0;

// A new expedition. `maps` sets the stage order (shuffled), `heroes` the roster pool.
export function newExpedition(seed, { heroes, maps, tuning }) {
  const rng = createRng(seed >>> 0);
  const order = maps.map((map) => map.id);
  const stages = [];
  while (order.length) stages.push(pickFrom(order, rng));
  const road = heroes.filter((hero) => hero.slot === "road").map((hero) => hero.id);
  const platform = heroes.filter((hero) => hero.slot === "platform").map((hero) => hero.id);
  const roster = [pickFrom(road, rng), pickFrom(platform, rng)];
  const rest = [...road, ...platform];
  while (roster.length < EXPEDITION.startHeroes && rest.length) roster.push(pickFrom(rest, rng));
  return { seed: seed >>> 0, stages, stage: 0, roster, relics: [], veterans: [], lives: tuning.run.lives, camp: null };
}

export const stageCount = (state) => state.stages.length;
export const isFinished = (state) => state.stage >= state.stages.length;

// Options for new TowerDefenseGame(...) on top of heroes, tuning, map and waves.
export function stageGameOptions(state) {
  return {
    mode: "classic",
    tier: "normal",
    seed: mix(state.seed, state.stage, 0x51ed27),
    allowedHeroes: state.roster,
    boons: state.relics,
    startLevels: Object.fromEntries(state.veterans.map((id) => [id, EXPEDITION.veteranLevel])),
    lives: state.lives,
    hpScale: EXPEDITION.stageHp[Math.min(state.stage, EXPEDITION.stageHp.length - 1)],
  };
}

// Whether a relic (run blessing) can do anything for this roster. Chill and freeze come
// from paths and Infusions, which the roster cannot promise, so they are not offered.
function relicFits(id, state, tuning, heroesById) {
  const need = tuning.runBoons.list[id]?.requires;
  const sources = tuning.statuses?.sources ?? {};
  const has = (status) => state.roster.some((heroId) => sources[heroId] === status);
  switch (need) {
    case null: case undefined: return true;
    case "chain": return state.roster.includes("zeus");
    case "road": return state.roster.some((heroId) => heroesById.get(heroId)?.slot === "road");
    case "freeze": return false;
    default: return has(need);
  }
}

// The camp after a won stage: up to three cards, one of each kind when possible.
// Card shapes: { type: "hero", id } | { type: "relic", ids } (two relics) | { type: "veteran", ids }
// (Drill: every hero of the roster not yet a veteran).
export function campOffer(state, { heroes, tuning }) {
  const rng = createRng(mix(state.seed, state.stage, 0xc0ffee));
  const heroesById = new Map(heroes.map((hero) => [hero.id, hero]));
  const cards = [];
  const road = state.roster.filter((id) => heroesById.get(id)?.slot === "road").length;
  const platform = state.roster.length - road;
  // A new hero, from the slot type the roster has fewer of.
  const want = road <= platform ? "road" : "platform";
  const fresh = heroes.filter((hero) => !state.roster.includes(hero.id));
  const preferred = fresh.filter((hero) => hero.slot === want);
  const pool = (preferred.length ? preferred : fresh).map((hero) => hero.id);
  if (pool.length) cards.push({ type: "hero", id: pickFrom(pool, rng) });
  const relics = Object.keys(tuning.runBoons?.list ?? {}).filter((id) => !state.relics.includes(id) && relicFits(id, state, tuning, heroesById));
  // Relic card: a pair of relics (one alone is worth about one stat blessing, M17).
  if (relics.length) cards.push({ type: "relic", ids: [pickFrom(relics, rng), ...(relics.length ? [pickFrom(relics, rng)] : [])] });
  const recruits = state.roster.filter((id) => !state.veterans.includes(id));
  if (recruits.length) cards.push({ type: "veteran", ids: recruits });
  return cards;
}

// After a stage: a win moves on (lives carry over) and opens the camp unless it was the
// last stage; a loss ends the expedition. Returns the new state and what happened.
export function finishStage(state, { won, lives }, data) {
  if (!won) return { state: null, outcome: "lost", cleared: state.stage };
  const next = { ...state, stage: state.stage + 1, lives: Math.max(1, lives) };
  if (isFinished(next)) return { state: null, outcome: "complete", cleared: next.stage };
  return { state: { ...next, camp: campOffer(next, data) }, outcome: "camp", cleared: next.stage };
}

// Takes one camp card. Unknown cards are ignored (returns the state unchanged).
export function chooseCamp(state, index) {
  const card = state?.camp?.[index];
  if (!card) return state;
  const next = { ...state, camp: null };
  if (card.type === "hero") {
    next.roster = [...state.roster, card.id];
    next.lives = Math.max(1, state.lives - EXPEDITION.recruitLives);
  }
  else if (card.type === "relic") next.relics = [...new Set([...state.relics, ...card.ids])];
  else if (card.type === "veteran") next.veterans = [...new Set([...state.veterans, ...state.roster])]; // Drill: the whole current roster
  return next;
}

// Save shape check. Returns a clean state or null.
export function sanitizeExpedition(value, { heroIds, mapIds, relicIds }) {
  if (!value || typeof value !== "object") return null;
  const ids = (list, known) => (Array.isArray(list) ? [...new Set(list)].filter((id) => known.has(id)) : []);
  const stages = ids(value.stages, mapIds);
  const roster = ids(value.roster, heroIds);
  if (!stages.length || !roster.length || !Number.isFinite(value.seed)) return null;
  const stage = Math.max(0, Math.min(stages.length - 1, Math.floor(Number(value.stage) || 0)));
  const camp = Array.isArray(value.camp)
    ? value.camp.filter((card) => card && ((card.type === "hero" && heroIds.has(card.id)) || (card.type === "relic" && Array.isArray(card.ids) && card.ids.every((id) => relicIds.has(id))) || (card.type === "veteran" && Array.isArray(card.ids))))
    : null;
  return {
    seed: value.seed >>> 0,
    stages,
    stage,
    roster,
    relics: ids(value.relics, relicIds),
    veterans: ids(value.veterans, new Set(roster)),
    lives: Math.max(1, Math.floor(Number(value.lives) || 1)),
    camp: camp?.length ? camp : null,
  };
}
