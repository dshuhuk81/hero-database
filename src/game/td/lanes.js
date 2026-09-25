// Enemy routes of a map. Most maps have one entrance ("spawn" + "path"); a map with
// several lists them as "lanes", each a full route from its own gate to the base.
export function mapLanes(map) {
  return map.lanes ?? [{ spawn: map.spawn, path: map.path }];
}

// Polylines that draw every route exactly once. Lanes that merge share their tail,
// so a later lane only contributes its points up to where it joins an earlier one.
export function routeStrokes(map) {
  const drawn = [];
  const key = ([x, y]) => `${x},${y}`;
  return mapLanes(map).map(({ path }) => {
    const join = path.findIndex((point, i) => i > 0 && drawn.some((stroke) => {
      const at = stroke.findIndex((other) => key(other) === key(point));
      return at >= 0 && stroke.slice(at).map(key).join(";") === path.slice(i).map(key).join(";");
    }));
    const stroke = join > 0 ? path.slice(0, join + 1) : path;
    drawn.push(path);
    return stroke;
  });
}
