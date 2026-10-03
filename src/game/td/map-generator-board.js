// Map generator `board-v1` (docs/tower-defense-board-plan.md step 2): compact boards for the
// tile-pattern combat (board.js). The map is a coarse lattice of square cells; the road runs
// from cell to cell, ranged tiles come in a few blocks, and every map gets a layout signature
// so no two maps share a layout (owner requirement B).
//
// Board sizes: 8 x 4 (Chapter 1 and tutorials), 9 x 5 (standard), 10 x 5 (finales).
// Topologies: 1 to 3 gates on the left, top or bottom edge; with several gates the lanes have
// exactly the same length and merge at a junction, then share a tail with at least one corner
// to the base (the multi-entry rules in map-validation.js). The road stays one cell wide:
// two road cells side by side are always consecutive on a lane.
//
// Pure and deterministic like lattice-v2: the same recipe yields the same geometry.
import { buildGrid } from "./grid.js";
import { validateMap } from "./map-validation.js";
import { createRng } from "./sim.js";

export const BOARD_GENERATOR_ID = "board-v1";
export const BOARD_GENERATOR_RULESET = 1;

const WORLD = [960, 540];
// Per size: board cells, route length per lane in cells, platform cells, platform blocks.
export const BOARD_SIZES = {
  "8x4": { cols: 8, rows: 4, length: [8, 13], platforms: [8, 12], blocks: [3, 4] },
  "9x5": { cols: 9, rows: 5, length: [10, 17], platforms: [10, 15], blocks: [3, 5] },
  "6x3": { cols: 6, rows: 3, length: [6, 9], platforms: [5, 8], blocks: [2, 3] }, // R18 prototype: big slabs, few tiles
  "10x5": { cols: 10, rows: 5, length: [11, 19], platforms: [12, 17], blocks: [4, 5] },
};
const ATTEMPTS = 600;
const WALK_BUDGET = 20000;

// Block shapes as cell offsets (all orientations listed).
const SHAPES = [
  [[0, 0], [1, 0], [0, 1], [1, 1]], // 2 x 2
  [[0, 0], [1, 0], [2, 0]], [[0, 0], [0, 1], [0, 2]], // row of 3
  [[0, 0], [1, 0], [0, 1]], [[0, 0], [1, 0], [1, 1]], [[0, 0], [0, 1], [1, 1]], [[1, 0], [0, 1], [1, 1]], // L
  [[0, 0], [1, 0]], [[0, 0], [0, 1]], // pair
  [[0, 0]], // single
];

export function boardGeometry(size) {
  const spec = BOARD_SIZES[size];
  if (!spec) return null;
  const cell = Math.min(Math.floor((WORLD[0] - 16) / spec.cols), Math.floor((WORLD[1] - 16) / spec.rows));
  const origin = [Math.round((WORLD[0] - cell * spec.cols) / 2), Math.round((WORLD[1] - cell * spec.rows) / 2)];
  return { ...spec, cell, origin };
}

const key = ([c, r]) => `${c},${r}`;
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const add = ([c, r], [dc, dr]) => [c + dc, r + dr];
const same = (a, b) => a[0] === b[0] && a[1] === b[1];
const manhattan = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
const pick = (rng, list) => list[Math.floor(rng() * list.length)];
function shuffle(rng, list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}
const around8 = ([c, r]) => {
  const out = [];
  for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) if (dc || dr) out.push([c + dc, r + dr]);
  return out;
};
const turnsOf = (cells) => {
  let turns = 0;
  for (let i = 2; i < cells.length; i++) {
    const d1 = [cells[i - 1][0] - cells[i - 2][0], cells[i - 1][1] - cells[i - 2][1]];
    const d2 = [cells[i][0] - cells[i - 1][0], cells[i][1] - cells[i - 1][1]];
    if (d1[0] !== d2[0] || d1[1] !== d2[1]) turns++;
  }
  return turns;
};

function gateCells(side, g) {
  const out = [];
  const half = Math.floor(g.cols / 2);
  if (side === "left") for (let r = 0; r < g.rows; r++) out.push([0, r]);
  if (side === "top") for (let c = 1; c < half; c++) out.push([c, 0]);
  if (side === "bottom") for (let c = 1; c < half; c++) out.push([c, g.rows - 1]);
  return out;
}

// Randomized depth-first walk from `from` to `to` with a cell count in [min, max]. A new cell
// may touch (side by side) only the cell it came from among `road` cells and earlier walk
// cells, except `to`, which it reaches as the last step. Returns the cells or null.
function walk(rng, g, from, to, { min, max, road, minTurns = 0, firstDir = null }) {
  const inBoard = ([c, r]) => c >= 0 && r >= 0 && c < g.cols && r < g.rows;
  const used = new Set(road);
  let budget = WALK_BUDGET;
  const path = [from];
  const onPath = new Set([key(from)]);
  const touches = (cell, prev) => DIRS.some((d) => {
    const n = add(cell, d);
    if (same(n, prev) || same(n, to)) return false;
    return onPath.has(key(n)) || used.has(key(n));
  });
  const step = () => {
    if (--budget <= 0) return false;
    const cur = path[path.length - 1];
    if (same(cur, to)) return path.length >= min && turnsOf(path) >= minTurns;
    const left = max - path.length;
    if (manhattan(cur, to) > left) return false;
    // Next to the end cell the walk must step into it, so the end touches only its last cell.
    const options = manhattan(cur, to) === 1 ? [[to[0] - cur[0], to[1] - cur[1]]] : path.length === 1 && firstDir ? [firstDir] : shuffle(rng, DIRS);
    for (const d of options) {
      const n = add(cur, d);
      if (!inBoard(n) || onPath.has(key(n)) || used.has(key(n))) continue;
      if (!same(n, to) && touches(n, cur)) continue;
      if (same(n, to) && path.length + 1 < min) continue;
      if (!same(n, to) && manhattan(n, to) === 1 && path.length + 2 < min) continue;
      path.push(n); onPath.add(key(n));
      if (step()) return true;
      path.pop(); onPath.delete(key(n));
    }
    return false;
  };
  return step() ? path : null;
}

// Cells to the world path of a lane: the spawn sits 0.3 cell outside the gate cell's centre
// toward the board edge, then one point per corner, ending at the base cell centre.
function lanePath(cells, g, side) {
  const center = ([c, r]) => [g.origin[0] + g.cell * (c + 0.5), g.origin[1] + g.cell * (r + 0.5)];
  const out = [center(cells[0])];
  for (let i = 1; i < cells.length - 1; i++) {
    const a = cells[i - 1], b = cells[i], c = cells[i + 1];
    if ((b[0] - a[0]) !== (c[0] - b[0]) || (b[1] - a[1]) !== (c[1] - b[1])) out.push(center(b));
  }
  out.push(center(cells[cells.length - 1]));
  const shift = Math.round(g.cell * 0.3);
  if (side === "left") out[0][0] -= shift;
  if (side === "top") out[0][1] -= shift;
  if (side === "bottom") out[0][1] += shift;
  return out.map(([x, y]) => [Math.round(x), Math.round(y)]);
}

// The first step from a gate goes straight into the board, so the spawn segment is straight.
const INWARD = { left: [1, 0], top: [0, 1], bottom: [0, -1] };

function sideOf(cell, g) {
  if (cell[0] === 0) return "left";
  if (cell[1] === 0) return "top";
  return cell[1] === g.rows - 1 ? "bottom" : "left";
}

function checkRecipe(recipe) {
  return recipe?.generator === BOARD_GENERATOR_ID && recipe.ruleset === BOARD_GENERATOR_RULESET && Number.isInteger(recipe.seed)
    && !!BOARD_SIZES[recipe.size] && [1, 2, 3].includes(recipe.gates)
    && Array.isArray(recipe.entry) && recipe.entry.length > 0 && recipe.entry.every((e) => ["left", "top", "bottom"].includes(e));
}

// The lanes (cell lists, gate first, base last) for one attempt, or a rejection code.
function routeLanes(rng, g, recipe) {
  const [minLen, maxLen] = BOARD_SIZES[recipe.size].length;
  const bases = [];
  for (let c = g.cols - 2; c < g.cols; c++) for (let r = 1; r < g.rows - 1; r++) bases.push([c, r]);
  const base = pick(rng, bases);
  if (recipe.gates === 1) {
    const side = pick(rng, recipe.entry);
    const gate = pick(rng, gateCells(side, g));
    const cells = walk(rng, g, gate, base, { min: minLen, max: maxLen, road: [], minTurns: 2, firstDir: INWARD[side] });
    return cells ? { lanes: [cells], base } : "ROUTE_STUCK";
  }
  if (recipe.gates === 3) return threeGateLanes(rng, g, recipe, base);
  // Several gates: a tail junction -> base with a corner, then equal branches gate -> junction.
  const junctions = [];
  for (let c = 2; c < g.cols - 3; c++) for (let r = 0; r < g.rows; r++) junctions.push([c, r]);
  const junction = pick(rng, junctions);
  const tail = walk(rng, g, junction, base, { min: 3, max: Math.max(4, Math.floor(maxLen / 2)), road: [], minTurns: 1 });
  if (!tail) return "TAIL_STUCK";
  const sides = shuffle(rng, recipe.entry);
  const gates = [];
  const gateSides = [];
  // Equal branches need every gate at the same distance parity from the junction.
  const parity = (cell) => manhattan(cell, junction) % 2;
  for (let i = 0; i < recipe.gates; i++) {
    const side = sides[i % sides.length];
    gateSides.push(side);
    const options = gateCells(side, g).filter((cell) => !gates.some((other) => manhattan(other, cell) < 2)
      && (!gates.length || parity(cell) === parity(gates[0]))
      && !tail.some((t) => manhattan(t, cell) < 2));
    const gate = pick(rng, options);
    if (!gate) return "NO_GATE";
    gates.push(gate);
  }
  const far = Math.max(...gates.map((gate) => manhattan(gate, junction)));
  // Branch cell count k (gate .. junction): same for every gate; parity must fit each gate.
  const parityOk = (k) => gates.every((gate) => (k - 1 - manhattan(gate, junction)) % 2 === 0);
  const ks = [];
  // Several gates may run a little longer than one (each lane needs room to reach the junction).
  const longest = maxLen + 2 * (recipe.gates - 1);
  for (let k = far + 1; k + tail.length - 1 <= longest; k++) if (k + tail.length - 1 >= minLen && parityOk(k)) ks.push(k);
  if (!ks.length) return "NO_BRANCH_LENGTH";
  const k = pick(rng, ks.slice(0, 3));
  const road = tail.slice(1).map(key);
  const branches = [];
  for (const [i, gate] of gates.entries()) {
    const branch = walk(rng, g, gate, junction, { min: k, max: k, road: [...road, ...branches.flatMap((b) => b.slice(0, -1).map(key))], firstDir: INWARD[gateSides[i]] });
    if (!branch) return "BRANCH_STUCK";
    branches.push(branch);
  }
  // Branches must enter the junction from different sides than the tail leaves it.
  const entries = branches.map((b) => key(b[b.length - 2]));
  if (new Set(entries).size !== entries.length || entries.includes(key(tail[1]))) return "JUNCTION_CROWDED";
  return { lanes: branches.map((b) => [...b, ...tail.slice(1)]), base };
}

// Three gates with two merge points (three one-cell lanes rarely meet at one junction on a
// board five cells tall): gates A and B merge at J1, a middle road J1 -> J2, gate C merges at
// J2, and a tail J2 -> base with a corner. Lane lengths may differ. Each junction is entered
// from distinct sides. Returns { lanes, base } or a rejection code.
function threeGateLanes(rng, g, recipe, base) {
  const [minLen, maxLen] = BOARD_SIZES[recipe.size].length;
  const longest = maxLen + 4;
  const j2s = [], j1s = [];
  for (let c = 4; c < g.cols - 2; c++) for (let r = 0; r < g.rows; r++) j2s.push([c, r]);
  const j2 = pick(rng, j2s);
  const tail = walk(rng, g, j2, base, { min: 3, max: Math.max(4, Math.floor(maxLen / 2)), road: [], minTurns: 1 });
  if (!tail) return "TAIL_STUCK";
  for (let c = 2; c < j2[0]; c++) for (let r = 0; r < g.rows; r++) if (manhattan([c, r], j2) >= 2) j1s.push([c, r]);
  const j1 = pick(rng, j1s);
  if (!j1) return "NO_JUNCTION";
  const tailRoad = tail.slice(1).map(key);
  const mid = walk(rng, g, j1, j2, { min: Math.max(3, manhattan(j1, j2) + 1), max: manhattan(j1, j2) + 3, road: tailRoad });
  if (!mid) return "MIDDLE_STUCK";
  const taken = new Set([...tail, ...mid].map(key));
  const clear = (cell) => !taken.has(key(cell)) && ![...tail, ...mid].some((t) => manhattan(t, cell) < 2);
  // C enters J2 from the side the middle road and the tail leave free, so its gate sits on
  // the edge facing that side; it is built before A and B, which then route around it.
  const used = [mid.at(-2), tail[1]].map((n) => [n[0] - j2[0], n[1] - j2[1]].join(","));
  const free = DIRS.filter((d) => !used.includes(d.join(",")));
  const sideFor = { "0,-1": "top", "0,1": "bottom", "-1,0": "left" };
  const sideC = pick(rng, free.map((d) => sideFor[d.join(",")]).filter((side) => side && recipe.entry.includes(side)));
  if (!sideC) return "NO_GATE";
  const otherSides = shuffle(rng, recipe.entry.filter((side) => side !== sideC));
  const sideA = otherSides[0] ?? sideC, sideB = otherSides[1 % Math.max(1, otherSides.length)] ?? sideA;
  // C may also use top or bottom tiles up to J2's column (the left-half rule is for A and B).
  const cGates = (side) => side === "left" ? gateCells(side, g) : Array.from({ length: Math.max(0, j2[0]) }, (_, i) => [i + 1, side === "top" ? 0 : g.rows - 1]).filter(([col]) => col < g.cols - 2);
  const gateFor = (side, junction, others, ok, cells = gateCells(side, g)) => pick(rng, cells.filter((cell) => clear(cell)
    && !others.some((o) => manhattan(o, cell) < 2) && ok(manhattan(cell, junction))));
  const tailRoadC = [...tailRoad, ...mid.slice(0, -1).map(key)];
  // Lanes may differ in length (the sim ranks targets by distance still to go), so each
  // branch walks a length range from its gate. C is walked first, A and B route around it.
  const c = gateFor(sideC, j2, [], (d) => d >= 2, cGates(sideC));
  if (!c) return "NO_GATE";
  const branchC = walk(rng, g, c, j2, { min: manhattan(c, j2) + 1, max: manhattan(c, j2) + 5, road: tailRoadC, firstDir: INWARD[sideC] });
  if (!branchC) return "BRANCH_C_STUCK";
  const cRoad = branchC.slice(0, -1).map(key);
  // A and B gates keep clear of C's lane too.
  const awayFromC = (cell) => !branchC.some((t) => manhattan(t, cell) < 2);
  const a = gateFor(sideA, j1, [c], (d) => d >= 1, gateCells(sideA, g).filter(awayFromC));
  const b = a && gateFor(sideB, j1, [a, c], (d) => d >= 1, gateCells(sideB, g).filter(awayFromC));
  if (!a || !b) return "NO_GATE";
  const baseRoad = [...tailRoad, ...mid.slice(1).map(key), ...cRoad];
  // A must keep clear of B's gate tile (B is walked after A).
  const branchA = walk(rng, g, a, j1, { min: manhattan(a, j1) + 1, max: manhattan(a, j1) + 5, road: [...baseRoad, key(b)], firstDir: INWARD[sideA] });
  if (!branchA) return "BRANCH_A_STUCK";
  const branchB = walk(rng, g, b, j1, { min: manhattan(b, j1) + 1, max: manhattan(b, j1) + 5, road: [...baseRoad, ...branchA.slice(0, -1).map(key)], firstDir: INWARD[sideB] });
  if (!branchB) return "BRANCH_B_STUCK";
  const lengths = [branchA.length + mid.length - 1, branchB.length + mid.length - 1, branchC.length].map((k) => k + tail.length - 1);
  if (Math.min(...lengths) < minLen || Math.max(...lengths) > longest) return "NO_BRANCH_LENGTH";
  const atJ1 = [branchA.at(-2), branchB.at(-2), mid[1]].map(key);
  const atJ2 = [mid.at(-2), branchC.at(-2), tail[1]].map(key);
  if (new Set(atJ1).size !== 3 || new Set(atJ2).size !== 3) return "JUNCTION_CROWDED";
  const viaMid = [...mid.slice(1), ...tail.slice(1)];
  return { lanes: [[...branchA, ...viaMid], [...branchB, ...viaMid], [...branchC, ...tail.slice(1)]], base };
}

// Platform blocks next to the road. Returns { cells, blocks } or a rejection code.
function placeBlocks(rng, g, recipe, roadSet, reserved) {
  const spec = BOARD_SIZES[recipe.size];
  const [minCells, maxCells] = spec.platforms;
  const target = spec.blocks[0] + Math.floor(rng() * (spec.blocks[1] - spec.blocks[0] + 1));
  const inBoard = ([c, r]) => c >= 0 && r >= 0 && c < g.cols && r < g.rows;
  const taken = new Set();
  const blocks = [];
  const nearRoad = (cell) => around8(cell).some((n) => roadSet.has(key(n)));
  for (let tries = 0; tries < 400 && blocks.length < target; tries++) {
    const shape = pick(rng, blocks.length < 2 ? SHAPES.slice(0, 7) : SHAPES);
    const anchor = [Math.floor(rng() * g.cols), Math.floor(rng() * g.rows)];
    const cells = shape.map((o) => add(anchor, o));
    const ok = cells.every((cell) => inBoard(cell) && !roadSet.has(key(cell)) && !reserved.has(key(cell)) && !taken.has(key(cell))
      && nearRoad(cell) && DIRS.every((d) => { const n = add(cell, d); return !taken.has(key(n)) || cells.some((x) => same(x, n)); }));
    if (!ok) continue;
    if (taken.size + cells.length > maxCells) continue;
    cells.forEach((cell) => taken.add(key(cell)));
    blocks.push(cells);
  }
  if (taken.size < minCells || blocks.length < spec.blocks[0]) return "TOO_FEW_PLATFORMS";
  return { cells: blocks.flat(), blocks };
}

/**
 * Generate one runtime map from a board-v1 recipe:
 * { generator: "board-v1", ruleset: 1, seed, size: "8x4" | "9x5" | "10x5", gates: 1-3, entry: ["left", "top", "bottom"] }.
 * `identity` carries id, name, theme, art, music, boss. Returns { ok, map?, attempts, rejections }.
 * `avoid` lists existing maps whose layouts the result must not repeat (layoutConflict).
 */
export function generateBoardMap(recipe, identity, { attempts = ATTEMPTS, avoid = [] } = {}) {
  const rejections = {};
  const reject = (code) => { rejections[code] = (rejections[code] ?? 0) + 1; };
  if (!checkRecipe(recipe)) return { ok: false, attempts: 0, rejections: { RECIPE_INVALID: 1 } };
  const g = boardGeometry(recipe.size);
  const rng = createRng(recipe.seed);
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const routed = routeLanes(rng, g, recipe);
    if (typeof routed === "string") { reject(routed); continue; }
    const { lanes, base } = routed;
    const roadCells = [...new Map(lanes.flat().map((cell) => [key(cell), cell])).values()];
    const roadSet = new Set(roadCells.map(key));
    const gates = lanes.map((lane) => lane[0]);
    // Nothing may stand on the cell just outside a gate; keep gate cells free of tiles.
    const reserved = new Set([...gates.map(key), key(base)]);
    const placed = placeBlocks(rng, g, recipe, roadSet, reserved);
    if (typeof placed === "string") { reject(placed); continue; }
    // Every lane passes at least two blocks (a block cell next to a lane cell).
    const passes = (lane) => placed.blocks.filter((block) => block.some((cell) => around8(cell).some((n) => lane.some((l) => same(l, n))))).length;
    if (lanes.some((lane) => passes(lane) < 2)) { reject("LANE_UNCOVERED"); continue; }
    // A choke point: a road cell with at least three platform cells around it.
    const platformSet = new Set(placed.cells.map(key));
    const choke = roadCells.some((cell) => !reserved.has(key(cell)) && around8(cell).filter((n) => platformSet.has(key(n))).length >= 3);
    if (!choke) { reject("NO_CHOKE"); continue; }
    const roadSlotsCells = roadCells.filter((cell) => !reserved.has(key(cell)));
    // Special tiles: high ground and cursed on platforms, a shrine on the road.
    const plats = shuffle(rng, placed.cells);
    const rings = [
      { type: "platform", cell: plats[0], kind: "highground" },
      { type: "platform", cell: plats[1], kind: "cursed" },
      { type: "road", cell: pick(rng, roadSlotsCells), kind: "shrine" },
    ];
    const paths = lanes.map((lane) => lanePath(lane, g, sideOf(lane[0], g)));
    const baseXY = paths[0][paths[0].length - 1];
    const map = {
      ...identity,
      base: { x: baseXY[0], y: baseXY[1] },
      ...(paths.length === 1
        ? { spawn: { x: paths[0][0][0], y: paths[0][0][1] }, path: paths[0] }
        : { lanes: paths.map((path) => ({ spawn: { x: path[0][0], y: path[0][1] }, path })) }),
      grid: { board: { cell: g.cell, cols: g.cols, rows: g.rows, origin: g.origin, road: roadSlotsCells, platforms: placed.cells, rings } },
    };
    Object.assign(map, buildGrid(map));
    const validation = validateMap(map);
    if (!validation.ok) { reject(`INVALID_${validation.errors[0].code}`); continue; }
    if (avoid.some((other) => layoutConflict(map, other))) { reject("LAYOUT_TAKEN"); continue; }
    map.recipe = recipe;
    map.geometryHash = boardGeometryHash(map);
    return { ok: true, map, attempts: attempt, rejections };
  }
  return { ok: false, attempts, rejections };
}

export function boardGeometryHash(map) {
  const text = JSON.stringify({ spawn: map.spawn, base: map.base, path: map.path, lanes: map.lanes, grid: map.grid, roadSlots: map.roadSlots, platformSlots: map.platformSlots, rings: map.rings });
  const fnv = (offset) => {
    let h = offset >>> 0;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, "0");
  };
  return fnv(0x811c9dc5) + fnv(0x01000193);
}

// ---------------------------------------------------------------------------------------
// Layout signatures (owner requirement B: no two maps share a layout)
// ---------------------------------------------------------------------------------------

// A board map as cell sets: every road cell the lanes pass (gates and base included),
// platform cells, gate cells and the base cell, on its board size.
export function boardLayout(map) {
  const b = map?.grid?.board;
  if (!b) return null;
  const cellOf = ([x, y]) => [Math.floor((x - b.origin[0]) / b.cell), Math.floor((y - b.origin[1]) / b.cell)];
  const lanes = map.lanes ?? [{ spawn: map.spawn, path: map.path }];
  const road = new Set();
  const gates = new Set();
  for (const { path } of lanes) {
    const pts = path.map(([x, y]) => cellOf([Math.min(Math.max(x, b.origin[0]), b.origin[0] + b.cell * b.cols - 1), Math.min(Math.max(y, b.origin[1]), b.origin[1] + b.cell * b.rows - 1)]));
    gates.add(key(pts[0]));
    for (let i = 1; i < pts.length; i++) {
      const [a, z] = [pts[i - 1], pts[i]];
      const steps = manhattan(a, z);
      for (let s = 0; s <= steps; s++) road.add(key([a[0] + Math.sign(z[0] - a[0]) * s, a[1] + Math.sign(z[1] - a[1]) * s]));
    }
  }
  return { size: `${b.cols}x${b.rows}`, cols: b.cols, rows: b.rows, road, platforms: new Set((b.platforms ?? []).map(key)), gates, base: key(cellOf([map.base.x, map.base.y])) };
}

// The layout under the four symmetries of the rectangle (identity, mirror left-right,
// mirror top-bottom, half turn), so a mirrored copy counts as the same layout.
function symmetries(layout) {
  const maps = [
    ([c, r]) => [c, r],
    ([c, r]) => [layout.cols - 1 - c, r],
    ([c, r]) => [c, layout.rows - 1 - r],
    ([c, r]) => [layout.cols - 1 - c, layout.rows - 1 - r],
  ];
  const move = (set, f) => new Set([...set].map((k) => key(f(k.split(",").map(Number)))));
  return maps.map((f) => ({ road: move(layout.road, f), platforms: move(layout.platforms, f), gates: move(layout.gates, f), base: key(f(layout.base.split(",").map(Number))) }));
}

const jaccard = (a, b) => {
  let inter = 0;
  for (const k of a) if (b.has(k)) inter++;
  const union = a.size + b.size - inter;
  return union ? inter / union : 1;
};
const sameSet = (a, b) => a.size === b.size && [...a].every((k) => b.has(k));

export const ROAD_SIMILARITY_LIMIT = 0.7;

// Why two board maps count as the same layout, or null: identical cells (also mirrored), or
// more than ROAD_SIMILARITY_LIMIT of their road cells shared (also mirrored), same board size.
export function layoutConflict(a, b) {
  const la = boardLayout(a), lb = boardLayout(b);
  if (!la || !lb || la.size !== lb.size) return null;
  for (const s of symmetries(lb)) {
    if (sameSet(la.road, s.road) && sameSet(la.platforms, s.platforms) && sameSet(la.gates, s.gates) && la.base === s.base) return "identical";
    const shared = jaccard(la.road, s.road);
    if (shared > ROAD_SIMILARITY_LIMIT) return `road ${Math.round(shared * 100)}% shared`;
  }
  return null;
}
