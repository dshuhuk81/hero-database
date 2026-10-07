// God-Mode challenge: a stationary god on a fixed arena board, a timer and a damage score.
// The rules live in tdGodMode.json, the arena layout in god-mode-arena.js; this builds the map
// record the sim and the renderer read (a normal board map plus a `god` block).
import data from "../../data/tdGodMode.json" with { type: "json" };
import { godBoard } from "./god-mode-arena.js";
import { buildGrid } from "./grid.js";
import { cellCenter } from "./board.js";

export const godChallenges = data.challenges;

export function godChallenge(id) {
  return godChallenges.find((challenge) => challenge.id === id) ?? null;
}

// The map record for a challenge: the board with its slots and rings, a hidden one-step route
// (the engine expects a lane; the god never walks it) and the `god` rules with the boss cells.
export function godMapFor(challenge) {
  const { board, boss } = godBoard();
  const centres = boss.map((cell) => cellCenter(board, cell));
  const x = Math.round(centres.reduce((sum, [cx]) => sum + cx, 0) / centres.length);
  const y = Math.round(centres.reduce((sum, [, cy]) => sum + cy, 0) / centres.length);
  const map = {
    id: `god-${challenge.id}`,
    name: `${challenge.name}, ${challenge.title}`,
    boss: challenge.id,
    godOnly: true,
    campaignOnly: true,
    base: { x, y: y + 1 },
    spawn: { x, y },
    path: [[x, y], [x, y + 1]],
    grid: { board },
    enemyHp: 1,
  };
  return { ...map, ...buildGrid(map), god: { ...challenge, cells: boss, x, y } };
}
