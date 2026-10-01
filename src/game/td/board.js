// Compact board prototype (TOWER_DEFENSE_GAMEPLAY_IDEAS.md section F, step 2): a map with
// `grid.board` lays its tiles on a coarse lattice of square cells, and with
// `rules.patterns` each hero's basic attack reaches a pattern of cells instead of a circle.
// Pure helpers, shared by grid.js (tiles), sim.js (targeting) and render.js (highlight).

// Named patterns as cell offsets from the hero's own cell. All symmetric: heroes do not turn.
const square = (n) => {
  const out = [];
  for (let dc = -n; dc <= n; dc++) for (let dr = -n; dr <= n; dr++) out.push([dc, dr]);
  return out;
};
const diamond = (n) => square(n).filter(([dc, dr]) => Math.abs(dc) + Math.abs(dr) <= n);
const cross = (n) => square(n).filter(([dc, dr]) => dc === 0 || dr === 0);

export const PATTERNS = {
  plus: diamond(1), // own cell and the four next to it
  block: square(1), // 3 x 3
  diamond2: diamond(2), // 13 cells
  cross3: [...new Map([...cross(3), ...square(1)].map((o) => [o.join(","), o])).values()], // long cross over a 3 x 3 core
  block2: square(2), // 5 x 5
};

// map.grid.board: { cell, cols, rows, origin: [x0, y0] } (origin = top-left corner, world px).
export const boardOf = (map) => map?.grid?.board ?? null;

export const cellCenter = (board, [c, r]) => [board.origin[0] + board.cell * (c + 0.5), board.origin[1] + board.cell * (r + 0.5)];

export function cellAt(board, x, y) {
  return [Math.floor((x - board.origin[0]) / board.cell), Math.floor((y - board.origin[1]) / board.cell)];
}

export const onBoard = (board, [c, r]) => c >= 0 && r >= 0 && c < board.cols && r < board.rows;

// Rules for a board map: tuning.board (shared by every board) with the map's own `rules`
// on top, one level deep. Maps without `grid.board` get null and play with circles.
export function boardRules(map, tuning) {
  if (!boardOf(map)) return null;
  const shared = tuning?.board ?? {};
  const own = map.rules ?? {};
  const out = { ...shared, ...own };
  for (const key of Object.keys(own)) {
    if (shared[key] && typeof shared[key] === "object" && typeof own[key] === "object") out[key] = { ...shared[key], ...own[key] };
  }
  return out;
}

// Pattern name for a class under these board rules, or null (range circle).
export function patternFor(rules, heroClass) {
  const name = rules?.patterns?.[heroClass];
  return name && PATTERNS[name] ? name : null;
}

// The board cells a pattern covers from a hero standing at (x, y).
export function patternCells(board, name, x, y) {
  const [c, r] = cellAt(board, x, y);
  return (PATTERNS[name] ?? []).map(([dc, dr]) => [c + dc, r + dr]).filter((cell) => onBoard(board, cell));
}

// Whether a point (an enemy) is inside a hero's pattern.
export function inPattern(board, name, hx, hy, x, y) {
  const [hc, hr] = cellAt(board, hx, hy);
  const [c, r] = cellAt(board, x, y);
  return (PATTERNS[name] ?? []).some(([dc, dr]) => hc + dc === c && hr + dr === r);
}

// A pattern as a small inline SVG grid for the UI (recruit card, hero panel): the hero's own
// cell in gold, the cells it reaches in green, on the smallest square that holds the pattern.
export function patternSvg(name, cell = 7) {
  const offsets = PATTERNS[name];
  if (!offsets) return "";
  const n = Math.max(...offsets.map(([dc, dr]) => Math.max(Math.abs(dc), Math.abs(dr))));
  const size = (2 * n + 1) * cell;
  const covered = new Set(offsets.map((o) => o.join(",")));
  let rects = "";
  for (let dr = -n; dr <= n; dr++) for (let dc = -n; dc <= n; dc++) {
    const own = dc === 0 && dr === 0;
    const fill = own ? "#f2c35a" : covered.has(`${dc},${dr}`) ? "#5fd67a" : "rgba(255,255,255,0.12)";
    rects += `<rect x="${(dc + n) * cell + 0.5}" y="${(dr + n) * cell + 0.5}" width="${cell - 1}" height="${cell - 1}" rx="1" fill="${fill}"/>`;
  }
  return `<svg class="td-pattern-grid" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="Attack pattern: ${offsets.length} tiles">${rects}</svg>`;
}
