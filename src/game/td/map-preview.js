// One resolved preview model for every UI surface that shows a battlefield. Preview and
// combat both receive the same materialized map, so generated routes cannot drift from
// their terrain, gates or base.
import { mapLanes, routeStrokes } from "./lanes.js";
import { mapSceneFor } from "./map-scene.js";

export const routePreviewPoints = (points) => points.map(([x, y]) => `${x},${y}`).join(" ");

export function mapPreviewModel(map) {
  const art = mapSceneFor(map)?.assets ?? null;
  return {
    id: map.id,
    name: map.name,
    art,
    routes: routeStrokes(map).map((points) => points.map(([x, y]) => [x, y])),
    spawns: mapLanes(map).map(({ spawn }) => ({ x: spawn.x, y: spawn.y })),
    base: map.base ? { x: map.base.x, y: map.base.y } : null,
    geometryHash: map.geometryHash ?? null,
    skinId: map.skinId ?? map.art ?? null,
  };
}

