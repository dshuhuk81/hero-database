// Visual translations of TOWER_DEFENSE_HERO_SKILLS.md for the current sim.
// Durations here are presentation only; combat timing and status live in sim.js.
const PROFILES = {
  shield_wall:     { name: "Nuwa", color: 0xe7b260, accent: 0xffe7ac, shot: "clay", impact: "rock" },
  expose:          { name: "Prometheus", color: 0xff6435, accent: 0xffce76, shot: "chain", impact: "flame_04" },
  mass_taunt:      { name: "Momus", color: 0xc77bff, accent: 0xffb443, shot: "jab", impact: "star_03" },
  drain_field:     { name: "Demeter", color: 0x6bd886, accent: 0xd4f49a, shot: "vine", impact: "leaf" },
  knockback:       { name: "Poseidon", color: 0x399eff, accent: 0xd5f8ff, shot: "trident", impact: "light_01" },
  war_cry:         { name: "Amunra", color: 0xffc648, accent: 0xfff6d4, shot: "solar", impact: "flare_01" },
  lifesteal_cleave:{ name: "Set", color: 0xdca66b, accent: 0xffda99, shot: "sand", impact: "rock" },
  venom_cleave:    { name: "Jormungandr", color: 0x8ecf43, accent: 0xc9fb72, shot: "fang", impact: "drop" },
  shadow_step:     { name: "Nyx", color: 0x9873ed, accent: 0xe0c3ff, shot: "double", impact: "slash_04" },
  claw_sweep:      { name: "Bastet", color: 0xe796e8, accent: 0xffd2ee, shot: "claw", impact: "slash_04" },
  rapid_strike:    { name: "Horus", color: 0xf1a448, accent: 0xffe6ab, shot: "raptor", impact: "spark_04" },
  rebirth_flame:   { name: "Phoenix", color: 0xff693c, accent: 0xffdd82, shot: "ember", impact: "flame_04" },
  weaken_burst:    { name: "Fengyi", color: 0x91e4e6, accent: 0xf0ffff, shot: "wind", impact: "twirl_01" },
  moon_barrage:    { name: "Diana", color: 0xb9ceff, accent: 0xf1f5ff, shot: "moon", impact: "star_03" },
  piercing_shot:   { name: "Artemis", color: 0x88cfac, accent: 0xd9ffe6, shot: "arrow", impact: "spark_04" },
  petrify_shot:    { name: "Medusa", color: 0x8bb387, accent: 0xd2d9cf, shot: "arrow", impact: "spark_04" },
  fortune_shower:  { name: "Caishen", color: 0xffd15a, accent: 0xfff0b5, shot: "ingot", impact: "star_03" },
  fate_link:       { name: "Yuelao", color: 0xf2758d, accent: 0xffdab1, shot: "thread", impact: "heart" },
  valkyrie_call:   { name: "Freya", color: 0xf5abd0, accent: 0xc5efbb, shot: "petal", impact: "petal" },
};
const TYPES = new Set(["shot", "hit", "ult", "heal", "buff"]);
export const hasHeroFx = effect => Boolean(PROFILES[effect.heroVariant]) && TYPES.has(effect.type);

// Small white silhouettes are tinted at runtime alongside the existing Kenney PNGs.
function makeSymbols(PIXI) {
  const result = new Map();
  const draw = (name, paint) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const c = canvas.getContext("2d");
    c.translate(32, 32); c.fillStyle = "white"; c.strokeStyle = "white";
    c.lineWidth = 3; c.lineCap = "round";
    paint(c); result.set(name, PIXI.Texture.from(canvas));
  };
  draw("petal", c => { c.beginPath(); c.moveTo(-22, 0); c.bezierCurveTo(-4, -28, 24, -19, 23, 0); c.bezierCurveTo(12, 17, -9, 16, -22, 0); c.fill(); });
  draw("leaf", c => { c.beginPath(); c.moveTo(-25, 12); c.quadraticCurveTo(-20, -27, 25, -12); c.quadraticCurveTo(12, 23, -25, 12); c.fill(); });
  draw("heart", c => { c.beginPath(); c.moveTo(0, 23); c.bezierCurveTo(-44, -5, -18, -34, 0, -13); c.bezierCurveTo(18, -34, 44, -5, 0, 23); c.fill(); });
  draw("ingot", c => { c.beginPath(); c.moveTo(-26, -8); c.lineTo(-16, 15); c.lineTo(16, 15); c.lineTo(26, -8); c.quadraticCurveTo(0, 6, -26, -8); c.fill(); c.beginPath(); c.ellipse(0, -7, 12, 7, 0, 0, Math.PI * 2); c.fill(); });
  draw("rock", c => { c.beginPath(); c.moveTo(-18, -11); c.lineTo(4, -23); c.lineTo(23, 2); c.lineTo(8, 19); c.lineTo(-22, 10); c.closePath(); c.fill(); });
  draw("drop", c => { c.beginPath(); c.moveTo(0, -26); c.bezierCurveTo(4, -8, 23, 4, 13, 18); c.bezierCurveTo(-8, 36, -29, 7, 0, -26); c.fill(); });
  draw("arrow", c => { c.beginPath(); c.moveTo(-28, 0); c.lineTo(23, 0); c.moveTo(9, -10); c.lineTo(25, 0); c.lineTo(9, 10); c.moveTo(-26, -8); c.lineTo(-15, 0); c.lineTo(-26, 8); c.stroke(); });
  draw("eye", c => { c.beginPath(); c.moveTo(-27, 0); c.quadraticCurveTo(0, -25, 27, 0); c.quadraticCurveTo(0, 20, -27, 0); c.stroke(); c.beginPath(); c.arc(0, 0, 7, 0, Math.PI * 2); c.fill(); c.beginPath(); c.moveTo(13, 9); c.lineTo(5, 24); c.lineTo(-6, 18); c.stroke(); });
  return result;
}

export function createHeroFx(PIXI, parent, fxTextures, { reducedMotion = false } = {}) {
  const layer = new PIXI.Container();
  parent.addChild(layer);
  const symbols = makeSymbols(PIXI);
  let seen = new WeakSet();
  const active = [];
  let previousTime = 0;
  const TAU = Math.PI * 2;

  function create(effect) {
    const profile = PROFILES[effect.heroVariant];
    const root = new PIXI.Container();
    layer.addChild(root);
    const g = new PIXI.Graphics();
    root.addChild(g);
    const state = { effect, profile, root, g, tracks: [], age: 0, duration: 0.5 };
    const sx = effect.sourceX ?? effect.x1 ?? effect.x;
    const sy = effect.sourceY ?? effect.y1 ?? effect.y;
    const x = effect.x2 ?? effect.x, y = effect.y2 ?? effect.y;
    const angle = Math.atan2(y - sy, x - sx);
    const { color, accent } = profile;

    function add(texture, px, py, opts = {}) {
      const sp = new PIXI.Sprite(symbols.get(texture) || fxTextures.get(texture) || PIXI.Texture.EMPTY);
      sp.anchor.set(0.5);
      sp.tint = opts.tint ?? color;
      sp.blendMode = symbols.has(texture) ? "normal" : "add";
      root.addChild(sp);
      const track = { sp, texture, x: px, y: py, dx: 0, dy: 0, size: 20, end: 0.5,
        duration: 0.45, delay: 0, rotation: 0, spin: 0, alpha: 0.85, stretch: 1, ...opts };
      if (reducedMotion) { track.dx = 0; track.dy = 0; track.spin = 0; track.orbit = 0; track.arc = 0; }
      state.duration = Math.max(state.duration, track.delay + track.duration);
      state.tracks.push(track);
    }
    function burst(texture, px, py, count = 8, opts = {}) {
      for (let i = 0; i < (reducedMotion ? 2 : count); i++) {
        const a = i / count * TAU + Math.random() * 0.3;
        const travel = 18 + Math.random() * 28;
        add(texture, px, py, { dx: Math.cos(a) * travel, dy: Math.sin(a) * travel * 0.7,
          size: 8 + Math.random() * 9, rotation: a, spin: 2, ...opts });
      }
    }
    function slash(px, py, rotation, delay = 0, size = 58) {
      add("slash_04", px, py, { rotation, size, end: 1.35, spin: 0.5, duration: 0.25, delay, tint: accent });
    }
    function beam(ax, ay, bx, by, delay = 0, width = 16, tint = color) {
      const length = Math.hypot(bx - ax, by - ay);
      add("trace_01", (ax + bx) / 2, (ay + by) / 2,
        { size: Math.max(1, length), stretch: width / Math.max(1, length), rotation: Math.atan2(by - ay, bx - ax),
          delay, duration: 0.32, end: 1, tint });
    }
    const selfCentered = ["shield_wall", "expose", "mass_taunt", "drain_field", "war_cry", "lifesteal_cleave",
      "venom_cleave", "fortune_shower", "fate_link", "valkyrie_call"].includes(effect.heroVariant);
    state.center = effect.type === "ult" && selfCentered ? [sx, sy] : [x, y];
    state.source = [sx, sy]; state.angle = angle;

    if (effect.type === "shot") {
      state.duration = 0.2;
      const type = profile.shot;
      const projectile = { ember: "flame_04", wind: "twirl_01", moon: "arrow", arrow: "arrow",
        snake: "drop", ingot: "ingot", petal: "petal" }[type];
      if (projectile) {
        add(projectile, sx, sy, { dx: x - sx, dy: y - sy, size: type === "wind" ? 26 : 17,
          rotation: angle, spin: type === "wind" ? 7 : type === "ingot" ? 3 : 0,
          arc: type === "ingot" || type === "petal" ? 18 : 0, duration: 0.16, end: 1 });
        for (let i = 1; i <= 3; i++) add("light_01", sx + (x - sx) * i / 4, sy + (y - sy) * i / 4,
          { size: 9, delay: i * 0.025, duration: 0.16, alpha: 0.35 });
      } else if (["double", "claw", "sand", "solar", "raptor"].includes(type)) {
        const count = type === "double" ? 2 : type === "claw" ? 3 : 1;
        for (let i = 0; i < count; i++) slash(x, y + (i - (count - 1) / 2) * 7, angle + i * 0.5, i * 0.035, 34);
      } else {
        beam(sx, sy, x, y, 0, type === "clay" ? 10 : 4);
      }
    } else if (effect.type === "hit") {
      add("light_01", x, y, { size: 32, tint: accent, duration: 0.2 });
      burst(profile.impact, x, y, 5, { size: profile.impact === "slash_04" ? 25 : 12,
        ...(profile.shot === "fang" ? { dy: 25 } : {}) });
    } else if (effect.type === "heal" || effect.type === "buff") {
      const texture = profile.shot === "thread" ? "heart" : profile.shot === "ingot" ? "ingot"
        : profile.shot === "petal" ? "petal" : effect.type === "heal" ? "leaf" : "star_03";
      for (let i = 0; i < 5; i++) add(texture, x + (i - 2) * 9, y,
        { dy: -32 - i * 3, size: 11, delay: i * 0.07, duration: 0.65, spin: 0.7, tint: i % 2 ? accent : color });
      add("light_01", x, y, { size: 65, alpha: 0.3, duration: 0.7 });
      if (profile.shot === "thread") for (let i = 0; i < 3; i++) add("heart", sx, sy,
        { dx: x - sx, dy: y - sy, size: 10, delay: i * 0.13, duration: 0.4, end: 1 });
    } else if (effect.type === "ult") {
      state.duration = 1.15;
      const [cx, cy] = state.center;
      add("light_01", cx, cy, { size: 95, end: 1.4, alpha: 0.4, duration: 0.7 });
      switch (effect.heroVariant) {
        case "shield_wall":
          for (const side of [-1, 1]) for (let i = 0; i < 6; i++) add("light_01", sx + side * 40, sy + 20,
            { dy: -65, size: 16, delay: i * 0.08, duration: 0.6, tint: accent });
          burst("rock", sx, sy + 20, 10, { duration: 0.7 });
          break;
        case "expose":
          for (let i = 0; i < 12; i++) {
            const a = i / 12 * TAU;
            add("flame_04", sx + Math.cos(a) * 31, sy + Math.sin(a) * 17,
              { size: 33, dy: -22, delay: i % 3 * 0.1, duration: 0.7 });
          }
          for (let i = 0; i < 3; i++) {
            const a = (effect.facing ?? angle) + (i - 1) * 0.45;
            add("flame_04", sx, sy, { dx: Math.cos(a) * 65, dy: Math.sin(a) * 65,
              rotation: a, size: 44, end: 1.5, delay: i * 0.15, duration: 0.6 });
          }
          break;
        case "mass_taunt":
          for (let i = 0; i < 3; i++) {
            const a = (effect.facing ?? angle) + (i - 1) * 0.7;
            const bx = sx + Math.cos(a) * 42, by = sy + Math.sin(a) * 42;
            add("flare_01", bx, by, { size: 70, tint: accent, delay: i * 0.2, duration: 0.4, end: 1.4 });
            burst("star_03", bx, by, 8, { delay: i * 0.2, tint: i % 2 ? color : 0xff775b });
          }
          break;
        case "drain_field":
          for (let i = 0; i < 12; i++) {
            const a = i / 12 * TAU;
            add("leaf", sx + Math.cos(a) * 57, sy + Math.sin(a) * 35,
              { dx: -Math.cos(a) * 40, dy: -Math.sin(a) * 25 - 10, size: 19, rotation: a,
                delay: i * 0.025, spin: 2, duration: 0.8 });
          }
          break;
        case "knockback":
          for (let i = 0; i < 12; i++) {
            const side = (i - 5.5) * 7;
            add("light_01", sx - Math.sin(angle) * side, sy + Math.cos(angle) * side,
              { dx: Math.cos(angle) * 95, dy: Math.sin(angle) * 95, size: 35, duration: 0.65,
                tint: i % 2 ? accent : color, delay: i % 3 * 0.025 });
          }
          burst("spark_04", x, y, 10, { tint: accent, delay: 0.2 });
          break;
        case "war_cry":
          add("star_03", sx, sy - 18, { size: 95, spin: 0.5, tint: accent, duration: 0.95 });
          for (let i = 0; i < 3; i++) {
            beam(sx + (i - 1) * 25, sy - 35, x, y, i * 0.18, 20, accent);
            slash(x, y, angle + i * 0.7, i * 0.18, 75);
          }
          break;
        case "lifesteal_cleave":
          for (let i = 0; i < 3; i++) {
            beam(sx, sy + (i - 1) * 8, x, y + (i - 1) * 8, i * 0.17, 24);
            slash(x, y, angle + (i % 2 ? 1 : -1), i * 0.17, i === 2 ? 90 : 50);
            burst("rock", x, y, 5, { delay: i * 0.17, alpha: 0.5, size: 16 });
          }
          break;
        case "venom_cleave":
          add("twirl_01", sx, sy, { size: 125, end: 1.4, spin: 2, alpha: 0.5, duration: 0.9 });
          burst("drop", sx, sy, 15, { size: 16, duration: 0.85 });
          break;
        case "shadow_step":
          add("magic_01", sx, sy, { size: 65, duration: 0.3 });
          for (let i = 0; i < 4; i++) slash(x, y, (i % 2 ? -1 : 1) * 0.8, i * 0.14, 65);
          add("magic_01", x, y, { size: 95, delay: 0.5, duration: 0.45 });
          break;
        case "claw_sweep":
          add("light_01", sx, sy, { dx: x - sx, dy: y - sy, arc: 50, size: 28, duration: 0.25, end: 1 });
          for (let i = 0; i < 3; i++) slash(x, y, i * TAU / 3, 0.2 + i * 0.13, 85);
          add("light_01", x, y, { dx: sx - x, dy: sy - y, arc: 40, size: 22, delay: 0.65, duration: 0.3 });
          break;
        case "rapid_strike":
          add("eye", x, y - 35, { size: 33, duration: 1, end: 1 });
          for (let i = 0; i < 3; i++) { slash(x, y, angle + (i - 1) * 0.5, i * 0.12, 60); burst("spark_04", x, y, 4, { delay: i * 0.12, tint: accent }); }
          break;
        case "rebirth_flame":
          // A moving flame body and two swept wings form the phoenix silhouette.
          for (let i = -4; i <= 4; i++) add("flame_04", sx, sy,
            { dx: x - sx - Math.sin(angle) * i * 11, dy: y - sy + Math.cos(angle) * i * 11,
              arc: Math.abs(i) * 8, rotation: angle - Math.PI / 2, size: 65 - Math.abs(i) * 7,
              duration: 0.55, end: 0.9, tint: i % 2 ? color : accent });
          burst("flame_04", x, y, 10, { size: 32, delay: 0.4, duration: 0.6 });
          break;
        case "weaken_burst":
          for (let i = 0; i < 4; i++) add("twirl_01", x, y - i * 9,
            { size: 110 - i * 17, spin: (i % 2 ? -1 : 1) * 1.8, end: 1.3, delay: i * 0.12, duration: 1.6, tint: i % 2 ? accent : color });
          for (let i = 0; i < 8; i++) add("leaf", x, y,
            { orbit: 40, phase: i / 8 * TAU, spin: 2, size: 10, dy: -30, duration: 1.6 });
          break;
        case "moon_barrage":
          for (let i = 0; i < 3; i++) { beam(sx, sy + (i - 1) * 8, x, y, i * 0.14, 12, accent); add("star_03", x, y, { size: 40, delay: i * 0.14 }); }
          add("slash_04", x, y, { size: 100, rotation: -0.7, duration: 0.8, end: 1.4, tint: accent });
          break;
        case "piercing_shot": {
          const distance = (effect.range ?? 140) * 1.5;
          const tx = sx + Math.cos(angle) * distance, ty = sy + Math.sin(angle) * distance;
          beam(sx, sy, tx, ty, 0, 13);
          add("arrow", sx, sy, { dx: tx - sx, dy: ty - sy, rotation: angle, size: 30, duration: 0.28, end: 1 });
          burst("spark_04", x, y, 8, { tint: accent });
          break;
        }
        case "petrify_shot":
          for (const victim of effect.gazeTargets ?? [{ x, y }]) {
            beam(sx, sy - 10, victim.x, victim.y, 0, 24, accent);
            burst("rock", victim.x, victim.y, 10, { tint: accent, duration: 0.75 });
          }
          for (const side of [-1, 1]) add("light_01", sx + side * 6, sy - 10,
            { size: 24, duration: 0.45, tint: accent });
          break;
        case "fortune_shower":
          for (let i = 0; i < 3; i++) add("ingot", sx, sy,
            { orbit: 40, phase: i / 3 * TAU, spin: 2, size: 23, duration: 1, end: 1 });
          burst("star_03", sx, sy, 12, { tint: accent, duration: 0.8 });
          break;
        case "fate_link":
          for (let i = 0; i < 6; i++) add("heart", sx, sy,
            { dx: Math.cos(i / 6 * TAU) * 50, dy: Math.sin(i / 6 * TAU) * 32 - 15,
              size: 18, delay: i * 0.1, duration: 0.65 });
          break;
        case "valkyrie_call":
          for (let i = 0; i < 16; i++) {
            const a = i / 16 * TAU;
            add(i % 3 ? "petal" : "leaf", sx, sy,
              { dx: Math.cos(a) * 70, dy: Math.sin(a) * 40, rotation: a, spin: 1.5,
                size: 17, delay: i % 3 * 0.15, duration: 0.85, tint: i % 3 ? color : accent });
          }
          break;
      }
    }
    return state;
  }

  function draw(state) {
    const { effect: e, profile: p, g, age, duration } = state;
    const t = Math.min(1, age / duration), fade = 1 - t;
    const [cx, cy] = state.center, [sx, sy] = state.source;
    g.clear();
    // Fine linework supplements the textured effects for recognizable silhouettes.
    if (e.type === "shot" && ["vine", "snake", "thread", "chain", "trident", "fang"].includes(p.shot)) {
      const x = e.x2, y = e.y2, dx = x - sx, dy = y - sy;
      const length = Math.max(1, Math.hypot(dx, dy));
      g.moveTo(sx, sy);
      for (let i = 1; i <= 16; i++) {
        const f = i / 16;
        const wave = Math.sin(f * Math.PI * 4 + (reducedMotion ? 0 : age * 24)) * Math.sin(f * Math.PI) * 5;
        if (p.shot === "chain" && i % 2 === 0) g.moveTo(sx + dx * f, sy + dy * f);
        else g.lineTo(sx + dx * f - dy / length * wave, sy + dy * f + dx / length * wave);
      }
      g.stroke({ color: p.color, width: p.shot === "thread" ? 1.2 : 2, alpha: fade });
      if (p.shot === "trident" || p.shot === "fang") for (const side of [-1, 1]) {
        g.moveTo(x - dx / length * 15 - dy / length * side * 5, y - dy / length * 15 + dx / length * side * 5)
          .lineTo(x - dy / length * side * 5, y + dx / length * side * 5).stroke({ color: p.accent, width: 2, alpha: fade });
      }
    }
    if (e.type === "ult") {
      const radius = reducedMotion ? 35 : 15 + t * 65;
      if (e.heroVariant === "shield_wall") {
        g.roundRect(cx - 40, cy - 35, 80, 55, 5).fill({ color: p.color, alpha: fade * 0.12 })
          .stroke({ color: p.accent, width: 2, alpha: fade * 0.65 });
        for (let i = -2; i <= 2; i++) g.moveTo(cx + i * 15, cy + 20).lineTo(cx + i * 15, cy - 32)
          .stroke({ color: p.color, width: 2, alpha: fade * 0.4 });
      } else if (["drain_field", "venom_cleave", "valkyrie_call", "mass_taunt"].includes(e.heroVariant)) {
        g.ellipse(cx, cy, radius, radius * 0.6).stroke({ color: p.color, width: 2, alpha: fade * 0.6 });
        if (e.heroVariant === "drain_field") for (let i = 0; i < 8; i++) {
          const a = i / 8 * TAU, x = cx + Math.cos(a) * 45, y = cy + Math.sin(a) * 28;
          g.moveTo(x - 8, y + 5).quadraticCurveTo(x + 12, y - 27, x, y - 12)
            .stroke({ color: p.color, width: 2, alpha: fade });
        }
      }
    }
    if (e.type === "heal" && p.shot === "thread") g.moveTo(sx, sy).quadraticCurveTo((sx + cx) / 2, (sy + cy) / 2 - 20, cx, cy)
      .stroke({ color: p.color, width: 1.2, alpha: fade * 0.5 });
    for (const track of state.tracks) {
      const { sp } = track;
      const elapsed = age - track.delay;
      sp.visible = elapsed >= 0 && elapsed < track.duration;
      if (!sp.visible) continue;
      // A texture may arrive after the event started.
      sp.texture = symbols.get(track.texture) || fxTextures.get(track.texture) || PIXI.Texture.EMPTY;
      const progress = elapsed / track.duration;
      const move = reducedMotion ? 0 : progress;
      const orbitAngle = (track.phase ?? 0) + move * track.spin;
      sp.position.set(track.x + (track.dx ?? 0) * move + Math.cos(orbitAngle) * (track.orbit ?? 0),
        track.y + (track.dy ?? 0) * move - Math.sin(move * Math.PI) * (track.arc ?? 0)
        + Math.sin(orbitAngle) * (track.orbit ?? 0) * 0.6);
      sp.rotation = track.rotation + move * track.spin;
      const size = track.size * (1 + (track.end - 1) * (reducedMotion ? 0 : progress));
      sp.width = size; sp.height = size * track.stretch;
      sp.alpha = track.alpha * (1 - progress) * (reducedMotion ? 0.5 : 1);
    }
  }

  return {
    update(game, dt) {
      if (game.time < previousTime || (game.time === 0 && !game.heroes.length)) {
        for (const state of active) state.root.destroy({ children: true });
        active.length = 0; seen = new WeakSet();
      }
      const elapsed = game.paused ? 0 : game.time > previousTime ? game.time - previousTime : game.running ? 0 : dt;
      previousTime = game.time;
      for (let i = active.length - 1; i >= 0; i--) {
        active[i].age += elapsed;
        if (active[i].age >= active[i].duration) { active[i].root.destroy({ children: true }); active.splice(i, 1); }
      }
      for (const effect of game.effects) {
        if (!hasHeroFx(effect) || seen.has(effect)) continue;
        seen.add(effect);
        // Bound simultaneous sprite work during large multi-target ultimates.
        if (active.length >= 120) active.shift().root.destroy({ children: true });
        active.push(create(effect));
      }
      for (const state of active) draw(state);
    },
  };
}
