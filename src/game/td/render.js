// PixiJS v8 renderer for the tower defense game.
// Async: callers must await createRenderer(...).
// Logical space is fixed at 960x540; stage.scale maps it to the canvas CSS size.

import { bossSpriteFile, ENEMY_ART, ENEMY_SPRITE_VERSIONS, enemySheetUrl, enemySpriteVersion, HERO_FIGURES, heroFigureUrl, tdAsset } from "./assets.js";
import { fitRect, shortNumber, tiltView } from "./ui.js";
import { createOdinFx } from "./odin-fx.js";
import { createHeroFx, hasHeroFx, PROFILES } from "./hero-fx.js";
import { createFxKit } from "./fx-kit.js";
import { createStatusFx } from "./status-fx.js";
import { createMapScene, mapSceneFor } from "./map-scene.js";
import { mapLanes, routeStrokes } from "./lanes.js";
import { boardOf, cellCenter, patternCells } from "./board.js";

// Exact versions (audit step 4): a CDN major tag would ship untested releases. Bump both
// deliberately and re-run the Chromium checks.
const PIXI_CDN = "https://cdn.jsdelivr.net/npm/pixi.js@8.21.0/dist/pixi.mjs";
const GLOW_CDN = "https://cdn.jsdelivr.net/npm/@pixi/filter-glow@5.2.1/dist/filter-glow.mjs";

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

const TINTS = { gold: 0xfacc15, purple: 0xa855f7, green: 0x82e89a, red: 0xff6b6b, white: 0xffffff, blue: 0x9de7ff };

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

// Boss art is already more than twice the base enemy size. Keeping its board scale separate
// prevents a large enemyScale from pushing top-lane bosses outside the canvas.
export function enemyRenderScale(kind, rules) {
  return kind === "boss" ? rules?.bossScale ?? rules?.enemyScale ?? 1 : rules?.enemyScale ?? 1;
}

// Targetability is communicated by combat behavior and boss mechanics, not by degrading art.
export function enemyRenderAlpha() {
  return 1;
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

  // R18 prototype (TOWER_DEFENSE_TOP_CLIPPING_CONCEPT.md): tilt the ground, not the figures.
  // Every layer lives in `tiltRoot`, squashed to k and moved down by offsetY; unit containers
  // are counter-scaled by 1/k so heroes and enemies keep their size. Sim coordinates are
  // unchanged. Active only for maps listed in tuning.board.tilt.maps; ?tilt=off disables it,
  // ?tilt=0.7 (or any number 0.5 to 1) overrides k.
  const tiltCfg = game.boardRules?.tilt;
  const tiltParam = new URLSearchParams(location.search).get("tilt");
  const tiltOn = Boolean(tiltCfg) && tiltParam !== "off" && (tiltCfg.maps ?? []).includes(game.map?.id);
  const tiltK = tiltOn ? Math.min(1, Math.max(0.5, Number(tiltParam) || tiltCfg.k)) : 1;
  const tiltOffsetY = tiltOn ? tiltCfg.offsetY : 0;
  tiltView.k = tiltK;
  tiltView.offsetY = tiltOffsetY;
  const tiltRoot = new PIXI.Container();
  tiltRoot.scale.y = tiltK;
  tiltRoot.y = tiltOffsetY;
  const layerBand = new PIXI.Container(); // scenery bands above and below the squashed ground

  // Layer order (added in order = drawn back to front)
  const layerBgTex  = new PIXI.Container(); // game-art background panels
  const layerBg     = new PIXI.Container(); // path, grid
  const layerStructures = new PIXI.Container(); // physical gate/base foundations
  const layerSlotAuras = new PIXI.Container(); // special-tile ground glow + occupant underglow
  const layerSlots  = new PIXI.Container(); // slot rings
  const layerRanges = new PIXI.Container(); // range preview rings
  const layerLinks  = new PIXI.Container(); // aura + synergy links
  const layerUnits  = new PIXI.Container(); // enemies + heroes
  const layerSlotAurasTop = new PIXI.Container(); // special-tile motes/mist drifting over heroes
  const layerForeground = new PIXI.Container(); // doorway faces occlude entering units
  const layerBars   = new PIXI.Container(); // hp bars (redrawn each frame)
  const layerFx     = new PIXI.Container(); // shot tracers, hit rings
  const layerParts  = new PIXI.Container(); // particles
  const layerNumbers = new PIXI.Container(); // floating damage numbers
  const layerHud    = new PIXI.Container(); // portals, labels
  // Unit depth (zIndex): ground enemies, then heroes sorted top to bottom, then flyers. A road
  // hero must stay visible while the enemies it blocks stand on its tile.
  layerUnits.sortableChildren = true;
  const Z_HERO = 1000, Z_FLYER = 3000;
  for (const l of [layerBgTex, layerBg, layerStructures, layerSlotAuras, layerSlots, layerRanges, layerLinks, layerUnits, layerSlotAurasTop, layerForeground, layerBars, layerFx, layerParts, layerNumbers, layerHud]) {
    tiltRoot.addChild(l);
  }
  stage.addChild(layerBand, tiltRoot);

  // ------------------------------------------------------------------
  // Sprite cache: hero thumbnails + boss + FX textures
  // ------------------------------------------------------------------
  const sprites     = new Map(); // id -> PIXI.Texture (UI/selection portraits from CDN)
  const boardSprites = new Map(); // id -> PIXI.Texture (on-board overrides, e.g. pixel sprites)
  const fxTex    = new Map(); // name -> PIXI.Texture
  // M24c: one pooled particle/shape kit shared by hero, lightning and status effects.
  const fxKit = createFxKit(PIXI, layerParts, { reducedMotion });
  const zeusFx = createOdinFx(PIXI, layerParts, fxKit, { reducedMotion });
  const heroFx = createHeroFx(fxKit, { reducedMotion });
  const statusFx = createStatusFx(fxKit, { reducedMotion });

  // On-board tokens: transparent head-and-shoulders cutouts from the hero skin (skin.js).
  // A hero without a token keeps the circle portrait.
  for (const [id, hero] of game.heroesById) {
    if (hero.token) PIXI.Assets.load(hero.token).then((tex) => boardSprites.set(id, tex)).catch(() => {});
  }

  // Hero board figures (HERO_FIGURES, assets.js): a standing figure with idle, attack and
  // ultimate clips instead of the token. A sheet loads when its hero first appears on the board.
  // ?figures=off (or ?anim=off) keeps the tokens; ?figures=lab loads the unpacked anim lab frames
  // (public/td-local/anim-lab/, dev only) to try new clips before build-td-hero-figures packs them.
  // Figure data is in frame pixels: anchor (feet), bodyHeight, hand (where ranged shots start).
  const figureParams = new URLSearchParams(location.search);
  const figureParam = figureParams.get("figures");
  const FIGURES = figureParam !== "off" && figureParams.get("anim") !== "off";
  const animHeroes = new Map(); // hero id -> { clips: { idle, attack, ultimate }, anchor, bodyHeight, hand }
  const figureRequested = new Set();
  let labManifest = null;
  function requestFigure(heroId) {
    if (!FIGURES || figureRequested.has(heroId) || !HERO_FIGURES[heroId]) return;
    figureRequested.add(heroId);
    if (figureParam === "lab") {
      const labId = HERO_FIGURES[heroId].replace(/-v\d+$/, "");
      labManifest ??= fetch("/td-local/anim-lab/manifest.json", { cache: "no-store" }).then((r) => r.json());
      labManifest.then(async ({ characters }) => {
        const char = characters.find((c) => c.id === labId);
        if (!char?.clips.idle) return;
        const clips = {};
        for (const [name, clip] of Object.entries(char.clips)) clips[name] = await Promise.all(clip.frames.map((f) => PIXI.Assets.load(f)));
        animHeroes.set(heroId, { clips, anchor: [128, 247], bodyHeight: 225, hand: char.hand });
      }).catch((err) => console.warn(`anim lab frames for ${heroId} not loaded`, err));
      return;
    }
    PIXI.Assets.load(heroFigureUrl(heroId)).then((sheet) => {
      const td = sheet.data.td;
      animHeroes.set(heroId, { clips: sheet.animations, anchor: [td.anchor.x, td.anchor.y], bodyHeight: td.bodyHeight, hand: td.hand });
    }).catch(() => {}); // no sheet yet (not uploaded): the token stays
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


  // Full-body enemy sprites (scripts/build-td-enemy-sprites.mjs), preferred over
  // portraits when present. Missing files fail quietly and portraits stay in use.
  // Per-file version (R2 caches a year): bump a file here and in the build script's --version together.
  const fullBodyTextures = new Map(); // kind -> PIXI.Texture
  // Baphomet's sprite is boss-vN; other final bosses use boss-{id}-vN (the map's boss).
  const bossFile = bossSpriteFile(options.boss?.id);
  const bossSpriteSize = { lilith: 108 }[options.boss?.id] ?? 96;
  const fullSpriteSize = (kind) => (kind === "boss" ? bossSpriteSize : kind === "brute" ? 64 : ENEMY_ART[kind]?.size ?? 44);
  // Full-body sprites stand on the path: the build script leaves a 10% margin under the
  // figure, so anchor at 0.9 height and put the feet a little below the path centre line.
  const FULL_SPRITE_FEET = 6;
  // Flyers hover above a faint ground shadow and bob, so they read as airborne
  // (they pass over blockers; only platform heroes can hit them).
  const FLYER_LIFT = 18;
  const flyerBob = (unit) => (reducedMotion ? 0 : Math.sin(performance.now() / 260 + unit.entityId) * 3);
  // Enemy motion (M7): procedural motion on every full-body enemy sprite (animateEnemy) and,
  // where a kind has one, its animation sheet. Render-only and on game time, so pausing
  // freezes it. Off with reduced motion or ?anim=off.
  const urlParams = new URLSearchParams(location.search);
  const ENEMY_ANIM = !reducedMotion && urlParams.get("anim") !== "off";
  const DEATH_FALL = 0.5; // seconds an animated enemy takes to topple and fade
  const SPRITE_KINDS = ["grunt", "runner", "flyer", "archer", "brute"];
  // Same cache bust as hero thumbs: the lobby, boss plate and glossary show these files in
  // plain <img> tags, and a cached non-CORS copy makes WebGL reject the texture (the boss then
  // fell back to the blurry Kenney tile).
  const enemySpriteUrl = (file, version) => `${tdAsset(`enemies/sprites/${file}-${version}.webp`)}?${TEXTURE_CACHE_BUST}`;
  for (const [kind, file] of [...SPRITE_KINDS.map((k) => [k, k]), ["boss", bossFile], ["brood", "brood"]]) {
    PIXI.Assets.load(enemySpriteUrl(file, ENEMY_SPRITE_VERSIONS[file] ?? "v1"))
      .then((tex) => fullBodyTextures.set(kind, tex))
      .catch(() => {});
  }
  // M11 kinds borrow another sprite (ENEMY_ART), tinted in updateEnemyOverlays.
  for (const [kind, art] of Object.entries(ENEMY_ART)) {
    PIXI.Assets.load(enemySpriteUrl(art.file, art.version))
      .then((tex) => fullBodyTextures.set(kind, tex))
      .catch(() => {});
  }
  // Animation sheets (M7, enemySheetUrl): a kind with a sheet plays its clips instead of the
  // still sprite (animateEnemy picks the frame). The boss uses the map's boss sheet; kinds that
  // borrow a sprite (ENEMY_ART) use the sheet of exactly the still they borrow (tint and rim
  // glow still apply). ?sheets=off keeps the stills with procedural motion;
  // ?sheets=local&set=<name> loads an unreleased set from public/td-local/sheets/ in dev.
  const ENEMY_SHEETS = ENEMY_ANIM && urlParams.get("sheets") !== "off";
  const enemySheets = new Map(); // kind -> { anims: { idle, walk, attack, hurt, death }, td }
  if (ENEMY_SHEETS) {
    const localSet = urlParams.get("sheets") === "local" ? urlParams.get("set") ?? "painted" : null;
    const own = [...["grunt", "archer", "flyer", "runner", "brute", "brood"].map((k) => [k, k]), ["boss", bossFile]]
      .map(([kind, file]) => [kind, file, enemySpriteVersion(file)]);
    const borrowed = Object.entries(ENEMY_ART).map(([kind, art]) => [kind, art.file, art.version]);
    for (const [kind, file, version] of [...own, ...borrowed]) {
      const url = localSet ? `/td-local/sheets/${localSet}/${file}-${version}.json` : enemySheetUrl(file, version);
      if (!url) continue;
      PIXI.Assets.load(url).then((sheet) => {
        if (sheet.data.td?.pixelArt) sheet.textureSource.scaleMode = "nearest";
        enemySheets.set(kind, { anims: sheet.animations, td: sheet.data.td });
      }).catch(() => {});
    }
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
  // Background art (authored map terrain, async)
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
        if (tiltOn) {
          // First-cut scenery bands: the same terrain, stretched over the full canvas, blurred
          // and darkened. Final version: one authored band per theme.
          const band = new PIXI.Sprite(tex);
          band.width = 960;
          band.height = 540;
          band.filters = [new PIXI.BlurFilter({ strength: 7, quality: 3 })];
          layerBand.addChild(new PIXI.Graphics().rect(0, 0, 960, 540).fill(sceneArt.ground));
          layerBand.addChild(band);
          layerBand.addChild(new PIXI.Graphics().rect(0, 0, 960, 540).fill({ color: 0x000000, alpha: 0.3 }));
          // Soft seams where the ground meets the bands.
          const seam = new PIXI.Graphics();
          for (let i = 0; i < 24; i++) { // local ground space (the root squashes it)
            const a = 0.5 * (1 - i / 24) ** 2;
            seam.rect(0, i * 2, 960, 2).fill({ color: 0x000000, alpha: a });
            seam.rect(0, 540 - (i + 1) * 2, 960, 2).fill({ color: 0x000000, alpha: a });
          }
          layerBgTex.addChild(seam);
        }
      } catch (error) {
        console.warn(`${sceneArt.name} terrain could not load; using the stone ground fallback.`, error);
      }
      return;
    }
    // Dark overlay for gameplay readability
    const overlay = new PIXI.Graphics();
    overlay.rect(0, 0, 960, 540).fill({ color: 0x000000, alpha: 0.38 });
    layerBgTex.addChild(overlay);
  }

  // ------------------------------------------------------------------
  // Slots (semi-static: rebuild when hero placement changes)
  // ------------------------------------------------------------------
  let slotState = "";
  // Empty-tile mode: while a fallen hero is being redeployed (`game.uiDeploySlot`, set by
  // the deck) its tile type is "eligible" and the other type "dim"; with a full team
  // empty tiles go "idle" so they stay out of the way during combat.
  function slotMode(type) {
    const deploying = game.uiDeploySlot;
    if (deploying) return deploying === type ? "eligible" : "dim";
    return game.heroes.length >= game.deployCap() ? "idle" : "";
  }
  function buildSlots() {
    if (mapScene) {
      const next = `${game.heroes.map((h) => `${h.slotType}:${h.slotIndex}`).join(",")}|${game.focusedSlot?.type}:${game.focusedSlot?.index}|${slotMode("road")}${slotMode("platform")}`;
      if (next === slotState) return;
      slotState = next;
      layerSlots.removeChildren().forEach((child) => child.destroy({ children: true }));
    } else layerSlots.removeChildren();
    for (const type of ["road", "platform"]) {
      const mode = slotMode(type);
      (type === "road" ? game.map.roadSlots : game.map.platformSlots).forEach(([x, y], i) => {
        const occupied = game.heroes.some((h) => h.slotType === type && h.slotIndex === i);
        const focused  = game.focusedSlot?.type === type && game.focusedSlot.index === i;
        drawSlot(layerSlots, x, y, type, occupied, focused, mode);
      });
    }
    for (const [key, kind] of Object.entries(game.map.rings ?? {})) {
      const [type, index] = key.split(":");
      const pos = (type === "road" ? game.map.roadSlots : game.map.platformSlots)[Number(index)];
      if (pos) drawRingMark(layerSlots, pos[0], pos[1], kind);
    }
  }

  // Special ring marker (M16): a colored frame around the tile and a small badge.
  const RING_MARKS = { highground: 0xfacc15, shrine: 0x67e8f9, cursed: 0xf87171 };
  function drawRingMark(container, x, y, kind) {
    const color = RING_MARKS[kind] ?? 0xffffff;
    const g = new PIXI.Graphics();
    g.rect(x - 30, y - 30, 60, 60).stroke({ width: 2, color, alpha: 0.6 });
    const bx = x + 24, by = y - 26;
    g.circle(bx, by, 9).fill({ color: 0x13111c, alpha: 0.92 }).stroke({ width: 2, color });
    if (kind === "highground") g.moveTo(bx, by - 5).lineTo(bx + 5, by + 4).lineTo(bx - 5, by + 4).closePath().fill({ color });
    else if (kind === "shrine") g.moveTo(bx, by - 5).lineTo(bx + 4, by).lineTo(bx, by + 5).lineTo(bx - 4, by).closePath().fill({ color });
    else g.moveTo(bx - 4, by - 4).lineTo(bx + 4, by + 4).moveTo(bx + 4, by - 4).lineTo(bx - 4, by + 4).stroke({ width: 2.5, color, cap: "round" });
    container.addChild(g);
  }

  // Special-tile atmosphere is built once and animated by changing transforms only, so combat
  // never allocates display objects. Two parts: soft ground light under the slot art (spills past
  // the tile onto the map) and drifting motes / mist / wisps above the heroes, so the effect reads
  // on occupied tiles too. The hero standing on a special tile gets an underglow and a rim in the
  // tile's colour. Reduced motion keeps the static glow and rim and hides the moving parts.
  const specialTileFx = [];
  let softTexture = null;
  function getSoftTexture() {
    if (softTexture) return softTexture;
    const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.35, "rgba(255,255,255,0.55)");
    grad.addColorStop(0.7, "rgba(255,255,255,0.15)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    softTexture = PIXI.Texture.from(canvas);
    return softTexture;
  }
  function softSprite(color, width, height, alpha, blendMode = "add") {
    const sp = new PIXI.Sprite(getSoftTexture());
    sp.anchor.set(0.5);
    sp.tint = color;
    sp.width = width;
    sp.height = height;
    sp.alpha = alpha;
    sp.blendMode = blendMode;
    return sp;
  }

  function buildSpecialTileFx() {
    for (const [key, kind] of Object.entries(game.map.rings ?? {})) {
      const [type, index] = key.split(":");
      const pos = (type === "road" ? game.map.roadSlots : game.map.platformSlots)[Number(index)];
      if (!pos) continue;
      const color = RING_MARKS[kind] ?? 0xffffff;
      const blend = kind === "shrine" ? "screen" : "add";

      // Ground: wide soft bleed (about twice the tile), brighter core, crisp halo keeps the tile edge.
      const ground = new PIXI.Container();
      ground.position.set(pos[0], pos[1]);
      const bleed = softSprite(color, 164, 106, kind === "cursed" ? 0.5 : 0.42, blend);
      bleed.position.set(0, 5);
      const core = softSprite(color, 78, 50, 0.4, blend);
      core.position.set(0, 5);
      const halo = new PIXI.Graphics();
      halo.ellipse(0, 4, 34, 22).stroke({ color, width: kind === "shrine" ? 3 : 2, alpha: 0.42 });
      // Standing figures reach into the slot above, so the occupant glow lies flat at the feet.
      const underglow = softSprite(color, 116, FIGURES ? 40 : 116, 0.5, blend);
      underglow.visible = false;
      ground.addChild(bleed, core, halo, underglow);
      layerSlotAuras.addChild(ground);

      // Top: drifting parts and the occupant rim, drawn over the hero token.
      const top = new PIXI.Container();
      top.position.set(pos[0], pos[1]);
      const parts = [];
      const count = kind === "highground" ? 7 : kind === "shrine" ? 4 : 6;
      for (let i = 0; i < count; i += 1) {
        const part = new PIXI.Container();
        if (kind === "highground") {
          part.addChild(softSprite(color, 12, 12, 0.9));
          const spark = new PIXI.Graphics();
          spark.circle(0, 0, i % 2 ? 1.2 : 1.6).fill({ color: 0xfff7d6, alpha: 0.95 });
          if (i % 2 === 0) spark.moveTo(-3.5, 0).lineTo(3.5, 0).moveTo(0, -3.5).lineTo(0, 3.5).stroke({ color, width: 0.8, alpha: 0.7 });
          part.addChild(spark);
        } else if (kind === "shrine") {
          part.addChild(softSprite(color, 54 + i * 6, 26 + i * 3, 0.5, "screen"));
        } else {
          const wisp = new PIXI.Graphics();
          wisp.moveTo(-6, 5).bezierCurveTo(-1, -6, 5, 3, 3, -9).stroke({ color, width: 2, alpha: 0.6, cap: "round" });
          part.addChild(softSprite(color, 16, 20, 0.55), wisp, softSprite(0xffd0c0, 5, 5, 0.9));
          part.children[2].position.set(3, -9);
        }
        part.blendMode = blend;
        top.addChild(part);
        parts.push(part);
      }
      const rim = new PIXI.Graphics();
      if (kind === "highground") {
        // Three arcs that rotate: a slow gold shimmer around the token.
        for (let a = 0; a < 3; a += 1) {
          const start = (a * Math.PI * 2) / 3;
          rim.moveTo(Math.cos(start) * 32, Math.sin(start) * 32).arc(0, 0, 32, start, start + 1.3).stroke({ color, width: 2.5, alpha: 0.9, cap: "round" });
        }
      } else {
        rim.circle(0, 0, 32).stroke({ color, width: kind === "shrine" ? 2.5 : 2, alpha: 0.85 });
        if (kind === "shrine") rim.circle(0, 0, 36).stroke({ color, width: 1, alpha: 0.4 });
      }
      rim.blendMode = blend;
      // Figures: the rim becomes a ground ring at the feet (squashed wrapper, so the highground
      // arcs still rotate) under the units; tokens keep the rim drawn over the token.
      const rimHolder = new PIXI.Container();
      rimHolder.addChild(rim);
      rimHolder.visible = false;
      if (FIGURES) {
        rimHolder.scale.set(1, 0.32);
        ground.addChild(rimHolder);
      } else top.addChild(rimHolder);
      layerSlotAurasTop.addChild(top);

      specialTileFx.push({ kind, type, index: Number(index), x: pos[0], y: pos[1], bleed, core, halo, underglow, parts, rim, rimHolder });
    }
  }

  function updateSpecialTileFx(now) {
    const seconds = now / 1000;
    for (const fx of specialTileFx) {
      const unit = game.heroes.find((h) => h.slotType === fx.type && h.slotIndex === fx.index);
      const veil = unit && game.isVeiled?.(unit) ? 0.45 : 1;
      fx.underglow.visible = fx.rimHolder.visible = !!unit;
      if (unit) {
        const feet = FIGURES ? HERO_ANIM.feetY : 0;
        fx.underglow.position.set(unit.x - fx.x, unit.y - fx.y + feet);
        fx.rimHolder.position.set(unit.x - fx.x, unit.y - fx.y + feet);
      }
      if (reducedMotion) {
        fx.bleed.alpha = fx.kind === "cursed" ? 0.5 : 0.42;
        fx.core.alpha = 0.4;
        fx.halo.alpha = 0.72;
        fx.halo.scale.set(1);
        fx.underglow.alpha = 0.45 * veil;
        fx.rim.alpha = 0.8 * veil;
        fx.rim.scale.set(1);
        fx.rim.rotation = 0;
        for (const part of fx.parts) part.visible = false;
        continue;
      }
      const pulse = 0.5 + 0.5 * Math.sin(seconds * (fx.kind === "cursed" ? 2.1 : 1.45));
      fx.bleed.alpha = (fx.kind === "cursed" ? 0.38 : 0.32) + pulse * 0.18;
      fx.core.alpha = 0.3 + pulse * 0.2;
      fx.halo.alpha = 0.34 + pulse * 0.34;
      fx.halo.scale.set(0.94 + pulse * 0.11);
      if (unit) {
        fx.underglow.alpha = (0.4 + pulse * 0.25) * veil;
        if (fx.kind === "highground") {
          fx.rim.rotation = seconds * 0.9;
          fx.rim.alpha = (0.6 + pulse * 0.3) * veil;
          fx.rim.scale.set(1);
        } else if (fx.kind === "shrine") {
          fx.rim.rotation = 0;
          fx.rim.alpha = (0.5 + pulse * 0.4) * veil;
          fx.rim.scale.set(0.96 + pulse * 0.08);
        } else {
          // Uneven flicker: two out-of-phase sines, so it never settles into a steady beat.
          const flicker = 0.5 + 0.25 * Math.sin(seconds * 7.3) + 0.25 * Math.sin(seconds * 11.9 + 1.3);
          fx.rim.rotation = 0;
          fx.rim.alpha = (0.35 + flicker * 0.55) * veil;
          fx.rim.scale.set(1);
        }
      }
      // Parts over a hero stay fainter so the token and its level border remain readable.
      const over = unit ? 0.7 : 1;
      for (let i = 0; i < fx.parts.length; i += 1) {
        const part = fx.parts[i];
        part.visible = true;
        const phase = (seconds * (fx.kind === "shrine" ? 0.07 : fx.kind === "cursed" ? 0.16 : 0.2) + i / fx.parts.length) % 1;
        if (fx.kind === "highground") {
          part.position.set(Math.sin(seconds * 0.7 + i * 2.2) * (12 + i * 1.5), 18 - phase * 62);
          part.alpha = Math.sin(phase * Math.PI) * 0.85 * over;
          part.scale.set(0.75 + phase * 0.5);
        } else if (fx.kind === "shrine") {
          // Mist rolls around the tile and spills a little past its edge.
          const angle = seconds * 0.35 + (i / fx.parts.length) * Math.PI * 2;
          part.position.set(Math.cos(angle) * 26, 6 + Math.sin(angle) * 12 - Math.sin(phase * Math.PI) * 14);
          part.rotation = Math.sin(seconds * 0.3 + i) * 0.35;
          part.alpha = (0.28 + pulse * 0.14) * Math.sin(phase * Math.PI) * over + 0.08;
          part.scale.set(0.85 + phase * 0.4, 0.8 + phase * 0.3);
        } else {
          part.position.set(Math.sin(seconds * 1.15 + i * 1.7) * (12 + i * 1.5), 18 - phase * 56);
          part.rotation = Math.sin(seconds * 0.8 + i) * 0.22;
          part.alpha = Math.sin(phase * Math.PI) * 0.72 * over;
          part.scale.set(0.8 + phase * 0.4);
        }
      }
    }
  }

  // M24c: Supports with the passive attack aura pulse while it is active, and a slow wave
  // runs out to the aura's real edge (its range). Allies inside it, or under a timed ult
  // buff, carry a faint rim at their feet. Presentation only; the rule is supportAuraFor().
  const auraFx = new Map(); // support hero -> { glow, color, phase }
  const auraGfx = new PIXI.Graphics();
  layerSlotAuras.addChild(auraGfx);
  function updateAuraFx(now) {
    const seconds = now / 1000;
    auraGfx.clear();
    const live = new Set();
    for (const hero of game.heroes) {
      if (hero.ability !== "aura") continue;
      live.add(hero);
      let fx = auraFx.get(hero);
      if (!fx) {
        const color = PROFILES[hero.id]?.color ?? palette.gold;
        fx = { glow: softSprite(color, 96, 60, 0.4), color, phase: Math.random() * Math.PI * 2 };
        layerSlotAuras.addChild(fx.glow);
        auraFx.set(hero, fx);
      }
      const veil = game.isVeiled?.(hero) ? 0.45 : 1;
      const pulse = reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(seconds * 2.4 + fx.phase);
      // Figures: glow and ring lie flat at the feet instead of circling the body.
      fx.glow.position.set(hero.x, hero.y + (FIGURES ? HERO_ANIM.feetY : 6));
      fx.glow.width = 88 + pulse * 22;
      fx.glow.height = FIGURES ? 30 + pulse * 6 : 56 + pulse * 14;
      fx.glow.alpha = (0.32 + pulse * 0.3) * veil;
      const ringR = 31 + pulse * 4;
      if (FIGURES) auraGfx.ellipse(hero.x, hero.y + HERO_ANIM.feetY, ringR, ringR * 0.32).stroke({ color: fx.color, width: 2.5, alpha: (0.35 + pulse * 0.4) * veil });
      else auraGfx.circle(hero.x, hero.y, ringR).stroke({ color: fx.color, width: 2.5, alpha: (0.35 + pulse * 0.4) * veil });
      if (reducedMotion) {
        auraGfx.circle(hero.x, hero.y, hero.range).stroke({ color: fx.color, width: 1.5, alpha: 0.12 * veil });
      } else {
        const t = ((seconds + fx.phase) / 2.8) % 1;
        const r = 34 + (hero.range - 34) * (1 - (1 - t) * (1 - t));
        auraGfx.circle(hero.x, hero.y, r).stroke({ color: fx.color, width: 2, alpha: 0.3 * (1 - t) * veil });
      }
    }
    for (const [hero, fx] of auraFx) {
      if (live.has(hero)) continue;
      fx.glow.destroy();
      auraFx.delete(hero);
    }
    for (const ally of game.heroes) {
      const aura = game.supportAuraFor?.(ally);
      const timed = game.time < (ally.buffUntil || 0);
      if (!aura && !timed) continue;
      const color = timed ? palette.gold : auraFx.get(aura.source)?.color ?? palette.gold;
      const pulse = reducedMotion ? 0.5 : 0.5 + 0.5 * Math.sin(seconds * (timed ? 5 : 2.4));
      const veil = game.isVeiled?.(ally) ? 0.45 : 1;
      auraGfx.ellipse(ally.x, ally.y + 22, 26, 9).stroke({ color, width: timed ? 2.5 : 1.5, alpha: (timed ? 0.55 + pulse * 0.35 : 0.3 + pulse * 0.25) * veil });
    }
  }

  function drawSlot(container, x, y, type, occupied, highlighted, mode = "") {
    if (mapScene) { mapScene.drawSlot(container, x, y, type, occupied, highlighted, mode); return; }
    const before = container.children.length;
    drawFallbackSlot(container, x, y, type, occupied, highlighted);
    // Same placement states as the map-scene tiles, as a fade on the fallback art.
    const fade = highlighted || occupied ? 1 : mode === "dim" ? 0.3 : mode === "idle" ? 0.55 : 1;
    for (const child of container.children.slice(before)) child.alpha *= fade;
  }

  function drawFallbackSlot(container, x, y, type, occupied, highlighted) {
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
    if (placement) drawReach(placement.x, placement.y, placement.range, placement.type === "road" ? "gold" : "purple", game.patternAt?.(game.heroesById?.get(placement.heroId) ?? { id: placement.heroId, class: placement.heroClass }, placement.type, placement.index));
    const selected = game.heroes.find((u) => u.entityId === game.uiSelected);
    if (selected) drawReach(selected.x, selected.y, selected.range, selected.slotType === "road" ? "gold" : "purple", game.patternOf?.(selected));
  }

  // Prototype board (board.js): a hero with an attack pattern shows its cells in green,
  // like the placement view of grid tower defense games; everyone else keeps the ring.
  function drawReach(x, y, radius, color, pattern) {
    const board = boardOf(game.map);
    if (!pattern) { drawRangeRing(layerRanges, x, y, radius, color); return; }
    const g = new PIXI.Graphics();
    const size = board.cell - 6;
    for (const cell of patternCells(board, pattern, x, y)) {
      const [cx, cy] = cellCenter(board, cell);
      g.rect(cx - size / 2, cy - size / 2, size, size).fill({ color: 0x47d16b, alpha: 0.2 });
      g.rect(cx - size / 2, cy - size / 2, size, size).stroke({ width: 3, color: 0x6dff8e, alpha: 0.85 });
    }
    layerRanges.addChild(g);
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

  // Heroes never move on attack: the whole figure stays on its slot and only the attack
  // clip (or the token) plays. A full-body step needs its own animation, not a container shift.

  function syncHeroes() {
    const seen = new Set();
    for (const unit of game.heroes) {
      seen.add(unit.entityId);
      if (!heroSprites.has(unit.entityId)) {
        const container = buildHeroSprite(unit);
        heroSprites.set(unit.entityId, container);
        layerUnits.addChild(container);
      }
      const container = heroSprites.get(unit.entityId);
      updateHeroSprite(unit, container);
      // Lower heroes in front: standing figures reach into the slot above.
      if (container.zIndex !== Z_HERO + unit.y) container.zIndex = Z_HERO + unit.y;
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
    container._base = base;
    base.circle(0, 0, 25).fill({ color: 0x1b1530 });
    container.addChild(base);

    // Token ring (drawTokenRing); below the token so the head overlaps it.
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


    const ultBar = new PIXI.Graphics();
    container._ultBar = ultBar;
    container.addChild(ultBar);

    // HP bar lives in the container (not layerBars) so a lower hero's figure draws in front of it.
    const hpBar = new PIXI.Graphics();
    container._hpBar = hpBar;
    container.addChild(hpBar);

    // Collection level disc on the border at bottom-right (hidden without campaign data).
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

    // Board maps: unit sizes from tuning.board (heroScale), tuned by eye.
    container.scale.set(game.boardRules?.heroScale ?? 1);
    container.scale.y /= tiltK; // R18: stays upright under the squashed ground layers
    return container;
  }

  function updateHeroSprite(unit, container) {
    container.position.set(unit.x, unit.y);
    // Assassin veil (class ultimate): translucent while nothing can hurt it.
    container.alpha = game.isVeiled?.(unit) ? 0.45 : 1;

    // Swap texture in once it loads (token takes priority over the CDN portrait)
    if ((boardSprites.get(unit.id) ?? sprites.get(unit.id) ?? null) !== container._texRef) applyHeroTexture(container, unit.id);
    updateHeroAnim(unit, container);
    drawBar(container._hpBar.clear(), -24, 31, 48, unit.hpLeft / unit.hp, 0x82e89a);

    // Ultimate charge bar, directly below health.
    const ultBar = container._ultBar.clear();
    if (unit.ultClock !== undefined && unit.ultCooldown) {
      const pct = Math.min(1, unit.ultClock / unit.ultCooldown);
      drawBar(ultBar, -24, 36, 48, pct, palette.purple);
    }

    // Permanent collection level (R4): number disc plus a plain ring, redrawn only on change.
    const key = String(unit.campaignLevel ?? "");
    if (container._level !== key) {
      container._level = key;
      container._lvlText.text = key;
      container._lvlText.parent.visible = !!key;
      drawTokenRing(container._border);
    }
  }

  // Hero figure (see animHeroes). A basic attack resets attackClock upwards; casting the
  // ultimate drops ultClock, so both clips trigger without touching the sim. The attack clip
  // starts at startFrame so the hand thrust lines up with the shot. The art faces right.
  const HERO_ANIM = { height: 80, feetY: 22, fps: { idle: 8, attack: 16, ultimate: 12 }, startFrame: { attack: 2 } };
  // A figure point (frame px) relative to the slot centre, before mirroring.
  const figurePoint = (fig, [fx, fy]) => {
    const s = HERO_ANIM.height / fig.bodyHeight;
    return [(fx - fig.anchor[0]) * s, HERO_ANIM.feetY + (fy - fig.anchor[1]) * s];
  };
  const animShotSeen = new WeakSet();
  function moveAnimShotOrigins() {
    if (!animHeroes.size) return;
    for (const effect of game.effects) {
      if (animShotSeen.has(effect)) continue;
      animShotSeen.add(effect);
      const fig = effect.type === "shot" && animHeroes.get(effect.heroId);
      if (!fig?.hand) continue;
      const unit = game.heroes.find((h) => h.entityId === effect.sourceId);
      if (!unit) continue;
      const dir = Math.cos(unit.rotation || 0) < 0 ? -1 : 1;
      const [dx, dy] = figurePoint(fig, fig.hand);
      const hx = unit.x + dx * dir, hy = unit.y + dy;
      if (effect.x1 === unit.x && effect.y1 === unit.y) { effect.x1 = hx; effect.y1 = hy; }
      effect.sourceX = hx; effect.sourceY = hy;
    }
  }
  function updateHeroAnim(unit, container) {
    requestFigure(unit.id);
    const fig = animHeroes.get(unit.id);
    if (!fig) return;
    const clips = fig.clips;
    const now = performance.now();
    let sp = container._anim;
    if (!sp) {
      const first = clips.idle[0];
      sp = new PIXI.Sprite(first);
      sp.anchor.set(fig.anchor[0] / first.width, fig.anchor[1] / first.height);
      sp.position.set(0, HERO_ANIM.feetY);
      container.addChildAt(sp, container.getChildIndex(container._ultBar));
      container._anim = sp;
      // A figure stands on the slot: shadow only, no token disc or level ring behind it. The
      // number badge still shows the level; health and ultimate charge remain below it.
      container._base.clear().ellipse(0, HERO_ANIM.feetY, 22, 6).fill({ color: 0x000000, alpha: 0.45 });
      container._border.visible = false;
      container._animState = { clip: "idle", start: now, atk: unit.attackClock, ult: unit.ultClock };
    }
    container._img.visible = false;
    const st = container._animState;
    if (clips.ultimate && unit.ultClock < st.ult - 0.05) { st.clip = "ultimate"; st.start = now; }
    else if (clips.attack && st.clip !== "ultimate" && unit.attackClock > st.atk + 0.01) {
      st.clip = "attack"; st.start = now - HERO_ANIM.startFrame.attack / HERO_ANIM.fps.attack * 1000;
    }
    st.atk = unit.attackClock; st.ult = unit.ultClock;
    let frames = clips[st.clip];
    let i = Math.floor((now - st.start) / 1000 * HERO_ANIM.fps[st.clip]);
    if (st.clip !== "idle" && i >= frames.length) { st.clip = "idle"; st.start = now; frames = clips.idle; i = 0; }
    if (reducedMotion && st.clip === "idle") i = 0;
    sp.texture = frames[i % frames.length];
    // Mirror when the target is on the left.
    const scale = HERO_ANIM.height / fig.bodyHeight;
    sp.scale.set(Math.cos(unit.rotation || 0) < 0 ? -scale : scale, scale);
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

  // Gold ring around a hero token (battle ranks are gone since R4, so it no longer shows a level).
  function drawTokenRing(g) {
    g.clear();
    g.circle(0, 0, 26).stroke({ width: 2.5, color: palette.gold });
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
      const stale = existing && ((!existing._fullSprite && fullBodyTextures.has(unit.kind)) || (!existing._sheet && enemySheets.has(unit.kind)));
      if (!existing || stale) {
        const c = buildEnemyContainer(unit);
        c.tdEnemy = unit;
        c.zIndex = unit.flying ? Z_FLYER : 0;
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
      layerUnits.sortDirty = true; // re-apply zIndex: the boss stays above its escort, below the heroes
    }
    for (const [id, c] of enemyContainers) {
      if (!seen.has(id)) {
        if (isAuthored && c.tdEnemy?.exitReason === "base") {
          c.destroy({ children: true });
          enemyContainers.delete(id);
          continue;
        }
        // Move to dying pool for death-fade instead of instant removal
        dyingPool.set(id, { c, timer: c._anim ? DEATH_FALL : 0.3 });
        enemyContainers.delete(id);
      }
    }
  }

  function advanceDying(dt) {
    for (const [id, d] of dyingPool) {
      d.timer -= dt;
      if (d.c._sheet) {
        // Play the death clip, hold its last frame, fade at the end.
        const death = d.c._sheet.anims.death;
        const p = 1 - Math.max(0, d.timer) / DEATH_FALL;
        d.c._fullSprite.texture = death[Math.min(death.length - 1, Math.floor(p * 1.4 * death.length))];
        if (d.c._flying) d.c._fullSprite.y = FULL_SPRITE_FEET - FLYER_LIFT * (1 - Math.min(1, p * 1.4) ** 2); // falls to the ground
        d.c.alpha = Math.min(1, Math.max(0, d.timer) / (DEATH_FALL * 0.4));
      } else if (d.c._anim) {
        // Topple backwards (away from the facing), then fade.
        const sp = d.c._fullSprite;
        const p = 1 - Math.max(0, d.timer) / DEATH_FALL;
        sp.rotation = -Math.sign(sp.scale.x) * 1.45 * (1 - (1 - Math.min(1, p * 1.6)) ** 3);
        d.c._glint.alpha = 0;
        d.c.alpha = Math.min(1, Math.max(0, d.timer) / (DEATH_FALL * 0.5));
      } else d.c.alpha = Math.max(0, d.timer / 0.3);
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
    const sheet = enemySheets.get(kind);
    if (fullTex || sheet) {
      const size = fullSpriteSize(kind);
      const shadow = new PIXI.Graphics();
      shadow.ellipse(0, FULL_SPRITE_FEET, size * (unit.flying ? 0.22 : 0.3), size * (unit.flying ? 0.06 : 0.08)).fill({ color: 0x000000, alpha: unit.flying ? 0.25 : 0.45 });
      c.addChild(shadow);
      const sp = new PIXI.Sprite(sheet ? sheet.anims.idle[0] : fullTex);
      if (sheet) {
        // Feet point from the packer; the idle body's larger side gets the still sprite's ~80%.
        const frame = sheet.anims.idle[0];
        sp.anchor.set(sheet.td.anchor.x / frame.width, sheet.td.anchor.y / frame.height);
        sp.scale.set(size * 0.8 / Math.max(sheet.td.bodyHeight, sheet.td.bodyWidth ?? 0));
        c._sheet = sheet;
      } else {
        sp.anchor.set(0.5, 0.9);
        sp.width = size; sp.height = size;
      }
      sp.y = FULL_SPRITE_FEET - (unit.flying ? FLYER_LIFT : 0);
      c._fullSprite = sp;
      c._fullScale = sp.scale.x;
      c.addChild(sp);
      if (ENEMY_ANIM) {
        // Additive copy of the sprite: the white hit flash, shaped like the body.
        const glint = new PIXI.Sprite(sp.texture);
        glint.anchor.copyFrom(sp.anchor);
        glint.blendMode = "add";
        glint.alpha = 0;
        c._glint = glint;
        c.addChild(glint);
        c._anim = { phase: (unit.entityId * 1.7) % (Math.PI * 2), moving: 0, x: unit.x, y: unit.y, t: game.time,
          clock: unit.attackClock ?? 0, hp: unit.hp, atkAt: -9, hitAt: -9, target: null };
      }
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


    // Kenney tile sprite fallback (non-boss when portrait not yet loaded; boss when no hero image)
    const kenTex = enemyTextures.get(kind);
    if (kenTex && !fullTex && !sheet && !c._portraitSprite && !(kind === "boss" && c._bossSprite)) {
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

    // Ice shell while Freeze holds the enemy (M24c): faceted pale crystal.
    const ice = new PIXI.Graphics();
    const iceR = flashR * 1.15;
    const facets = [];
    for (let i = 0; i < 6; i++) { const a = -Math.PI / 2 + i * Math.PI / 3; facets.push(Math.cos(a) * iceR, Math.sin(a) * iceR * 1.1); }
    ice.poly(facets).fill({ color: 0xbfeaff, alpha: 0.45 }).stroke({ color: 0xeafaff, width: 2, alpha: 0.9 });
    ice.moveTo(-iceR * 0.5, -iceR * 0.2).lineTo(0, -iceR * 0.75).moveTo(iceR * 0.15, iceR * 0.5).lineTo(iceR * 0.55, iceR * 0.05)
      .stroke({ color: 0xffffff, width: 1.5, alpha: 0.8 });
    // Full-body sprites stand on their feet: lift the shell to the body's middle.
    if (fullTex || sheet) ice.y = FULL_SPRITE_FEET - fullSpriteSize(kind) * 0.4 - (unit.flying ? FLYER_LIFT : 0);
    ice.visible = false;
    c._iceOverlay = ice;
    c.addChild(ice);

    c.scale.set(enemyRenderScale(kind, game.boardRules));
    c.scale.y /= tiltK; // R18
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
    if (c._anim) {
      // Only turn around on clearly sideways steps, so a vertical stretch keeps the facing.
      const dx = unit.x - (c._lastX ?? unit.x), dy = unit.y - (c._lastY ?? unit.y);
      if (c._fullSprite && Math.abs(dx) > 0.01 && Math.abs(dx) > Math.abs(dy) * 0.5 && Math.hypot(dx, dy) < 8) {
        c._fullSprite.scale.x = Math.sign(dx) * Math.abs(c._fullScale);
      }
      c._lastX = unit.x; c._lastY = unit.y;
      c.position.set(unit.x, unit.y);
    } else {
      if (c._fullSprite && c._lastX !== undefined && Math.abs(unit.x - c._lastX) > 0.01) {
        c._fullSprite.scale.x = (unit.x < c._lastX ? -1 : 1) * c._fullScale;
      }
      c._lastX = unit.x;
      c.position.set(unit.x, unit.y);
    }
    if (unit.flying && c._fullSprite) c._fullSprite.y = FULL_SPRITE_FEET - FLYER_LIFT + flyerBob(unit);
    c.alpha = enemyRenderAlpha(unit);
    if (c._anim) animateEnemy(unit, c);
    if (c._fullSprite) return updateEnemyOverlays(unit, c);

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

  // Prototype enemy motion (ENEMY_ANIM). Reads only what the sim already exposes:
  // distance moved drives the walk cycle, a jump in attackClock is a swing, a real hp drop
  // (not a DoT tick) is a hit. Everything is an offset on the sprite, pivoting at the feet.
  function animateEnemy(unit, c) {
    const a = c._anim, sp = c._fullSprite, size = fullSpriteSize(unit.kind);
    const t = game.time;
    if (t === a.t) return; // paused: hold the pose
    a.t = t;
    const moved = Math.hypot(unit.x - a.x, unit.y - a.y);
    a.x = unit.x; a.y = unit.y;
    if (moved < size) a.phase += moved * Math.PI / (size * 0.45); // a step per ~half a body width
    a.moving = moved > 0.02 ? Math.min(1, a.moving + 0.2) : Math.max(0, a.moving - 0.1);
    const clock = unit.attackClock ?? 0;
    if (clock > a.clock + 0.01) { a.atkAt = t; a.target = unit.heldBy ?? null; }
    a.clock = clock;
    if (unit.hp < a.hp - unit.maxHp * 0.015 && t - a.hitAt > 0.15) a.hitAt = t;
    a.hp = unit.hp;

    // Face the hero being struck; otherwise keep the travel facing from updateEnemyContainer.
    if (a.target && t - a.atkAt < 0.4 && Math.abs(a.target.x - unit.x) > 1) sp.scale.x = Math.sign(a.target.x - unit.x) * Math.abs(sp.scale.x);
    const f = Math.sign(sp.scale.x) || 1;
    const held = (unit.petrifiedUntil ?? 0) > t || (unit.frozenUntil ?? 0) > t;
    if (c._sheet) {
      // Sheet kinds: the clips carry the motion, so only pick the frame (game time; the walk
      // follows distance moved, one cycle per ~0.9 body widths). Held enemies keep their frame.
      const { anims, td } = c._sheet;
      const at = t - a.atkAt, ht = t - a.hitAt;
      const play = (clip, since) => anims[clip][Math.min(anims[clip].length - 1, Math.floor(since * td.fps))];
      if (!held) {
        sp.texture = at < anims.attack.length / td.fps ? play("attack", at)
          : ht < anims.hurt.length / td.fps ? play("hurt", ht)
          : unit.flying ? anims.walk[Math.floor(t * td.fps + unit.entityId * 2.3) % anims.walk.length] // own wingbeat, regardless of pace
          : a.moving > 0.3 ? anims.walk[Math.floor(a.phase / (Math.PI * 2) * anims.walk.length) % anims.walk.length]
          : anims.idle[Math.floor(t * td.fps * 0.6) % anims.idle.length];
      }
      sp.position.set(0, FULL_SPRITE_FEET - (unit.flying ? FLYER_LIFT - flyerBob(unit) : 0));
      sp.rotation = 0;
      sp.scale.set(f * c._fullScale, c._fullScale);
      c._glint.alpha = 0; // the hurt clip has its own flash
      c._flying = unit.flying;
      return;
    }
    let rot = 0, dx = 0, dy = 0, sx = 1, sy = 1;
    if (!held) {
      if (unit.flying) {
        sy += Math.sin(t * 14 + unit.entityId) * 0.06; // wingbeat
      } else {
        const step = Math.sin(a.phase);
        dy -= Math.abs(step) * size * 0.05 * a.moving;          // bounce per step
        rot += (step * 0.07 + 0.06) * a.moving * f;             // waddle and lean into the walk
        const land = Math.cos(2 * a.phase) * 0.04 * a.moving;   // squash on landing
        sy += land; sx -= land * 0.6;
        sy += Math.sin(t * 2.4 + unit.entityId) * 0.02 * (1 - a.moving); // breathing at rest
      }
      const at = t - a.atkAt;
      if (at < 0.36) {
        const melee = Boolean(a.target);
        if (at < 0.14) { // wind up
          const k = at / 0.14;
          rot -= 0.14 * k * f; dx -= size * 0.05 * k * f;
        } else { // strike (melee lunges in, ranged recoils), easing back
          const e = (1 - (at - 0.14) / 0.22) ** 2;
          rot += (melee ? 0.22 : -0.05) * e * f; dx += size * (melee ? 0.14 : -0.06) * e * f; sx += 0.06 * e;
        }
      }
      const ht = t - a.hitAt;
      if (ht < 0.18) { // knocked back and shaking
        const k = 1 - ht / 0.18;
        dx += (Math.sin(ht * 90) * 0.04 - 0.03 * f) * size * k;
      }
    }
    const ht = t - a.hitAt;
    c._glint.alpha = ht < 0.1 ? 0.75 * (1 - ht / 0.1) : 0;

    const base = c._fullScale;
    sp.position.set(dx, FULL_SPRITE_FEET + dy - (unit.flying ? FLYER_LIFT - flyerBob(unit) : 0));
    sp.rotation = rot;
    sp.scale.set(f * base * sx, base * sy);
    c._glint.position.copyFrom(sp.position);
    c._glint.rotation = rot;
    c._glint.scale.copyFrom(sp.scale);
  }

  // Petrify tint and stone shell, hit flash.
  function updateEnemyOverlays(unit, c) {
    const petrified = (unit.petrifiedUntil ?? 0) > game.time;
    c._stoneOverlay.visible = petrified;
    const frozen = !petrified && (unit.frozenUntil ?? 0) > game.time;
    c._iceOverlay.visible = frozen;
    const stunned = !petrified && !frozen && (unit.stunnedUntil ?? 0) > game.time;
    const chilled = unit.chill > 0;
    const own = ENEMY_ART[unit.kind]?.tint ?? 0xffffff;
    for (const sprite of [c._fullSprite, c._portraitSprite, c._bossSprite, c._enemySprite]) {
      if (sprite) sprite.tint = petrified ? 0x9ba39f : frozen ? 0xa8e4ff : stunned ? 0xb9a8ff : chilled ? 0xd2f0ff : own;
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
      const enemyScale = enemyRenderScale(unit.kind, game.boardRules); // bars follow each sprite's scale
      const radius = (unit.kind === "boss" ? 26 : unit.kind === "brute" ? 17 : 12) * enemyScale;
      const top = ((fullBodyTextures.has(unit.kind) ? FULL_SPRITE_FEET - fullSpriteSize(unit.kind) * 0.8 - 4 : -radius / enemyScale - 9) - (unit.flying ? FLYER_LIFT : 0)) * enemyScale;
      drawBar(g, unit.x - radius, Math.max(2, unit.y + top), radius * 2, unit.hp / unit.maxHp, unit.kind === "boss" ? 0xff4d4d : 0xf4f1ff);
      // Baphomet's Defensive Stance (M18): a steel ring while it takes less damage.
      if ((unit.stanceUntil ?? 0) > game.time) g.circle(unit.x, unit.y - 20, 40).stroke({ width: 3, color: 0xcbd5e1, alpha: 0.75 });
      // Ochenta: Valor bar under the health bar, gold ring during the Eighty Count rush, red
      // ring while The Final Eight keeps him standing.
      const valor = unit.kind === "boss" ? game.bossTuning?.valor : null;
      if (valor) drawBar(g, unit.x - radius, Math.max(2, unit.y + top) + 5, radius * 2, (unit.valor ?? 0) / valor.max, 0xfbbf24);
      if ((unit.rallyUntil ?? 0) > game.time) g.circle(unit.x, unit.y - 20, 38).stroke({ width: 3, color: 0xfbbf24, alpha: 0.8 });
      if ((unit.finalEightUntil ?? 0) > game.time) g.circle(unit.x, unit.y - 20, 44).stroke({ width: 3, color: 0xef4444, alpha: 0.85 });
      // Status pips (M13) left to right above the health bar: Wet, Burn, Poison, Chill.
      let pip = 0;
      for (const [on, color] of [[game.isWet?.(unit), 0x60a5fa], [game.isBurning?.(unit), 0xfb923c], [game.isPoisoned?.(unit), 0x84cc16], [unit.chill > 0, 0xa5f3fc]]) {
        if (!on) continue;
        g.circle(unit.x - radius + 3 + pip * 7, Math.max(2, unit.y + top) - 5 - (unit.shieldMax ? 5 : 0), 2.6).fill({ color }).stroke({ width: 1, color: 0x07060c, alpha: 0.8 });
        pip += 1;
      }
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
      // Baphomet's mark (M18): a red reticle during the warning, a red ring while silenced.
      if ((unit.markedByBossUntil ?? 0) > game.time) {
        const r = 34;
        g.circle(unit.x, unit.y, r).stroke({ width: 2, color: 0xff4d4d, alpha: 0.9 });
        for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) g.moveTo(unit.x + dx * (r - 8), unit.y + dy * (r - 8)).lineTo(unit.x + dx * (r + 6), unit.y + dy * (r + 6)).stroke({ width: 3, color: 0xff4d4d, cap: "round" });
      }
      // Enemy archer aiming at a platform hero (targetsPlatforms): amber corner brackets.
      if (game.time - (unit.aimedAt ?? -Infinity) < 0.15) {
        const r = 30, arm = 9;
        for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          const cx = unit.x + sx * r, cy = unit.y + sy * r;
          g.moveTo(cx - sx * arm, cy).lineTo(cx, cy).lineTo(cx, cy - sy * arm);
        }
        g.stroke({ width: 3, color: 0xfbbf24, alpha: 0.95, cap: "round", join: "round" });
      }
      if (game.isSilenced?.(unit)) {
        const pulse = reducedMotion ? 0.8 : 0.55 + 0.35 * Math.sin(performance.now() / 120);
        statusRing(g, unit, 0xff4d4d, pulse);
      }
      // Hexed (Hexer): a pulsing violet ring while the hero cannot act.
      if (game.isHexed?.(unit)) {
        const pulse = reducedMotion ? 0.8 : 0.55 + 0.35 * Math.sin(performance.now() / 120);
        statusRing(g, unit, 0xc084fc, pulse);
      }
    }
    layerBars.addChild(g);
  }

  // Figures get a flat ring at the feet so it does not cross the body or the hero above.
  function statusRing(g, unit, color, alpha) {
    if (animHeroes.has(unit.id)) g.ellipse(unit.x, unit.y + HERO_ANIM.feetY, 33, 11).stroke({ width: 3, color, alpha });
    else g.circle(unit.x, unit.y, 33).stroke({ width: 3, color, alpha });
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
  const damageNumbers = [];
  const seenEffects = new WeakSet();
  let particleClock = null;
  let fxClock = 0;

  // Status visuals (M24c): where an enemy's body is, and which statuses it shows.
  function enemyBody(unit) {
    const full = fullBodyTextures.has(unit.kind);
    const size = full ? fullSpriteSize(unit.kind) : unit.kind === "boss" ? 52 : unit.kind === "brute" ? 40 : 28;
    const feet = unit.y + (full ? FULL_SPRITE_FEET : size * 0.45) - (unit.flying ? FLYER_LIFT : 0);
    return { x: unit.x, y: feet, top: feet - size * 0.8, width: size * 0.6 };
  }
  function enemyStatuses(unit) {
    const list = [];
    if (game.isPoisoned?.(unit)) list.push("poison");
    if (game.isBurning?.(unit)) list.push("burn");
    if ((unit.frozenUntil ?? 0) > game.time) list.push("frozen");
    else if (unit.chill > 0) list.push("chill");
    if (game.isWet?.(unit)) list.push("wet");
    return list;
  }

  function spawnDamageNumber(effect) {
    const amount = Math.max(1, effect.amount);
    // Damage-over-time ticks arrive faster than the popup fades. Reuse one popup per
    // enemy so a moving target does not leave a dotted line of numbers behind it.
    const existingDot = effect.dot && damageNumbers.find((popup) => popup.dot && popup.enemyId === effect.enemyId);
    if (existingDot) {
      existingDot.amount += amount;
      existingDot.text.text = shortNumber(existingDot.amount);
      existingDot.life = existingDot.maxLife;
      return;
    }
    const stack = damageNumbers.reduce((count, popup) => count + (popup.enemyId === effect.enemyId ? 1 : 0), 0);
    const body = enemyBody({ kind: effect.enemyKind, x: effect.x, y: effect.y, flying: effect.flying });
    const text = new PIXI.Text({
      text: shortNumber(amount),
      style: {
        fill: effect.crit ? 0xffe27a : effect.shielded ? 0x9de7ff : 0xf8f5ff,
        fontFamily: "system-ui, sans-serif",
        fontSize: effect.crit ? 15 : 12,
        fontWeight: effect.crit ? "600" : "400",
        stroke: { color: 0x160f20, width: 3, join: "round" },
      },
    });
    text.anchor.set(0.5, 1);
    text.scale.y = 1 / tiltK; // R18: numbers stay upright
    const offsetX = ((stack % 3) - 1) * 8;
    text.position.set(effect.x + offsetX, body.top - 3 - Math.min(stack, 3) * 4);
    layerNumbers.addChild(text);
    damageNumbers.push({ text, enemyId: effect.enemyId, y: text.y, offsetX, amount, dot: !!effect.dot, life: effect.life, maxLife: 0.75 });
  }

  function advanceDamageNumbers(dt) {
    for (let i = damageNumbers.length - 1; i >= 0; i--) {
      const popup = damageNumbers[i];
      popup.life -= dt;
      if (popup.life <= 0) {
        layerNumbers.removeChild(popup.text);
        popup.text.destroy();
        damageNumbers.splice(i, 1);
        continue;
      }
      if (popup.dot) {
        const enemy = game.enemies.find((unit) => unit.entityId === popup.enemyId);
        if (enemy) {
          const body = enemyBody(enemy);
          popup.text.x = enemy.x + popup.offsetX;
          popup.y = body.top - 3;
        }
      }
      const progress = 1 - popup.life / popup.maxLife;
      popup.text.y = popup.y - (reducedMotion ? 8 : 24) * progress;
      popup.text.alpha = Math.min(1, popup.life * 5) * Math.min(1, progress * 8 + 0.35);
    }
  }

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

  // Travelling shot for effects without a hero profile, mostly enemy archers and Hexers
  // hitting road heroes: a small dark arrow with a streak, never an instant line.
  function launchBolt(effect) {
    const { x1, y1, x2, y2 } = effect;
    const life = Math.min(0.25, Math.max(0.06, Math.hypot(x2 - x1, y2 - y1) / 800));
    const enemyShot = effect.color === "red";
    fxKit.spawn(enemyShot ? "arrow" : "glow", x1, y1 - 10, { tint: enemyShot ? 0xffb4a8 : TINTS[effect.color] ?? TINTS.gold, size: enemyShot ? 18 : 10, life, add: !enemyShot, hold: 0.9,
      path: { x1, y1: y1 - 10, x2, y2: y2 - 6, arc: 8 }, data: { acc: 0 },
      onStep: (p, dt) => {
        p.data.acc += dt;
        if (p.data.acc < 0.02) return;
        p.data.acc = 0;
        fxKit.spawn("streak", p.x - Math.cos(p.rot) * 8, p.y - Math.sin(p.rot) * 8, { tint: enemyShot ? 0xff6b6b : TINTS.gold, size: 18, sizeEnd: 10, life: 0.12, rot: p.rot, alpha: 0.6, hold: 0, optional: true });
      },
      onEnd: (p) => fxKit.spawn("glow", p.x, p.y, { tint: enemyShot ? 0xff6b6b : TINTS.white, size: 18, sizeEnd: 28, life: 0.16, hold: 0.1, optional: true }) });
  }

  // Hex: a curse orb spirals from the caster to the hero, then twists around it.
  function launchCurse(effect) {
    const tint = effect.color === "red" ? TINTS.red : TINTS.purple;
    const path = { x1: effect.x1, y1: effect.y1 - 12, x2: effect.x2, y2: effect.y2 - 8, arc: 20, helix: 10, helixFreq: 2 };
    fxKit.spawn("glow", effect.x1, effect.y1, { tint, size: 16, life: 0.3, hold: 0.9, path,
      onEnd: () => spawnParticle("twirl_01", effect.x2, effect.y2, { size: 64, life: 0.6, vr: 5, tint: effect.color === "red" ? "red" : "purple" }) });
    for (let i = 0; i < 2; i++) fxKit.spawn("dot", effect.x1, effect.y1, { tint: 0xffffff, size: 6, life: 0.3, path: { ...path, phase: Math.PI * (i + 0.5) } });
  }

  function spawnParticles(effect) {
    if (effect.type === "damageNumber") return spawnDamageNumber(effect);
    if (effect.type === "thunderStrike" || effect.type === "shieldUp" || effect.type === "shieldBlock") return spawnPowerParticles(effect);
    if (hasHeroFx(effect)) return;
    if (effect.heroVariant === "chain_lightning" && ["shot", "hit", "ult"].includes(effect.type)) return;
    // Travelling replacements for the old tracer lines; the kit tones them down for reduced motion.
    if (effect.type === "shot") return launchBolt(effect);
    if (effect.type === "hex") return launchCurse(effect);
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
    if (effect.type === "splash") {
      spawnParticle("magic_01", effect.x, effect.y, { size: effect.radius * 2, life: 0.35, tint: effect.color === "green" ? "green" : "purple" });
    } else if (effect.type === "reaction") {
      const tint = { steam: "white", freeze: "white", blight: "green", conduct: "purple", harvest: "purple" }[effect.reaction] ?? "white";
      spawnParticle(effect.reaction === "freeze" ? "star_03" : "twirl_01", effect.x, effect.y, { size: Math.max(40, effect.radius * 1.6), life: 0.6, vr: 4, tint });
      if (effect.reaction === "steam") for (let i = 0; i < 4; i++) spawnParticle("light_01", effect.x + rand(30), effect.y, { size: 34, life: 0.8, vy: -50, tint: "white" });
    } else if (effect.type === "shieldBreak") {
      for (let i = 0; i < 5; i++) spawnParticle("spark_04", effect.x, effect.y, { size: 16, life: 0.4, vx: rand(180), vy: rand(180), tint: "white" });
    } else if (effect.type === "cleave") {
      spawnParticle("slash_04", effect.x, effect.y, { size: effect.radius * 1.6, life: 0.3, rot: Math.random() * Math.PI * 2, tint: "gold" });
    } else if (effect.type === "dash") {
      for (let i = 1; i <= 4; i++) {
        const point = fxKit.pathPoint({ x1: effect.x1, y1: effect.y1, x2: effect.x2, y2: effect.y2, bend: 20 }, i / 5, { x: 0, y: 0, angle: 0 });
        fxKit.spawn("glow", point.x, point.y, { tint: TINTS.purple, size: 24 - i * 2, sizeEnd: 8, life: 0.3, delay: i * 0.03, alpha: 0.6 });
      }
    } else if (effect.type === "beam") {
      for (let i = 0; i < 4; i++) fxKit.spawn("glow", effect.x1, effect.y1, { tint: TINTS.green, size: 9, life: 0.28, delay: i * 0.05,
        path: { x1: effect.x1, y1: effect.y1, x2: effect.x2, y2: effect.y2, arc: 16, bend: 20 } });
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

  // Divine Interventions (R5): a bolt that shakes the board, a dome going up, a blocked leak.
  function spawnPowerParticles(effect) {
    const rand = (s) => (Math.random() - 0.5) * s;
    if (effect.type === "thunderStrike") {
      startImpact({ shake: 6, vignette: 0 });
      if (reducedMotion) return;
      spawnParticle("flare_01", effect.x, effect.y, { size: 150, life: 0.35, tint: "white" });
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2 + Math.random() * 0.4;
        spawnParticle("spark_04", effect.x, effect.y, { size: 18, life: 0.5, vx: Math.cos(angle) * 240, vy: Math.sin(angle) * 240, tint: i % 2 ? "blue" : "white" });
      }
    } else if (effect.type === "shieldUp") {
      if (reducedMotion) return;
      spawnParticle("flare_01", effect.x, effect.y, { size: 170, life: 0.5, tint: "blue" });
      for (let i = 0; i < 6; i++) spawnParticle("star_03", effect.x + rand(120), effect.y + rand(60), { size: 22, life: 0.7, vy: -40, tint: "gold" });
    } else if (effect.type === "shieldBlock") {
      if (reducedMotion) return;
      spawnParticle("star_03", effect.x, effect.y - 30, { size: 46, life: 0.5, vr: 4, tint: "blue" });
      const text = new PIXI.Text({ text: "Blocked", style: { fill: 0x9de7ff, fontSize: 15, fontWeight: "800", stroke: { color: 0x07060c, width: 4 } } });
      text.anchor.set(0.5);
      text.position.set(effect.x, effect.y - 48);
      layerParts.addChild(text);
      particles.push({ sp: text, vx: 0, vy: -36, vr: 0, life: 0.9, maxLife: 0.9 });
    }
  }

  // A jagged bolt from above the board down to the strike point, built once per strike.
  function boltPoints(effect) {
    if (effect._bolt) return effect._bolt;
    const points = [];
    const top = { x: effect.x + (Math.random() - 0.5) * 80, y: -20 };
    const steps = 9;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const jitter = i === 0 || i === steps ? 0 : (Math.random() - 0.5) * 34;
      points.push([top.x + (effect.x - top.x) * t + jitter, top.y + (effect.y - top.y) * t]);
    }
    effect._bolt = points;
    return points;
  }

  // Thunderfall area: the board cells it covers (sim.thunderArea), or a circle on classic maps.
  function drawArea(g, target, fill, stroke) {
    if (target.area?.cells?.length) {
      const size = target.area.cell;
      for (const [x, y] of target.area.cells) g.rect(x, y, size, size).fill(fill);
      if (stroke) for (const [x, y] of target.area.cells) g.rect(x + 1, y + 1, size - 2, size - 2).stroke(stroke);
    } else {
      g.circle(target.x, target.y, target.radius).fill(fill);
      if (stroke) g.circle(target.x, target.y, target.radius).stroke(stroke);
    }
  }

  // R5 power visuals drawn every frame on layerFx; true when the effect was handled.
  function drawPowerEffect(effect, g, now) {
    if (effect.type === "thunderWarn") {
      // Target tiles pulse blue-white until the bolt lands.
      const pulse = 0.5 + 0.5 * Math.sin(now / 70);
      drawArea(g, effect, { color: TINTS.blue, alpha: 0.12 + pulse * 0.18 }, { width: 3, color: TINTS.white, alpha: 0.5 + pulse * 0.5 });
      return true;
    }
    if (effect.type === "thunderStrike") {
      const fade = Math.min(1, effect.life / 0.7);
      drawArea(g, effect, { color: TINTS.white, alpha: fade * 0.45 });
      // The bolt itself is only visible for the first moments of the strike.
      if (effect.life > 0.4) {
        const points = boltPoints(effect);
        const alpha = Math.min(1, (effect.life - 0.4) / 0.15);
        for (const [width, color, a] of [[12, TINTS.blue, 0.35], [6, TINTS.blue, 0.8], [2.5, TINTS.white, 1]]) {
          g.moveTo(points[0][0], points[0][1]);
          for (const [px, py] of points.slice(1)) g.lineTo(px, py);
          g.stroke({ width, color, alpha: alpha * a, cap: "round", join: "round" });
        }
        if (GlowFilter && !reducedMotion) g.filters = [new GlowFilter({ distance: 16, outerStrength: 2, color: TINTS.blue })];
      }
      return true;
    }
    if (effect.type === "shieldUp") {
      // Dome over the base, breathing while it holds and fading in its last second.
      const fade = Math.min(1, effect.life);
      const pulse = 0.5 + 0.5 * Math.sin(now / 260);
      const r = effect.radius + pulse * 4;
      g.ellipse(effect.x, effect.y, r * 1.25, r).fill({ color: TINTS.blue, alpha: fade * (0.1 + pulse * 0.06) });
      g.ellipse(effect.x, effect.y, r * 1.25, r).stroke({ width: 3, color: TINTS.blue, alpha: fade * 0.9 });
      g.ellipse(effect.x, effect.y, r * 1.25 + 5, r + 5).stroke({ width: 1.5, color: TINTS.gold, alpha: fade * 0.7 });
      return true;
    }
    if (effect.type === "shieldBlock") {
      const t = 1 - effect.life / 0.8;
      g.ellipse(effect.x, effect.y, 70 + t * 40, 56 + t * 32).stroke({ width: 4, color: TINTS.white, alpha: (1 - t) * 0.9 });
      return true;
    }
    return false;
  }

  // Thunderfall aim preview (game.uiAim, set while the power is armed): the tiles the bolt would hit.
  function drawAimPreview(now) {
    const aim = game.uiAim;
    if (!aim) return;
    const g = new PIXI.Graphics();
    const pulse = 0.5 + 0.5 * Math.sin(now / 160);
    drawArea(g, aim, { color: TINTS.blue, alpha: 0.1 + pulse * 0.08 }, { width: 2, color: TINTS.blue, alpha: 0.9 });
    layerFx.addChild(g);
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
    // Kit effects run on game time: frozen while paused, faster at higher game speed,
    // wall time between waves so tails finish. A restarted run clears them.
    if (game.time < fxClock || (game.time === 0 && !game.heroes.length && fxKit.count())) { fxKit.clear(); heroFx.reset(); }
    const fxDt = Math.min(0.1, game.paused ? 0 : game.time > fxClock ? game.time - fxClock : game.running ? 0 : dt);
    fxClock = game.time;
    moveAnimShotOrigins();
    heroFx.update(game);
    zeusFx.update(game.effects);
    statusFx.update(game.enemies, fxDt, enemyBody, enemyStatuses);
    fxKit.update(fxDt);
    advanceDamageNumbers(fxDt);

    // Draw shot tracers and hit rings as transient Graphics on layerFx
    layerFx.removeChildren();
    for (const effect of game.effects) {
      if (effect.type === "damageNumber") continue;
      if (effect.type === "baseHit") continue; // physical sanctuary owns its impact feedback
      if (["thunderWarn", "thunderStrike", "shieldUp", "shieldBlock"].includes(effect.type)) {
        const pg = new PIXI.Graphics();
        drawPowerEffect(effect, pg, now);
        layerFx.addChild(pg);
        continue;
      }
      if (effect.type === "veil") continue; // the hero token turns translucent instead (particles mark the start)
      if (hasHeroFx(effect)) continue;
      if (effect.heroVariant === "chain_lightning" && ["shot", "hit", "ult"].includes(effect.type)) continue;
      // M24c: shots, hexes, dashes and heal beams travel as kit particles (spawnParticles), no tracer lines.
      if (effect.type === "shot" || effect.type === "hex" || effect.type === "dash" || effect.type === "beam") continue;
      const color = effect.color === "purple" ? palette.purple : effect.color === "red" ? 0xff6b6b : effect.color === "green" ? TINTS.green : effect.color === "white" ? TINTS.white : palette.gold;
      const g = new PIXI.Graphics();
      g.setStrokeStyle({ width: 2, color, alpha: reducedMotion ? 0.5 : Math.min(1, effect.life * 6) });
      const fade = reducedMotion ? 0.5 : Math.min(1, effect.life * 4);
      if (effect.type === "splash" || effect.type === "cleave" || effect.type === "hold") {
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
    drawAimPreview(now);
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
    updateSpecialTileFx(now);
    updateAuraFx(now);
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
    const [spawnTexture, baseTexture, roadTexture] = await Promise.all([
      load("spawn", "stone gate"), load("base", "sanctuary"), load("road", "stone paving"),
      buildBgTexture(),
    ]);
    mapScene = createMapScene(PIXI, game, { ground: layerBg, structures: layerStructures, foreground: layerForeground, overlay: layerHud, reducedMotion, tilt: tiltOn ? { k: tiltK, units: layerUnits, zHero: Z_HERO } : null, textures: { spawn: spawnTexture, base: baseTexture, road: roadTexture } });
  } else buildBgTexture();
  buildBg();
  buildPortals();
  buildSpecialTileFx();

  let destroyed = false;
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    mapScene?.destroy?.();
    // Removes the canvas from the DOM; shared textures stay in the Assets cache for the next run.
    app.destroy({ removeView: true }, { children: true });
    softTexture?.destroy(true);
  }

  return { draw, resize, destroy, sprites, particles, fxCount: () => fxKit.count() };
}

// ------------------------------------------------------------------
// Coordinate helpers (unchanged API, work with PixiJS canvas element)
// ------------------------------------------------------------------
export function canvasPoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return { x: (event.clientX - rect.left) * 960 / rect.width, y: ((event.clientY - rect.top) * 540 / rect.height - tiltView.offsetY) / tiltView.k };
}

// A point inside a drawn tile (56 px square, a board cell on a prototype board) always picks
// that tile, so the corners of staggered tiles at road bends are not stolen by a neighbour
// whose centre is closer.
const TILE_HALF = 28;
export function nearestSlot(map, point, maxDistance = 38) {
  const board = boardOf(map);
  const half = board ? board.cell / 2 : TILE_HALF;
  let best = null, bestInside = false;
  for (const type of ["road", "platform"]) {
    const slots = type === "road" ? map.roadSlots : map.platformSlots;
    slots.forEach(([x, y], index) => {
      const distance = Math.hypot(point.x - x, point.y - y);
      const inside = Math.abs(point.x - x) <= half && Math.abs(point.y - y) <= half;
      if (!inside && distance > maxDistance) return;
      if (!best || (inside && !bestInside) || (inside === bestInside && distance < best.distance)) {
        best = { type, index, distance };
        bestInside = inside;
      }
    });
  }
  return best;
}
