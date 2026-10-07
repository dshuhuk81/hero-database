// God-Mode arena layout: a fixed 9 x 4 board below the boss's parapet. The boss is not on the board;
// it sits behind the wall and is hit through the five target anchors (bossTargets).
//
//   P  platform (side balconies and side platforms)
//   M  melee front
//   H  raised gallery (bottom row)
//   .  void, no placement
//
// Every hero can take boss damage, whatever the cell type.

export const GOD_ARENA = {
  columns: 9,
  bossTargets: 5,
  rows: [
    "P.......P", // side balconies
    ".PMMMMMP.", // side platforms and melee front
    "..P...P..", // further side platforms
    "..HHHHH..", // raised gallery
  ],
  legend: { P: "platform", M: "melee front", H: "raised gallery", ".": "void" },
};

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
