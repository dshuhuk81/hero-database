// PixiJS v8 renderer for the tower defense game.
// Async: callers must await createRenderer(...).
// Logical space is fixed at 960x540; stage.scale maps it to the canvas CSS size.

import { ENEMY_ART, tdAsset } from "./assets.js";
import { fitRect } from "./ui.js";
import { createZeusFx } from "./zeus-fx.js";
import { createHeroFx, hasHeroFx } from "./hero-fx.js";
import { createMapScene, mapSceneFor } from "./map-scene.js";
import { mapLanes, routeStrokes } from "./lanes.js";

const PIXI_CDN = "https://cdn.jsdelivr.net/npm/pixi.js@8/dist/pixi.mjs";
const GLOW_CDN = "https://cdn.jsdelivr.net/npm/@pixi/filter-glow@5/dist/filter-glow.mjs";

const COLORS = {
  grunt:  0xaaa4bb,
  runner: 0x78ddff,
  flyer:  0xc4b5fd,
  archer: 0x82e89a,
  brute:  0xfb923c,
  boss:   0xff4d4d,
  brood:  0x8b5cf6,
  mender: 0x8ff0b0,
  shieldbearer: 0x93c5fd,
  broodcaller: 0xf87171,
  imp:    0xfca5a5,
  hexer:  0xc4b5fd,
};

// Kenney Micro Roguelike packed sheet: 128x80, 8x8 tiles, no gaps.
// Tile N -> col=N%16, row=N//16, x=col*8, y=row*8.
const ENEMY_TILES = {
  grunt:  { x:  40, y: 0, w: 8, h: 8 },
  runner: { x:  48, y: 0, w: 8, h: 8 },
  flyer:  { x: 112, y: 0, w: 8, h: 8 },
  archer: { x:  48, y: 8, w: 8, h: 8 },
  brute:  { x: 104, y: 0, w: 8, h: 8 },
  boss:   { x:  88, y: 0, w: 8, h: 8 },
};

const THEMES = {
  moonlit: { glow: 0xa855f7, trail: 0xfacc15 },
  verdant: { glow: 0x82e898, trail: 0x82e898 },
};

const TINTS = { gold: 0xfacc15, purple: 0xa855f7, green: 0x82e89a, red: 0xff6b6b, white: 0xffffff };

// Effect hierarchy (P5): every effect maps to one of three tiers so the big
// moments read above the constant combat noise. ring scales hit/ult rings,
// burst scales particle size; shake (screen px) and vignette only for epic.
export const FX_TIERS = {
  minor: { ring: 1, burst: 1, shake: 0, vignette: 0 },
  major: { ring: 1.6, burst: 1.4, shake: 0, vignette: 0 },
  epic: { ring: 2.6, burst: 2, shake: 7, vignette: 0.45 },
};

export function effectTier(effect) {
  if (effect.type === "boss" || effect.type === "bossDown") return "epic";
  if (effect.type === "ult" || effect.type === "awaken" || (effect.type === "hit" && effect.crit)) return "major";
  return "minor";
}

export async function createRenderer(canvas, game, options = {}) {
  // Authored battlefields (Moonlit, Verdant) render through map-scene.js.
  const sceneArt = mapSceneFor(game.map);
  const isAuthored = Boolean(sceneArt);
  let mapScene = null;
  const [PIXI, glowMod] = await Promise.all([
    import(/* @vite-ignore */ PIXI_CDN),
    import(/* @vite-ignore */ GLOW_CDN).catch(() => null),
  ]);
  const GlowFilter = glowMod?.GlowFilter ?? null;

  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  const root = getComputedStyle(document.documentElement);
  const palette = {
    surface: parseInt((root.getPropertyValue("--bg-surface").trim() || "#0d0b14").replace("#", ""), 16),
    raised:  parseInt((root.getPropertyValue("--bg-raised").trim()  || "#13111c").replace("#", ""), 16),
    gold:    0xfacc15,
    purple:  0xa855f7,
  };

  // ------------------------------------------------------------------
  // App + stage
  // ------------------------------------------------------------------
  const app = new PIXI.Application();
  await app.init({
    canvas,
    width: 960,
    height: 540,
    backgroundColor: palette.surface,
    antialias: true,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
    resizeTo: undefined, // we handle resize manually
  });

  const stage = app.stage;
  // Stop PixiJS's own ticker; we drive frames from the page's rAF loop.
  app.ticker.stop();

  // Layer order (added in order = drawn back to front)
  const layerBgTex  = new PIXI.Container(); // game-art background panels
  const layerBg     = new PIXI.Container(); // path, grid
  const layerStructures = new PIXI.Container(); // physical gate/base foundations
  const layerSlots  = new PIXI.Container(); // slot rings
  const layerRanges = new PIXI.Container(); // range preview rings
  const layerLinks  = new PIXI.Container(); // aura + synergy links
  const layerUnits  = new PIXI.Container(); // enemies + heroes
  const layerForeground = new PIXI.Container(); // doorway faces occlude entering units
  const layerBars   = new PIXI.Container(); // hp bars (redrawn each frame)
  const layerFx     = new PIXI.Container(); // shot tracers, hit rings
  const layerParts  = new PIXI.Container(); // particles
  const layerHud    = new PIXI.Container(); // portals, labels
  for (const l of [layerBgTex, layerBg, layerStructures, layerSlots, layerRanges, layerLinks, layerUnits, layerForeground, layerBars, layerFx, layerParts, layerHud]) {
    stage.addChild(l);
  }

  // ------------------------------------------------------------------
  // Sprite cache: hero thumbnails + boss + FX textures
  // ------------------------------------------------------------------
  const zeusFx = createZeusFx(PIXI, layerParts, { reducedMotion });
  const sprites     = new Map(); // id -> PIXI.Texture (UI/selection portraits from CDN)
  const boardSprites = new Map(); // id -> PIXI.Texture (on-board overrides, e.g. pixel sprites)
  const fxTex    = new Map(); // name -> PIXI.Texture
  const heroFx = createHeroFx(PIXI, layerParts, fxTex, { reducedMotion });

  // On-board tokens: transparent head-and-shoulders cutouts (scripts/build-td-tokens.mjs).
  // A hero without a token keeps the circle portrait.
  const TOKEN_VERSION = "v1";
  for (const id of game.heroesById.keys()) {
    PIXI.Assets.load(tdAsset(`tokens/${id}-${TOKEN_VERSION}.webp`)).then((tex) => boardSprites.set(id, tex)).catch(() => {});
  }

  // Version query forces a fresh CORS-enabled fetch: browsers may still hold
  // pre-CORS copies of the immutable R2 hero thumbs, which WebGL rejects.
  const TEXTURE_CACHE_BUST = "v=cors1";
  async function loadTexture(key, url) {
    try {
      const busted = `${url}${url.includes("?") ? "&" : "?"}${TEXTURE_CACHE_BUST}`;
      const tex = await PIXI.Assets.load(busted);
      sprites.set(key, tex);
    } catch {}
  }

  const heroLoads = [];
  for (const hero of game.heroesById.values()) {
    heroLoads.push(loadTexture(hero.id, hero.image));
  }
  if (options.boss?.image) heroLoads.push(loadTexture("boss", options.boss.image));
  // Fire hero loads but don't block; they resolve into the sprites map.
  Promise.all(heroLoads);

  const FX_NAMES = ["slash_04", "spark_04", "magic_01", "trace_01", "light_01", "star_03", "flame_04", "twirl_01", "flare_01"];
  for (const name of FX_NAMES) {
    PIXI.Assets.load(tdAsset(`fx/${name}.png`))
      .then((tex) => fxTex.set(name, tex))
      .catch(() => {});
  }

  // Enemy sprite textures sliced from the Kenney packed sheet (fallback).
  const enemyTextures = new Map(); // kind -> PIXI.Texture
  PIXI.Assets.load(tdAsset("kenney_enemies.png"))
    .then((baseTex) => {
      baseTex.source.scaleMode = "nearest";
      for (const [kind, f] of Object.entries(ENEMY_TILES)) {
        enemyTextures.set(kind, new PIXI.Texture({
          source: baseTex.source,
          frame: new PIXI.Rectangle(f.x, f.y, f.w, f.h),
        }));
      }
    })
    .catch(() => {});

  // In-game portrait sprites per enemy kind (primary, loads async).
  const portraitTextures = new Map(); // kind -> PIXI.Texture
  const PORTRAIT_KINDS = ["grunt", "runner", "flyer", "archer", "brute"];
  for (const kind of PORTRAIT_KINDS) {
    PIXI.Assets.load(tdAsset(`enemies/${kind}.png`))
      .then((tex) => portraitTextures.set(kind, tex))
      .catch(() => {});
  }

  // Full-body enemy sprites (scripts/build-td-enemy-sprites.mjs), preferred over
  // portraits when present. Missing files fail quietly and portraits stay in use.
  // Per-file version (R2 caches a year): bump a file here and in the build script's --version together.
  const ENEMY_SPRITE_VERSIONS = { "boss-lilith": "v2", brood: "v2" };
  const fullBodyTextures = new Map(); // kind -> PIXI.Texture
  // Baphomet's sprite is boss-v1; other final bosses use boss-{id}-vN (the map's boss).
  const bossFile = options.boss?.id && options.boss.id !== "baphomet" ? `boss-${options.boss.id}` : "boss";
  const bossSpriteSize = { lilith: 108 }[options.boss?.id] ?? 96;
  const fullSpriteSize = (kind) => (kind === "boss" ? bossSpriteSize : kind === "brute" ? 64 : ENEMY_ART[kind]?.size ?? 44);
  // Full-body sprites stand on the path: the build script leaves a 10% margin under the
  // figure, so anchor at 0.9 height and put the feet a little below the path centre line.
  const FULL_SPRITE_FEET = 6;
  // Flyers hover above a faint ground shadow and bob, so they read as airborne
  // (they pass over blockers; only platform heroes can hit them).
  const FLYER_LIFT = 18;
  const flyerBob = (unit) => (reducedMotion ? 0 : Math.sin(performance.now() / 260 + unit.entityId) * 3);
  for (const [kind, file] of [...PORTRAIT_KINDS.map((k) => [k, k]), ["boss", bossFile], ["brood", "brood"]]) {
    PIXI.Assets.load(tdAsset(`enemies/sprites/${file}-${ENEMY_SPRITE_VERSIONS[file] ?? "v1"}.webp`))
      .then((tex) => fullBodyTextures.set(kind, tex))
      .catch(() => {});
  }
  // M11 kinds borrow another sprite (ENEMY_ART), tinted in updateEnemyOverlays.
  for (const [kind, art] of Object.entries(ENEMY_ART)) {
    PIXI.Assets.load(tdAsset(`enemies/sprites/${art.file}-${art.version}.webp`))
      .then((tex) => fullBodyTextures.set(kind, tex))
      .catch(() => {});
  }

  // Slot art sprites (road = gold glow, platform = purple glow). Falls back to Graphics if absent.
  const slotTextures = new Map(); // "road" | "platform" -> PIXI.Texture
  if (!isAuthored) {
    PIXI.Assets.load(tdAsset("spritePlatform.webp")).then((t) => slotTextures.set("road", t)).catch(() => {});
    PIXI.Assets.load(tdAsset("sprite.webp")).then((t) => slotTextures.set("platform", t)).catch(() => {});
  }

  // Path tile texture (mossy stone, seamless). Rebuilds bg once when it loads.
  let pathTileTex = null;
  if (!isAuthored) PIXI.Assets.load(tdAsset("spriteRoad.webp")).then((t) => { pathTileTex = t; buildBg(); }).catch(() => {});

  // ------------------------------------------------------------------
  // Resize: fit the 960x540 world into the parent's width AND height
  // (letterboxed), then scale the stage to the fitted canvas size.
  // ------------------------------------------------------------------
  function resize() {
    const box = canvas.parentElement;
    const style = box ? getComputedStyle(box) : null;
    const padX = style ? parseFloat(style.paddingLeft) + parseFloat(style.paddingRight) : 0;
    const padY = style ? parseFloat(style.paddingTop) + parseFloat(style.paddingBottom) : 0;
    const { width: w, height: h } = fitRect((box?.clientWidth || 960) - padX, (box?.clientHeight || 0) - padY);
    if (!w || !h) return;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    // PixiJS autoDensity handles the backing store; we just update the renderer size.
    app.renderer.resize(w, h);
    const sx = w / 960;
    const sy = h / 540;
    stage.scale.set(sx, sy);
  }

  // ------------------------------------------------------------------
  // Static background: grid lines + path
  // ------------------------------------------------------------------
  function buildBg() {
    if (isAuthored) return;
    layerBg.removeChildren();

    // Grid (very subtle - bg art provides the visual depth)
    const grid = new PIXI.Graphics();
    grid.setStrokeStyle({ width: 1, color: 0xffffff, alpha: 0.012 });
    for (let x = 0; x <= 960; x += 48) { grid.moveTo(x, 0).lineTo(x, 540); }
    for (let y = 0; y <= 540; y += 48) { grid.moveTo(0, y).lineTo(960, y); }
    grid.stroke();
    layerBg.addChild(grid);

    // Path: tiled stone texture (when loaded) or 4-layer Graphics fallback
    const strokes = routeStrokes(game.map);
    function tracePaths(g, routes = strokes) {
      for (const pts of routes) {
        g.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      }
    }

    function pathStroke(width, color, alpha) {
      const g = new PIXI.Graphics();
      g.setStrokeStyle({ width, color, alpha, cap: "round", join: "round" });
      tracePaths(g);
      g.stroke();
      layerBg.addChild(g);
      return g;
    }

    if (pathTileTex) {
      // Gold border aura (peeks out past tile mask edges)
      pathStroke(88, 0xc9a227, 0.22);
      // TilingSprite masked to path shape, one per route (overlaps inside one mask cancel out)
      for (const route of strokes) {
        const pathMask = new PIXI.Graphics();
        pathMask.setStrokeStyle({ width: 74, color: 0xffffff, alpha: 1, cap: "round", join: "round" });
        tracePaths(pathMask, [route]);
        pathMask.stroke();
        const ts = new PIXI.TilingSprite({ texture: pathTileTex, width: 960, height: 540 });
        ts.tileScale.set(0.12); // ~2-3 stones visible across 74px path width
        ts.mask = pathMask;
        layerBg.addChild(ts);
      }
      // Thin gold center accent on top
      pathStroke(3, 0xfacc15, 0.52);
    } else {
      // Fallback: pure Graphics layers
      pathStroke(86, 0xc9a227, 0.24);
      pathStroke(74, 0x000000, 0.65);
      pathStroke(46, 0x040210, 0.50);
      pathStroke(3, 0xfacc15, 0.55);
    }
  }

  // ------------------------------------------------------------------
  // Background art panels (game-extracted stage textures, async)
  // ------------------------------------------------------------------
  async function buildBgTexture() {
    if (isAuthored) {
      // Local versioned artwork ships with the page, including localhost previews.
      // Awaited before exposing the playable canvas: no flash of untextured ground.
      const ground = new PIXI.Graphics().rect(0, 0, 960, 540).fill(sceneArt.ground);
      layerBgTex.addChild(ground);
      try {
        const tex = await PIXI.Assets.load(sceneArt.assets.terrain);
        const spr = new PIXI.Sprite(tex);
        spr.width = 960;
        spr.height = 540;
        layerBgTex.addChild(spr);
        layerBgTex.addChild(new PIXI.Graphics().rect(0, 0, 960, 540).fill(sceneArt.grade));
      } catch (error) {
        console.warn(`${sceneArt.name} terrain could not load; using the stone ground fallback.`, error);
      }
      return;
    }
    // World map 2048x2048: scale width to 960, crop height to show mountains + city
    try {
      const tex = await PIXI.Assets.load(tdAsset("bg/worldmap.webp"));
      const spr = new PIXI.Sprite(tex);
      const scale = 960 / 2048;
      spr.width = 960;
      spr.height = 2048 * scale; // 960px tall
      spr.position.set(0, -40); // show upper portion: dramatic sky, mountains, glowing city
      layerBgTex.addChild(spr);
    } catch {}

    // Dark overlay for gameplay readability
    const overlay = new PIXI.Graphics();
    overlay.rect(0, 0, 960, 540).fill({ color: 0x000000, alpha: 0.38 });
    layerBgTex.addChild(overlay);
  }

  // ------------------------------------------------------------------
  // Slots (semi-static: rebuild when hero placement changes)
  // ------------------------------------------------------------------
  let slotState = "";
  function buildSlots() {
    if (mapScene) {
      const next = `${game.heroes.map((h) => `${h.slotType}:${h.slotIndex}`).join(",")}|${game.focusedSlot?.type}:${game.focusedSlot?.index}`;
      if (next === slotState) return;
      slotState = next;
      layerSlots.removeChildren().forEach((child) => child.destroy({ children: true }));
    } else layerSlots.removeChildren();
    game.map.roadSlots.forEach(([x, y], i) => {
      const occupied  = game.heroes.some((h) => h.slotType === "road" && h.slotIndex === i);
      const focused   = game.focusedSlot?.type === "road" && game.focusedSlot.index === i;
      drawSlot(layerSlots, x, y, "road", occupied, focused);
    });
    game.map.platformSlots.forEach(([x, y], i) => {
      const occupied  = game.heroes.some((h) => h.slotType === "platform" && h.slotIndex === i);
      const focused   = game.focusedSlot?.type === "platform" && game.focusedSlot.index === i;
      drawSlot(layerSlots, x, y, "platform", occupied, focused);
    });
  }

  function drawSlot(container, x, y, type, occupied, highlighted) {
    if (mapScene) { mapScene.drawSlot(container, x, y, type, occupied, highlighted); return; }
    const color  = type === "road" ? palette.gold : palette.purple;
    const radius = type === "road" ? 27 : 24;
    const tex    = slotTextures.get(type);

    if (tex) {
      const size = type === "road" ? 72 : 64;
      const spr = new PIXI.Sprite(tex);
      spr.anchor.set(0.5);
      spr.width = size;
      spr.height = size;
      spr.position.set(x, y);
      spr.alpha = occupied ? 0.45 : 1;
      container.addChild(spr);
      if (highlighted) {
        const ring = new PIXI.Graphics();
        ring.setStrokeStyle({ width: 3, color: 0xffffff, alpha: 0.9 });
        ring.circle(x, y, size / 2 + 4).stroke();
        container.addChild(ring);
      }
      return;
    }

    // Fallback: Graphics approach
    const g = new PIXI.Graphics();

    // Outer ambient glow
    g.circle(x, y, radius + 11).fill({ color, alpha: 0.06 });

    // Dark carved pedestal base
    g.circle(x, y, radius).fill({ color: 0x000000, alpha: 0.52 });
    const fillAlpha = occupied ? 0.10 : 0.22;
    g.circle(x, y, radius).fill({ color, alpha: fillAlpha });

    // Outer border ring
    const borderColor = highlighted ? 0xffffff : occupied ? 0xffffff : color;
    const borderAlpha = highlighted ? 1.0 : occupied ? 0.12 : 0.88;
    const borderWidth = highlighted ? 3 : 2;
    g.setStrokeStyle({ width: borderWidth, color: borderColor, alpha: borderAlpha });
    g.circle(x, y, radius).stroke();

    if (!occupied) {
      g.setStrokeStyle({ width: 1, color, alpha: 0.42 });
      g.circle(x, y, radius - 8).stroke();
      const d = radius - 4;
      for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) {
        g.circle(x + dx, y + dy, 2).fill({ color, alpha: 0.85 });
      }
    }

    container.addChild(g);
  }

  // ------------------------------------------------------------------
  // Range rings
  // ------------------------------------------------------------------
  function buildRanges() {
    layerRanges.removeChildren();
    const placement = game.uiPlacement;
    if (placement) drawRangeRing(layerRanges, placement.x, placement.y, placement.range, placement.type === "road" ? "gold" : "purple");
    const selected = game.heroes.find((u) => u.entityId === game.uiSelected);
    if (selected) drawRangeRing(layerRanges, selected.x, selected.y, selected.range, selected.slotType === "road" ? "gold" : "purple");
  }

  function drawRangeRing(container, x, y, radius, color) {
    const g = new PIXI.Graphics();
    const c = color === "gold" ? palette.gold : palette.purple;
    g.circle(x, y, radius).fill({ color: c, alpha: 0.08 });
    // Glow: inner falloff band brightens toward the edge, soft halo outside it, crisp edge on top.
    g.circle(x, y, radius - 9).stroke({ width: 10, color: c, alpha: 0.05 });
    g.circle(x, y, radius - 4).stroke({ width: 6, color: c, alpha: 0.08 });
    g.circle(x, y, radius).stroke({ width: 12, color: c, alpha: 0.10 });
    g.circle(x, y, radius).stroke({ width: 6, color: c, alpha: 0.18 });
    g.circle(x, y, radius).stroke({ width: 3, color: c, alpha: 0.9 });
    container.addChild(g);
  }

  // ------------------------------------------------------------------
  // Aura + synergy links
  // ------------------------------------------------------------------
  function buildLinks() {
    layerLinks.removeChildren();
    const selected = game.heroes.find((u) => u.entityId === game.uiSelected);
    if (!selected) return;

    const auraPct = Math.round((game.tuning.support?.passiveAuraBonus ?? 0.1) * 100);
    if (selected.ability === "aura") {
      const g = new PIXI.Graphics();
      g.setStrokeStyle({ width: 2, color: palette.gold, alpha: 0.55 });
      for (const ally of game.heroes) {
        if (ally === selected) continue;
        if (Math.hypot(selected.x - ally.x, selected.y - ally.y) > selected.range) continue;
        drawDashedLine(g, selected.x, selected.y, ally.x, ally.y, 5, 5);
        addLabel(layerLinks, `+${auraPct}%`, ally.x + 22, ally.y - 18, palette.gold);
      }
      g.stroke();
      layerLinks.addChild(g);
    }

    const links = game.synergyLinksFor?.(selected) || [];
    if (links.length) {
      const bonusPct = (game.tuning.synergy?.bonusPerTag ?? 0.08) * 100;
      const g = new PIXI.Graphics();
      g.setStrokeStyle({ width: 2, color: 0x82e89a, alpha: 0.55 });
      for (const link of links) {
        drawDashedLine(g, selected.x, selected.y, link.hero.x, link.hero.y, 5, 5);
        addLabel(layerLinks, `+${Math.round(link.shared.length * bonusPct)}%`, link.hero.x - 22, link.hero.y - 18, 0x82e89a);
      }
      g.stroke();
      layerLinks.addChild(g);
    }
  }

  function drawDashedLine(g, x1, y1, x2, y2, dash, gap) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    if (len === 0) return;
    const ux = (x2 - x1) / len; const uy = (y2 - y1) / len;
    let d = 0; let drawing = true;
    while (d < len) {
      const segLen = Math.min(drawing ? dash : gap, len - d);
      if (drawing) { g.moveTo(x1 + ux * d, y1 + uy * d).lineTo(x1 + ux * (d + segLen), y1 + uy * (d + segLen)); }
      d += segLen; drawing = !drawing;
    }
  }

  function addLabel(container, text, x, y, color) {
    const t = new PIXI.Text({ text, style: { fill: color, fontSize: 11, fontWeight: "700" } });
    t.position.set(x, y);
    t.anchor.set(0.5, 0.5);
    container.addChild(t);
  }

  // ------------------------------------------------------------------
  // Portals (entrance / exit)
  // ------------------------------------------------------------------
  function buildPortals() {
    if (isAuthored) return;
    const exit = mapLanes(game.map)[0].path.at(-1); // every lane ends at the base
    for (const { path: [entrance] } of mapLanes(game.map)) drawPortal(layerHud, entrance[0], entrance[1], 0x82e89a, "ENTRANCE");
    drawPortal(layerHud, exit[0],     exit[1],     0xff4d4d, "EXIT");
  }

  function drawPortal(container, x, y, color, label) {
    const g = new PIXI.Graphics();
    g.setStrokeStyle({ width: 4, color, alpha: 1 });
    g.circle(x, y, 22).stroke();
    g.setStrokeStyle({ width: 4, color, alpha: 0.35 });
    g.circle(x, y, 30).stroke();
    container.addChild(g);
    const t = new PIXI.Text({ text: label, style: { fill: color, fontSize: 10, fontWeight: "700" } });
    t.anchor.set(0.5, 0);
    t.position.set(x, y + 34);
    container.addChild(t);
  }

  // ------------------------------------------------------------------
  // Heroes
  // ------------------------------------------------------------------
  const heroSprites = new Map(); // entityId -> Container

  function syncHeroes() {
    const seen = new Set();
    for (const unit of game.heroes) {
      seen.add(unit.entityId);
      if (!heroSprites.has(unit.entityId)) {
        const container = buildHeroSprite(unit);
        heroSprites.set(unit.entityId, container);
        layerUnits.addChild(container);
      }
      updateHeroSprite(unit, heroSprites.get(unit.entityId));
    }
    for (const [id, container] of heroSprites) {
      if (!seen.has(id)) { layerUnits.removeChild(container); container.destroy({ children: true }); heroSprites.delete(id); }
    }
  }

  function buildHeroSprite(unit) {
    const container = new PIXI.Container();
    container._heroId = unit.id;

    // Ground shadow and a dark disc behind the cutout token.
    const base = new PIXI.Graphics();
    base.ellipse(0, 24, 25, 7).fill({ color: 0x000000, alpha: 0.45 });
    base.circle(0, 0, 25).fill({ color: 0x1b1530 });
    container.addChild(base);

    // Border doubles as the level display (drawLevelBorder); below the token so the head overlaps it.
    const border = new PIXI.Graphics();
    container._border = border;
    container.addChild(border);

    const mask = new PIXI.Graphics();
    container._mask = mask;
    container.addChild(mask);

    const sp = new PIXI.Sprite(PIXI.Texture.EMPTY);
    sp.anchor.set(0.5);
    sp.mask = mask;
    container.addChild(sp);
    container._img = sp;
    applyHeroTexture(container, unit.id);


    const facing = new PIXI.Graphics();
    container._facing = facing;
    container.addChild(facing);

    const ultRing = new PIXI.Graphics();
    container._ultRing = ultRing;
    container.addChild(ultRing);

    // Level number disc sitting on the border at bottom-right.
    const badge = new PIXI.Container();
    badge.position.set(19, 19);
    const disc = new PIXI.Graphics();
    disc.circle(0, 0, 8).fill(palette.gold).stroke({ width: 1.5, color: 0x13111c });
    const lvlText = new PIXI.Text({ text: "1", style: { fill: 0x13111c, fontSize: 11, fontWeight: "800" } });
    lvlText.anchor.set(0.5);
    lvlText.position.set(0, 0.5);
    badge.addChild(disc, lvlText);
    container._lvlText = lvlText;
    container._badgeDisc = disc;
    container.addChild(badge);

    return container;
  }

  function updateHeroSprite(unit, container) {
    container.position.set(unit.x, unit.y);
    // Assassin veil (class ultimate): translucent while nothing can hurt it.
    container.alpha = game.isVeiled?.(unit) ? 0.45 : 1;

    // Swap texture in once it loads (token takes priority over the CDN portrait)
    if ((boardSprites.get(unit.id) ?? sprites.get(unit.id) ?? null) !== container._texRef) applyHeroTexture(container, unit.id);

    // Facing tick
    const f = container._facing;
    f.clear();
    const angle = unit.rotation || 0;
    f.setStrokeStyle({ width: 3, color: 0xffffff, alpha: 0.75 });
    f.moveTo(Math.cos(angle) * 27, Math.sin(angle) * 27).lineTo(Math.cos(angle) * 36, Math.sin(angle) * 36);
    f.stroke();

    // Ult charge arc
    const ur = container._ultRing;
    ur.clear();
    if (unit.ultClock !== undefined && unit.ultCooldown) {
      const pct = Math.min(1, unit.ultClock / unit.ultCooldown);
      if (pct > 0) {
        ur.setStrokeStyle({ width: 3, color: palette.purple, alpha: 0.65 });
        ur.arc(0, 0, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
        ur.stroke();
      }
    }

    // Level: segmented border + number disc, redrawn only when the level changes.
    const level = unit.level || 1;
    const key = `${level}${unit.awakened ? "a" : ""}`;
    if (container._level !== key) {
      container._level = key;
      container._lvlText.text = unit.awakened ? "\u2605" : String(level);
      container._badgeDisc.clear().circle(0, 0, 8).fill(unit.awakened ? 0xfff4c2 : palette.gold).stroke({ width: 1.5, color: 0x13111c });
      drawLevelBorder(container._border, level, unit.awakened);
    }
  }

  // Token: the cutout overflows the ring top so the head pops out of the frame.
  // Portrait fallback: plain circle crop.
  function applyHeroTexture(container, heroId) {
    const token = boardSprites.get(heroId);
    const tex = token ?? sprites.get(heroId) ?? null;
    const sp = container._img;
    const mask = container._mask;
    container._texRef = tex;
    mask.clear();
    if (!tex) { sp.texture = PIXI.Texture.EMPTY; return; }
    sp.texture = tex;
    sp.tint = 0xffffff;
    if (token) {
      sp.width = 60; sp.height = 60;
      sp.position.set(0, -7);
      mask.circle(0, 0, 25).fill(0xffffff);
      mask.ellipse(0, -16, 18, 24).fill(0xffffff); // head rises about 15px above the ring
    } else {
      sp.width = 50; sp.height = 50;
      sp.position.set(0, 0);
      mask.circle(0, 0, 25).fill(0xffffff);
    }
  }

  // One arc per level; owned levels solid gold. At max level the ring closes and glows.
  function drawLevelBorder(g, level, awakened = false) {
    const maxLevel = game.tuning.upgrades?.maxLevel ?? 4;
    g.clear();
    g.filters = null;
    if (awakened) {
      // Awakened: radiant double ring with a stronger glow.
      g.circle(0, 0, 26).stroke({ width: 3, color: 0xfff4c2 });
      g.circle(0, 0, 30).stroke({ width: 1.5, color: palette.gold, alpha: 0.8 });
      if (GlowFilter && !reducedMotion) g.filters = [new GlowFilter({ distance: 14, outerStrength: 2, color: 0xffe27a })];
      return;
    }
    if (level >= maxLevel) {
      g.circle(0, 0, 26).stroke({ width: 3, color: palette.gold });
      if (GlowFilter && !reducedMotion) g.filters = [new GlowFilter({ distance: 8, outerStrength: 1.2, color: palette.gold })];
      return;
    }
    const gap = 0.22;
    const span = (Math.PI * 2) / maxLevel;
    for (let i = 0; i < maxLevel; i++) {
      const start = -Math.PI * 0.75 + i * span + gap / 2; // gaps at the diagonals; the badge sits in one
      const owned = i < level;
      g.moveTo(Math.cos(start) * 26, Math.sin(start) * 26);
      g.arc(0, 0, 26, start, start + span - gap).stroke({ width: owned ? 3 : 2, color: palette.gold, alpha: owned ? 1 : 0.3 });
    }
  }

  // ------------------------------------------------------------------
  // Enemies (pooled Graphics + optional sprite)
  // ------------------------------------------------------------------
  const enemyContainers = new Map(); // entityId -> Container

  function syncEnemies() {
    const seen = new Set();
    let addedPlain = false;
    for (const unit of game.enemies) {
      if (isAuthored && unit.dead && unit.exitReason === "base") continue;
      seen.add(unit.entityId);
      const existing = enemyContainers.get(unit.entityId);
      // Full-body art that finished loading after this enemy spawned: rebuild so it converges.
      const stale = existing && !existing._fullSprite && fullBodyTextures.has(unit.kind);
      if (!existing || stale) {
        const c = buildEnemyContainer(unit);
        c.tdEnemy = unit;
        enemyContainers.set(unit.entityId, c);
        if (stale) {
          layerUnits.addChildAt(c, layerUnits.getChildIndex(existing));
          layerUnits.removeChild(existing);
          existing.destroy({ children: true });
        } else layerUnits.addChild(c);
        if (unit.kind !== "boss" && unit.kind !== "brood") addedPlain = true;
      }
      updateEnemyContainer(unit, enemyContainers.get(unit.entityId));
      if (isAuthored) {
        // Units emerge from the breach and pass inside the base, instead of dying there.
        enemyContainers.get(unit.entityId).alpha *= Math.min(1, Math.max(0, unit.distance / 18), Math.max(0, (game.laneOf(unit).total - unit.distance) / 24));
      }
    }
    // Keep the boss and its children above the escort that spawns after them.
    if (addedPlain) {
      for (const c of enemyContainers.values()) {
        if (c.tdEnemy?.kind === "boss" || c.tdEnemy?.kind === "brood") layerUnits.setChildIndex(c, layerUnits.children.length - 1);
      }
    }
    for (const [id, c] of enemyContainers) {
      if (!seen.has(id)) {
        if (isAuthored && c.tdEnemy?.exitReason === "base") {
          c.destroy({ children: true });
          enemyContainers.delete(id);
          continue;
        }
        // Move to dying pool for death-fade instead of instant removal
        dyingPool.set(id, { c, timer: 0.3 });
        enemyContainers.delete(id);
      }
    }
  }

  function advanceDying(dt) {
    for (const [id, d] of dyingPool) {
      d.timer -= dt;
      d.c.alpha = Math.max(0, d.timer / 0.3);
      if (d.timer <= 0) {
        layerUnits.removeChild(d.c);
        d.c.destroy({ children: true });
        dyingPool.delete(id);
      }
    }
  }

  function buildEnemyContainer(unit) {
    const c = new PIXI.Container();

    // Vector shape (fallback, also draws boss ring when sprite present)
    const g = new PIXI.Graphics();
    c._shape = g;
    c.addChild(g);

    const kind = unit.kind;

    // Full-body sprite: unmasked, larger than the portrait circle, ground shadow.
    const fullTex = fullBodyTextures.get(kind);
    if (fullTex) {
      const size = fullSpriteSize(kind);
      const shadow = new PIXI.Graphics();
      shadow.ellipse(0, FULL_SPRITE_FEET, size * (unit.flying ? 0.22 : 0.3), size * (unit.flying ? 0.06 : 0.08)).fill({ color: 0x000000, alpha: unit.flying ? 0.25 : 0.45 });
      c.addChild(shadow);
      const sp = new PIXI.Sprite(fullTex);
      sp.anchor.set(0.5, 0.9);
      sp.y = FULL_SPRITE_FEET - (unit.flying ? FLYER_LIFT : 0);
      sp.width = size; sp.height = size;
      c._fullSprite = sp;
      c._fullScale = sp.scale.x;
      c.addChild(sp);
      c._shape.visible = false;
      if (kind === "boss" && GlowFilter && !reducedMotion) sp.filters = [new GlowFilter({ distance: 14, outerStrength: 1, color: 0xff4d4d })];
      // Lilith's children are dark on dark ground: a thin violet rim keeps them readable in the escort.
      if (kind === "brood" && GlowFilter && !reducedMotion) sp.filters = [new GlowFilter({ distance: 8, outerStrength: 1.4, color: 0xa855f7 })];
      // Borrowed sprites (M11) get a colored rim so they don't read as the original kind.
      if (ENEMY_ART[kind]?.glow && GlowFilter && !reducedMotion) sp.filters = [new GlowFilter({ distance: 8, outerStrength: 1.6, color: ENEMY_ART[kind].glow })];
    }

    // Boss: hero image > Kenney tile > vector circle (handled in buildEnemyShape)
    if (kind === "boss" && !fullTex) {
      const heroTex = sprites.get("boss");
      if (heroTex) {
        const mask = new PIXI.Graphics();
        mask.circle(0, 0, 28).fill(0xffffff);
        c.addChild(mask);
        const sp = new PIXI.Sprite(heroTex);
        sp.anchor.set(0.5);
        sp.width = 56; sp.height = 56;
        sp.mask = mask;
        c._bossSprite = sp;
        c.addChild(sp);
        if (GlowFilter && !reducedMotion) {
          sp.filters = [new GlowFilter({ distance: 18, outerStrength: 1.2, color: 0xff4d4d })];
        }
      }
    }

    // Portrait sprite for non-boss enemies (circular mask like boss portrait)
    if (kind !== "boss" && !fullTex) {
      const porTex = portraitTextures.get(kind);
      if (porTex) {
        const r = kind === "brute" ? 20 : 14;
        const mask = new PIXI.Graphics();
        mask.circle(0, 0, r).fill(0xffffff);
        c.addChild(mask);
        const sp = new PIXI.Sprite(porTex);
        sp.anchor.set(0.5);
        sp.width = r * 2; sp.height = r * 2;
        sp.mask = mask;
        c._portraitSprite = sp;
        c._portraitMask = mask;
        c.addChild(sp);
        c._shape.visible = false;
      }
    }

    // Kenney tile sprite fallback (non-boss when portrait not yet loaded; boss when no hero image)
    const kenTex = enemyTextures.get(kind);
    if (kenTex && !fullTex && !c._portraitSprite && !(kind === "boss" && c._bossSprite)) {
      const spriteSize = kind === "boss" ? 52 : kind === "brute" ? 40 : 28;
      const sp = new PIXI.Sprite(kenTex);
      sp.anchor.set(0.5);
      sp.width = spriteSize;
      sp.height = spriteSize;
      c._enemySprite = sp;
      c.addChild(sp);
      if (kind !== "boss") c._shape.visible = false;
      if (kind === "boss" && GlowFilter && !reducedMotion) {
        sp.filters = [new GlowFilter({ distance: 18, outerStrength: 1.2, color: 0xff4d4d })];
      }
    }

    // White overlay for hit-flash effect
    const flashR = kind === "boss" ? 29 : kind === "brute" ? 20 : 14;
    const flash = new PIXI.Graphics();
    flash.circle(0, 0, flashR).fill({ color: 0xffffff });
    flash.alpha = 0;
    c._flashOverlay = flash;
    c.addChild(flash);

    // Persistent stone shell follows the actual crowd-control timer.
    const stone = new PIXI.Graphics();
    stone.circle(0, 0, flashR).fill({ color: 0xa4aaa7, alpha: 0.7 })
      .stroke({ color: 0xe1e5df, width: 2, alpha: 0.8 });
    stone.moveTo(-flashR * 0.35, -flashR * 0.85).lineTo(1, -3)
      .lineTo(-5, 4).lineTo(3, flashR * 0.8)
      .moveTo(1, -3).lineTo(flashR * 0.65, -flashR * 0.3)
      .moveTo(-5, 4).lineTo(-flashR * 0.7, flashR * 0.45)
      .stroke({ color: 0x454e4a, width: 1.5, alpha: 0.9 });
    stone.visible = false;
    c._stoneOverlay = stone;
    c.addChild(stone);

    return c;
  }

  function buildEnemyShape(g, unit) {
    g.clear();
    const kind   = unit.kind;
    const radius = kind === "boss" ? 26 : kind === "brute" ? 17 : 12;
    const color  = COLORS[kind] ?? 0xffffff;

    if (unit.kind === "boss" && !sprites.get("boss") && !enemyTextures.get("boss")) {
      g.circle(0, 0, radius).fill({ color }).setStrokeStyle({ width: 3, color: 0x07060c, alpha: 0.8 }).circle(0, 0, radius).stroke();
      return;
    }
    if (unit.kind === "boss") { // sprite handles the body; just add glow border
      g.setStrokeStyle({ width: 3, color: 0xff4d4d });
      g.circle(0, 0, 29).stroke();
      return;
    }

    const scale = kind === "brute" ? 1.4 : 1; // P4 per-tier size scaling
    const r = radius * scale;
    g.setStrokeStyle({ width: 3, color: 0x07060c, alpha: 0.8 });
    if (unit.flying) {
      // diamond
      g.moveTo(0, -r).lineTo(r, 0).lineTo(0, r).lineTo(-r, 0).closePath().fill({ color }).stroke();
    } else if (kind === "runner") {
      polygon(g, r, 3, color);
    } else if (kind === "archer") {
      polygon(g, r, 4, color);
    } else if (kind === "brute") {
      polygon(g, r, 6, color);
    } else {
      g.circle(0, 0, r).fill({ color }).stroke();
    }
  }

  function polygon(g, r, sides, color) {
    const rot = -Math.PI / 2;
    for (let i = 0; i < sides; i++) {
      const a = rot + (i / sides) * Math.PI * 2;
      i ? g.lineTo(Math.cos(a) * r, Math.sin(a) * r) : g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath().fill({ color }).stroke();
  }

  // Hit-flash: set on entity, consumed by renderer
  const hitFlash = new Map(); // entityId -> framesLeft

  // Death-fade pool: enemies removed from sim are kept here for ~0.3s
  const dyingPool = new Map(); // entityId -> { c, timer }
  let dyingClock = null;

  function updateEnemyContainer(unit, c) {
    // Full-body sprites face their direction of travel (art faces right).
    if (c._fullSprite && c._lastX !== undefined && Math.abs(unit.x - c._lastX) > 0.01) {
      c._fullSprite.scale.x = (unit.x < c._lastX ? -1 : 1) * c._fullScale;
    }
    c._lastX = unit.x;
    c.position.set(unit.x, unit.y);
    if (unit.flying && c._fullSprite) c._fullSprite.y = FULL_SPRITE_FEET - FLYER_LIFT + flyerBob(unit);
    c.alpha = unit.untargetable ? 0.8 : 1; // a summoning Lilith cannot be hit
    if (c._fullSprite) return updateEnemyOverlays(unit, c);

    // Upgrade to portrait if it finished loading after container was built
    if (!c._portraitSprite && unit.kind !== "boss") {
      const porTex = portraitTextures.get(unit.kind);
      if (porTex) {
        const kind = unit.kind;
        const r = kind === "brute" ? 20 : 14;
        const mask = new PIXI.Graphics();
        mask.circle(0, 0, r).fill(0xffffff);
        c.addChildAt(mask, c.children.length - 1);
        const sp = new PIXI.Sprite(porTex);
        sp.anchor.set(0.5);
        sp.width = r * 2; sp.height = r * 2;
        sp.mask = mask;
        c._portraitSprite = sp;
        c._portraitMask = mask;
        c.addChildAt(sp, c.children.length - 1);
        c._shape.visible = false;
        if (c._enemySprite) { c._enemySprite.visible = false; }
      }
    }

    // Upgrade to Kenney sprite if sheet finished loading (fallback when portrait absent)
    if (!c._enemySprite && !c._portraitSprite && !(unit.kind === "boss" && c._bossSprite)) {
      const kenTex = enemyTextures.get(unit.kind);
      if (kenTex) {
        const kind = unit.kind;
        const spriteSize = kind === "boss" ? 52 : kind === "brute" ? 40 : 28;
        const sp = new PIXI.Sprite(kenTex);
        sp.anchor.set(0.5);
        sp.width = spriteSize;
        sp.height = spriteSize;
        c._enemySprite = sp;
        c.addChildAt(sp, c.children.length - 1);
        if (kind !== "boss") c._shape.visible = false;
        if (kind === "boss" && GlowFilter && !reducedMotion) {
          sp.filters = [new GlowFilter({ distance: 18, outerStrength: 1.2, color: 0xff4d4d })];
        }
      }
    }

    // Vector shape: only rebuild when used as fallback; boss ring always redrawn
    if (c._shape.visible || unit.kind === "boss") buildEnemyShape(c._shape, unit);
    updateEnemyOverlays(unit, c);
  }

  // Petrify tint and stone shell, hit flash.
  function updateEnemyOverlays(unit, c) {
    const petrified = (unit.petrifiedUntil ?? 0) > game.time;
    c._stoneOverlay.visible = petrified;
    const stunned = !petrified && (unit.stunnedUntil ?? 0) > game.time;
    const own = ENEMY_ART[unit.kind]?.tint ?? 0xffffff;
    for (const sprite of [c._fullSprite, c._portraitSprite, c._bossSprite, c._enemySprite]) {
      if (sprite) sprite.tint = petrified ? 0x9ba39f : stunned ? 0xb9a8ff : own;
    }

    // Hit-flash: white overlay for 2 frames
    if (unit._hitFlash) { hitFlash.set(unit.entityId, 2); unit._hitFlash = false; }
    const flashFrames = hitFlash.get(unit.entityId) || 0;
    if (c._flashOverlay) c._flashOverlay.alpha = flashFrames > 0 ? 0.85 : 0;
    if (flashFrames > 0) hitFlash.set(unit.entityId, flashFrames - 1);
  }

  // ------------------------------------------------------------------
  // HP bars (full rebuild each frame, lightweight Graphics)
  // ------------------------------------------------------------------
  function drawBars() {
    layerBars.removeChildren();
    const g = new PIXI.Graphics();
    for (const unit of game.enemies) {
      const radius = unit.kind === "boss" ? 26 : unit.kind === "brute" ? 17 : 12;
      const top = (fullBodyTextures.has(unit.kind) ? FULL_SPRITE_FEET - fullSpriteSize(unit.kind) * 0.8 - 4 : -radius - 9) - (unit.flying ? FLYER_LIFT : 0);
      drawBar(g, unit.x - radius, Math.max(2, unit.y + top), radius * 2, unit.hp / unit.maxHp, unit.kind === "boss" ? 0xff4d4d : 0xf4f1ff);
      // Mender: green heal ring at its feet, showing the heal radius faintly.
      const heal = game.tuning.enemies[unit.kind]?.heal;
      if (heal) {
        g.ellipse(unit.x, unit.y + FULL_SPRITE_FEET, 20, 7).fill({ color: 0x4ade80, alpha: 0.35 }).stroke({ width: 2, color: 0x86efac, alpha: 0.9 });
        g.circle(unit.x, unit.y, heal.radius).stroke({ width: 1, color: 0x4ade80, alpha: 0.18 });
      }
      // Shieldbearer: shield bar above health and a bubble while the shield holds.
      if (unit.shieldMax) {
        const ratio = unit.shield / unit.shieldMax;
        drawBar(g, unit.x - radius, Math.max(2, unit.y + top - 5), radius * 2, ratio, 0x7dd3fc);
        if (ratio > 0) g.circle(unit.x, unit.y - fullSpriteSize(unit.kind) * 0.35, fullSpriteSize(unit.kind) * 0.45).stroke({ width: 2, color: 0x7dd3fc, alpha: 0.25 + 0.45 * ratio });
      }
    }
    for (const unit of game.heroes) {
      drawBar(g, unit.x - 24, unit.y + 31, 48, unit.hpLeft / unit.hp, 0x82e89a);
      // Hexed (Hexer): a pulsing violet ring while the hero cannot act.
      if (game.isHexed?.(unit)) {
        const pulse = reducedMotion ? 0.8 : 0.55 + 0.35 * Math.sin(performance.now() / 120);
        g.circle(unit.x, unit.y, 33).stroke({ width: 3, color: 0xc084fc, alpha: pulse });
      }
    }
    layerBars.addChild(g);
  }

  function drawBar(g, x, y, width, ratio, color) {
    g.rect(x, y, width, 4).fill({ color: 0x000000, alpha: 0.65 });
    const filled = width * Math.max(0, ratio);
    if (filled > 0) g.rect(x, y, filled, 4).fill({ color });
  }

  // ------------------------------------------------------------------
  // Effects + particles
  // ------------------------------------------------------------------
  const particles = [];
  const seenEffects = new WeakSet();
  let particleClock = null;

  function spawnParticle(texName, x, y, { size = 28, life = 0.3, vx = 0, vy = 0, rot = 0, vr = 0, tint = "gold" } = {}) {
    const tex = fxTex.get(texName);
    if (!tex) return;
    const sp = new PIXI.Sprite(tex);
    sp.anchor.set(0.5);
    sp.width = size; sp.height = size;
    sp.rotation = rot;
    sp.tint = TINTS[tint] ?? TINTS.gold;
    sp.position.set(x, y);
    layerParts.addChild(sp);
    particles.push({ sp, vx, vy, vr, life, maxLife: life });

    if (GlowFilter && !reducedMotion && (tint === "purple" || tint === "red")) {
      sp.filters = [new GlowFilter({ distance: 10, outerStrength: 0.8, color: TINTS[tint] })];
    }
  }

  function spawnParticles(effect) {
    if (hasHeroFx(effect)) return;
    if (effect.heroVariant === "chain_lightning" && ["shot", "hit", "ult"].includes(effect.type)) return;
    if (reducedMotion) return;
    const rand = (s) => (Math.random() - 0.5) * s;
    const baseTint = effect.color === "purple" ? "purple" : effect.color === "red" ? "red" : "gold";
    const tier = FX_TIERS[effectTier(effect)];
    if (tier.shake || tier.vignette) startImpact(tier);
    if (effect.type === "hit" && effect.crit) {
      // Crit: white core flash and a wider spark ring on top of the normal hit.
      spawnParticle("flare_01", effect.x, effect.y, { size: 40 * tier.burst, life: 0.3, tint: "white" });
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 + Math.random();
        spawnParticle("spark_04", effect.x, effect.y, { size: 16, life: 0.45, vx: Math.cos(angle) * 170, vy: Math.sin(angle) * 170, tint: baseTint });
      }
    }
    if (effect.type === "shot") {
      spawnParticle("trace_01", (effect.x1 + effect.x2) / 2, (effect.y1 + effect.y2) / 2, { size: 26, life: 0.2, tint: baseTint });
    } else if (effect.type === "splash") {
      spawnParticle("magic_01", effect.x, effect.y, { size: effect.radius * 2, life: 0.35, tint: effect.color === "green" ? "green" : "purple" });
    } else if (effect.type === "hex") {
      spawnParticle("twirl_01", effect.x2, effect.y2, { size: 64, life: 0.6, vr: 5, tint: "purple" });
      for (let i = 1; i <= 3; i++) spawnParticle("trace_01", effect.x1 + (effect.x2 - effect.x1) * i / 4, effect.y1 + (effect.y2 - effect.y1) * i / 4, { size: 18, life: 0.3, tint: "purple" });
    } else if (effect.type === "shieldBreak") {
      for (let i = 0; i < 5; i++) spawnParticle("spark_04", effect.x, effect.y, { size: 16, life: 0.4, vx: rand(180), vy: rand(180), tint: "white" });
    } else if (effect.type === "cleave") {
      spawnParticle("slash_04", effect.x, effect.y, { size: effect.radius * 1.6, life: 0.3, rot: Math.random() * Math.PI * 2, tint: "gold" });
    } else if (effect.type === "dash") {
      for (let i = 1; i <= 3; i++) spawnParticle("trace_01", effect.x1 + (effect.x2 - effect.x1) * i / 4, effect.y1 + (effect.y2 - effect.y1) * i / 4, { size: 22, life: 0.25, tint: "purple" });
    } else if (effect.type === "beam") {
      spawnParticle("light_01", effect.x2, effect.y2, { size: 30, life: 0.45, vy: -30, tint: "green" });
    } else if (effect.type === "hold") {
      spawnParticle("twirl_01", effect.x, effect.y, { size: effect.radius * 1.4, life: 0.8, vr: 3, tint: "gold" });
    } else if (effect.type === "veil") {
      spawnParticle("twirl_01", effect.x, effect.y, { size: 70, life: 0.6, vr: -5, tint: "purple" });
    } else if (effect.type === "hit" && effect.melee) {
      spawnParticle("slash_04", effect.x, effect.y, { size: 56, life: 0.35, rot: Math.random() * Math.PI * 2, tint: "gold" });
      for (let i = 0; i < 3; i++) spawnParticle("spark_04", effect.x, effect.y, { size: 18, life: 0.4, vx: rand(160), vy: rand(160), tint: "gold" });
    } else if (effect.type === "hit") {
      spawnParticle("magic_01", effect.x, effect.y, { size: 48, life: 0.4, tint: "purple" });
      for (let i = 0; i < 2; i++) spawnParticle("spark_04", effect.x, effect.y, { size: 16, life: 0.4, vx: rand(140), vy: rand(140), tint: "purple" });
    } else if (effect.type === "heal") {
      spawnParticle("light_01", effect.x, effect.y, { size: 44, life: 0.7, vy: -46, tint: "green" });
    } else if (effect.type === "buff") {
      spawnParticle("star_03", effect.x, effect.y, { size: 36, life: 0.7, vy: -30, vr: 3, tint: "gold" });
    } else if (effect.type === "ult") {
      spawnParticle("flare_01", effect.x, effect.y, { size: 96, life: 0.7, tint: "purple" });
      spawnParticle("twirl_01", effect.x, effect.y, { size: 80, life: 0.8, vr: 6, tint: "purple" });
      spawnParticle("flame_04", effect.x, effect.y, { size: 60, life: 0.75, vy: -60, tint: "gold" });
    } else if (effect.type === "boss") {
      spawnParticle("flare_01", effect.x, effect.y, { size: 70 * tier.burst, life: 1, tint: "red" });
      spawnParticle("twirl_01", effect.x, effect.y, { size: 55 * tier.burst, life: 1.1, vr: 4, tint: "red" });
      spawnParticle("flame_04", effect.x, effect.y, { size: 48 * tier.burst, life: 1, vy: -70, tint: "red" });
    } else if (effect.type === "summon") {
      spawnParticle("twirl_01", effect.x, effect.y, { size: 90, life: 0.8, vr: -4, tint: "purple" });
      spawnParticle("magic_01", effect.x, effect.y, { size: 70, life: 0.7, tint: "purple" });
    } else if (effect.type === "awaken") {
      spawnParticle("flare_01", effect.x, effect.y, { size: 110, life: 0.9, tint: "white" });
      spawnParticle("twirl_01", effect.x, effect.y, { size: 90, life: 1, vr: 5, tint: "gold" });
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        spawnParticle("star_03", effect.x, effect.y, { size: 22, life: 0.9, vx: Math.cos(angle) * 120, vy: Math.sin(angle) * 120 - 30, vr: 3, tint: "gold" });
      }
    } else if (effect.type === "bossDown") {
      spawnParticle("flare_01", effect.x, effect.y, { size: 90 * tier.burst, life: 1.2, tint: "white" });
      spawnParticle("twirl_01", effect.x, effect.y, { size: 70 * tier.burst, life: 1.3, vr: -5, tint: "gold" });
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        spawnParticle("spark_04", effect.x, effect.y, { size: 24, life: 1, vx: Math.cos(angle) * 220, vy: Math.sin(angle) * 220, tint: i % 2 ? "gold" : "red" });
      }
    }
  }

  function advanceParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) { layerParts.removeChild(p.sp); p.sp.destroy(); particles.splice(i, 1); continue; }
      p.sp.x += p.vx * dt; p.sp.y += p.vy * dt;
      p.sp.rotation += p.vr * dt;
      p.sp.alpha = Math.max(0, p.life / p.maxLife);
    }
  }

  // Epic-tier impact: short screen shake and a red edge vignette that fade out together.
  const IMPACT_SECONDS = 0.5;
  let impact = null;
  const vignette = new PIXI.Graphics();
  function startImpact(tier) {
    if (reducedMotion) return;
    impact = { tier, start: performance.now() };
  }

  function applyImpact(now) {
    vignette.clear();
    if (!impact) return;
    const t = (now - impact.start) / 1000 / IMPACT_SECONDS;
    if (t >= 1) { impact = null; stage.position.set(0, 0); return; }
    const fade = 1 - t;
    const amp = impact.tier.shake * fade;
    stage.position.set((Math.random() - 0.5) * 2 * amp, (Math.random() - 0.5) * 2 * amp);
    if (impact.tier.vignette) {
      for (let i = 0; i < 4; i++) {
        vignette.rect(i * 10, i * 10, 960 - i * 20, 540 - i * 20).stroke({ width: 10, color: TINTS.red, alpha: impact.tier.vignette * fade * (1 - i / 4) });
      }
    }
    if (!vignette.parent) stage.addChild(vignette);
  }

  function drawEffects(now) {
    const dt = particleClock === null ? 0 : Math.min((now - particleClock) / 1000, 0.1);
    particleClock = now;

    // Spawn particles for newly seen effects
    for (const effect of game.effects) {
      if (!seenEffects.has(effect)) { seenEffects.add(effect); spawnParticles(effect); }
    }

    advanceParticles(dt);
    zeusFx.update(game.effects);
    heroFx.update(game, dt);

    // Draw shot tracers and hit rings as transient Graphics on layerFx
    layerFx.removeChildren();
    for (const effect of game.effects) {
      if (effect.type === "baseHit") continue; // physical sanctuary owns its impact feedback
      if (effect.type === "veil") continue; // the hero token turns translucent instead (particles mark the start)
      if (hasHeroFx(effect)) continue;
      if (effect.heroVariant === "chain_lightning" && ["shot", "hit", "ult"].includes(effect.type)) continue;
      const color = effect.color === "purple" ? palette.purple : effect.color === "red" ? 0xff6b6b : effect.color === "green" ? TINTS.green : effect.color === "white" ? TINTS.white : palette.gold;
      const g = new PIXI.Graphics();
      g.setStrokeStyle({ width: 2, color, alpha: reducedMotion ? 0.5 : Math.min(1, effect.life * 6) });
      const fade = reducedMotion ? 0.5 : Math.min(1, effect.life * 4);
      if (effect.type === "shot") {
        g.moveTo(effect.x1, effect.y1).lineTo(effect.x2, effect.y2).stroke();
      } else if (effect.type === "hex") {
        g.moveTo(effect.x1, effect.y1).lineTo(effect.x2, effect.y2).stroke({ width: 3, color, alpha: fade * 0.8, cap: "round" });
      } else if (effect.type === "dash" || effect.type === "beam") {
        // Class kits (M6): Assassin dash trail, Support heal beam.
        const beam = effect.type === "beam";
        g.moveTo(effect.x1, effect.y1).lineTo(effect.x2, effect.y2)
          .stroke({ width: beam ? 3 : 5, color: beam ? TINTS.green : color, alpha: fade * (beam ? 0.8 : 0.6), cap: "round" });
      } else if (effect.type === "splash" || effect.type === "cleave" || effect.type === "hold") {
        // Mage splash area, Warrior cleave arc, Tank hold zone: drawn at their real radius.
        const r = effect.radius;
        if (effect.type === "cleave") {
          const facing = Math.atan2(effect.y - (effect.sourceY ?? effect.y), effect.x - (effect.sourceX ?? effect.x));
          g.arc(effect.sourceX ?? effect.x, effect.sourceY ?? effect.y, Math.hypot(effect.x - effect.sourceX, effect.y - effect.sourceY) || r, facing - 0.9, facing + 0.9)
            .stroke({ width: 6, color: TINTS.gold, alpha: fade * 0.8, cap: "round" });
        } else {
          g.circle(effect.x, effect.y, r).fill({ color, alpha: fade * (effect.type === "hold" ? 0.12 : 0.18) });
          g.circle(effect.x, effect.y, r).stroke({ width: 2, color, alpha: fade * 0.7 });
        }
      } else {
        const tierName = effectTier(effect);
        const tier = FX_TIERS[tierName];
        // Expanding rings for ultimates and epic moments, fixed rings for hits.
        const expanding = effect.type === "ult" || tierName === "epic";
        const base = expanding ? 55 * (1 - Math.min(1, effect.life)) + 20 : 14;
        const radius = reducedMotion ? (expanding ? 40 : 10) * tier.ring : base * tier.ring;
        g.setStrokeStyle({ width: tierName === "minor" ? 4 : 5, color, alpha: reducedMotion ? 0.35 : Math.min(1, effect.life * 1.8) });
        g.arc(effect.x, effect.y, radius, 0, Math.PI * 2).stroke();
        if (effect.type === "hit" && effect.crit) g.circle(effect.x, effect.y, radius * 0.45).stroke({ width: 2, color: TINTS.white, alpha: Math.min(1, effect.life * 4) });
        if (GlowFilter && !reducedMotion && tierName !== "minor") {
          g.filters = [new GlowFilter({ distance: 14, outerStrength: 1.5, color })];
        }
      }
      layerFx.addChild(g);
    }
  }

  // ------------------------------------------------------------------
  // Main draw call (called from rAF loop in TowerDefensePage)
  // Bg and portals are static (built once). Slots, ranges, links rebuild
  // each frame because they depend on game.heroes / game.uiPlacement which
  // can change any tick.
  // ------------------------------------------------------------------
  function draw(now = performance.now()) {
    const dyingDt = dyingClock === null ? 0 : Math.min((now - dyingClock) / 1000, 0.1);
    dyingClock = now;

    buildSlots();
    buildRanges();
    buildLinks();
    syncEnemies();
    advanceDying(dyingDt);
    syncHeroes();
    drawBars();
    drawEffects(now);
    applyImpact(now);
    mapScene?.draw(now);
    app.renderer.render(stage);
  }

  // ------------------------------------------------------------------
  // Initial one-time setup (static layers built here, not in draw loop)
  // ------------------------------------------------------------------
  resize();
  if (isAuthored) {
    const load = (key, fallback) => PIXI.Assets.load(sceneArt.assets[key]).catch((error) => {
      console.warn(`${sceneArt.name} ${key} art unavailable; using ${fallback} fallback.`, error);
      return null;
    });
    const [spawnTexture, baseTexture, roadTexture, padTexture] = await Promise.all([
      load("spawn", "stone gate"), load("base", "sanctuary"), load("road", "stone paving"), load("pad", "carved pad"),
      buildBgTexture(),
    ]);
    mapScene = createMapScene(PIXI, game, { ground: layerBg, structures: layerStructures, foreground: layerForeground, overlay: layerHud, reducedMotion, textures: { spawn: spawnTexture, base: baseTexture, road: roadTexture, pad: padTexture } });
  } else buildBgTexture();
  buildBg();
  buildPortals();

  let destroyed = false;
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    mapScene?.destroy?.();
    // Removes the canvas from the DOM; shared textures stay in the Assets cache for the next run.
    app.destroy({ removeView: true }, { children: true });
  }

  return { draw, resize, destroy, sprites, particles };
}

// ------------------------------------------------------------------
// Coordinate helpers (unchanged API, work with PixiJS canvas element)
// ------------------------------------------------------------------
export function canvasPoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return { x: (event.clientX - rect.left) * 960 / rect.width, y: (event.clientY - rect.top) * 540 / rect.height };
}

export function nearestSlot(map, point, maxDistance = 38) {
  let best = null;
  for (const type of ["road", "platform"]) {
    const slots = type === "road" ? map.roadSlots : map.platformSlots;
    slots.forEach(([x, y], index) => {
      const distance = Math.hypot(point.x - x, point.y - y);
      if (distance <= maxDistance && (!best || distance < best.distance)) best = { type, index, distance };
    });
  }
  return best;
}
