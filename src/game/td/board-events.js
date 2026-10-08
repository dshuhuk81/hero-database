// Chapter board events (G2 of TOWER_DEFENSE_GAMEPLAY_IDEAS.md): an environment can carry one
// telegraphed `event` (tdEnvironments.json) that changes the board during the stage, so
// positioning and relocation matter while the stage runs. Numbers live in the event entry;
// first guesses. Visuals: render.js draws one-off tile effects (lavaWarn, lavaBurst, flood,
// gearWarn) and every frame the standing tile states from boardEventMarks(); authored-fx.js plays
// the Effekseer clips (EVENT_ATLAS_FX). "Phase" is the environment phase (sim.environmentPhase:
// a new one every tuning.timeline.phaseSeconds, odd = 1, 3, ...).
//
// - eruption (Ashen Forge): every `every` s (first at `first`) `count` tiles are marked, hero tiles
//   first; `warn` s later lava bursts there: heroes still on them lose `damage` of max health.
// - flood (Tidal Ruins): each odd phase a stretch of `count` road tiles floods until the phase
//   ends. Ground enemies there move `slow` slower and are Wet; heroes in it deal `heroAttack` less.
// - frostbite (Frostbound): a hero that stays `after` s on one tile freezes over and attacks
//   `aps` slower until it moves; shrine tiles never freeze.
// - rod (Stormpeak): each phase one road or platform tile becomes a lightning rod. A hero on it
//   charges its ultimate `charge` faster, and every `every` s lightning strikes it for `damage`.
// - spores (Mycelium Hollow): every `every` s a mushroom grows on an empty inner road tile (at
//   most `max`); enemies on it heal `heal` of max health per second; a road hero on it tramples it.
// - prism (Crystal Vault): each phase `count` platform tiles become prisms; a hero on one also
//   strikes a second enemy in reach for `share` of each basic attack.
// - ghosts (Haunted Necropolis): a fallen ground enemy rises again `delay` s later with a
//   `chance`, as a ghost with `hp` of its health and no gold; a kill by an Assassin or Support
//   lays it to rest, ghosts never rise twice.
// - windfall (Autumn Sanctuary): every `every` s a fruit falls on an empty hero tile and lies for
//   `seconds`; a hero placed or moved onto it collects `nectar` Nectar.
// - alignment (Celestial Observatory): each phase one board row or column aligns; heroes standing
//   in it deal `attack` more damage.
// - gearjam (Clockwork Citadel): like eruption, but the marked tiles jam: a hero there cannot
//   attack for `seconds` (its ultimate keeps charging).
import { boardOf, cellAt } from "./board.js";
import { environmentFor } from "./environments.js";

export const boardEventFor = (map) => (boardOf(map) ? environmentFor(map)?.event ?? null : null);

const key = ([c, r]) => `${c},${r}`;
const unkey = (text) => text.split(",").map(Number);
const tileTopLeft = (board, [c, r]) => [board.origin[0] + c * board.cell, board.origin[1] + r * board.cell];
const tileCenter = (board, [c, r]) => [board.origin[0] + board.cell * (c + 0.5), board.origin[1] + board.cell * (r + 0.5)];
const area = (board, cells) => ({ cell: board.cell, cells: cells.map((cell) => tileTopLeft(board, cell)) });
const heroCell = (board, hero) => key(cellAt(board, hero.x, hero.y));
const placed = (hero) => Number.isFinite(hero?.x) && Number.isFinite(hero?.y);

export function newBoardEventState() {
  return { next: null, pending: [], phase: 0, flooded: null, frost: new Map(), rod: null, rodClock: 0, spores: new Set(),
    prisms: null, ghosts: [], fruit: null, line: null };
}

export function stepBoardEvents(game, dt) {
  const event = game.boardEvent;
  const board = boardOf(game.map);
  if (!event || !board || !game.started || game.complete) return;
  const state = game.boardEventState;
  const phase = game.environmentPhase();
  const newPhase = state.phase !== phase;
  state.phase = phase;
  STEPS[event.type]?.(game, event, board, state, dt, newPhase, phase);
}

const shuffle = (game, list) => {
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(game.rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
};
const pick = (game, list) => list[Math.floor(game.rng() * list.length)];
const heroTiles = (board) => [...(board.road ?? []), ...(board.platforms ?? [])];
const emitAt = (game, board, cell, effect) => {
  const [x, y] = tileCenter(board, cell);
  game.emit({ x, y, ...effect });
};

// Tiles with heroes first (shuffled), then other hero tiles of the board, never the same tile twice.
function markedCells(game, board, count) {
  const occupied = [...new Map(game.heroes.map((hero) => { const cell = cellAt(board, hero.x, hero.y); return [key(cell), cell]; })).values()];
  const taken = new Set(occupied.map(key));
  const rest = heroTiles(board).filter((cell) => !taken.has(key(cell)));
  return [...shuffle(game, occupied), ...shuffle(game, rest)].slice(0, count);
}

// Eruption and Gear Jam: mark tiles, then hit the heroes still on them.
function telegraphed(warnType, onHit, burstType) {
  return (game, event, board, state) => {
    state.next ??= event.first ?? event.every;
    if (game.time >= state.next) {
      state.next += event.every;
      const cells = markedCells(game, board, event.count);
      state.pending.push({ at: game.time + event.warn, cells });
      for (const cell of cells) emitAt(game, board, cell, { type: warnType, area: area(board, [cell]), life: event.warn, total: event.warn });
    }
    const due = state.pending.filter((entry) => entry.at <= game.time);
    if (!due.length) return;
    state.pending = state.pending.filter((entry) => entry.at > game.time);
    for (const { cells } of due) {
      const marked = new Set(cells.map(key));
      for (const hero of [...game.heroes]) if (marked.has(heroCell(board, hero))) onHit(game, event, hero);
      for (const cell of cells) emitAt(game, board, cell, { type: burstType, area: area(board, [cell]), life: 0.6 });
    }
  };
}

const STEPS = {
  eruption: telegraphed("lavaWarn", (game, event, hero) => game.damageHero(hero, hero.hp * event.damage, null), "lavaBurst"),

  gearjam: telegraphed("gearWarn", (game, event, hero) => { hero.rootedUntil = Math.max(hero.rootedUntil ?? 0, game.time + event.seconds); }, "gearJam"),

  flood(game, event, board, state, dt, newPhase, phase) {
    if (newPhase && phase % 2 === 1) {
      const road = board.road ?? [];
      const count = Math.min(event.count, road.length);
      // A stretch of road, never the first or last tile (spawn and base stay dry).
      const room = Math.max(1, road.length - count - 1);
      const start = Math.min(road.length - count, 1 + Math.floor(game.rng() * room));
      const cells = road.slice(start, start + count);
      state.flooded = new Set(cells.map(key));
      const left = phaseLeft(game);
      game.emit({ type: "flood", area: area(board, cells), x: 0, y: 0, life: left, total: left });
      for (const cell of cells) emitAt(game, board, cell, { type: "floodRise", life: 0.8 });
    } else if (newPhase) state.flooded = null;
    if (!state.flooded) return;
    for (const enemy of game.enemies) {
      if (enemy.dead || enemy.flying || enemy.stationary) continue;
      if (!state.flooded.has(key(cellAt(board, enemy.x, enemy.y)))) continue;
      enemy.floodedUntil = game.time + 0.2;
      enemy.wetUntil = Math.max(enemy.wetUntil ?? 0, game.time + (event.wetSeconds ?? 1));
    }
  },

  frostbite(game, event, board, state) {
    const seen = new Set();
    for (const hero of game.heroes) {
      seen.add(hero.entityId);
      const cell = heroCell(board, hero);
      const entry = state.frost.get(hero.entityId);
      if (!entry || entry.cell !== cell) { state.frost.set(hero.entityId, { cell, since: game.time, frozen: false }); continue; }
      if (entry.frozen || game.ringKind(hero.slotType, hero.slotIndex) === "shrine" || game.time - entry.since < event.after) continue;
      entry.frozen = true;
      emitAt(game, board, unkey(cell), { type: "frostSet", life: 0.8 });
    }
    for (const id of state.frost.keys()) if (!seen.has(id)) state.frost.delete(id);
  },

  rod(game, event, board, state, dt, newPhase) {
    if (newPhase) {
      state.rod = key(pick(game, heroTiles(board)));
      state.rodClock = event.every;
      emitAt(game, board, unkey(state.rod), { type: "rodStrike", life: 0.6 });
    }
    if (!state.rod) return;
    state.rodClock -= dt;
    if (state.rodClock > 0) return;
    state.rodClock = event.every;
    for (const hero of [...game.heroes]) if (heroCell(board, hero) === state.rod) game.damageHero(hero, hero.hp * event.damage, null);
    emitAt(game, board, unkey(state.rod), { type: "rodStrike", life: 0.6 });
  },

  spores(game, event, board, state, dt) {
    const road = (board.road ?? []).slice(1, -1);
    const heroAt = new Set(game.heroes.filter((hero) => hero.slotType === "road").map((hero) => heroCell(board, hero)));
    for (const cell of [...state.spores]) {
      if (!heroAt.has(cell)) continue;
      state.spores.delete(cell); // trampled
      emitAt(game, board, unkey(cell), { type: "sporeTrampled", life: 0.5 });
    }
    state.next ??= event.first ?? event.every;
    if (game.time >= state.next) {
      state.next += event.every;
      const free = road.filter((cell) => !heroAt.has(key(cell)) && !state.spores.has(key(cell)));
      if (free.length && state.spores.size < event.max) {
        const cell = pick(game, free);
        state.spores.add(key(cell));
        emitAt(game, board, cell, { type: "sporeGrow", life: 0.8 });
      }
    }
    if (!state.spores.size) return;
    for (const enemy of game.enemies) {
      if (enemy.dead || enemy.flying || enemy.stationary || enemy.hp >= enemy.maxHp) continue;
      if (state.spores.has(key(cellAt(board, enemy.x, enemy.y)))) enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * event.heal * dt);
    }
  },

  prism(game, event, board, state, dt, newPhase) {
    if (!newPhase) return;
    const cells = shuffle(game, [...(board.platforms ?? [])]).slice(0, event.count);
    state.prisms = new Set(cells.map(key));
    for (const cell of cells) emitAt(game, board, cell, { type: "prismOn", life: 0.8 });
  },

  ghosts(game, event, board, state) {
    const due = state.ghosts.filter((entry) => entry.at <= game.time);
    if (!due.length) return;
    state.ghosts = state.ghosts.filter((entry) => entry.at > game.time);
    for (const { kind, distance, lane, sway, statScale, maxHp } of due) {
      const ghost = game.spawnEnemy(kind, { distance, lane, sway, statScale, extra: { ghost: true } });
      ghost.maxHp = ghost.hp = maxHp * event.hp;
      ghost.reward = 0;
      game.emit({ type: "ghostRise", x: ghost.x, y: ghost.y, life: 0.8 });
    }
  },

  windfall(game, event, board, state) {
    const occupied = new Set(game.heroes.map((hero) => heroCell(board, hero)));
    if (state.fruit && occupied.has(state.fruit.cell)) {
      game.addPlacement(event.nectar);
      emitAt(game, board, unkey(state.fruit.cell), { type: "fruitTaken", amount: event.nectar, life: 0.8 });
      state.fruit = null;
    } else if (state.fruit && game.time >= state.fruit.until) state.fruit = null;
    state.next ??= event.first ?? event.every;
    if (game.time < state.next) return;
    state.next += event.every;
    if (state.fruit) return;
    const free = heroTiles(board).filter((cell) => !occupied.has(key(cell)));
    if (!free.length) return;
    const cell = pick(game, free);
    state.fruit = { cell: key(cell), until: game.time + event.seconds };
    emitAt(game, board, cell, { type: "fruitDrop", life: 0.8 });
  },

  alignment(game, event, board, state, dt, newPhase) {
    if (!newPhase) return;
    const column = game.rng() < 0.5;
    const index = Math.floor(game.rng() * (column ? board.cols : board.rows));
    state.line = { column, index };
    const cells = lineCells(board, state.line);
    for (const cell of cells.filter((cell) => heroTiles(board).some((tile) => key(tile) === key(cell)))) emitAt(game, board, cell, { type: "alignOn", life: 0.8 });
  },
};

const phaseLeft = (game) => {
  const seconds = game.tuning.timeline?.phaseSeconds ?? 20;
  return seconds - (game.time % seconds);
};
const lineCells = (board, line) => Array.from({ length: line.column ? board.rows : board.cols }, (_, i) => (line.column ? [line.index, i] : [i, line.index]));

// Hero stat factor from the board event (sim.environment): attack, aps, charge.
export function boardEventMultiplier(game, stat, hero) {
  const event = game.boardEvent;
  const state = game.boardEventState;
  if (!event || !state || !placed(hero) || !game.started) return 1;
  const board = boardOf(game.map);
  const cell = heroCell(board, hero);
  switch (event.type) {
    case "flood": return stat === "attack" && state.flooded?.has(cell) ? 1 - event.heroAttack : 1;
    case "frostbite": return stat === "aps" && state.frost.get(hero.entityId)?.frozen && state.frost.get(hero.entityId).cell === cell ? 1 - event.aps : 1;
    case "rod": return stat === "charge" && state.rod === cell ? 1 + event.charge : 1;
    case "alignment": {
      if (stat !== "attack" || !state.line) return 1;
      const [c, r] = cellAt(board, hero.x, hero.y);
      return (state.line.column ? c : r) === state.line.index ? 1 + event.attack : 1;
    }
    default: return 1;
  }
}

// Movement factor for an enemy standing in flood water.
export function floodPace(game, enemy) {
  return (enemy.floodedUntil ?? 0) > game.time ? 1 - (game.boardEvent?.slow ?? 0) : 1;
}

// Prism: the second enemy a hero's basic attack also strikes, and the share; null when none.
export function prismSplit(game, hero) {
  const event = game.boardEvent;
  if (event?.type !== "prism" || !game.boardEventState.prisms?.has(heroCell(boardOf(game.map), hero))) return null;
  return event.share;
}

// Necropolis: queue a fallen enemy's ghost (sim.killEnemy).
export function boardEventOnKill(game, enemy, hero) {
  const event = game.boardEvent;
  if (event?.type !== "ghosts" || !game.started) return;
  if (enemy.kind === "boss" || enemy.ghost || enemy.parentId || enemy.summonerId || enemy.splitFrom || enemy.flying || enemy.stationary) return;
  if (hero && (event.restClasses ?? ["Assassin", "Support"]).includes(hero.class)) return;
  if (game.rng() >= event.chance) return;
  game.boardEventState.ghosts.push({ at: game.time + event.delay, kind: enemy.kind, distance: enemy.distance, lane: enemy.lane ?? 0, sway: enemy.sway ?? 0, statScale: enemy.statScale ?? 1, maxHp: enemy.maxHp });
}

// Standing tile states for the renderer, every frame: [{ look, cells: [top-left], cell, progress }].
export function boardEventMarks(game) {
  const event = game.boardEvent;
  const state = game.boardEventState;
  const board = boardOf(game.map);
  if (!event || !state || !board || !game.started || game.god) return [];
  const mark = (look, cells, progress = 1) => ({ look, cell: board.cell, cells: cells.map((cell) => tileTopLeft(board, cell)), progress });
  switch (event.type) {
    case "frostbite": {
      const out = [];
      for (const hero of game.heroes) {
        const entry = state.frost.get(hero.entityId);
        if (!entry || game.ringKind(hero.slotType, hero.slotIndex) === "shrine") continue;
        const progress = entry.frozen ? 1 : (game.time - entry.since) / event.after;
        if (progress > 0.5) out.push(mark("frost", [unkey(entry.cell)], progress));
      }
      return out;
    }
    case "rod": return state.rod ? [mark("rod", [unkey(state.rod)], 1 - Math.max(0, state.rodClock) / event.every)] : [];
    case "spores": return state.spores.size ? [mark("spores", [...state.spores].map(unkey))] : [];
    case "prism": return state.prisms ? [mark("prism", [...state.prisms].map(unkey))] : [];
    case "windfall": return state.fruit ? [mark("fruit", [unkey(state.fruit.cell)], Math.max(0, state.fruit.until - game.time) / event.seconds)] : [];
    case "alignment": return state.line ? [mark("align", lineCells(board, state.line))] : [];
    case "gearjam": return game.heroes.filter((hero) => (hero.rootedUntil ?? 0) > game.time).map((hero) => mark("jam", [cellAt(board, hero.x, hero.y)]));
    default: return [];
  }
}
