// Map generator `orthogonal-v1` (docs/tower-defense-map-agent-runbook.md): one deterministic,
// single-lane, self-avoiding orthogonal route on a 30 px lattice, turned into a complete
// runtime map record. Development-time only: approved candidates are published into
// tdMaps.json as ordinary maps (scripts/generate-td-map.mjs); the game never generates a
// layout at runtime. Pure: the same recipe always yields byte-identical geometry.
import { buildGrid, rankedTiles } from "./grid.js";
import { analyzeMap } from "./map-analysis.js";
import { validateMap } from "./map-validation.js";
import { createRng } from "./sim.js";

export const GENERATOR_ID = "orthogonal-v1";
export const GENERATOR_RULESET = 1;

// Stable rejection reasons (validateMap codes are reported as they are).
export const GENERATOR_REJECTION = {
  RECIPE_INVALID: "RECIPE_INVALID",
  WALK_STUCK: "WALK_STUCK",
  NO_BASE_CONNECTION: "NO_BASE_CONNECTION",
  TURNS_OUT_OF_RANGE: "TURNS_OUT_OF_RANGE",
  LENGTH_OUT_OF_RANGE: "LENGTH_OUT_OF_RANGE",
  COVERAGE_GAP_OUT_OF_RANGE: "COVERAGE_GAP_OUT_OF_RANGE",
};

// Fixed rules of ruleset 1. Endpoints sit on the painted gate and sanctuary lines of the
// current skins (spawn x 48, base x 880, like the authored maps); interior corners stay
// inside `route`, clear of the decorated terrain edges.
const RULES = {
  lattice: 30,
  spawnX: 48,
  baseX: 880,
  endpointY: [120, 420],     // spawn and base rows
  route: [150, 110, 800, 450], // interior corners [x0, y0, x1, y1]
  firstRun: [120, 300],      // first horizontal leg out of the gate
  segment: [150, 480],       // every inner leg
  lastRun: [90, 450],        // final horizontal leg into the sanctuary
  clearance: 150,            // road centre to any non-adjacent road centre
  gridBounds: [60, 80, 920, 485],
  attempts: 400,
};

const segmentsOf = (path) => path.slice(1).map((point, index) => [path[index], point]);
const pathLength = (path) => segmentsOf(path).reduce((sum, [a, b]) => sum + Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]), 0);

function pointToSegment([x, y], [[ax, ay], [bx, by]]) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(x - ax - t * dx, y - ay - t * dy);
}

function crosses([a, b], [c, d]) {
  const ah = a[1] === b[1], ch = c[1] === d[1];
  const within = (v, p, q) => v >= Math.min(p, q) && v <= Math.max(p, q);
  if (ah === ch) return false; // parallel legs are covered by the distance check
  const [h1, h2, v1, v2] = ah ? [a, b, c, d] : [c, d, a, b];
  return within(v1[0], h1[0], h2[0]) && within(h1[1], v1[1], v2[1]);
}

// Closest approach of two axis-aligned legs.
function segmentGap(s, t) {
  if (crosses(s, t)) return 0;
  return Math.min(pointToSegment(s[0], t), pointToSegment(s[1], t), pointToSegment(t[0], s), pointToSegment(t[1], s));
}

// Skin safe regions (recipe.constraints.exclude, [x, y, w, h]): painted ruins and props at
// the terrain edges. The road band (centre +- ROAD_BAND) must not enter one.
const ROAD_BAND = 40;
function legHitsRect([a, b], [rx, ry, rw, rh]) {
  const x0 = Math.min(a[0], b[0]) - ROAD_BAND, x1 = Math.max(a[0], b[0]) + ROAD_BAND;
  const y0 = Math.min(a[1], b[1]) - ROAD_BAND, y1 = Math.max(a[1], b[1]) + ROAD_BAND;
  return x0 < rx + rw && x1 > rx && y0 < ry + rh && y1 > ry;
}

// A new leg may touch only the leg it continues; every older leg keeps `clearance`.
function clear(path, next, exclude = []) {
  const legs = segmentsOf(path);
  const leg = [path.at(-1), next];
  return legs.slice(0, -1).every((old) => segmentGap(old, leg) >= RULES.clearance) && !exclude.some((rect) => legHitsRect(leg, rect));
}

const inRange = (value, [lo, hi]) => value >= lo && value <= hi;
const latticeSteps = ([lo, hi]) => {
  const list = [];
  for (let v = Math.ceil(lo / RULES.lattice) * RULES.lattice; v <= hi; v += RULES.lattice) list.push(v);
  return list;
};
const pick = (rng, list) => list[Math.floor(rng() * list.length)];

// One route attempt: gate -> first leg -> alternating vertical/horizontal legs -> sanctuary.
function walk(rng, turnTarget, exclude) {
  const [rx0, ry0, rx1, ry1] = RULES.route;
  const spawnY = pick(rng, latticeSteps(RULES.endpointY));
  const path = [[RULES.spawnX, spawnY], [RULES.spawnX + pick(rng, latticeSteps(RULES.firstRun)), spawnY]];
  if (exclude.some((rect) => legHitsRect(path, rect))) return { code: GENERATOR_REJECTION.WALK_STUCK };
  // Inner legs until the turn budget leaves room for the two closing turns.
  while (path.length - 1 < turnTarget - 1) {
    const [x, y] = path.at(-1);
    const vertical = (path.length - 1) % 2 === 1; // leg 0 is horizontal
    const options = [];
    for (const length of latticeSteps(RULES.segment)) {
      for (const sign of [-1, 1]) {
        const next = vertical ? [x, y + sign * length] : [x + sign * length, y];
        if (!inRange(next[0], [rx0, rx1]) || !inRange(next[1], [ry0, ry1])) continue;
        if (clear(path, next, exclude)) options.push(next);
      }
    }
    if (!options.length) return { code: GENERATOR_REJECTION.WALK_STUCK };
    path.push(pick(rng, options));
  }
  // Close: the route needs a vertical leg to the base row, then a horizontal run in.
  const [x, y] = path.at(-1);
  const vertical = (path.length - 1) % 2 === 1;
  const endings = [];
  for (const baseY of latticeSteps(RULES.endpointY)) {
    const run = RULES.baseX - x;
    if (!inRange(run, RULES.lastRun) || Math.abs(baseY - y) < RULES.segment[0]) continue;
    if (!vertical) continue; // the last inner leg must be horizontal so the close turns twice
    const corner = [x, baseY], end = [RULES.baseX, baseY];
    if (!clear(path, corner, exclude)) continue;
    if (!clear([...path, corner], end, exclude)) continue;
    endings.push([corner, end]);
  }
  if (!endings.length) return { code: GENERATOR_REJECTION.NO_BASE_CONNECTION };
  path.push(...pick(rng, endings));
  return { path };
}

// Special tiles from geometry, not from the RNG: the Shrine on the road tile nearest the
// route's middle, High Ground on the platform that sees the most route at range 160, the
// Cursed tile on the best late-route platform that is not High Ground.
function ringAnchors(map) {
  const bare = { ...map, ...buildGrid({ ...map, grid: { ...map.grid, rings: [] } }) };
  const mid = midpoint(map.path);
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

function midpoint(path) {
  let left = pathLength(path) / 2;
  for (const [a, b] of segmentsOf(path)) {
    const length = Math.abs(b[0] - a[0]) + Math.abs(b[1] - a[1]);
    if (left <= length) {
      const t = left / length;
      return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t)];
    }
    left -= length;
  }
  return path.at(-1);
}

// FNV-1a over the canonical geometry, twice with different offsets: 16 hex characters.
export function geometryHash(map) {
  const text = JSON.stringify({ spawn: map.spawn, base: map.base, path: map.path, grid: map.grid, roadSlots: map.roadSlots, platformSlots: map.platformSlots, rings: map.rings });
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
  return recipe?.generator === GENERATOR_ID && recipe.ruleset === GENERATOR_RULESET && Number.isInteger(recipe.seed)
    && recipe.topology === "single-lane" && pair(p.turns) && pair(p.length) && pair(p.coverageGap)
    && (recipe.constraints?.exclude ?? []).every((rect) => Array.isArray(rect) && rect.length === 4 && rect.every(Number.isInteger));
}

/**
 * Generate one runtime map from a recipe.
 * `identity` carries the non-geometry fields: id, name, theme, art, music, boss.
 * Returns { ok, map?, attempts, rejections } where rejections counts reasons by code.
 */
export function generateMap(recipe, identity, { attempts = RULES.attempts } = {}) {
  /** @type {Record<string, number>} */
  const rejections = {};
  const reject = (code) => { rejections[code] = (rejections[code] ?? 0) + 1; };
  if (!checkRecipe(recipe)) return { ok: false, attempts: 0, rejections: { [GENERATOR_REJECTION.RECIPE_INVALID]: 1 } };
  const { turns, length, coverageGap } = recipe.parameters;
  const exclude = recipe.constraints?.exclude ?? [];
  const rng = createRng(recipe.seed);
  for (let attempt = 1; attempt <= attempts; attempt++) {
    // Even turn counts only: the route leaves and enters horizontally.
    const turnOptions = [];
    for (let t = turns[0]; t <= turns[1]; t++) if (t % 2 === 0) turnOptions.push(t);
    if (!turnOptions.length) { reject(GENERATOR_REJECTION.TURNS_OUT_OF_RANGE); continue; }
    const result = walk(rng, pick(rng, turnOptions), exclude);
    if (!result.path) { reject(result.code); continue; }
    const path = result.path;
    const routeTurns = path.length - 2;
    if (!inRange(routeTurns, turns)) { reject(GENERATOR_REJECTION.TURNS_OUT_OF_RANGE); continue; }
    if (!inRange(pathLength(path), length)) { reject(GENERATOR_REJECTION.LENGTH_OUT_OF_RANGE); continue; }
    const shell = {
      id: identity.id,
      boss: identity.boss,
      name: identity.name,
      theme: identity.theme,
      art: identity.art,
      music: identity.music,
      spawn: { x: path[0][0], y: path[0][1] },
      base: { x: path.at(-1)[0], y: path.at(-1)[1] },
      path,
      grid: { bounds: RULES.gridBounds, ...(exclude.length ? { exclude } : {}), rings: [] },
    };
    let map;
    try {
      shell.grid = { ...shell.grid, rings: ringAnchors(shell) };
      map = { ...shell, ...buildGrid(shell) };
    } catch (error) {
      if (globalThis.process?.env?.TD_GEN_DEBUG) console.error(error);
      reject("GRID_BUILD_FAILED");
      continue;
    }
    const validation = validateMap(map);
    if (!validation.ok) { for (const { code } of validation.errors) reject(code); continue; }
    const gap = 1 - analyzeMap(map).coverage[90].total;
    if (!inRange(gap, coverageGap)) { reject(GENERATOR_REJECTION.COVERAGE_GAP_OUT_OF_RANGE); continue; }
    // Key order matches the authored records (scripts/build-td-grid.mjs keeps it).
    const record = {
      id: map.id, rings: map.rings, boss: map.boss, name: map.name, theme: map.theme, art: map.art, music: map.music,
      spawn: map.spawn, base: map.base, path: map.path, roadSlots: map.roadSlots, platformSlots: map.platformSlots, grid: map.grid,
      recipe, geometryHash: "",
    };
    record.geometryHash = geometryHash(record);
    return { ok: true, map: record, attempts: attempt, rejections };
  }
  return { ok: false, attempts, rejections };
}
