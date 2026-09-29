// Map generator `lattice-v2`: the path layer of a battlefield, independent of its theme
// (background art). Themes only contribute `exclude` rectangles (painted props the road
// must avoid); the road itself is drawn by map-scene.js, so any theme takes any route.
//
// Routes are self-avoiding walks on a 60 px lattice (15 x 7 nodes). A route keeps one empty
// node between itself and any earlier part (8-neighbourhood), so parallel road stretches are
// at least 120 px apart and side tiles fit. Straight runs are at least two nodes long. Before
// every step a breadth-first search from the base (Red Blob Games' "flow field" idea) checks
// that the base is still reachable, so walks do not dead-end.
//
// Topologies:
//   single-lane  one gate (left, top or bottom edge) to a base in the right third.
//   two-gate     a second gate joins the first route at a junction with a branch of exactly
//                the same length, so both lanes are equally long and share their tail
//                (the multi-entry rules in map-validation.js).
//
// Pure and deterministic like orthogonal-v1: the same recipe yields the same geometry.
import { buildGrid, rankedTiles } from "./grid.js";
import { analyzeMap } from "./map-analysis.js";
import { validateMap } from "./map-validation.js";
import { mapLanes } from "./lanes.js";
import { createRng } from "./sim.js";

export const GENERATOR_V2_ID = "lattice-v2";
export const GENERATOR_V2_RULESET = 1;

const RULES = {
  cell: 60,
  cols: 15, rows: 7,        // node x = 60 + 60 * col (60..900), y = 90 + 60 * row (90..450)
  x0: 60, y0: 90,
  baseCols: [10, 13],       // base in the right third
  gateSpan: [1, 8],         // top/bottom gates stay in the left half
  minRun: 2,                // nodes per straight run (120 px)
  gridBounds: [30, 60, 930, 500],
  attempts: 800,
  expansions: 6000,         // search budget per attempt
};
const ROAD_BAND = 40;

const nodeXY = ([c, r]) => [RULES.x0 + c * RULES.cell, RULES.y0 + r * RULES.cell];
const key = ([c, r]) => c * 16 + r;
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
const inside = ([c, r]) => c >= 0 && c < RULES.cols && r >= 0 && r < RULES.rows;
const pick = (rng, list) => list[Math.floor(rng() * list.length)];
function shuffle(rng, list) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

function nodeBlocked(node, exclude) {
  const [x, y] = nodeXY(node);
  return exclude.some(([rx, ry, rw, rh]) => x - ROAD_BAND < rx + rw && x + ROAD_BAND > rx && y - ROAD_BAND < ry + rh && y + ROAD_BAND > ry);
}

// Nodes within one step (8-neighbourhood) of `node`.
const around = ([c, r]) => {
  const out = [];
  for (let dc = -1; dc <= 1; dc++) for (let dr = -1; dr <= 1; dr++) if (dc || dr) out.push([c + dc, r + dr]);
  return out;
};

// A node may join the walk if it is free and touches no earlier node except the last one or
// two (the corner it continues from). `allowed` lists nodes it may touch anyway (a junction).
function legal(node, visited, tailKeys, blocked, allowed = null) {
  if (!inside(node) || visited.has(key(node)) || blocked.has(key(node))) return false;
  return around(node).every((n) => !visited.has(key(n)) || tailKeys.has(key(n)) || (allowed && allowed.has(key(n))));
}

// Breadth-first search: can `goal` still be reached from `start` without touching the walk?
function reachable(start, goal, visited, blocked, headKey) {
  if (key(start) === key(goal)) return true;
  const seen = new Set([key(start)]);
  const queue = [start];
  while (queue.length) {
    const cur = queue.shift();
    for (const [dc, dr] of DIRS) {
      const n = [cur[0] + dc, cur[1] + dr];
      if (key(n) === key(goal)) return true;
      if (!inside(n) || seen.has(key(n)) || visited.has(key(n)) || blocked.has(key(n))) continue;
      // Leave a gap to the existing walk (except right at the head).
      if (around(n).some((m) => visited.has(key(m)) && key(m) !== headKey)) continue;
      seen.add(key(n));
      queue.push(n);
    }
  }
  return false;
}

// Depth-first walk in straight runs from `start` to `goal` whose node count lies in
// [minNodes, maxNodes] (exact when equal) and whose turn count lies in `turns`.
function walkRoute(rng, start, goal, { minNodes, maxNodes, turns, blocked, avoid = new Set(), allow = null }) {
  let budget = RULES.expansions;
  const visited = new Set([...avoid, key(start)]);
  const nodes = [start];
  const cornerCount = (list) => {
    let t = 0;
    for (let i = 1; i < list.length - 1; i++) {
      const a = [list[i][0] - list[i - 1][0], list[i][1] - list[i - 1][1]];
      const b = [list[i + 1][0] - list[i][0], list[i + 1][1] - list[i][1]];
      if (a[0] !== b[0] || a[1] !== b[1]) t++;
    }
    return t;
  };
  function dfs(dir) {
    if (--budget < 0) return false;
    const head = nodes.at(-1);
    const remaining = maxNodes - nodes.length;
    const dist = Math.abs(goal[0] - head[0]) + Math.abs(goal[1] - head[1]);
    if (dist > remaining) return false;
    if (minNodes === maxNodes && (remaining - dist) % 2) return false; // exact length: parity
    const options = shuffle(rng, DIRS).filter(([dc, dr]) => !dir || dc !== -dir[0] || dr !== -dir[1]);
    // Straight on is preferred a little, so runs are longer than the minimum.
    if (dir && rng() < 0.45) {
      const at = options.findIndex((o) => o[0] === dir[0] && o[1] === dir[1]);
      if (at > 0) options.unshift(...options.splice(at, 1));
    }
    for (const d of options) {
      const turning = !dir || d[0] !== dir[0] || d[1] !== dir[1];
      const run = turning ? RULES.minRun : 1;
      const added = [];
      let ok = true;
      for (let i = 1; i <= run; i++) {
        const n = [head[0] + d[0] * i, head[1] + d[1] * i];
        const last = added.at(-1) ?? head;
        const prev = added.length >= 2 ? added.at(-2) : added.length === 1 ? head : nodes.at(-2);
        const tail = new Set([key(last), ...(prev ? [key(prev)] : [])]);
        if (key(n) === key(goal)) { // the goal may end a run early (a 60 px last leg)
          added.push(n);
          break;
        }
        if (!legal(n, visited, tail, blocked, allow)) { ok = false; break; }
        added.push(n);
        visited.add(key(n));
      }
      if (ok && added.length) {
        nodes.push(...added);
        const end = added.at(-1);
        if (key(end) === key(goal)) {
          const t = cornerCount(nodes);
          if (nodes.length >= minNodes && nodes.length <= maxNodes && t >= turns[0] && t <= turns[1]) return true;
        } else if (reachable(end, goal, visited, blocked, key(end)) && dfs(d)) return true;
        nodes.length -= added.length;
      }
      for (const n of added) if (key(n) !== key(goal)) visited.delete(key(n));
    }
    return false;
  }
  return dfs(null) ? nodes : null;
}

// Corner points (world px) of a node route.
function corners(nodes) {
  const pts = [nodeXY(nodes[0])];
  for (let i = 1; i < nodes.length - 1; i++) {
    const a = [nodes[i][0] - nodes[i - 1][0], nodes[i][1] - nodes[i - 1][1]];
    const b = [nodes[i + 1][0] - nodes[i][0], nodes[i + 1][1] - nodes[i][1]];
    if (a[0] !== b[0] || a[1] !== b[1]) pts.push(nodeXY(nodes[i]));
  }
  pts.push(nodeXY(nodes.at(-1)));
  return pts;
}

function gateNodes(entry, exclude) {
  const list = [];
  if (entry === "left") for (let r = 1; r < RULES.rows - 1; r++) list.push([0, r]);
  if (entry === "top") for (let c = RULES.gateSpan[0]; c <= RULES.gateSpan[1]; c++) list.push([c, 0]);
  if (entry === "bottom") for (let c = RULES.gateSpan[0]; c <= RULES.gateSpan[1]; c++) list.push([c, RULES.rows - 1]);
  return list.filter((n) => !nodeBlocked(n, exclude));
}

function ringAnchors(map) {
  const bare = { ...map, ...buildGrid({ ...map, grid: { ...map.grid, rings: [] } }) };
  const path = mapLanes(map)[0].path;
  const mid = path[Math.floor(path.length / 2)];
  const road = [...bare.roadSlots].sort((p, q) => Math.hypot(p[0] - mid[0], p[1] - mid[1]) - Math.hypot(q[0] - mid[0], q[1] - mid[1]))[0];
  const ranked = rankedTiles(bare, "platform", 160).map((index) => bare.platformSlots[index]);
  const high = ranked[0];
  const base = [map.base.x, map.base.y];
  const cursed = ranked.slice(1, 8).sort((p, q) => Math.hypot(p[0] - base[0], p[1] - base[1]) - Math.hypot(q[0] - base[0], q[1] - base[1]))[0];
  return [
    { type: "platform", at: high, kind: "highground" },
    { type: "platform", at: cursed, kind: "cursed" },
    { type: "road", at: road, kind: "shrine" },
  ].filter((ring) => ring.at);
}

export function geometryHashV2(map) {
  const text = JSON.stringify({ spawn: map.spawn, base: map.base, path: map.path, lanes: map.lanes, grid: map.grid, roadSlots: map.roadSlots, platformSlots: map.platformSlots, rings: map.rings });
  const fnv = (offset) => {
    let h = offset >>> 0;
    for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
    return h.toString(16).padStart(8, "0");
  };
  return fnv(0x811c9dc5) + fnv(0x01000193);
}

function checkRecipe(recipe) {
  const p = recipe?.parameters ?? {};
  const pair = (v) => Array.isArray(v) && v.length === 2 && v.every(Number.isFinite) && v[0] <= v[1];
  return recipe?.generator === GENERATOR_V2_ID && recipe.ruleset === GENERATOR_V2_RULESET && Number.isInteger(recipe.seed)
    && ["single-lane", "two-gate"].includes(recipe.topology) && pair(p.turns) && pair(p.length) && pair(p.coverageGap)
    && Array.isArray(p.entry) && p.entry.every((e) => ["left", "top", "bottom"].includes(e));
}

/**
 * Generate one runtime map from a lattice-v2 recipe. Same contract as generateMap (orthogonal-v1):
 * returns { ok, map?, attempts, rejections }.
 */
export function generateMapV2(recipe, identity, { attempts = RULES.attempts } = {}) {
  const rejections = {};
  const reject = (code) => { rejections[code] = (rejections[code] ?? 0) + 1; };
  if (!checkRecipe(recipe)) return { ok: false, attempts: 0, rejections: { RECIPE_INVALID: 1 } };
  const { turns, length, coverageGap, entry } = recipe.parameters;
  const exclude = recipe.constraints?.exclude ?? [];
  const blocked = new Set();
  for (let c = 0; c < RULES.cols; c++) for (let r = 0; r < RULES.rows; r++) if (nodeBlocked([c, r], exclude)) blocked.add(key([c, r]));
  const rng = createRng(recipe.seed);
  const minNodes = Math.ceil(length[0] / RULES.cell) + 1, maxNodes = Math.floor(length[1] / RULES.cell) + 1;
  const bases = [];
  for (let c = RULES.baseCols[0]; c <= RULES.baseCols[1]; c++) for (let r = 1; r < RULES.rows - 1; r++) if (!blocked.has(key([c, r]))) bases.push([c, r]);
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const base = pick(rng, bases);
    if (!base) { reject("NO_ENDPOINTS"); continue; }
    let lanes;
    if (recipe.topology === "two-gate") {
      // Built from the base outwards: a shared tail base <- junction (with at least one
      // corner, so both lanes end in the same last segment), then two branches of exactly the
      // same node count from the junction out to two gates.
      const junctions = [];
      for (let c = 3; c <= 8; c++) for (let r = 1; r < RULES.rows - 1; r++) if (!blocked.has(key([c, r]))) junctions.push([c, r]);
      const junction = pick(rng, junctions);
      const tail = walkRoute(rng, junction, base, { minNodes: 4, maxNodes: Math.max(5, Math.floor(maxNodes * 0.45)), turns: [1, 4], blocked });
      if (!tail) { reject("TAIL_STUCK"); continue; }
      const sideA = pick(rng, entry);
      const sideB = pick(rng, entry.length > 1 ? entry.filter((e) => e !== sideA) : entry);
      const tailSet = new Set(tail.map(key));
      const free = (n) => !tailSet.has(key(n)) && around(n).every((m) => !tailSet.has(key(m)));
      const gA = pick(rng, gateNodes(sideA, exclude).filter(free));
      const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
      const gB = gA && pick(rng, gateNodes(sideB, exclude).filter((n) => free(n) && dist(n, gA) >= 4 && (dist(n, junction) - dist(gA, junction)) % 2 === 0));
      if (!gA || !gB) { reject("NO_SECOND_GATE"); continue; }
      const branchNodes = Math.max(minNodes - tail.length + 1, Math.max(dist(gA, junction), dist(gB, junction)) + 3);
      const exact = branchNodes + ((branchNodes - 1 - dist(gA, junction)) % 2 ? 1 : 0);
      // The branches may touch each other and the tail only right at the junction.
      const nearJ = new Set([key(junction), ...around(junction).map(key)]);
      const tailBody = new Set(tail.slice(1).map(key));
      const a = walkRoute(rng, junction, gA, { minNodes: exact, maxNodes: exact, turns: [0, 99], blocked, avoid: tailBody, allow: nearJ });
      if (!a) { reject("BRANCH_STUCK"); continue; }
      const b = walkRoute(rng, junction, gB, { minNodes: exact, maxNodes: exact, turns: [0, 99], blocked, avoid: new Set([...tailBody, ...a.slice(1).map(key)]), allow: nearJ });
      if (!b) { reject("BRANCH_STUCK"); continue; }
      const laneA = [...a.slice().reverse(), ...tail.slice(1)];
      const laneB = [...b.slice().reverse(), ...tail.slice(1)];
      const total = laneA.length;
      if (total < minNodes || total > maxNodes) { reject("LENGTH_OUT_OF_RANGE"); continue; }
      lanes = [laneA, laneB];
    } else {
      const sideA = pick(rng, entry);
      const gate = pick(rng, gateNodes(sideA, exclude));
      if (!gate) { reject("NO_ENDPOINTS"); continue; }
      const main = walkRoute(rng, gate, base, { minNodes, maxNodes, turns, blocked });
      if (!main) { reject("WALK_STUCK"); continue; }
      lanes = [main];
    }
    const [bx, by] = nodeXY(base);
    const routes = lanes.map((nodes) => ({ spawn: { x: nodeXY(nodes[0])[0], y: nodeXY(nodes[0])[1] }, path: corners(nodes) }));
    const shell = {
      id: identity.id, boss: identity.boss, name: identity.name, theme: identity.theme, art: identity.art, music: identity.music,
      ...(routes.length > 1 ? { lanes: routes } : { spawn: routes[0].spawn, path: routes[0].path }),
      base: { x: bx, y: by },
      grid: { bounds: RULES.gridBounds, ...(exclude.length ? { exclude } : {}), rings: [] },
    };
    let map;
    try {
      shell.grid = { ...shell.grid, rings: ringAnchors(shell) };
      map = { ...shell, ...buildGrid(shell) };
    } catch {
      reject("GRID_BUILD_FAILED");
      continue;
    }
    const validation = validateMap(map);
    if (!validation.ok) { for (const { code } of validation.errors) reject(code); continue; }
    const gap = 1 - analyzeMap(map).coverage[90].total;
    if (gap < coverageGap[0] || gap > coverageGap[1]) { reject("COVERAGE_GAP_OUT_OF_RANGE"); continue; }
    const record = {
      id: map.id, rings: map.rings, boss: map.boss, name: map.name, theme: map.theme, art: map.art, music: map.music,
      ...(map.lanes ? { lanes: map.lanes } : { spawn: map.spawn, path: map.path }),
      base: map.base, roadSlots: map.roadSlots, platformSlots: map.platformSlots, grid: map.grid,
      recipe, geometryHash: "",
    };
    record.geometryHash = geometryHashV2(record);
    return { ok: true, map: record, attempts: attempt, rejections };
  }
  return { ok: false, attempts, rejections };
}
