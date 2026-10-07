// God-Mode arena layout: a fixed 9 x 3 playable board, 90 px cells, origin (75, 266).
// The god stands behind the parapet and owns five invisible target cells in row -1.
// Row -1 keeps the same world-space hit positions as the former visible first row.
//
//   P  platform tile (side platforms)
//   M  melee front, a road tile
//   H  raised gallery: a platform tile with the high-ground ring
//   .  void, no placement
//
// Every hero can take boss damage, whatever the cell type.

export const GOD_ARENA = {
  columns: 9,
  cell: 90,
  origin: [75, 266],
  bossTargets: 5,
  rows: [
    ".PMMMMMP.", // side platforms and melee front
    "..P...P..", // further side platforms
    "..HHHHH..", // raised gallery
  ],
  legend: { P: "platform", M: "melee front", H: "raised gallery", ".": "void" },
};

// The arena as a `grid.board` record (board.js): road tiles for M, platform tiles for P and H
// (listed in reading order), high-ground rings on H, and off-board boss target cells.
export function godBoard() {
  const road = [], platforms = [], rings = [];
  GOD_ARENA.rows.forEach((row, r) => [...row].forEach((type, c) => {
    if (type === "M") road.push([c, r]);
    else if (type === "P" || type === "H") platforms.push([c, r]);
    if (type === "H") rings.push({ type: "platform", cell: [c, r], kind: "highground" });
  }));
  const boss = Array.from({ length: GOD_ARENA.bossTargets }, (_, i) => [i + 2, -1]);
  return { board: { cell: GOD_ARENA.cell, cols: GOD_ARENA.columns, rows: GOD_ARENA.rows.length, origin: GOD_ARENA.origin, road, platforms, rings }, boss };
}

// Board trapezoid in canvas px; `edge` is the y of the wall side, the far edge of the board.
const TOP_X = [102, 858];
const BASE_X = [10, 950];
const BASE_Y = 536;

// Projects the grid onto the trapezoid and returns one entry per cell with its quad and centre.
export function arenaCells(edge) {
  const depth = BASE_Y - edge;
  const rowCount = GOD_ARENA.rows.length;
  const cols = GOD_ARENA.columns;
  const span = (y) => {
    const t = (y - edge) / depth;
    return [TOP_X[0] + (BASE_X[0] - TOP_X[0]) * t, TOP_X[1] + (BASE_X[1] - TOP_X[1]) * t];
  };
  const cells = [];
  GOD_ARENA.rows.forEach((row, r) => {
    const y0 = edge + (depth * r) / rowCount;
    const y1 = edge + (depth * (r + 1)) / rowCount;
    const [l0, r0] = span(y0);
    const [l1, r1] = span(y1);
    [...row].forEach((type, c) => {
      const quad = [
        l0 + ((r0 - l0) * c) / cols, y0,
        l0 + ((r0 - l0) * (c + 1)) / cols, y0,
        l1 + ((r1 - l1) * (c + 1)) / cols, y1,
        l1 + ((r1 - l1) * c) / cols, y1,
      ];
      const cx = (quad[0] + quad[2] + quad[4] + quad[6]) / 4;
      const cy = (quad[1] + quad[3] + quad[5] + quad[7]) / 4;
      cells.push({ col: c, row: r, type, quad, cx, cy });
    });
  });
  return cells;
}

export function cellAt(cells, col, row) {
  return cells.find((cell) => cell.col === col && cell.row === row);
}

// Pulls a quad towards its centre so neighbouring tiles leave a gap.
export function insetQuad(cell, factor = 0.9) {
  const out = [];
  for (let i = 0; i < 8; i += 2) {
    out.push(cell.cx + (cell.quad[i] - cell.cx) * factor, cell.cy + (cell.quad[i + 1] - cell.cy) * factor);
  }
  return out;
}
