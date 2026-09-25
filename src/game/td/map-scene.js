// Retained scenery for authored battlefields. Coordinates use the game's 960 × 540 world.
// All randomness is local to the scenery: decorating a map never consumes combat RNG.
const TAU = Math.PI * 2;

// Per-map art direction, keyed by tdMaps.json `art`. Assets load from public/td/maps/.
export const MAP_SCENES = {
  "moonlit-sanctuary-v1": {
    name: "Moonlit", baseName: "Sanctuary",
    assets: {
      terrain: "/td/maps/moonlit-terrain-v1.png",
      spawn: "/td/maps/moonlit-spawn-v1.png",
      base: "/td/maps/moonlit-base-v1.png",
      road: "/td/maps/moonlit-road-v1.png",
      pad: "/td/maps/moonlit-pad-v1.png",
    },
    ground: 0x202e3d, grade: { color: 0x08101c, alpha: 0.14 },
    seed: 0x6d6f6f6e,
    stone: [0x424c58, 0x48535e, 0x3b4652, 0x505962, 0x39434f, 0x45525d],
    gold: 0xb69a60, light: 0xeee1b1,
    road: { tint: 0xa4b3c7, bed: [[82, 0x142127, 0.17], [76, 0x29332e, 0.35]], shoulders: [0x566269, 0x3c4d52], shoulderShadow: 0x101c25 },
    fragments: { count: 105, color: 0x65716e, edge: 0xb1b3a0 },
    labels: { spawn: ["SPAWN", 0xc2d0e1], base: ["SANCTUARY", 0xe3d4a8], integrity: 0xb6c4cf, stroke: 0x0a1420 },
    glow: { spawn: 0xb8ceee, base: 0xf5d590, hit: 0xffc0a0, ring: 0xf0c191, place: 0xe4c78d, dust: 0xb6b1a0, mote: 0xe8d9b2 },
    pad: { platformTint: 0xc7d0f5, road: 0xc4a664, platform: 0x9ca6d6, highlight: 0xf3dba6 },
  },
  "verdant-shrine-v1": {
    name: "Verdant", baseName: "Shrine",
    assets: {
      terrain: "/td/maps/verdant-terrain-v1.png",
      spawn: "/td/maps/verdant-spawn-v1.png",
      base: "/td/maps/verdant-base-v1.png",
      road: "/td/maps/verdant-road-v1.png",
      pad: "/td/maps/verdant-pad-v1.png",
    },
    ground: 0x1f2d24, grade: { color: 0x07140f, alpha: 0.12 },
    seed: 0x76657264,
    stone: [0x46514a, 0x4b5850, 0x3e4a43, 0x535e55, 0x3b463f, 0x48554d],
    gold: 0xc0a05a, light: 0xf3e2a8,
    road: { tint: 0xb3c0ab, bed: [[84, 0x0f1d17, 0.2], [76, 0x2a3a2b, 0.38]], shoulders: [0x5a6a52, 0x3e5140], shoulderShadow: 0x0d1a14 },
    fragments: { count: 70, color: 0x66735f, edge: 0xb3b99c },
    labels: { spawn: ["SPAWN", 0xe6b3a4], base: ["SHRINE", 0xecd79b], integrity: 0xbccbb8, stroke: 0x0a1610 },
    glow: { spawn: 0xff8a6a, base: 0xffd27a, hit: 0xffc0a0, ring: 0xf0c191, place: 0xd8cf8a, dust: 0xa9b095, mote: 0xf0dfa0 },
    pad: { platformTint: 0xcfe3cb, road: 0xc9a95f, platform: 0x86cfa4, highlight: 0xf1e2a4 },
    decorate: decorateVerdant,
  },
};

export function mapSceneFor(map) {
  return MAP_SCENES[map?.art] ?? null;
}

export function createMapScene(PIXI, game, {
  ground, structures, foreground, overlay, reducedMotion = false, textures = {},
}) {
  const theme = mapSceneFor(game.map);
  const STONE = theme.stone, GOLD = theme.gold, LIGHT = theme.light;
  const owned = [];
  const add = (parent, object) => { parent.addChild(object); owned.push(object); return object; };
  const graphic = parent => add(parent, new PIXI.Graphics());
  let seed = theme.seed;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const spawn = game.map.spawn;
  const base = game.map.base;
  const maxLives = Math.max(1, game.tuning?.run?.lives ?? game.lives ?? 1);
  const seen = new WeakSet();
  let hitAt = -Infinity;
  let lastLives = game.lives;
  let lastWave = game.wave;
  let waveAt = -Infinity;
  let lastIntegrity = -1;
  const placements = [];

  function polygon(g, points, color, alpha = 1) {
    g.poly(points.flat()).fill({ color, alpha });
  }

  function strokePath(g, width, color, alpha = 1) {
    const points = game.map.path;
    g.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) g.lineTo(points[i][0], points[i][1]);
    g.stroke({ width, color, alpha, cap: "round", join: "round" });
  }

  // The road has a sunken bed, dusty shoulders and three irregular stone courses.
  const road = graphic(ground);
  if (textures.road) {
    for (const [width, color, alpha] of theme.road.bed) strokePath(road, width, color, alpha);
    const mask = graphic(ground);
    strokePath(mask, 70, 0xffffff);
    const surface = add(ground, new PIXI.TilingSprite({ texture: textures.road, width: 960, height: 540 }));
    surface.tileScale.set(0.12);
    surface.tint = theme.road.tint; // grading keeps pale stone within the terrain's value range
    surface.mask = mask;
  } else {
    strokePath(road, 84, 0x141c23, 0.32);
    strokePath(road, 76, 0x333c40, 0.65);
    strokePath(road, 68, 0x1b252e);
  }
  for (let segment = 1; segment < game.map.path.length; segment++) {
    const [ax, ay] = game.map.path[segment - 1];
    const [bx, by] = game.map.path[segment];
    const length = Math.hypot(bx - ax, by - ay);
    if (!length) continue;
    const ux = (bx - ax) / length, uy = (by - ay) / length;
    const project = (along, across) => [ax + ux * along - uy * across, ay + uy * along + ux * across];
    for (let row = -1; !textures.road && row <= 1; row++) {
      for (let distance = row === 0 ? 0 : -10; distance < length; distance += 24) {
        const start = Math.max(0, distance + 1.5), end = Math.min(length, distance + 22);
        if (end <= start) continue;
        const left = row * 22 - 9 + random() * 1.6;
        const right = row * 22 + 9.5 - random();
        const corners = [project(start + random() * 2, left + 1), project(end - 2, left),
          project(end, left + 3), project(end - random() * 2, right - 1),
          project(start + 1, right), project(start, right - 3)];
        polygon(road, corners.map(([x, y]) => [x + 0.5, y + 2]), 0x0c151e, 0.85);
        polygon(road, corners, STONE[Math.floor(random() * STONE.length)], 0.96);
        road.moveTo(...corners[0]).lineTo(...corners[1]).stroke({ width: 0.8, color: 0x92a1ac, alpha: 0.24 });
        if (random() < 0.18) {
          const a = project(start + 7, left + 1), b = project(start + 10, left + 6), c = project(start + 7, left + 11);
          road.moveTo(...a).lineTo(...b).lineTo(...c).stroke({ width: 0.9, color: 0x17232b, alpha: 0.65 });
        }
      }
    }
    for (const side of [-1, 1]) {
      for (let distance = 5; distance < length - 8; distance += 18) {
        if (random() < 0.23) continue;
        const across = side * (36 + random() * 2);
        const p = [project(distance, across - 2.3), project(distance + 12, across - 2),
          project(distance + 11, across + 2), project(distance + 1, across + 2.8)];
        polygon(road, p.map(([x, y]) => [x, y + 2]), theme.road.shoulderShadow, textures.road ? 0.2 : 0.6);
        polygon(road, p, random() > 0.5 ? theme.road.shoulders[0] : theme.road.shoulders[1], textures.road ? 0.33 : 0.7);
      }
    }
  }

  // Scattered fragments only outside routes and the interactive placement footprints.
  const allSlots = [...game.map.roadSlots, ...game.map.platformSlots];
  function distanceToPath(x, y) {
    let nearest = Infinity;
    for (let i = 1; i < game.map.path.length; i++) {
      const [ax, ay] = game.map.path[i - 1], [bx, by] = game.map.path[i];
      const dx = bx - ax, dy = by - ay;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
      nearest = Math.min(nearest, Math.hypot(x - ax - t * dx, y - ay - t * dy));
    }
    return nearest;
  }
  const fragments = graphic(ground);
  for (let i = 0; i < theme.fragments.count; i++) {
    const x = 22 + random() * 916, y = 24 + random() * 492;
    if (distanceToPath(x, y) < 49 || allSlots.some(([sx, sy]) => Math.hypot(x - sx, y - sy) < 47)
      || Math.hypot(x - base.x, y - base.y) < 86 || Math.hypot(x - spawn.x, y - spawn.y) < 70) continue;
    const w = 2 + random() * 6, h = 1.5 + random() * 3;
    fragments.ellipse(x + 2, y + 3, w + 1, h + 1).fill({ color: 0x07121b, alpha: 0.3 });
    polygon(fragments, [[x - w, y], [x - w * 0.6, y - h], [x + w * 0.6, y - h * 0.5], [x + w, y + h], [x - w * 0.4, y + h]], theme.fragments.color, 0.36);
    fragments.moveTo(x - w * 0.6, y - h).lineTo(x + w * 0.6, y - h * 0.5).stroke({ width: 0.7, color: theme.fragments.edge, alpha: 0.2 });
  }

  function localGraphic(parent, point) {
    const g = graphic(parent); g.position.set(point.x, point.y); return g;
  }

  function foundation(g, width, depth) {
    g.ellipse(5, 17, width + 4, depth + 8).fill({ color: 0x050a13, alpha: 0.48 });
    const p = [[-width, -depth + 8], [-width + 12, -depth], [width - 12, -depth], [width, -depth + 8],
      [width, depth - 6], [width - 12, depth], [-width + 12, depth], [-width, depth - 6]];
    polygon(g, p.map(([x, y]) => [x, y + 8]), 0x17232e);
    polygon(g, p, 0x53616d);
    g.poly(p.flat()).stroke({ color: 0x8b989a, alpha: 0.45, width: 1 });
    g.moveTo(-width + 12, depth + 4).lineTo(width - 12, depth + 4).stroke({ color: 0x354652, width: 2 });
    g.ellipse(0, 0, width - 11, depth - 8).stroke({ color: GOLD, alpha: 0.42, width: 1 });
  }

  function column(g, x, y, height, width = 12) {
    g.rect(x - width / 2 + 3, y - height + 5, width, height + 3).fill({ color: 0x09131d, alpha: 0.7 });
    g.rect(x - width / 2, y - height, width, height).fill(0x52616f);
    g.rect(x + 1, y - height, width / 2 - 1, height).fill(0x2d3d4b);
    g.rect(x - width / 2 + 2, y - height + 3, 2, height - 5).fill({ color: 0xa0adb0, alpha: 0.45 });
    g.rect(x - width / 2 - 3, y - height, width + 6, 5).fill(0x77818a);
    g.rect(x - width / 2 - 3, y - 3, width + 6, 6).fill(0x657381);
    g.rect(x - width / 2 - 1, y - height + 7, width + 2, 2).fill({ color: GOLD, alpha: 0.8 });
    for (let cut = 11; cut < height - 5; cut += 12) {
      g.moveTo(x - width / 2, y - cut).lineTo(x + width / 2, y - cut).stroke({ color: 0x1e2e3c, width: 1, alpha: 0.65 });
    }
  }

  function star(g, x, y, radius, color, alpha = 1) {
    const points = [];
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8 - Math.PI / 2, r = i % 2 ? radius * 0.25 : radius;
      points.push(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    g.poly(points).fill({ color, alpha });
  }

  const gate = localGraphic(structures, spawn);
  foundation(gate, 37, 34);
  // A narrow, vertical opening presents its bright threshold toward the right.
  gate.ellipse(-5, -7, 13, 33).fill(0x101529);
  gate.ellipse(-4, -7, 10, 29).fill({ color: 0x6578ad, alpha: 0.48 });
  gate.ellipse(-2, -6, 5, 25).fill({ color: 0xacc4e6, alpha: 0.32 });
  column(gate, -11, -21, 22, 13);
  polygon(gate, [[-19, -42], [-11, -49], [2, -43], [7, -30], [0, -24], [-4, -36]], 0x74818b);
  gate.moveTo(-12, -43).lineTo(-2, -37).lineTo(2, -28).stroke({ color: GOLD, alpha: 0.8, width: 1.5 });
  gate.moveTo(-27, 21).lineTo(27, 21).stroke({ width: 1.2, color: GOLD, alpha: 0.65 });
  for (let i = 0; i < 4; i++) gate.rect(6 + i * 6, -12, 3, 24).fill({ color: 0xa4afb4, alpha: 0.17 });
  const gateFront = localGraphic(foreground, spawn);
  column(gateFront, -10, 29, 21, 14);
  polygon(gateFront, [[-21, 30], [-18, 23], [0, 23], [5, 29], [1, 35], [-18, 35]], 0x394b5b);
  star(gateFront, -10, 12, 4.5, LIGHT, 0.8);

  const sanctuary = localGraphic(structures, base);
  foundation(sanctuary, 51, 39);
  // West-facing vestibule: a dark doorway, roofed chamber and raised rear wall.
  polygon(sanctuary, [[-8, -30], [30, -37], [43, -26], [43, 21], [27, 29], [-8, 22]], 0x263745);
  polygon(sanctuary, [[30, -37], [43, -26], [43, 21], [30, 27]], 0x1b2b38);
  sanctuary.ellipse(-7, -2, 19, 25).fill(0x101b2a);
  sanctuary.ellipse(-4, -2, 13, 21).fill({ color: 0xd4b576, alpha: 0.12 });
  polygon(sanctuary, [[-18, -29], [11, -53], [39, -36], [43, -29], [12, -43], [-15, -23]], 0x77818a);
  sanctuary.moveTo(-18, -29).lineTo(11, -53).lineTo(39, -36).stroke({ color: 0xccb779, width: 2 });
  column(sanctuary, -13, -16, 19, 10);
  column(sanctuary, 32, -20, 19, 10);
  // The astrolabe is mounted above the sanctuary, with small physical gold inlays.
  sanctuary.circle(12, -35, 17).fill(0x283843).stroke({ width: 2.3, color: GOLD });
  sanctuary.circle(12, -35, 12).stroke({ width: 0.8, color: LIGHT, alpha: 0.65 });
  sanctuary.ellipse(12, -35, 7, 14).stroke({ width: 1, color: GOLD, alpha: 0.75 });
  sanctuary.moveTo(-2, -35).lineTo(26, -35).stroke({ width: 1, color: GOLD, alpha: 0.8 });
  star(sanctuary, 12, -35, 9, LIGHT, 0.95);
  for (let i = 0; i < 8; i++) {
    const a = i * TAU / 8;
    sanctuary.circle(12 + Math.cos(a) * 17, -35 + Math.sin(a) * 17, 1.4).fill(LIGHT);
  }
  for (let i = 0; i < 3; i++) {
    const x = -42 + i * 8;
    sanctuary.moveTo(x, -17).lineTo(x, 19).stroke({ width: 1.5, color: 0xa7aaa0, alpha: 0.3 });
  }
  const baseFront = localGraphic(foreground, base);
  column(baseFront, 2, 27, 20, 11);
  column(baseFront, 34, 23, 24, 11);
  polygon(baseFront, [[0, 26], [37, 22], [41, 29], [5, 35]], 0x3b4d59);
  baseFront.moveTo(4, 28).lineTo(36, 25).stroke({ width: 1.4, color: GOLD, alpha: 0.8 });

  // Painted architecture already carries its own foundation; only a soft contact
  // shadow is needed. Use vector masonry if an image is unavailable.
  for (const [texture, point, back, front, width, height, padWidth, padDepth] of [
    [textures.spawn, spawn, gate, gateFront, 96, 110, 37, 34],
    [textures.base, base, sanctuary, baseFront, 118, 125, 51, 39],
  ]) {
    if (!texture) continue;
    back.clear();
    back.ellipse(3, 16, padWidth, padDepth * 0.7).fill({ color: 0x06111b, alpha: 0.17 });
    back.ellipse(2, 14, padWidth * 0.8, padDepth * 0.5).fill({ color: 0x06111b, alpha: 0.14 });
    front.visible = false;
    const sprite = add(structures, new PIXI.Sprite(texture));
    sprite.anchor.set(0.5);
    sprite.position.set(point.x, point.y);
    sprite.width = width; sprite.height = height;
  }

  function label(text, x, y, size, color) {
    const t = add(overlay, new PIXI.Text({ text, style: {
      fontFamily: "Georgia, serif", fontSize: size, fontWeight: "600", fill: color,
      letterSpacing: size >= 10 ? 1.3 : 0.5,
      stroke: { color: theme.labels.stroke, width: 3 },
    } }));
    t.anchor.set(0.5); t.position.set(x, y); return t;
  }
  label(theme.labels.spawn[0], spawn.x + 1, spawn.y + 51, 10, theme.labels.spawn[1]);
  label(theme.labels.base[0], base.x + 1, base.y + 55, 10, theme.labels.base[1]);
  const integrityLabel = label("", base.x + 1, base.y + 69, 9, theme.labels.integrity);
  const cracks = localGraphic(foreground, base);
  const ambient = graphic(overlay);
  const motes = Array.from({ length: 12 }, (_, i) => ({
    x: i < 6 ? spawn.x : base.x + 9, y: i < 6 ? spawn.y : base.y - 10,
    phase: random() * TAU, span: 10 + random() * 17, speed: 0.1 + random() * 0.15,
  }));
  const extra = theme.decorate?.({ PIXI, game, add, graphic, random, polygon, star, distanceToPath, allSlots,
    layers: { ground, structures, foreground, overlay }, reducedMotion, theme });

  function draw(now = 0) {
    const seconds = now / 1000;
    if (game.wave !== lastWave) { lastWave = game.wave; waveAt = now; }
    for (const effect of game.effects ?? []) {
      if (effect.type === "baseHit" && !seen.has(effect)) {
        seen.add(effect);
        if (effect.damage > 0) hitAt = now;
      } else if (effect.type === "place" && !seen.has(effect)) {
        seen.add(effect);
        if (Number.isFinite(effect.x) && Number.isFinite(effect.y)) {
          placements.push({ x: effect.x, y: effect.y, at: now });
        }
      }
    }
    // This also works while an older saved run has no explicit baseHit effect.
    if (game.lives < lastLives) hitAt = now;
    lastLives = game.lives;
    const integrity = Math.max(0, Math.min(1, game.lives / maxLives));
    if (lastIntegrity !== integrity) {
      lastIntegrity = integrity;
      integrityLabel.text = `${Math.max(0, game.lives)} / ${maxLives} INTEGRITY`;
      integrityLabel.style.fill = integrity <= 0.3 ? 0xe8a68b : theme.labels.integrity;
      cracks.clear();
      if (integrity < 0.7) cracks.moveTo(35, -23).lineTo(30, -12).lineTo(35, -5).lineTo(29, 5).stroke({ color: 0x0a1420, width: 2 });
      if (integrity < 0.35) cracks.moveTo(3, 17).lineTo(13, 24).lineTo(11, 30).lineTo(21, 34).stroke({ color: 0x121a20, width: 2 });
    }
    ambient.clear();
    const breath = reducedMotion ? 0.5 : 0.5 + Math.sin(seconds * 1.4) * 0.5;
    const hit = Math.max(0, 1 - (now - hitAt) / 650);
    const wave = reducedMotion ? 0 : Math.max(0, 1 - (now - waveAt) / 1100);
    ambient.ellipse(spawn.x - 4, spawn.y - 5, 7, 25).fill({ color: theme.glow.spawn, alpha: 0.06 + breath * 0.045 + wave * 0.14 });
    ambient.ellipse(base.x - 5, base.y, 15, 24).fill({ color: hit ? theme.glow.hit : theme.glow.base, alpha: 0.035 + breath * 0.025 + hit * 0.2 });
    if (hit > 0) {
      ambient.ellipse(base.x - 7, base.y, 24 + (reducedMotion ? 0 : (1 - hit) * 9), 33)
        .stroke({ width: 2, color: theme.glow.ring, alpha: hit * 0.75 });
    }
    for (let i = placements.length - 1; i >= 0; i--) {
      const placement = placements[i];
      const progress = (now - placement.at) / 350;
      if (progress >= 1) { placements.splice(i, 1); continue; }
      const fade = 1 - progress;
      const radius = reducedMotion ? 27 : 24 + progress * 13;
      ambient.ellipse(placement.x, placement.y + 4, radius, radius * 0.67)
        .stroke({ width: 1.5, color: theme.glow.place, alpha: fade * 0.55 });
      if (!reducedMotion) {
        for (let mote = 0; mote < 7; mote++) {
          const a = mote * TAU / 7;
          const x = placement.x + Math.cos(a) * (18 + progress * 22);
          const y = placement.y + 7 + Math.sin(a) * (9 + progress * 13) - Math.sin(progress * Math.PI) * 5;
          ambient.ellipse(x, y, 1.8 - progress, 1.1).fill({ color: theme.glow.dust, alpha: fade * 0.4 });
        }
      }
    }
    if (!reducedMotion) {
      for (const mote of motes) {
        const phase = (seconds * mote.speed + mote.phase) % 1;
        const x = mote.x + Math.sin(mote.phase + seconds * 0.35) * mote.span;
        const y = mote.y + 12 - phase * 53;
        ambient.circle(x, y, 0.7 + Math.sin(mote.phase) * 0.2).fill({ color: theme.glow.mote, alpha: Math.sin(phase * Math.PI) * 0.35 });
      }
    }
    extra?.draw(now, { hit, wave, breath });
  }

  // Caller can retain a slot container and repaint only when its state changes.
  function drawSlot(container, x, y, type, occupied, highlighted) {
    const g = new PIXI.Graphics();
    g.position.set(x, y);
    container.addChild(g);
    const radius = type === "road" ? 26 : 24;
    const accent = type === "road" ? theme.pad.road : theme.pad.platform;
    if (textures.pad) {
      g.ellipse(1, 11, 25, 13).fill({ color: 0x07131c, alpha: 0.22 });
      const sprite = new PIXI.Sprite(textures.pad);
      sprite.anchor.set(0.5);
      sprite.position.set(x, y);
      sprite.width = 60; sprite.height = 58;
      if (type === "platform") sprite.tint = theme.pad.platformTint;
      container.addChild(sprite);
      if (!occupied || highlighted) {
        const rune = new PIXI.Graphics();
        rune.position.set(x, y - 1);
        rune.ellipse(0, 0, 18, 13).stroke({ color: accent, width: highlighted ? 1.6 : 1, alpha: highlighted ? 0.9 : 0.55 });
        if (!occupied) star(rune, 0, 0, 4.5, accent, highlighted ? 0.9 : 0.5);
        if (highlighted) rune.ellipse(0, 1, 29, 23).stroke({ color: theme.pad.highlight, width: 1.2, alpha: 0.65 });
        container.addChild(rune);
      }
      return g;
    }
    g.ellipse(3, 9, radius + 5, radius * 0.78).fill({ color: 0x030b14, alpha: 0.56 });
    const points = [];
    for (let i = 0; i < 8; i++) {
      const a = (i + 0.5) * TAU / 8;
      points.push([Math.cos(a) * radius, Math.sin(a) * radius * 0.82]);
    }
    polygon(g, points.map(([px, py]) => [px, py + 5]), 0x203140);
    polygon(g, points, occupied ? 0x4e5d68 : 0x53636f);
    g.poly(points.flat()).stroke({ color: 0xa7b2b5, alpha: 0.46, width: 1 });
    g.ellipse(0, 0, radius - 5, (radius - 5) * 0.82).fill({ color: 0x253645, alpha: 0.56 });
    g.ellipse(0, 0, radius - 6, (radius - 6) * 0.82).stroke({ color: accent, alpha: highlighted ? 1 : occupied ? 0.34 : 0.7, width: highlighted ? 2 : 1 });
    for (let i = 0; i < 4; i++) {
      const a = i * TAU / 4;
      const px = Math.cos(a) * (radius - 2), py = Math.sin(a) * (radius - 2) * 0.82;
      g.circle(px, py, 1.1).fill({ color: accent, alpha: 0.8 });
    }
    if (!occupied) {
      star(g, 0, 0, 7, accent, 0.68);
      g.moveTo(-11, 8).lineTo(-4, 11).lineTo(9, 8).stroke({ color: 0x97a5ac, alpha: 0.18, width: 0.8 });
    }
    if (highlighted) {
      g.ellipse(0, 0, radius + 4, (radius + 4) * 0.82).stroke({ color: 0xffe7b4, alpha: 0.8, width: 1.5 });
      g.ellipse(0, 0, radius + 7, (radius + 7) * 0.82).stroke({ color: accent, alpha: 0.14, width: 4 });
    }
    return g;
  }

  draw(0);
  return {
    draw, drawSlot,
    destroy() {
      for (const object of owned) if (!object.destroyed) { object.removeFromParent(); object.destroy({ children: true }); }
    },
  };
}

// Verdant Crossing: fallen guardian landmark, root-bound spawn threshold,
// water glints and fireflies in the sheltered pockets. Pool centers match
// scripts/build-td-verdant-art.py.
const VERDANT_POOLS = [[887, 303, 58, 40], [62, 478, 74, 44], [430, 331, 46, 20]];

function decorateVerdant({ PIXI, add, graphic, random, polygon, layers, reducedMotion, theme, game }) {
  const GOLD = theme.gold;
  const spawn = game.map.spawn;

  // Corrupted roots spread from the breach across the first flagstones (ground layer, under units).
  const roots = graphic(layers.ground);
  for (const [points, width] of [
    [[[26, 124], [10, 138], [6, 156], [18, 170]], 4.5],
    [[[70, 124], [84, 136], [80, 150], [96, 160]], 3.5],
    [[[40, 128], [44, 146], [34, 160], [40, 176]], 3],
  ]) {
    roots.moveTo(...points[0]).bezierCurveTo(...points[1], ...points[2], ...points[3]);
    roots.stroke({ width: width + 1.5, color: 0x0b0e0a, alpha: 0.5, cap: "round" });
    roots.moveTo(...points[0]).bezierCurveTo(...points[1], ...points[2], ...points[3]);
    roots.stroke({ width, color: 0x2d2419, alpha: 0.95, cap: "round" });
    roots.moveTo(points[0][0] - 0.8, points[0][1] - 0.8).bezierCurveTo(points[1][0] - 0.8, points[1][1] - 0.8, points[2][0] - 0.8, points[2][1] - 0.8, points[3][0] - 0.8, points[3][1] - 0.8);
    roots.stroke({ width: 0.9, color: 0x7d6a4a, alpha: 0.5, cap: "round" });
  }
  // Blight veins in the roots pulse with the spawn (overlay would sit above units; keep them low).
  const veins = graphic(layers.ground);

  // Fallen guardian: toppled helmeted head, broken torso block and a split spear,
  // lying flat in the top-right thicket, clear of the route and the (860,160) pad.
  const guardian = add(layers.structures, new PIXI.Graphics());
  guardian.position.set(893, 62);
  const g = guardian;
  g.ellipse(4, 20, 64, 17).fill({ color: 0x050d09, alpha: 0.45 });
  // Torso: a heavy carved block with a gilded collar, tipped onto its side.
  polygon(g, [[-8, -10], [44, -20], [58, -6], [56, 16], [4, 24], [-10, 10]].map(([x, y]) => [x + 2, y + 4]), 0x101a14);
  polygon(g, [[-8, -10], [44, -20], [58, -6], [56, 16], [4, 24], [-10, 10]], 0x5b665c);
  polygon(g, [[44, -20], [58, -6], [56, 16], [46, 2]], 0x3a453d);
  polygon(g, [[-8, -10], [44, -20], [46, 2], [-6, 8]], 0x6d786c);
  g.moveTo(-6, -2).lineTo(45, -10).stroke({ width: 2.2, color: GOLD, alpha: 0.75 });
  g.moveTo(8, -12).lineTo(12, 6).lineTo(6, 18).stroke({ width: 1, color: 0x1a2219, alpha: 0.7 });
  g.moveTo(28, -16).lineTo(31, 0).stroke({ width: 1, color: 0x1a2219, alpha: 0.6 });
  // Head with crested helmet, face turned up, resting against the torso.
  g.ellipse(-26, 4, 20, 17).fill(0x141e17);
  g.ellipse(-27, 1, 19, 16).fill(0x646f63);
  g.ellipse(-31, -3, 12, 10).fill({ color: 0x7f8a7a, alpha: 0.8 });
  polygon(g, [[-44, -8], [-30, -22], [-10, -16], [-14, -10], [-30, -14]], 0x4b564c);
  g.moveTo(-44, -8).lineTo(-30, -22).lineTo(-10, -16).stroke({ width: 1.6, color: GOLD, alpha: 0.8 });
  g.moveTo(-36, 2).lineTo(-28, 1).stroke({ width: 1.8, color: 0x151c16, alpha: 0.9 });
  g.moveTo(-24, 0).lineTo(-17, 2).stroke({ width: 1.8, color: 0x151c16, alpha: 0.9 });
  g.moveTo(-28, 9).lineTo(-22, 10).stroke({ width: 1, color: 0x2a332a, alpha: 0.8 });
  g.moveTo(-40, 12).lineTo(-33, 5).lineTo(-36, -2).stroke({ width: 0.9, color: 0x1a2219, alpha: 0.7 });
  // Split spear: shaft lies across the thicket, gilded blade broken off beside it.
  g.moveTo(-58, 28).lineTo(20, 32).stroke({ width: 4, color: 0x1a130c, alpha: 0.55 });
  g.moveTo(-60, 25).lineTo(18, 29).stroke({ width: 3, color: 0x6a5536 });
  g.moveTo(-60, 24).lineTo(18, 28).stroke({ width: 0.8, color: 0xb59a6a, alpha: 0.6 });
  polygon(g, [[26, 30], [44, 25], [52, 30], [44, 34]], 0x8f7437);
  polygon(g, [[26, 30], [44, 25], [52, 30]], GOLD);
  // Moss drapes and a few leaves reclaiming the statue.
  for (let i = 0; i < 22; i++) {
    const x = -44 + random() * 100, y = -18 + random() * 30;
    const onStatue = (x > -46 && x < -8 && Math.hypot((x + 27) / 19, (y - 1) / 16) < 1) || (x > -8 && x < 56 && y > -16 && y < 20);
    if (!onStatue) continue;
    const r = 1.8 + random() * 3;
    g.ellipse(x, y, r * 1.5, r).fill({ color: random() > 0.5 ? 0x3f5f2e : 0x5f8340, alpha: 0.85 });
  }
  for (let i = 0; i < 7; i++) {
    const x = -48 + i * 16 + random() * 6, y = 20 + random() * 8;
    g.ellipse(x, y, 5 + random() * 3, 3).fill({ color: 0x2a4a2a, alpha: 0.9 });
    g.ellipse(x - 1, y - 1, 3, 1.6).fill({ color: 0x6f9a52, alpha: 0.7 });
  }

  // Ground-level glints on the pools (below units) and fireflies (above scenery, tiny).
  const water = graphic(layers.ground);
  const glints = VERDANT_POOLS.flatMap(([cx, cy, rx, ry]) => Array.from({ length: Math.max(2, Math.round(rx / 18)) }, () => ({
    x: cx + (random() - 0.5) * rx * 1.1, y: cy + (random() - 0.5) * ry * 0.9,
    w: 4 + random() * 7, phase: random() * Math.PI * 2,
  })));
  const flies = graphic(layers.overlay);
  const sheltered = [[905, 70], [70, 470], [880, 300], [20, 230], [430, 520], [940, 200], [300, 20], [630, 520]];
  const fireflies = Array.from({ length: 14 }, (_, i) => {
    const [x, y] = sheltered[i % sheltered.length];
    return { x: x + (random() - 0.5) * 50, y: y + (random() - 0.5) * 30, phase: random() * Math.PI * 2, speed: 0.25 + random() * 0.35 };
  });

  return {
    draw(now, { wave, breath }) {
      const seconds = now / 1000;
      veins.clear();
      veins.moveTo(26, 124).bezierCurveTo(10, 138, 6, 156, 18, 170)
        .stroke({ width: 1, color: theme.glow.spawn, alpha: 0.18 + breath * 0.12 + wave * 0.35, cap: "round" });
      veins.moveTo(70, 124).bezierCurveTo(84, 136, 80, 150, 96, 160)
        .stroke({ width: 0.8, color: theme.glow.spawn, alpha: 0.14 + breath * 0.1 + wave * 0.3, cap: "round" });
      water.clear();
      for (const glint of glints) {
        const shimmer = reducedMotion ? 0.5 : 0.5 + Math.sin(seconds * 1.1 + glint.phase) * 0.5;
        const drift = reducedMotion ? 0 : Math.sin(seconds * 0.4 + glint.phase) * 2;
        water.ellipse(glint.x + drift, glint.y, glint.w, 0.9).fill({ color: 0xcfeede, alpha: 0.06 + shimmer * 0.12 });
      }
      flies.clear();
      if (reducedMotion) return;
      for (const fly of fireflies) {
        const t = seconds * fly.speed + fly.phase;
        const x = fly.x + Math.sin(t) * 16 + Math.sin(t * 2.3) * 4;
        const y = fly.y + Math.cos(t * 0.8) * 9;
        const blink = Math.max(0, Math.sin(t * 2.1 + fly.phase * 3));
        flies.circle(x, y, 3.2).fill({ color: 0xd9f59a, alpha: blink * 0.08 });
        flies.circle(x, y, 1).fill({ color: 0xf2ffc6, alpha: blink * 0.55 });
      }
    },
  };
}
