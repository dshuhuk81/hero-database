// Stable, data-only validation for authored and generated map records. Generator tools use
// these codes to explain rejected candidates; the runtime continues to consume plain maps.
import { buildGrid } from "./grid.js";
import { mapLanes } from "./lanes.js";

export const MAP_VALIDATION = {
  BASE_MISSING: "BASE_MISSING",
  GRID_MISSING: "GRID_MISSING",
  PATH_TOO_SHORT: "PATH_TOO_SHORT",
  POINT_INVALID: "POINT_INVALID",
  POINT_OUTSIDE_WORLD: "POINT_OUTSIDE_WORLD",
  SEGMENT_DIAGONAL: "SEGMENT_DIAGONAL",
  SEGMENT_TOO_SHORT: "SEGMENT_TOO_SHORT",
  PATH_SELF_INTERSECTION: "PATH_SELF_INTERSECTION",
  SPAWN_MISMATCH: "SPAWN_MISMATCH",
  BASE_MISMATCH: "BASE_MISMATCH",
  LANE_LENGTH_MISMATCH: "LANE_LENGTH_MISMATCH",
  LANES_DO_NOT_MERGE: "LANES_DO_NOT_MERGE",
  GRID_BUILD_FAILED: "GRID_BUILD_FAILED",
  GRID_OUT_OF_DATE: "GRID_OUT_OF_DATE",
  ROAD_SLOT_COUNT: "ROAD_SLOT_COUNT",
  PLATFORM_SLOT_COUNT: "PLATFORM_SLOT_COUNT",
};

const samePoint = (a, b) => a?.[0] === b?.[0] && a?.[1] === b?.[1];
const pointOf = ({ x, y } = {}) => [x, y];
const pathLength = (path) => path.slice(1).reduce((total, point, index) => total + Math.hypot(point[0] - path[index][0], point[1] - path[index][1]), 0);
const issue = (code, message, detail = {}) => ({ code, message, ...detail });

function between(value, a, b) {
  return value >= Math.min(a, b) && value <= Math.max(a, b);
}

function intersects([a, b], [c, d]) {
  const aHorizontal = a[1] === b[1];
  const cHorizontal = c[1] === d[1];
  if (aHorizontal !== cHorizontal) {
    const [h1, h2] = aHorizontal ? [a, b] : [c, d];
    const [v1, v2] = aHorizontal ? [c, d] : [a, b];
    return between(v1[0], h1[0], h2[0]) && between(h1[1], v1[1], v2[1]);
  }
  if (aHorizontal) return a[1] === c[1] && Math.max(Math.min(a[0], b[0]), Math.min(c[0], d[0])) <= Math.min(Math.max(a[0], b[0]), Math.max(c[0], d[0]));
  return a[0] === c[0] && Math.max(Math.min(a[1], b[1]), Math.min(c[1], d[1])) <= Math.min(Math.max(a[1], b[1]), Math.max(c[1], d[1]));
}

function validatePath(path, lane, { width, height, minSegment }, errors) {
  if (!Array.isArray(path) || path.length < 2) {
    errors.push(issue(MAP_VALIDATION.PATH_TOO_SHORT, `lane ${lane} needs at least two path points`, { lane }));
    return;
  }
  path.forEach((point, index) => {
    if (!Array.isArray(point) || point.length !== 2 || !point.every(Number.isInteger)) {
      errors.push(issue(MAP_VALIDATION.POINT_INVALID, `lane ${lane} point ${index} must contain two integers`, { lane, point: index }));
    } else if (point[0] < 0 || point[0] > width || point[1] < 0 || point[1] > height) {
      errors.push(issue(MAP_VALIDATION.POINT_OUTSIDE_WORLD, `lane ${lane} point ${index} is outside ${width}x${height}`, { lane, point: index }));
    }
  });
  const segments = path.slice(1).map((point, index) => [path[index], point]);
  segments.forEach(([a, b], index) => {
    const axisAligned = a[0] === b[0] || a[1] === b[1];
    if (!axisAligned) errors.push(issue(MAP_VALIDATION.SEGMENT_DIAGONAL, `lane ${lane} segment ${index} is not orthogonal`, { lane, segment: index }));
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (length < minSegment) errors.push(issue(MAP_VALIDATION.SEGMENT_TOO_SHORT, `lane ${lane} segment ${index} is ${length}px; minimum is ${minSegment}px`, { lane, segment: index }));
  });
  for (let a = 0; a < segments.length; a += 1) {
    for (let b = a + 2; b < segments.length; b += 1) {
      if (intersects(segments[a], segments[b])) {
        errors.push(issue(MAP_VALIDATION.PATH_SELF_INTERSECTION, `lane ${lane} segments ${a} and ${b} intersect`, { lane, segments: [a, b] }));
      }
    }
  }
}

/**
 * Validate one complete runtime map record.
 * @param {any} map
 * @param {{ width?: number, height?: number, minSegment?: number, minRoadSlots?: number, minPlatformSlots?: number }} [options]
 */
export function validateMap(map, {
  width = 960,
  height = 540,
  minSegment = 60,
  minRoadSlots = map?.grid?.board ? 6 : 15, // compact boards (board.js) hold few large tiles
  minPlatformSlots = map?.grid?.board ? 8 : 20,
} = {}) {
  const errors = [];
  if (!map?.base || !Number.isInteger(map.base.x) || !Number.isInteger(map.base.y)) {
    errors.push(issue(MAP_VALIDATION.BASE_MISSING, "map needs an integer base point"));
  }
  if (!map?.grid) errors.push(issue(MAP_VALIDATION.GRID_MISSING, "map needs grid generation settings"));

  const lanes = mapLanes(map);
  lanes.forEach((lane, index) => {
    validatePath(lane.path, index, { width, height, minSegment }, errors);
    if (!samePoint(lane.path?.[0], pointOf(lane.spawn))) {
      errors.push(issue(MAP_VALIDATION.SPAWN_MISMATCH, `lane ${index} does not begin at its spawn`, { lane: index }));
    }
    if (map.base && !samePoint(lane.path?.at(-1), pointOf(map.base))) {
      errors.push(issue(MAP_VALIDATION.BASE_MISMATCH, `lane ${index} does not end at the base`, { lane: index }));
    }
  });

  if (lanes.length > 1) {
    // Lanes may differ in length: targeting ranks enemies by distance still to go (sim
    // progress()), so every lane is fair. They must share their final segment.
    const tails = lanes.map((lane) => lane.path.slice(-2));
    if (!tails.every((tail) => JSON.stringify(tail) === JSON.stringify(tails[0]))) {
      errors.push(issue(MAP_VALIDATION.LANES_DO_NOT_MERGE, "multi-entry lanes need a shared final segment"));
    }
  }

  if (map?.grid) {
    try {
      const built = buildGrid(map);
      const committed = { roadSlots: map.roadSlots, platformSlots: map.platformSlots, rings: map.rings };
      if (JSON.stringify(built) !== JSON.stringify(committed)) {
        errors.push(issue(MAP_VALIDATION.GRID_OUT_OF_DATE, "committed slots or rings do not match buildGrid(map)"));
      }
    } catch (error) {
      errors.push(issue(MAP_VALIDATION.GRID_BUILD_FAILED, error instanceof Error ? error.message : String(error)));
    }
  }
  if ((map?.roadSlots?.length ?? 0) < minRoadSlots) {
    errors.push(issue(MAP_VALIDATION.ROAD_SLOT_COUNT, `map needs at least ${minRoadSlots} road slots`));
  }
  if ((map?.platformSlots?.length ?? 0) < minPlatformSlots) {
    errors.push(issue(MAP_VALIDATION.PLATFORM_SLOT_COUNT, `map needs at least ${minPlatformSlots} platform slots`));
  }
  return { ok: errors.length === 0, errors };
}

