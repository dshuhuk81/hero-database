// Placement tiles (M22b): square cells on the road (blockers) and in rows beside it
// (ranged). Pure and deterministic; scripts/build-td-grid.mjs writes the result into
// tdMaps.json as roadSlots / platformSlots / rings, so the game reads plain arrays.
import { mapLanes } from "./lanes.js";

export const GRID_DEFAULTS = {
  cell: 60,        // tile size and spacing along the road
  roadHalf: 35,    // half the painted road width (map-scene strokes it at 70)
  gap: 4,          // clearance between the road edge and a side tile
  endClear: 64,    // no tiles this close to a gate or the sanctuary
  bounds: [34, 34, 926, 506], // allowed tile centers [x0, y0, x1, y1]
};

// Axis-aligned route segments, shared lane tails once.
function routeSegments(map) {
  const seen = new Set();
  const segments = [];
  for (const lane of mapLanes(map)) {
    for (let i = 1; i < lane.path.length; i++) {
      const a = lane.path[i - 1], b = lane.path[i];
      const key = [a, b].map((p) => p.join(",")).sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      segments.push([a, b]);
    }
  }
  return segments;
}

function distanceToSegments(segments, x, y) {
  let nearest = Infinity;
  for (const [[ax, ay], [bx, by]] of segments) {
    const dx = bx - ax, dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    nearest = Math.min(nearest, Math.hypot(x - ax - t * dx, y - ay - t * dy));
  }
  return nearest;
}

// Evenly spaced points along a segment, centered so both ends get the same margin.
function along([ax, ay], [bx, by], step) {
  const length = Math.hypot(bx - ax, by - ay);
  const count = Math.max(1, Math.floor(length / step) + 1);
  const offset = (length - (count - 1) * step) / 2;
  const ux = (bx - ax) / (length || 1), uy = (by - ay) / (length || 1);
  return Array.from({ length: count }, (_, i) => ({ x: ax + ux * (offset + i * step), y: ay + uy * (offset + i * step), ux, uy }));
}

const TILE_HALF = 28; // drawn tile half size (map-scene.js TILE 56)
const tooClose = (cells, x, y, spacing) => cells.some(([cx, cy]) => Math.max(Math.abs(cx - x), Math.abs(cy - y)) < spacing);
const inRect = (x, y, [rx, ry, rw, rh]) => x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;
const round = (v) => Math.round(v);

// map.grid: { cell?, bounds?, exclude?: [[x, y, w, h], ...], rings?: [{ at: [x, y], kind }] }.
export function buildGrid(map) {
  const cfg = { ...GRID_DEFAULTS, ...(map.grid ?? {}) };
  const { cell, roadHalf, gap, endClear, bounds: [x0, y0, x1, y1] } = cfg;
  const segments = routeSegments(map);
  const ends = [...mapLanes(map).map((lane) => lane.path[0]), [map.base.x, map.base.y]];
  const blocked = (x, y) =>
    x < x0 || x > x1 || y < y0 || y > y1
    || ends.some(([ex, ey]) => Math.hypot(ex - x, ey - y) < endClear)
    || (cfg.exclude ?? []).some((rect) => inRect(x, y, rect));

  const road = [];
  for (const [a, b] of segments) {
    for (const p of along(a, b, cell)) {
      const x = round(p.x), y = round(p.y);
      if (!blocked(x, y) && !tooClose(road, x, y, cell - 8)) road.push([x, y]);
    }
  }

  // Side rows: one row of tiles on each side of every segment, just clear of the road.
  // A map can author its side tiles instead (`grid.platforms`, M24 layout trial):
  // irregular clusters in clearings and near bends, checked by the same rules.
  const across = roadHalf + gap + cell / 2;
  const platform = [];
  if (cfg.platforms) {
    const clear = roadHalf + gap + TILE_HALF;
    for (const [x, y] of cfg.platforms) {
      const where = `${map.id} side tile [${x}, ${y}]`;
      if (blocked(x, y)) throw new Error(`${where}: outside bounds, in an excluded rect or too close to a gate`);
      if (distanceToSegments(segments, x, y) < clear) throw new Error(`${where}: overlaps the road`);
      if (tooClose(platform, x, y, TILE_HALF * 2 + 2)) throw new Error(`${where}: overlaps another side tile`);
      platform.push([x, y]);
    }
  }
  for (const [a, b] of cfg.platforms ? [] : segments) {
    // Extend a tile past each end so the outside of a bend gets a corner tile.
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ux = (b[0] - a[0]) / length, uy = (b[1] - a[1]) / length;
    const a2 = [a[0] - ux * across, a[1] - uy * across], b2 = [b[0] + ux * across, b[1] + uy * across];
    for (const p of along(a2, b2, cell)) {
      for (const side of [-1, 1]) {
        const x = round(p.x - p.uy * across * side), y = round(p.y + p.ux * across * side);
        if (blocked(x, y) || distanceToSegments(segments, x, y) < across - 1) continue;
        if (!tooClose(platform, x, y, cell - 4)) platform.push([x, y]);
      }
    }
  }
  const order = (cells) => cells.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  order(road); order(platform);

  // Special rings sit on the tile nearest their anchor point.
  const rings = {};
  for (const { at: [x, y], kind, type } of cfg.rings ?? []) {
    const pools = type ? [[type, type === "road" ? road : platform]] : [["road", road], ["platform", platform]];
    let best = null;
    for (const [slotType, cells] of pools) {
      cells.forEach(([cx, cy], index) => {
        const d = Math.hypot(cx - x, cy - y);
        if (!best || d < best.d) best = { d, key: `${slotType}:${index}` };
      });
    }
    if (best) rings[best.key] = kind;
  }
  return { roadSlots: road, platformSlots: platform, rings };
}

// Route samples every 10 px (all lanes), for tile scoring.
const routeSamples = new WeakMap();
function samplesFor(map) {
  if (!routeSamples.has(map)) {
    const points = [];
    for (const { path } of map.lanes ?? [{ path: map.path }]) {
      for (let i = 1; i < path.length; i++) {
        const [ax, ay] = path[i - 1], [bx, by] = path[i];
        const steps = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / 10));
        for (let s = 0; s < steps; s++) points.push([ax + (bx - ax) * s / steps, ay + (by - ay) * s / steps, points.length]);
      }
    }
    routeSamples.set(map, points);
  }
  return routeSamples.get(map);
}

// Tiles for a hero, best first: most route inside its range, then later along the route
// (closer to the sanctuary). Test bots use it to pick tiles like a player would.
export function rankedTiles(map, type, range) {
  const tiles = type === "road" ? map.roadSlots : map.platformSlots;
  const samples = samplesFor(map);
  const score = tiles.map(([x, y]) => {
    let covered = 0, last = 0;
    for (const [px, py, order] of samples) if (Math.hypot(px - x, py - y) <= range) { covered++; last = Math.max(last, order); }
    return { covered, last };
  });
  return tiles.map((_, i) => i).sort((a, b) => score[b].covered - score[a].covered || score[b].last - score[a].last || a - b);
}
