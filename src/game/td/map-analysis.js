// Deterministic geometry metrics for authored and generated battlefields. This module is
// deliberately independent of rendering and combat so generation tools can reject or
// classify candidates before they enter the runtime map catalog.
import { mapLanes } from "./lanes.js";

export const ANALYSIS_RANGES = [90, 160, 210];
const SAMPLE_STEP = 10;

const round = (value, digits = 3) => {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
};
const mean = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const lengthOf = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

function pathLength(path) {
  let total = 0;
  for (let i = 1; i < path.length; i += 1) total += lengthOf(path[i - 1], path[i]);
  return total;
}

function samplePath(path, step = SAMPLE_STEP) {
  const total = pathLength(path);
  if (!path.length) return [];
  if (!total) return [{ x: path[0][0], y: path[0][1], progress: 0 }];
  const samples = [];
  let walked = 0;
  for (let i = 1; i < path.length; i += 1) {
    const [ax, ay] = path[i - 1];
    const [bx, by] = path[i];
    const segment = lengthOf(path[i - 1], path[i]);
    const count = Math.max(1, Math.ceil(segment / step));
    for (let n = 0; n < count; n += 1) {
      const distance = segment * n / count;
      const t = segment ? distance / segment : 0;
      samples.push({
        x: ax + (bx - ax) * t,
        y: ay + (by - ay) * t,
        progress: (walked + distance) / total,
      });
    }
    walked += segment;
  }
  const [x, y] = path.at(-1);
  samples.push({ x, y, progress: 1 });
  return samples;
}

function coverage(samples, slots, range) {
  if (!samples.length) return { total: 0, early: 0, middle: 0, late: 0, dominant: 0, pockets: 0 };
  const hits = samples.map(({ x, y }) => slots.reduce((count, [sx, sy]) => count + (Math.hypot(x - sx, y - sy) <= range ? 1 : 0), 0));
  const share = (filter) => {
    const selected = hits.filter((_, index) => filter(samples[index].progress));
    return selected.length ? selected.filter(Boolean).length / selected.length : 0;
  };
  const perSlot = slots.map(([sx, sy]) => samples.filter(({ x, y }) => Math.hypot(x - sx, y - sy) <= range).length / samples.length);
  let pockets = 0;
  let inside = false;
  for (const count of hits) {
    if (count >= 2 && !inside) pockets += 1;
    inside = count >= 2;
  }
  return {
    total: round(hits.filter(Boolean).length / hits.length),
    early: round(share((progress) => progress < 1 / 3)),
    middle: round(share((progress) => progress >= 1 / 3 && progress < 2 / 3)),
    late: round(share((progress) => progress >= 2 / 3)),
    dominant: round(Math.max(0, ...perSlot)),
    pockets,
  };
}

function nearestSupport(roadSlots, platformSlots) {
  const distances = roadSlots.map(([x, y]) => Math.min(Infinity, ...platformSlots.map(([px, py]) => Math.hypot(x - px, y - py))));
  const finite = distances.filter(Number.isFinite);
  return {
    mean: round(mean(finite), 1),
    max: round(Math.max(0, ...finite), 1),
  };
}

function sharedTail(lanes) {
  if (lanes.length < 2) return null;
  const paths = lanes.map((lane) => lane.path);
  const shortest = Math.min(...paths.map((path) => path.length));
  let points = 0;
  while (points < shortest) {
    const reference = paths[0][paths[0].length - 1 - points];
    if (!paths.every((path) => {
      const point = path[path.length - 1 - points];
      return point[0] === reference[0] && point[1] === reference[1];
    })) break;
    points += 1;
  }
  if (points < 2) return { points, length: 0, ratio: 0 };
  const tail = paths[0].slice(paths[0].length - points);
  const length = pathLength(tail);
  return { points, length: round(length, 1), ratio: round(length / pathLength(paths[0])) };
}

function landmarkFor(metrics) {
  if (metrics.lanes.count > 1) return "twin-gate";
  const medium = metrics.coverage[160];
  if (medium.dominant >= 0.32 && medium.pockets >= 2) return "defense-basin";
  if (medium.late - medium.early >= 0.2) return "last-stand";
  if (metrics.route.longestSegment >= 400 && 1 - medium.total >= 0.12) return "long-watch";
  if (metrics.route.turns >= 5) return "switchback";
  return "open-road";
}

/**
 * Describe the tactical geometry of one runtime-compatible map.
 * @param {any} map
 * @param {{ ranges?: number[], sampleStep?: number }} [options]
 */
export function analyzeMap(map, { ranges = ANALYSIS_RANGES, sampleStep = SAMPLE_STEP } = {}) {
  const lanes = mapLanes(map);
  const laneLengths = lanes.map(({ path }) => pathLength(path));
  const segments = lanes.flatMap(({ path }) => path.slice(1).map((point, index) => lengthOf(path[index], point)));
  const samples = lanes.flatMap(({ path }) => samplePath(path, sampleStep));
  const platformSlots = map.platformSlots ?? [];
  const roadSlots = map.roadSlots ?? [];
  const coverageByRange = Object.fromEntries(ranges.map((range) => [range, coverage(samples, platformSlots, range)]));
  const metrics = {
    id: map.id,
    route: {
      length: round(Math.max(0, ...laneLengths), 1),
      laneLengths: laneLengths.map((length) => round(length, 1)),
      segments: segments.length,
      turns: lanes.reduce((sum, lane) => sum + Math.max(0, lane.path.length - 2), 0),
      longestSegment: round(Math.max(0, ...segments), 1),
      firstTurnDistance: round(mean(lanes.map((lane) => lane.path.length > 1 ? lengthOf(lane.path[0], lane.path[1]) : 0)), 1),
    },
    lanes: {
      count: lanes.length,
      lengthSpread: round(Math.max(0, ...laneLengths) - Math.min(...laneLengths), 1),
      sharedTail: sharedTail(lanes),
    },
    slots: {
      road: roadSlots.length,
      platform: platformSlots.length,
      roadSupport: nearestSupport(roadSlots, platformSlots),
    },
    coverage: coverageByRange,
  };
  return { ...metrics, landmark: landmarkFor(metrics) };
}

