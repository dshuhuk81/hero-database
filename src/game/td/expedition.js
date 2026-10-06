// Expedition (M21): a roguelite chain of stages on EXPEDITION.stages battlefields (each plays the map's own timeline). It starts
// with three random heroes; after each won stage the camp offers three cards (a new hero,
// a relic or a veteran) and the player takes one. Lives carry over between stages, gold
// does not, and every stage is tougher than the last. Relics are the rare and epic run
// blessings of M17, active from the start. Pure logic; the page module is page/expedition.ts
// and the in-progress state lives in the td:v1 save.
import { createRng } from "./sim.js";

export const EXPEDITION = {
  startHeroes: 3, // at least one road and one platform hero
  // Route length is a content setting (audit step 4): an expedition draws this many distinct
  // battlefields, so a new map adds variety, not duration. One stageHp entry per stage.
  stages: 3,
  stageHp: [0.35, 0.5, 0.65], // enemy health per stage, on top of the Normal difficulty
  veteranBonus: 0.1, // veterans gain this much attack and max HP for the rest of the expedition
  completeFavor: 300, // once per finished expedition, on top of each stage's normal Favor
  recruitLives: 5, // a new hero costs this many of the carried-over lives (one shown life, never below 1)
};

// Only platform heroes reach flyers, and a Support there barely hurts: air damage is a Mage or Archer.
const isShooter = (hero) => hero?.slot === "platform" && (hero.class === "Mage" || hero.class === "Archer");

function pickFrom(list, rng) {
  return list.splice(Math.floor(rng() * list.length), 1)[0];
}

// Seed for a stage or camp: the expedition seed mixed with the stage number and a salt.
const mix = (seed, stage, salt) => (Math.imul(seed ^ (stage + 1) * 0x9e3779b1, 0x85ebca6b) ^ salt) >>> 0;

// A new expedition. `maps` is the battlefield pool (EXPEDITION.stages drawn in random order),
// `heroes` the roster pool (the page passes the owned heroes).
export function newExpedition(seed, { heroes, maps, tuning }) {
  const rng = createRng(seed >>> 0);
  // Campaign-only battlefields (tdMaps.json campaignOnly) stay out of the expedition pool.
  const order = maps.filter((map) => !map.campaignOnly).map((map) => map.id);
  const stages = [];
  while (order.length && stages.length < EXPEDITION.stages) stages.push(pickFrom(order, rng));
  const road = heroes.filter((hero) => hero.slot === "road").map((hero) => hero.id);
  const platform = heroes.filter((hero) => hero.slot === "platform").map((hero) => hero.id);
  // One road hero and one platform hero when the pool has both (a small owned collection may not);
  // the platform one is a Mage or Archer when owned, so flyers in any stage can be shot down.
  const shooters = heroes.filter(isShooter).map((hero) => hero.id);
  const air = shooters.length ? pickFrom(shooters, rng) : pickFrom(platform, rng);
  if (platform.includes(air)) platform.splice(platform.indexOf(air), 1);
  const roster = [pickFrom(road, rng), air].filter(Boolean);
  const rest = [...road, ...platform];
  while (roster.length < EXPEDITION.startHeroes && rest.length) roster.push(pickFrom(rest, rng));
  return { seed: seed >>> 0, stages, stage: 0, roster, relics: [], veterans: [], lives: tuning.run.lives, camp: null };
}

export const stageCount = (state) => state.stages.length;
export const isFinished = (state) => state.stage >= state.stages.length;

// Options for new TowerDefenseGame(...) on top of heroes, tuning and map; the page adds the map's timeline.
export function stageGameOptions(state) {
  return {
    tier: "normal",
    seed: mix(state.seed, state.stage, 0x51ed27),
    allowedHeroes: state.roster,
    boons: state.relics,
    heroBonuses: Object.fromEntries(state.veterans.map((id) => [id, { atk: EXPEDITION.veteranBonus, hp: EXPEDITION.veteranBonus }])),
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
    case "chain": return state.roster.includes("odin");
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
  // A new hero, from the slot type the roster has fewer of; a roster without a Mage or Archer
  // (older saves) is offered one first.
  const want = road <= platform ? "road" : "platform";
  const fresh = heroes.filter((hero) => !state.roster.includes(hero.id));
  const needAir = !state.roster.some((id) => isShooter(heroesById.get(id))) && fresh.some(isShooter);
  const preferred = needAir ? fresh.filter(isShooter) : fresh.filter((hero) => hero.slot === want);
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
