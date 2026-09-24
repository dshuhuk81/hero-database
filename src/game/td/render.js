// PixiJS v8 renderer for the tower defense game.
// Async: callers must await createRenderer(...).
// Logical space is fixed at 960x540; stage.scale maps it to the canvas CSS size.

const PIXI_CDN = "https://cdn.jsdelivr.net/npm/pixi.js@8/dist/pixi.mjs";
const GLOW_CDN = "https://cdn.jsdelivr.net/npm/@pixi/filter-glow@5/dist/filter-glow.mjs";

const COLORS = {
  grunt:  0xaaa4bb,
  runner: 0x78ddff,
  flyer:  0xc4b5fd,
  archer: 0x82e89a,
  brute:  0xfb923c,
  boss:   0xff4d4d,
};

const THEMES = {
  moonlit: { glow: 0xa855f7, trail: 0xfacc15 },
  verdant: { glow: 0x82e898, trail: 0x82e898 },
};

const TINTS = { gold: 0xfacc15, purple: 0xa855f7, green: 0x82e89a, red: 0xff6b6b };

export async function createRenderer(canvas, game, options = {}) {
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
  const layerBg     = new PIXI.Container(); // path, grid
  const layerSlots  = new PIXI.Container(); // slot rings
  const layerRanges = new PIXI.Container(); // range preview rings
  const layerLinks  = new PIXI.Container(); // aura + synergy links
  const layerUnits  = new PIXI.Container(); // enemies + heroes
  const layerBars   = new PIXI.Container(); // hp bars (redrawn each frame)
  const layerFx     = new PIXI.Container(); // shot tracers, hit rings
  const layerParts  = new PIXI.Container(); // particles
  const layerHud    = new PIXI.Container(); // portals, labels
  for (const l of [layerBg, layerSlots, layerRanges, layerLinks, layerUnits, layerBars, layerFx, layerParts, layerHud]) {
    stage.addChild(l);
  }

  // ------------------------------------------------------------------
  // Sprite cache: hero thumbnails + boss + FX textures
  // ------------------------------------------------------------------
  const sprites  = new Map(); // id -> PIXI.Texture
  const fxTex    = new Map(); // name -> PIXI.Texture

  async function loadTexture(key, url) {
    try {
      const tex = await PIXI.Assets.load(url);
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
    PIXI.Assets.load(`/td/fx/${name}.png`)
      .then((tex) => fxTex.set(name, tex))
      .catch(() => {});
  }

  // ------------------------------------------------------------------
  // Resize: scale stage so 960x540 logical coords fill the canvas CSS box
  // ------------------------------------------------------------------
  function resize() {
    const w = canvas.clientWidth || 960;
    const h = w * 0.5625;
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
    layerBg.removeChildren();
    const g = new PIXI.Graphics();

    // Background fill
    g.rect(0, 0, 960, 540).fill({ color: palette.surface });

    // Theme radial glow (approximated as a large soft circle)
    const theme = THEMES[game.map.theme] || THEMES.moonlit;
    const glow = new PIXI.Graphics();
    glow.circle(480, 270, 520).fill({ color: theme.glow, alpha: 0.07 });
    layerBg.addChild(glow);

    // Grid
    const grid = new PIXI.Graphics();
    grid.setStrokeStyle({ width: 1, color: 0xffffff, alpha: 0.025 });
    for (let x = 0; x <= 960; x += 48) { grid.moveTo(x, 0).lineTo(x, 540); }
    for (let y = 0; y <= 540; y += 48) { grid.moveTo(0, y).lineTo(960, y); }
    grid.stroke();
    layerBg.addChild(g);
    layerBg.addChild(grid);

    // Path
    const pathLine = new PIXI.Graphics();
    const pts = game.map.path;
    // Wide ghost track
    pathLine.setStrokeStyle({ width: 72, color: 0xffffff, alpha: 0.055, cap: "round", join: "round" });
    pathLine.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) pathLine.lineTo(pts[i][0], pts[i][1]);
    pathLine.stroke();
    // Thin accent trail
    const trail = new PIXI.Graphics();
    trail.setStrokeStyle({ width: 3, color: theme.trail, alpha: 0.13, cap: "round", join: "round" });
    trail.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) trail.lineTo(pts[i][0], pts[i][1]);
    trail.stroke();
    layerBg.addChild(pathLine);
    layerBg.addChild(trail);
  }

  // ------------------------------------------------------------------
  // Slots (semi-static: rebuild when hero placement changes)
  // ------------------------------------------------------------------
  function buildSlots() {
    layerSlots.removeChildren();
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
    const g = new PIXI.Graphics();
    const radius = type === "road" ? 27 : 24;
    const color  = type === "road" ? palette.gold : palette.purple;
    const fillAlpha = occupied ? 0.08 : type === "road" ? 0.16 : 0.18;
    g.circle(x, y, radius).fill({ color, alpha: fillAlpha });
    const borderColor = highlighted ? 0xffffff : occupied ? 0xffffff : color;
    const borderAlpha = highlighted ? 1 : occupied ? 0.08 : 1;
    const borderWidth = highlighted ? 4 : 2;
    if (!occupied && !highlighted) {
      // dashed border via alternating arcs is expensive; use a low-alpha solid ring instead
      g.setStrokeStyle({ width: borderWidth, color: borderColor, alpha: 0.5 });
    } else {
      g.setStrokeStyle({ width: borderWidth, color: borderColor, alpha: borderAlpha });
    }
    g.circle(x, y, radius).stroke();
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
    g.circle(x, y, radius).fill({ color: c, alpha: 0.07 });
    g.setStrokeStyle({ width: 2, color: c, alpha: 0.45 });
    g.circle(x, y, radius).stroke();
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
    const entrance = game.map.path[0];
    const exit     = game.map.path.at(-1);
    drawPortal(layerHud, entrance[0], entrance[1], 0x82e89a, "ENTRANCE");
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

    const mask = new PIXI.Graphics();
    mask.circle(0, 0, 25).fill(0xffffff);
    container.addChild(mask);

    const tex = sprites.get(unit.id);
    const sp = new PIXI.Sprite(tex ?? PIXI.Texture.EMPTY);
    sp.anchor.set(0.5);
    sp.width = 50; sp.height = 50;
    sp.mask = mask;
    container.addChild(sp);
    container._img = sp;

    const border = new PIXI.Graphics();
    border.setStrokeStyle({ width: 2, color: palette.gold });
    border.circle(0, 0, 26).stroke();
    container.addChild(border);

    const facing = new PIXI.Graphics();
    container._facing = facing;
    container.addChild(facing);

    const ultRing = new PIXI.Graphics();
    container._ultRing = ultRing;
    container.addChild(ultRing);

    const lvlText = new PIXI.Text({ text: "", style: { fill: palette.gold, fontSize: 11, fontWeight: "700" } });
    lvlText.anchor.set(0.5, 1);
    lvlText.position.set(0, -36);
    container._lvlText = lvlText;
    container.addChild(lvlText);

    return container;
  }

  function updateHeroSprite(unit, container) {
    container.position.set(unit.x, unit.y);

    // Swap texture if it loaded after construction
    const tex = sprites.get(unit.id);
    if (tex && container._img.texture === PIXI.Texture.EMPTY) {
      container._img.texture = tex;
      // Rebuild circular mask for the new sprite
      const mask = container.children.find((c) => c instanceof PIXI.Graphics && c !== container._facing && c !== container._ultRing);
      if (mask) { mask.clear(); mask.circle(0, 0, 25).fill(0xffffff); }
    }
    if (!tex) { container._img.tint = palette.purple; }

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

    // Level badge
    container._lvlText.text = (unit.level || 1) > 1 ? `Lv${unit.level}` : "";
  }

  // ------------------------------------------------------------------
  // Enemies (pooled Graphics + optional sprite)
  // ------------------------------------------------------------------
  const enemyContainers = new Map(); // entityId -> Container

  function syncEnemies() {
    const seen = new Set();
    for (const unit of game.enemies) {
      seen.add(unit.entityId);
      if (!enemyContainers.has(unit.entityId)) {
        const c = buildEnemyContainer(unit);
        enemyContainers.set(unit.entityId, c);
        layerUnits.addChild(c);
      }
      updateEnemyContainer(unit, enemyContainers.get(unit.entityId));
    }
    for (const [id, c] of enemyContainers) {
      if (!seen.has(id)) { layerUnits.removeChild(c); c.destroy({ children: true }); enemyContainers.delete(id); }
    }
  }

  function buildEnemyContainer(unit) {
    const c = new PIXI.Container();
    const g = new PIXI.Graphics();
    c._shape = g;
    c.addChild(g);

    if (unit.kind === "boss") {
      const tex = sprites.get("boss");
      if (tex) {
        const mask = new PIXI.Graphics();
        mask.circle(0, 0, 28).fill(0xffffff);
        c.addChild(mask);
        const sp = new PIXI.Sprite(tex);
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
    return c;
  }

  function buildEnemyShape(g, unit) {
    g.clear();
    const kind   = unit.kind;
    const radius = kind === "boss" ? 26 : kind === "brute" ? 17 : 12;
    const color  = COLORS[kind] ?? 0xffffff;

    if (unit.kind === "boss" && !sprites.get("boss")) {
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

  function updateEnemyContainer(unit, c) {
    c.position.set(unit.x, unit.y);
    buildEnemyShape(c._shape, unit);

    // Hit-flash: white tint for 2 frames (P4)
    if (unit._hitFlash) { hitFlash.set(unit.entityId, 2); unit._hitFlash = false; }
    const flashFrames = hitFlash.get(unit.entityId) || 0;
    if (flashFrames > 0) {
      if (c._bossSprite) c._bossSprite.tint = 0xffffff;
      hitFlash.set(unit.entityId, flashFrames - 1);
    } else {
      if (c._bossSprite) c._bossSprite.tint = 0xffffff; // boss sprite is always natural color
    }

    // Death fade: sim removes from enemies array before renderer sees it, but
    // if entity has _dying flag we can fade it (future hook — handled by removal for now)
  }

  // ------------------------------------------------------------------
  // HP bars (full rebuild each frame, lightweight Graphics)
  // ------------------------------------------------------------------
  function drawBars() {
    layerBars.removeChildren();
    const g = new PIXI.Graphics();
    for (const unit of game.enemies) {
      const radius = unit.kind === "boss" ? 26 : unit.kind === "brute" ? 17 : 12;
      drawBar(g, unit.x - radius, unit.y - radius - 9, radius * 2, unit.hp / unit.maxHp, unit.kind === "boss" ? 0xff4d4d : 0xf4f1ff);
    }
    for (const unit of game.heroes) {
      drawBar(g, unit.x - 24, unit.y + 31, 48, unit.hpLeft / unit.hp, 0x82e89a);
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
    if (reducedMotion) return;
    const rand = (s) => (Math.random() - 0.5) * s;
    const baseTint = effect.color === "purple" ? "purple" : effect.color === "red" ? "red" : "gold";
    if (effect.type === "shot") {
      spawnParticle("trace_01", (effect.x1 + effect.x2) / 2, (effect.y1 + effect.y2) / 2, { size: 26, life: 0.2, tint: baseTint });
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
      spawnParticle("flare_01", effect.x, effect.y, { size: 130, life: 1, tint: "red" });
      spawnParticle("twirl_01", effect.x, effect.y, { size: 100, life: 1.1, vr: 4, tint: "red" });
      spawnParticle("flame_04", effect.x, effect.y, { size: 88, life: 1, vy: -70, tint: "red" });
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

  function drawEffects(now) {
    const dt = particleClock === null ? 0 : Math.min((now - particleClock) / 1000, 0.1);
    particleClock = now;

    // Spawn particles for newly seen effects
    for (const effect of game.effects) {
      if (!seenEffects.has(effect)) { seenEffects.add(effect); spawnParticles(effect); }
    }

    advanceParticles(dt);

    // Draw shot tracers and hit rings as transient Graphics on layerFx
    layerFx.removeChildren();
    for (const effect of game.effects) {
      const color = effect.color === "purple" ? palette.purple : effect.color === "red" ? 0xff6b6b : palette.gold;
      const g = new PIXI.Graphics();
      g.setStrokeStyle({ width: 2, color, alpha: reducedMotion ? 0.5 : Math.min(1, effect.life * 6) });
      if (effect.type === "shot") {
        g.moveTo(effect.x1, effect.y1).lineTo(effect.x2, effect.y2).stroke();
      } else {
        const radius = reducedMotion ? (effect.type === "ult" ? 40 : 10) : effect.type === "ult" ? 55 * (1 - effect.life) + 20 : 14;
        g.setStrokeStyle({ width: 4, color, alpha: reducedMotion ? 0.35 : effect.life * 1.8 });
        g.arc(effect.x, effect.y, radius, 0, Math.PI * 2).stroke();
        if (GlowFilter && !reducedMotion && (effect.type === "ult" || effect.type === "boss")) {
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
    buildSlots();
    buildRanges();
    buildLinks();
    syncEnemies();
    syncHeroes();
    drawBars();
    drawEffects(now);
    app.renderer.render(stage);
  }

  // ------------------------------------------------------------------
  // Initial one-time setup (static layers built here, not in draw loop)
  // ------------------------------------------------------------------
  resize();
  buildBg();
  buildPortals();

  return { draw, resize, sprites, particles };
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
