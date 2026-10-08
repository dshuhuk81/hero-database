// Chapter board events (G2 of TOWER_DEFENSE_GAMEPLAY_IDEAS.md): an environment can carry one
// telegraphed `event` (tdEnvironments.json) that changes the board during the stage, so
// positioning and relocation matter while the stage runs. Numbers live in the event entry;
// first guesses. Effects: render.js draws the tile marks, authored-fx.js plays the Effekseer
// clips (EVENT_ATLAS_FX lavaWarn, lavaBurst, floodRise).
//
// - eruption (Ashen Forge): every `every` seconds (first at `first`) `count` tiles are marked,
//   tiles with heroes first; `warn` seconds later lava erupts there and every hero still on a
//   marked tile loses `damage` of its maximum health.
// - flood (Tidal Ruins): at each high tide (odd environment phase) a stretch of `count` road
//   tiles floods until the tide turns. Ground enemies there move `slow` slower and are Wet;
//   heroes standing in it deal `heroAttack` less damage.
import { boardOf, cellAt } from "./board.js";
import { environmentFor } from "./environments.js";

export const boardEventFor = (map) => (boardOf(map) ? environmentFor(map)?.event ?? null : null);

const key = ([c, r]) => `${c},${r}`;
const tileTopLeft = (board, [c, r]) => [board.origin[0] + c * board.cell, board.origin[1] + r * board.cell];
const tileCenter = (board, [c, r]) => [board.origin[0] + board.cell * (c + 0.5), board.origin[1] + board.cell * (r + 0.5)];
const area = (board, cells) => ({ cell: board.cell, cells: cells.map((cell) => tileTopLeft(board, cell)) });

export function newBoardEventState() {
  return { next: null, pending: [], flooded: null, floodPhase: 0 };
}

export function stepBoardEvents(game, dt) {
  const event = game.boardEvent;
  const board = boardOf(game.map);
  if (!event || !board || !game.started || game.complete) return;
  if (event.type === "eruption") stepEruption(game, event, board);
  else if (event.type === "flood") stepFlood(game, event, board, dt);
}

function stepEruption(game, event, board) {
  const state = game.boardEventState;
  state.next ??= event.first ?? event.every;
  if (game.time >= state.next) {
    state.next += event.every;
    const cells = eruptionCells(game, event, board);
    state.pending.push({ at: game.time + event.warn, cells });
    for (const cell of cells) {
      const [x, y] = tileCenter(board, cell);
      game.emit({ type: "lavaWarn", x, y, area: area(board, [cell]), life: event.warn, total: event.warn });
    }
  }
  const due = state.pending.filter((entry) => entry.at <= game.time);
  if (!due.length) return;
  state.pending = state.pending.filter((entry) => entry.at > game.time);
  for (const { cells } of due) {
    const marked = new Set(cells.map(key));
    for (const hero of [...game.heroes]) {
      if (marked.has(key(cellAt(board, hero.x, hero.y)))) game.damageHero(hero, hero.hp * event.damage, null);
    }
    for (const cell of cells) {
      const [x, y] = tileCenter(board, cell);
      game.emit({ type: "lavaBurst", x, y, area: area(board, [cell]), life: 0.6 });
    }
  }
}

// Tiles with heroes first (shuffled), then other hero tiles of the board, never the same tile twice.
function eruptionCells(game, event, board) {
  const shuffle = (list) => {
    for (let i = list.length - 1; i > 0; i -= 1) {
      const j = Math.floor(game.rng() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
  };
  const occupied = [...new Map(game.heroes.map((hero) => { const cell = cellAt(board, hero.x, hero.y); return [key(cell), cell]; })).values()];
  const taken = new Set(occupied.map(key));
  const rest = [...(board.road ?? []), ...(board.platforms ?? [])].filter((cell) => !taken.has(key(cell)));
  return [...shuffle(occupied), ...shuffle(rest)].slice(0, event.count);
}

function stepFlood(game, event, board) {
  const state = game.boardEventState;
  const phase = game.environmentPhase();
  const high = phase % 2 === 1;
  if (high && state.floodPhase !== phase) {
    state.floodPhase = phase;
    const road = board.road ?? [];
    const count = Math.min(event.count, road.length);
    // A stretch of road, never the first or last tile (spawn and base stay dry).
    const room = Math.max(1, road.length - count - 1);
    const start = Math.min(road.length - count, 1 + Math.floor(game.rng() * room));
    const cells = road.slice(start, start + count);
    state.flooded = new Set(cells.map(key));
    const seconds = game.tuning.timeline?.phaseSeconds ?? 20;
    const left = seconds - (game.time % seconds);
    game.emit({ type: "flood", area: area(board, cells), x: 0, y: 0, life: left, total: left });
    for (const cell of cells) {
      const [x, y] = tileCenter(board, cell);
      game.emit({ type: "floodRise", x, y, life: 0.8 });
    }
  } else if (!high && state.flooded) {
    state.flooded = null;
  }
  if (!state.flooded) return;
  for (const enemy of game.enemies) {
    if (enemy.dead || enemy.flying || enemy.stationary) continue;
    if (!state.flooded.has(key(cellAt(board, enemy.x, enemy.y)))) continue;
    enemy.floodedUntil = game.time + 0.2;
    enemy.wetUntil = Math.max(enemy.wetUntil ?? 0, game.time + (event.wetSeconds ?? 1));
  }
}

// Movement factor for an enemy standing in flood water.
export function floodPace(game, enemy) {
  return (enemy.floodedUntil ?? 0) > game.time ? 1 - (game.boardEvent?.slow ?? 0) : 1;
}

// Attack factor for a hero standing in flood water.
export function floodAttack(game, hero) {
  const flooded = game.boardEventState?.flooded;
  const board = flooded && hero ? boardOf(game.map) : null;
  return board && flooded.has(key(cellAt(board, hero.x, hero.y))) ? 1 - (game.boardEvent.heroAttack ?? 0) : 1;
}
