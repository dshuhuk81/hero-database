// Retained scenery for authored battlefields. Coordinates use the game's 960 × 540 world.
// All randomness is local to the scenery: decorating a map never consumes combat RNG.
import { mapLanes, routeStrokes } from "./lanes.js";
import { boardOf } from "./board.js";
import { ENVIRONMENTS } from "./environments.js";
import { createWorldPortals } from './world-portals.js';

const TAU = Math.PI * 2;

// Per-map art direction, keyed by tdMaps.json `art`. Assets load from public/td/maps/.
export const MAP_SCENES = {
  "moonlit-sanctuary-v1": {
    name: "Moonlit", baseName: "Sanctuary",
    assets: {
      terrain: "/td/maps/moonlit-terrain-v1.png",
      bleed: "/td/maps/moonlit-terrain-wide-v1.png",
      spawn: "/td/maps/moonlit-spawn-v1.png",
      base: "/td/maps/moonlit-base-v1.png",
      road: "/td/maps/moonlit-road-v1.png",
      platform: "/td/maps/moonlit-platform-v1.png",
    },
    ground: 0x202e3d, grade: { color: 0x08101c, alpha: 0.14 },
    seed: 0x6d6f6f6e,
    stone: [0x424c58, 0x48535e, 0x3b4652, 0x505962, 0x39434f, 0x45525d],
    gold: 0xb69a60, light: 0xeee1b1,
    road: { tint: 0xa4b3c7, bed: [[82, 0x142127, 0.17], [76, 0x29332e, 0.35]], shoulders: [0x566269, 0x3c4d52], shoulderShadow: 0x101c25 },
    fragments: { count: 105, color: 0x65716e, edge: 0xb1b3a0 },
    labels: { spawn: ["SPAWN", 0xc2d0e1], base: ["SANCTUARY", 0xe3d4a8], integrity: 0xb6c4cf, stroke: 0x0a1420 },
    glow: { spawn: 0xb8ceee, base: 0xf5d590, hit: 0xffc0a0, ring: 0xf0c191, place: 0xe4c78d, dust: 0xb6b1a0, mote: 0xe8d9b2 },
    pad: { road: 0xc4a664, platform: 0x9ca6d6, highlight: 0xf3dba6 },
  },
  "verdant-shrine-v1": {
    name: "Verdant", baseName: "Shrine",
    assets: {
      terrain: "/td/maps/verdant-terrain-v2.png",
      bleed: "/td/maps/verdant-terrain-wide-v1.png",
      spawn: "/td/maps/verdant-spawn-v2.png",
      base: "/td/maps/verdant-base-v2.png",
      road: "/td/maps/verdant-road-v2.png",
      platform: "/td/maps/verdant-platform-v1.png",
    },
    ground: 0x1f2d24, grade: { color: 0x07140f, alpha: 0.12 },
    seed: 0x76657264,
    stone: [0x46514a, 0x4b5850, 0x3e4a43, 0x535e55, 0x3b463f, 0x48554d],
    gold: 0xc0a05a, light: 0xf3e2a8,
    road: { tint: 0xb3c0ab, bed: [[84, 0x0f1d17, 0.2], [76, 0x2a3a2b, 0.38]], shoulders: [0x5a6a52, 0x3e5140], shoulderShadow: 0x0d1a14 },
    fragments: { count: 70, color: 0x66735f, edge: 0xb3b99c },
    labels: { spawn: ["SPAWN", 0xe6b3a4], base: ["SHRINE", 0xecd79b], integrity: 0xbccbb8, stroke: 0x0a1610 },
    glow: { spawn: 0xff8a6a, base: 0xffd27a, hit: 0xffc0a0, ring: 0xf0c191, place: 0xd8cf8a, dust: 0xa9b095, mote: 0xf0dfa0 },
    pad: { road: 0xc9a95f, platform: 0x86cfa4, highlight: 0xf1e2a4 },
    decorate: decorateVerdant,
  },
  "sunscar-sanctuary-v1": {
    name: "Sunscar", baseName: "Sanctuary",
    assets: {
      terrain: "/td/maps/sunscar-terrain-v1.png",
      bleed: "/td/maps/sunscar-terrain-wide-v1.png",
      spawn: "/td/maps/sunscar-spawn-v1.png",
      base: "/td/maps/sunscar-base-v1.png",
      road: "/td/maps/sunscar-road-v1.png",
      platform: "/td/maps/sunscar-platform-v1.png",
    },
    ground: 0x3a3226, grade: { color: 0x1a1208, alpha: 0.1 },
    seed: 0x73756e73,
    stone: [0x6b5f4e, 0x736654, 0x625747, 0x7a6d5a, 0x5c5142, 0x6f6350],
    gold: 0xc9a45c, light: 0xf6e4b0,
    road: { tint: 0xd8cbb4, bed: [[82, 0x2a1e12, 0.16], [76, 0x4a3d2c, 0.32]], shoulders: [0x8a7b63, 0x6a5c48], shoulderShadow: 0x2a1f14 },
    fragments: { count: 60, color: 0x8c7d64, edge: 0xd6c6a2 },
    labels: { spawn: ["SPAWN", 0xd7c2f0], base: ["SANCTUARY", 0xf2dc9c], integrity: 0xe6d6b4, stroke: 0x241a10 },
    glow: { spawn: 0xa88be0, base: 0xffd98a, hit: 0xffb08a, ring: 0xf0c191, place: 0xf0d59a, dust: 0xcdb892, mote: 0xf6e2a8 },
    pad: { road: 0xd2a85a, platform: 0x9fb2e0, highlight: 0xf8e2a6 },
  },
  "jungle-heart-v1": {
    name: "Jungle", baseName: "Heart Temple",
    assets: {
      terrain: "/td/maps/jungle-terrain-v1.png",
      bleed: "/td/maps/jungle-terrain-wide-v1.png",
      spawn: "/td/maps/jungle-spawn-v1.png",
      base: "/td/maps/jungle-base-v1.png",
      road: "/td/maps/jungle-road-v1.png",
    },
    ground: 0x273528, grade: { color: 0x06130c, alpha: 0.1 },
    seed: 0x6a756e67,
    stone: [0x465249, 0x526052, 0x3c493e, 0x596354, 0x354137, 0x4b594a],
    gold: 0xc5a458, light: 0xece2a2,
    road: { tint: 0xa7b49d, bed: [[84, 0x0b1910, 0.24], [76, 0x243829, 0.4]], shoulders: [0x536849, 0x38533b], shoulderShadow: 0x08150d },
    fragments: { count: 62, color: 0x61735b, edge: 0xaebc91 },
    labels: { spawn: ["SPAWN", 0xffa08c], base: ["HEART TEMPLE", 0xbaf6b2], integrity: 0xb9cfb6, stroke: 0x07150c },
    glow: { spawn: 0xff536b, base: 0x66f0a0, hit: 0xff9d80, ring: 0x8ff0b0, place: 0xd8cf82, dust: 0xa6b78c, mote: 0xdfff9b },
    pad: { road: 0xc7a354, platform: 0x74d0a0, highlight: 0xf2e59d },
    decorate: decorateJungle,
  },
};

// New environments share proven transparent architecture and road textures, with
// their own terrain, grading, highlights and gameplay rules.
// Register only delivered panoramas: future environments retain their terrain fallback.
const panoramicEnvironments = new Set([
  "frostbound", "ashen", "stormpeak", "tidal", "mycelium", "crystal",
  "necropolis", "autumn", "celestial", "clockwork",
]);
for (const environment of Object.values(ENVIRONMENTS)) {
  const source = MAP_SCENES[environment.reuse === "verdant" ? "verdant-shrine-v1" : `${environment.reuse}-sanctuary-v1`];
  // Architecture may be shared, but a panorama belongs only to its own theme.
  const { bleed: _sourcePanorama, platform: _sourcePlatform, ...sharedAssets } = source.assets;
  MAP_SCENES[`${environment.id}-sanctuary-v1`] = {
    ...source, name: environment.name, baseName: "Sanctuary",
    assets: {
      ...sharedAssets,
      terrain: `/td/maps/${environment.id}-terrain-v1.png`,
      ...(panoramicEnvironments.has(environment.id) ? { bleed: `/td/maps/${environment.id}-terrain-wide-v1.png` } : {}),
    },
    grade: { color: 0x080d16, alpha: 0.1 },
    seed: environment.id.split("").reduce((seed, character) => (Math.imul(seed, 31) + character.charCodeAt(0)) >>> 0, 7),
    structureTint: environment.color,
    labels: { ...source.labels, base: ["SANCTUARY", environment.color] },
    glow: { ...source.glow, base: environment.color, place: environment.color, mote: environment.color },
    pad: { ...source.pad, platform: environment.color },
    decorate: undefined,
  };
}

export function mapSceneFor(map) {
  return MAP_SCENES[map?.art] ?? null;
}

export function mapBackdropFor(map) {
  const scene = mapSceneFor(map);
  return scene?.assets?.bleed ?? scene?.assets?.terrain ?? null;
}

// Screen-space footprint for the compact painted ranged platform. Keeping this proportional to
// the board cell leaves a deliberate gutter even on the smallest campaign boards.
export function platformTileLayout(cell = 62) {
  const width = Math.round(cell * 0.746);
  return { width, height: Math.round(width * 0.75), y: Math.round(cell * 0.025) };
}

export const spawnLabelVisible = (game) => !game?.running;

// R18 prototype (B): procedural stone for the raised slabs. A few variants are painted once on a
// canvas (grain, mottling, cracks, chipped edges, moss in the corners) and shared; each tile picks
// one by position and may mirror it. `base` is a 0xRRGGBB colour from the map theme.
const slabCache = new Map();
function slabTexture(PIXI, variant, base, moss) {
  const key = `${variant}:${base}:${moss}`;
  if (slabCache.has(key)) return slabCache.get(key);
  const size = 192;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  let seed = 1234 + variant * 7919;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const [r, g, b] = [(base >> 16) & 255, (base >> 8) & 255, base & 255];
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, size, size);
  // Mottling: large soft light/dark patches.
  for (let i = 0; i < 26; i++) {
    const x = rand() * size, y = rand() * size, rad = 20 + rand() * 46, light = rand() > 0.5;
    const grad = ctx.createRadialGradient(x, y, 0, x, y, rad);
    grad.addColorStop(0, light ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.12)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  // Grain.
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = rand() > 0.5 ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.1)";
    ctx.fillRect(rand() * size, rand() * size, 1 + rand() * 2, 1 + rand() * 2);
  }
  // Cracks: jittery dark polylines with a light edge beside them.
  for (let i = 0; i < 3 + variant; i++) {
    let x = rand() * size, y = rand() * size, angle = rand() * Math.PI * 2;
    const points = [[x, y]];
    for (let k = 0; k < 9; k++) { angle += (rand() - 0.5) * 1.1; x += Math.cos(angle) * (6 + rand() * 9); y += Math.sin(angle) * (6 + rand() * 9); points.push([x, y]); }
    for (const [colour, dx, width] of [["rgba(255,255,255,0.12)", 1, 1.2], ["rgba(0,0,0,0.5)", 0, 1.3]]) {
      ctx.strokeStyle = colour; ctx.lineWidth = width; ctx.beginPath();
      points.forEach(([px, py], n) => (n ? ctx.lineTo(px + dx, py + dx) : ctx.moveTo(px + dx, py + dx)));
      ctx.stroke();
    }
  }
  // Moss creeping in from the corners.
  if (moss) {
    for (let i = 0; i < 70; i++) {
      const corner = Math.floor(rand() * 4), cx = corner % 2 ? size : 0, cy = corner > 1 ? size : 0;
      const x = cx + (corner % 2 ? -1 : 1) * rand() * rand() * 70, y = cy + (corner > 1 ? -1 : 1) * rand() * rand() * 70;
      ctx.fillStyle = `rgba(${moss[0]},${moss[1]},${moss[2]},${0.1 + rand() * 0.18})`;
      ctx.beginPath(); ctx.arc(x, y, 4 + rand() * 10, 0, Math.PI * 2); ctx.fill();
    }
  }
  // Worn rim: darker chipped edge all round.
  const rim = ctx.createLinearGradient(0, 0, 0, size);
  rim.addColorStop(0, "rgba(255,255,255,0.1)"); rim.addColorStop(0.15, "rgba(0,0,0,0)"); rim.addColorStop(0.85, "rgba(0,0,0,0)"); rim.addColorStop(1, "rgba(0,0,0,0.18)");
  ctx.fillStyle = rim; ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = "rgba(0,0,0,0.45)"; ctx.lineWidth = 4; ctx.strokeRect(0, 0, size, size);
  const texture = PIXI.Texture.from(canvas);
  slabCache.set(key, texture);
  return texture;
}

// Placement tiles for one theme: the painted ranged platform (or a raised stone slab on tilted
// boards), recessed road sockets, accent rims and the placement states. Shared by createMapScene
// and the God-Mode scene so every board uses the same tile art.
export function createSlotPainter(PIXI, { theme, board, tilt = null, textures = {} }) {
  const tiltK = tilt?.k ?? 1;
  const STONE = theme.stone;
  const TILE = board ? board.cell - 6 : 56;
  const DARK = 0x04070c;
  function drawSlot(container, x, y, type, occupied, highlighted, mode = "") {
    const h = TILE / 2;
    const paintedPlatform = type === "platform" && textures.platform;
    const platformLayout = platformTileLayout(board?.cell ?? 62);
    const visualWidth = paintedPlatform ? platformLayout.width : TILE;
    const visualHeight = paintedPlatform ? platformLayout.height / tiltK : TILE;
    const halfWidth = visualWidth / 2, halfHeight = visualHeight / 2;
    if (paintedPlatform) {
      const sprite = new PIXI.Sprite(textures.platform);
      sprite.anchor.set(0.5);
      sprite.position.set(x, y + platformLayout.y / tiltK);
      sprite.width = visualWidth;
      sprite.height = visualHeight;
      container.addChild(sprite);
    } else if (tilt && type === "platform") {
      const slabRoot = new PIXI.Container(); // R18 prototype (B): full strength, independent of the tile's idle fade
      slabRoot.position.set(x, y);
      container.addChild(slabRoot);
      const slab = new PIXI.Graphics();
      slabRoot.addChild(slab);
      // The slab is a stone block: a top face the size of the cell and a front face (the lip)
      // below it, about 0.1125 cell tall (0.15 reduced by 25%, Oct 5: slab and its shadow read too
      // tall against the Watcher of Realms reference). Ranged units still sit on clearly raised ground.
      const lip = Math.round(TILE * 0.0788); // Oct 5: cut another 30% (was 0.1125)
      // Contact shadow: one soft band under the front face, not a halo around the block.
      for (let i = 0; i < 3; i++) slab.rect(-h + 4 - i, h - 2 + lip, TILE - 4 + i * 2, 1.4 + i * 1.4).fill({ color: 0x000000, alpha: 0.14 });
      slab.rect(-h + 2, h - 2, TILE - 4, lip).fill({ color: 0x1a2118, alpha: 0.97 }); // front face
      const rawStone = STONE[2] ?? STONE[0];
      const mix = (a, b, t) => Math.round(a + (b - a) * t);
      const stone = (mix((rawStone >> 16) & 255, 0xb4, 0.4) << 16) | (mix((rawStone >> 8) & 255, 0xb0, 0.4) << 8) | mix(rawStone & 255, 0x98, 0.4); // lighter, warmer stone
      const variant = Math.abs(Math.round(x * 7 + y * 13)) % 3;
      const top = new PIXI.Sprite(slabTexture(PIXI, variant, stone, theme.name === "Jungle" ? [60, 110, 55] : null)); // textured top face
      top.position.set(-h + 2, -h + 2);
      top.width = TILE - 4; top.height = TILE - 4;
      if (variant === 1) { top.scale.x *= -1; top.x += TILE - 4; } // mirror one variant so neighbours differ
      slabRoot.addChild(top);
      const edges = new PIXI.Graphics();
      edges.moveTo(-h + 2, -h + 2).lineTo(h - 2, -h + 2).stroke({ color: 0xffffff, width: 1.5, alpha: 0.35 });
      edges.rect(-h + 2, -h + 2, TILE - 4, TILE - 4 + lip).stroke({ color: 0x000000, width: 1.5, alpha: 0.55 }); // dark outline separates slab from ground
      edges.moveTo(-h + 2, h - 2).lineTo(h - 2, h - 2).stroke({ color: 0x000000, width: 1.5, alpha: 0.5 });
      // Front face: vertical streaks of darker stone and a lighter top edge.
      for (let sx = -h + 8; sx < h - 8; sx += 11) edges.moveTo(sx, h).lineTo(sx + 2, h - 2 + lip).stroke({ color: 0x000000, width: 1, alpha: 0.18 });
      edges.moveTo(-h + 2, h - 1).lineTo(h - 2, h - 1).stroke({ color: 0xffffff, width: 1, alpha: 0.12 });
      slabRoot.addChild(edges);
    }
    if (tilt && type === "road") { // R18 prototype (B): road sockets are recessed into the ground
      const recess = new PIXI.Graphics();
      recess.position.set(x, y);
      container.addChild(recess);
      recess.rect(-h + 2, -h + 2, TILE - 4, TILE - 4).fill({ color: 0x000000, alpha: 0.12 });
      recess.rect(-h + 2, -h + 2, TILE - 4, Math.round(TILE * 0.14)).fill({ color: 0x000000, alpha: 0.14 }); // shadow under the back wall
      recess.rect(-h + 2, -h + 2, Math.round(TILE * 0.07), TILE - 4).fill({ color: 0x000000, alpha: 0.14 });
      recess.moveTo(-h + 2, h - 2).lineTo(h - 2, h - 2).stroke({ color: 0xffffff, width: 1.2, alpha: 0.14 });
    }
    const g = new PIXI.Graphics();
    g.position.set(x, y);
    container.addChild(g);
    const accent = type === "road" ? theme.pad.road : theme.pad.platform;
    const brackets = (inset, arm, color, width, alpha) => {
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const cx = sx * (halfWidth - inset), cy = sy * (halfHeight - inset);
        g.moveTo(cx - sx * arm, cy).lineTo(cx, cy).lineTo(cx, cy - sy * arm);
      }
      g.stroke({ color, width, alpha, cap: "round", join: "round" });
    };
    if (occupied && !highlighted) {
      g.rect(-halfWidth + 2, -halfHeight + 2, visualWidth - 4, visualHeight - 4).fill({ color: DARK, alpha: 0.14 });
      brackets(3, 7, accent, 1.2, 0.2);
      return g;
    }
    const eligible = mode === "eligible" || highlighted;
    const strength = eligible ? 1 : mode === "dim" ? 0.2 : mode === "idle" ? 0.32 : 0.78;
    g.alpha = strength;
    // Surface: road sockets sink into the stone, platforms sit on it as a plate.
    const surface = type === "road" ? (tilt ? 0.1 : 0.3) : paintedPlatform ? 0.08 : 0.38;
    g.rect(-halfWidth + 2, -halfHeight + 2, visualWidth - 4, visualHeight - 4).fill({ color: DARK, alpha: surface });
    g.rect(-halfWidth + 2, -halfHeight + 2, visualWidth - 4, visualHeight - 4).fill({ color: accent, alpha: eligible ? 0.16 : paintedPlatform ? 0.025 : 0.07 });
    // Contrasting rim: dark outline first, accent line inside it.
    g.rect(-halfWidth + 1.5, -halfHeight + 1.5, visualWidth - 3, visualHeight - 3).stroke({ color: DARK, width: paintedPlatform ? 1.5 : 3, alpha: paintedPlatform ? 0.3 : 0.6 });
    if (type === "platform") {
      g.rect(-halfWidth + 3.5, -halfHeight + 3.5, visualWidth - 7, visualHeight - 7).stroke({ color: accent, width: eligible ? 2 : 1.5, alpha: paintedPlatform && !eligible ? 0.28 : 0.95 });
      // Bevel: light top/left, dark bottom/right edge inside the rim.
      const bx = halfWidth - 6, by = halfHeight - 6;
      g.moveTo(-bx, by).lineTo(-bx, -by).lineTo(bx, -by).stroke({ color: 0xffffff, width: 1.2, alpha: paintedPlatform ? 0.08 : 0.28 });
      g.moveTo(bx, -by).lineTo(bx, by).lineTo(-bx, by).stroke({ color: DARK, width: 1.2, alpha: paintedPlatform ? 0.16 : 0.5 });
      // Double chevron: raised ground.
      if (!paintedPlatform) {
        for (const dy of [-2.5, 3.5]) g.moveTo(-5, dy + 3).lineTo(0, dy - 2).lineTo(5, dy + 3);
        g.stroke({ color: accent, width: 1.8, alpha: 0.9, cap: "round", join: "round" });
      }
    } else {
      // Recess: dark top/left, light bottom/right edge, then the corner brackets.
      const b = h - 5;
      g.moveTo(-b, b).lineTo(-b, -b).lineTo(b, -b).stroke({ color: DARK, width: 1.5, alpha: 0.55 });
      g.moveTo(b, -b).lineTo(b, b).lineTo(-b, b).stroke({ color: 0xffffff, width: 1, alpha: 0.18 });
      brackets(3.5, 11, accent, eligible ? 2.4 : 2, 0.95);
      // Shield glyph: blockers stand here.
      g.moveTo(0, -6).lineTo(5.5, -3.8).lineTo(4.6, 2.2).lineTo(0, 6.5).lineTo(-4.6, 2.2).lineTo(-5.5, -3.8).closePath()
        .fill({ color: DARK, alpha: 0.35 }).stroke({ color: accent, width: 1.6, alpha: 0.9, join: "round" });
    }
    if (highlighted) {
      g.rect(-halfWidth, -halfHeight, visualWidth, visualHeight).fill({ color: theme.pad.highlight, alpha: 0.14 });
      g.rect(-halfWidth + 0.5, -halfHeight + 0.5, visualWidth - 1, visualHeight - 1).stroke({ color: theme.pad.highlight, width: 2.5, alpha: 1 });
      g.rect(-halfWidth - 3, -halfHeight - 3, visualWidth + 6, visualHeight + 6).stroke({ color: theme.pad.highlight, width: 4, alpha: 0.3 });
    } else if (mode === "eligible") {
      g.rect(-halfWidth - 2, -halfHeight - 2, visualWidth + 4, visualHeight + 4).stroke({ color: accent, width: 3, alpha: 0.35 });
    }
    return g;
  }
  return drawSlot;
}

export function createMapScene(PIXI, game, {
  ground, structures, foreground, overlay, portalGround = structures, units = structures,
  portalAtlases = {}, reducedMotion = false, textures = {}, tilt = null,
}) {
  // Ground portals inherit the board tilt; their upright crystal and teeth use unit depth.
  const tiltK = tilt?.k ?? 1;
  const theme = mapSceneFor(game.map);
  const STONE = theme.stone;
  const owned = [];
  const add = (parent, object) => { parent.addChild(object); owned.push(object); return object; };
  const graphic = parent => add(parent, new PIXI.Graphics());
  let seed = theme.seed;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const spawns = mapLanes(game.map).map((lane) => lane.spawn);
  // Prototype board (board.js): the road and tiles grow to the board's cell size.
  const board = boardOf(game.map);
  const roadScale = board ? board.cell / 70 : 1;
  const strokes = routeStrokes(game.map);
  const base = game.map.base;
  const seen = new WeakSet();
  let hitAt = -Infinity;
  let lastLives = game.lives;
  let wasStarted = game.started;
  let startAt = -Infinity;
  const placements = [];

  function polygon(g, points, color, alpha = 1) {
    g.poly(points.flat()).fill({ color, alpha });
  }

  // One stroke per route; merged lanes are drawn once, so translucent layers do not double up.
  function strokePath(g, width, color, alpha = 1, routes = strokes) {
    width *= roadScale;
    for (const points of routes) {
      g.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) g.lineTo(points[i][0], points[i][1]);
      g.stroke({ width, color, alpha, cap: "round", join: "round" });
    }
  }
  const segments = strokes.flatMap((points) => points.slice(1).map((point, i) => [points[i], point]));

  // The road has a sunken bed, dusty shoulders and three irregular stone courses.
  const road = graphic(ground);
  if (textures.road) {
    for (const [width, color, alpha] of theme.road.bed) strokePath(road, width, color, alpha);
    // One masked surface per route: overlapping strokes inside a single mask cancel out
    // where lanes merge. The tiling is world-aligned, so the surfaces meet without a seam.
    for (const route of strokes) {
      const mask = graphic(ground);
      strokePath(mask, 70, 0xffffff, 1, [route]);
      const surface = add(ground, new PIXI.TilingSprite({ texture: textures.road, width: 960, height: 540 }));
      surface.tileScale.set(0.12);
      surface.tint = theme.road.tint; // grading keeps pale stone within the terrain's value range
      surface.mask = mask;
      if (tilt) surface.alpha = 0.55; // R18: the lane lets the painted ground show through, like open ground in the reference
    }
  } else {
    strokePath(road, 84, 0x141c23, 0.32);
    strokePath(road, 76, 0x333c40, 0.65);
    strokePath(road, 68, 0x1b252e);
  }
  if (tilt) {
    // Readability: the lane reads as dark, open ground (distinct from the raised slabs), with soft
    // flow chevrons showing the walking direction.
    const flow = graphic(ground);
    strokePath(flow, 74, 0x000000, 0.2);
    for (const [[ax, ay], [bx, by]] of segments) {
      const length = Math.hypot(bx - ax, by - ay);
      if (length < 48) continue;
      const ux = (bx - ax) / length, uy = (by - ay) / length;
      for (let d = 40; d < length - 20; d += 72) {
        const cx = ax + ux * d, cy = ay + uy * d;
        flow.moveTo(cx - ux * 6 - uy * 7, cy - uy * 6 + ux * 7).lineTo(cx + ux * 5, cy + uy * 5).lineTo(cx - ux * 6 + uy * 7, cy - uy * 6 - ux * 7)
          .stroke({ width: 2.2, color: 0xffffff, alpha: 0.2, cap: "round", join: "round" });
      }
    }
  }
  for (const [[ax, ay], [bx, by]] of segments) {
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
        const across = side * (36 + random() * 2) * roadScale;
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
    for (const [[ax, ay], [bx, by]] of segments) {
      const dx = bx - ax, dy = by - ay;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
      nearest = Math.min(nearest, Math.hypot(x - ax - t * dx, y - ay - t * dy));
    }
    return nearest;
  }
  const fragments = graphic(ground);
  for (let i = 0; i < theme.fragments.count; i++) {
    const x = 22 + random() * 916, y = 24 + random() * 492;
    if (distanceToPath(x, y) < 49 * roadScale || allSlots.some(([sx, sy]) => Math.hypot(x - sx, y - sy) < 47 * roadScale)
      || Math.hypot(x - base.x, y - base.y) < 86 || spawns.some((spawn) => Math.hypot(x - spawn.x, y - spawn.y) < 70)) continue;
    const w = 2 + random() * 6, h = 1.5 + random() * 3;
    fragments.ellipse(x + 2, y + 3, w + 1, h + 1).fill({ color: 0x07121b, alpha: 0.3 });
    polygon(fragments, [[x - w, y], [x - w * 0.6, y - h], [x + w * 0.6, y - h * 0.5], [x + w, y + h], [x - w * 0.4, y + h]], theme.fragments.color, 0.36);
    fragments.moveTo(x - w * 0.6, y - h).lineTo(x + w * 0.6, y - h * 0.5).stroke({ width: 0.7, color: theme.fragments.edge, alpha: 0.2 });
  }


  function star(g, x, y, radius, color, alpha = 1) {
    const points = [];
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8 - Math.PI / 2, r = i % 2 ? radius * 0.25 : radius;
      points.push(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    g.poly(points).fill({ color, alpha });
  }

  const portals = createWorldPortals(PIXI, game, {
    ground: portalGround, units, foreground, cell: board?.cell ?? 70, tiltK,
    reducedMotion, atlases: portalAtlases,
  });
  const ambient = graphic(overlay);
  const extra = theme.decorate?.({ PIXI, game, add, graphic, random, polygon, star, distanceToPath, allSlots,
    layers: { ground, structures, foreground, overlay }, reducedMotion, theme });

  function draw(now = 0) {
    const seconds = now / 1000;
    if (game.started !== wasStarted) { wasStarted = game.started; startAt = now; } // the gates flare when the stage starts
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
    portals.draw(now);
    ambient.clear();
    const breath = reducedMotion ? 0.5 : 0.5 + Math.sin(seconds * 1.4) * 0.5;
    const hit = Math.max(0, 1 - (now - hitAt) / 650);
    const wave = reducedMotion ? 0 : Math.max(0, 1 - (now - startAt) / 1100);
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
    extra?.draw(now, { hit, wave, breath });
  }

  // Caller can retain a slot container and repaint only when its state changes.
  // Placement tiles (M22b, readability pass M24): flat squares that sit edge to edge.
  // Every empty tile has a dark outer rim plus an accent rim so it reads on bright and
  // dark art alike. Road tiles are a recessed socket with corner brackets and a shield
  // glyph (blockers stand here); platform tiles a raised bevelled plate with a double
  // chevron (high ground for ranged heroes). mode: "eligible" brightens a valid target
  // while a hero is being placed, "dim" fades the wrong tile type, "idle" quiets empty
  // tiles when the team is full. Occupied tiles stay faint so the hero token reads first.
  const drawSlot = createSlotPainter(PIXI, { theme, board, tilt, textures });

  draw(0);
  return {
    draw, drawSlot,
    destroy() {
      portals.destroy();
      for (const object of owned) if (!object.destroyed) { object.removeFromParent(); object.destroy({ children: true }); }
    },
  };
}

// Verdant v2 has painted roots and a guardian in the terrain/building assets.
// Glints stay inside the two small painted water pockets at the outer edges.
const VERDANT_POOLS = [[947, 251, 8, 13], [20, 473, 14, 18]];

function decorateVerdant({ graphic, random, layers, reducedMotion }) {
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
    draw(now) {
      const seconds = now / 1000;
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

function decorateJungle({ graphic, random, layers, reducedMotion }) {
  const atmosphere = graphic(layers.overlay);
  const sheltered = [[55, 70], [175, 28], [350, 510], [610, 26], [810, 515], [925, 95], [918, 410], [35, 430]];
  const fireflies = Array.from({ length: 22 }, (_, i) => {
    const [x, y] = sheltered[i % sheltered.length];
    return { x: x + (random() - 0.5) * 65, y: y + (random() - 0.5) * 42, phase: random() * TAU, speed: 0.18 + random() * 0.32 };
  });

  return {
    draw(now) {
      atmosphere.clear();
      if (reducedMotion) return;
      const seconds = now / 1000;
      for (const fly of fireflies) {
        const t = seconds * fly.speed + fly.phase;
        const x = fly.x + Math.sin(t * 1.3) * 13 + Math.sin(t * 2.7) * 3;
        const y = fly.y + Math.cos(t) * 8;
        const blink = Math.max(0, Math.sin(t * 3.2 + fly.phase));
        atmosphere.circle(x, y, 3.8).fill({ color: 0xbaff75, alpha: blink * 0.07 });
        atmosphere.circle(x, y, 1).fill({ color: 0xe9ffc0, alpha: blink * 0.58 });
      }
    },
  };
}
