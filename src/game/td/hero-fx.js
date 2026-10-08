// Per-hero combat visuals (M24c), themed on the mythic roster (TOWER_DEFENSE_MYTHIC_HEROES.md).
// Keyed by internal hero id; ids, stats and mechanics are unchanged. Presentation only:
// durations here never affect combat. Everything draws through the pooled fx-kit.
// Rule: no instant straight tracer lines. Ranged attacks travel (arrow, fragment, gust,
// coin, pulse), melee shows a weapon arc or impact, heals flow along curves.
// Odin's lightning (heroVariant chain_lightning) lives in odin-fx.js.
import { boardOf } from "./board.js";

const TYPES = new Set(["shot", "hit", "ult", "heal", "buff", "beam", "dash", "cleave", "splash", "extra", "wardhit"]);
const LIGHTNING = new Set(["shot", "hit", "ult"]);
const UTILITY_ULTS = new Set(["shield_wall", "expose", "mass_taunt", "bifrost_ward", "rooted_sanctuary", "fortune_shower", "fate_link", "valkyrie_call"]);

// name/color/accent are also used by the docs table; ranged heroes launch projectiles.
export const PROFILES = {
  atlas:        { name: "Atlas", color: 0xd9b26f, accent: 0xfff1c9, mote: "twinkle" },
  ymir:  { name: "Ymir", color: 0x8fd0ff, accent: 0xeaf8ff, mote: "flake" },
  heimdall:       { name: "Heimdall", color: 0xffd66e, accent: 0xffffff, mote: "twinkle" },
  gaia:     { name: "Gaia", color: 0x7fcf6a, accent: 0xc9a46a, mote: "leaf", ranged: true, speed: 480 },
  aegir:    { name: "Aegir", color: 0x3fa8ff, accent: 0xd8f6ff, mote: "drop" },
  helios:      { name: "Helios", color: 0xffc233, accent: 0xfff4c4, mote: "twinkle" },
  surtr:         { name: "Surtr", color: 0xff5a1f, accent: 0xffc26b, mote: "ember" },
  fenrir: { name: "Fenrir", color: 0x8fdc4a, accent: 0xd8ff8a, mote: "drop" },
  nott:         { name: "Nott", color: 0x7c6cff, accent: 0xcfd6ff, mote: "twinkle", kind: "assassin" },
  hecate:      { name: "Hecate", color: 0xb36bff, accent: 0xffb86b, mote: "twinkle", kind: "assassin" },
  vidar:       { name: "Vidar", color: 0xa9b8cc, accent: 0xeef5ff, mote: "twinkle", kind: "assassin" },
  thanatos:      { name: "Thanatos", color: 0xb9c3d6, accent: 0xf2f5fb, mote: "glow", kind: "assassin" },
  isis:        { name: "Isis", color: 0xffc94a, accent: 0xfff6d2, mote: "twinkle", ranged: true, speed: 1600 },
  odin:        { name: "Odin", color: 0x8fb4ff, accent: 0xffffff, mote: "twinkle", ranged: true },
  hephaestus:     { name: "Hephaestus", color: 0xff7a2e, accent: 0xffd27a, mote: "ember", ranged: true, speed: 520 },
  boreas:      { name: "Boreas", color: 0x9be7ff, accent: 0xffffff, mote: "flake", ranged: true, speed: 560 },
  skadi:       { name: "Skadi", color: 0xbfe3ff, accent: 0xffffff, mote: "flake", ranged: true, speed: 900 },
  atalanta:     { name: "Atalanta", color: 0xa6dd6b, accent: 0xf1ffd6, mote: "leaf", ranged: true, speed: 1100 },
  stheno:      { name: "Stheno", color: 0x74d16b, accent: 0xd9f7c7, mote: "drop", ranged: true, speed: 900 },
  plutus:     { name: "Plutus", color: 0xffd24a, accent: 0xfff3b0, mote: "coin", ranged: true, speed: 480 },
  harmonia:      { name: "Harmonia", color: 0xff8fb1, accent: 0xffe1a8, mote: "note", ranged: true, speed: 520 },
  asclepius:       { name: "Asclepius", color: 0x5fe0a0, accent: 0xfff7d6, mote: "plus", ranged: true, speed: 540 },
  // Recruits (common heroes): plain mortal materials, drawn by the class builders (`kind`).
  "recruit-bram":   { name: "Bram", color: 0xa8b4c0, accent: 0xe8eef4, mote: "twinkle", kind: "tank" },
  "recruit-tilda":  { name: "Tilda", color: 0xc79a5a, accent: 0xffe2b0, mote: "twinkle", kind: "tank" },
  "recruit-kellan": { name: "Kellan", color: 0x9fb2c8, accent: 0xffffff, mote: "twinkle", kind: "warrior" },
  "recruit-sable":  { name: "Sable", color: 0xc8765a, accent: 0xffd0b0, mote: "ember", kind: "warrior" },
  "recruit-ash":    { name: "Ash", color: 0x8e8a9e, accent: 0xd8d4e8, mote: "glow", kind: "assassin" },
  "recruit-nyra":   { name: "Nyra", color: 0x5fb3a8, accent: 0xd0fff4, mote: "glow", kind: "assassin" },
  "recruit-elm":    { name: "Elm", color: 0x8fce72, accent: 0xe6ffd0, mote: "leaf", kind: "mage", ranged: true, speed: 560 },
  "recruit-ives":   { name: "Ives", color: 0xe89a4a, accent: 0xffe0b0, mote: "ember", kind: "mage", ranged: true, speed: 520 },
  "recruit-wren":   { name: "Wren", color: 0xc8a878, accent: 0xfff0d0, mote: "leaf", kind: "archer", ranged: true, speed: 950 },
  "recruit-hollis": { name: "Hollis", color: 0xd8c890, accent: 0xffffff, mote: "twinkle", kind: "archer", ranged: true, speed: 1100 },
  "recruit-poppy":  { name: "Poppy", color: 0x9ee6a0, accent: 0xfff7d6, mote: "plus", kind: "support", ranged: true, speed: 520 },
  "recruit-jory":   { name: "Jory", color: 0xffd98a, accent: 0xfff4d6, mote: "twinkle", kind: "support", ranged: true, speed: 520 },
};

export const hasHeroFx = (effect) => {
  if (!TYPES.has(effect.type) || !PROFILES[effect.heroId]) return false;
  // Lightning shots, hits and ultimates belong to odin-fx.
  return !(effect.heroVariant === "chain_lightning" && LIGHTNING.has(effect.type));
};

// Cronus's hit point is an invisible cell behind the parapet. Molten ground belongs on the
// visible floor in front of him; Campaign and other modes retain the actual target point.
export function moltenGroundPoint(map, x, y) {
  if (!map?.godOnly) return [x, y];
  const board = boardOf(map);
  return board && y < board.origin[1] ? [x, board.origin[1] + board.cell / 2] : [x, y];
}

export function createHeroFx(kit, { reducedMotion = false, groundKit = kit } = {}) {
  const { TAU, rand } = kit;
  // Flat ground effects (rings, lava, rims) draw on the ground kit, below the units, so they
  // never cover an enemy standing in them. Particles and bursts stay on the main kit.
  const ground = groundKit;
  let seen = new WeakSet();

  // ------------------------------------------------------------ building blocks
  const travelTime = (sx, sy, x, y, speed = 700) => Math.min(0.32, Math.max(0.07, Math.hypot(x - sx, y - sy) / speed));

  function flash(x, y, color, size = 34, { life = 0.2, delay = 0, alpha = 0.9, grow = 1.4 } = {}) {
    kit.spawn("glow", x, y, { tint: color, size, sizeEnd: size * grow, life, delay, alpha, hold: 0.1 });
  }
  function sparks(x, y, n, color, { speed = 150, gravity = 260, life = 0.35, size = 11, delay = 0, dir = 0, spread = TAU, up = 0, tex = "ember", add = true } = {}) {
    for (let i = 0; i < kit.n(n); i++) {
      const a = dir + (Math.random() - 0.5) * spread;
      const v = speed * (0.5 + Math.random() * 0.7);
      kit.spawn(tex, x, y, { tint: color, vx: Math.cos(a) * v, vy: Math.sin(a) * v - up, ay: gravity, drag: 1.5,
        size, sizeEnd: size * 0.5, life: life * (0.7 + Math.random() * 0.5), delay, align: tex === "ember" || tex === "drop" || tex === "shard", add });
    }
  }
  function debris(tex, x, y, n, color, { speed = 110, gravity = 420, life = 0.5, size = 9, delay = 0, up = 90, spin = 8, add = false, spread = TAU, dir = -Math.PI / 2 } = {}) {
    for (let i = 0; i < kit.n(n); i++) {
      const a = dir + (Math.random() - 0.5) * spread;
      const v = speed * (0.5 + Math.random() * 0.6);
      kit.spawn(tex, x, y, { tint: color, vx: Math.cos(a) * v, vy: Math.sin(a) * v - up, ay: gravity,
        size: size * (0.7 + Math.random() * 0.6), life, delay, rot: Math.random() * TAU, spin: (Math.random() - 0.5) * spin, add, hold: 0.6 });
    }
  }
  // Weapon arc across the target, bulging away from the attacker.
  function slash(x, y, angle, color, { r = 20, thick = 7, sweep = 2.3, life = 0.22, delay = 0, dir = 1, squash = 0.7, core = 0xffffff, offset = 0.35 } = {}) {
    const cx = x - Math.cos(angle) * r * offset, cy = y - Math.sin(angle) * r * offset * squash;
    const a0 = angle - sweep / 2 * dir, a1 = angle + sweep / 2 * dir;
    kit.shape((g, t) => {
      const progress = Math.min(1, t * 2.6);
      const alpha = t < 0.45 ? 1 : 1 - (t - 0.45) / 0.55;
      kit.crescent(g, cx, cy, r, a0, a1, { thick, color, alpha: alpha * 0.85, progress, squash, tail: 0.9 });
      kit.crescent(g, cx, cy, r - 1, a0, a1, { thick: thick * 0.35, color: core, alpha, progress, squash, tail: 0.6 });
    }, life, { delay });
  }
  // Short blade flash along the strike direction: the dagger itself.
  function daggerGlint(x, y, angle, p, delay = 0) {
    kit.spawn("shard", x - Math.cos(angle) * 6, y - Math.sin(angle) * 6, { tint: p.accent, size: 16, sizeEnd: 10, life: 0.16, delay, rot: angle, alpha: 1, hold: 0.4 });
  }
  function groundRing(x, y, r0, r1, color, { life = 0.45, width = 3, delay = 0, squash = 0.5, add = true, alpha = 0.85 } = {}) {
    ground.shape((g, t) => {
      const e = 1 - (1 - t) * (1 - t);
      kit.ring(g, x, y, reducedMotion ? (r0 + r1) / 2 : r0 + (r1 - r0) * e, { color, width: width * (1 - t * 0.6), alpha: alpha * (1 - t), squash });
    }, life, { delay, add });
  }
  // Travelling projectile with a trail callback; returns the travel time.
  function projectile(tex, sx, sy, x, y, color, { speed = 700, arc = 0, size = 16, spin = 0, add = true, trail = null, trailEvery = 0.02, helix = 0, helixFreq = 2, phase = 0, delay = 0, bend = 0 } = {}) {
    const life = travelTime(sx, sy, x, y, speed);
    kit.spawn(tex, sx, sy, {
      tint: color, size, life, delay, add, fadeIn: 0.05, hold: 0.85, alpha: 1,
      path: { x1: sx, y1: sy, x2: x, y2: y, arc, helix, helixFreq, phase, bend },
      data: { acc: 0 },
      onStep: (trail || spin) ? (p, dt) => {
        if (spin) p.sp.rotation += spin * p.age;
        if (!trail || reducedMotion) return;
        p.data.acc += dt;
        while (p.data.acc >= trailEvery) { p.data.acc -= trailEvery; trail(p.x, p.y, p.rot); }
      } : null,
    });
    return life + delay;
  }
  function streakTrail(color, { size = 26, life = 0.14, alpha = 0.7 } = {}) {
    return (x, y, angle) => kit.spawn("streak", x - Math.cos(angle) * size * 0.45, y - Math.sin(angle) * size * 0.45,
      { tint: color, size, sizeEnd: size * 0.6, life, rot: angle, alpha, optional: true, hold: 0 });
  }
  function moteTrail(tex, color, { size = 6, life = 0.3, fall = 0, add = true } = {}) {
    return (x, y) => kit.spawn(tex, x + rand(-2, 2), y + rand(-2, 2), { tint: color, size, sizeEnd: size * 0.3, life, vy: fall, ay: fall ? 200 : 0, add, optional: true, align: tex === "drop" });
  }
  function rise(tex, x, y, n, color, { spread = 22, speed = 45, life = 0.7, size = 10, delay = 0, add = true, stagger = 0.06 } = {}) {
    for (let i = 0; i < kit.n(n); i++) {
      kit.spawn(tex, x + rand(-spread, spread) * 0.6, y + rand(-6, 6), { tint: i % 2 ? color : undefined, vy: -speed * (0.7 + Math.random() * 0.5), drag: 0.8,
        size, sizeEnd: size * 0.7, life, delay: delay + i * stagger, wobble: 3, wobbleFreq: 1.4, add, hold: 0.5 });
    }
  }
  function orbit(tex, x, y, n, color, { r = 30, squash = 0.55, life = 0.9, size = 12, speed = 5, climb = 0, add = true, delay = 0 } = {}) {
    for (let i = 0; i < kit.n(n); i++) {
      const phase = i / n * TAU;
      kit.spawn(tex, x, y, { tint: color, size, life, delay, add, hold: 0.6,
        onStep: (p) => {
          const local = Math.max(0, p.age - p.delay);
          const a = phase + local * speed;
          const rr = r * (1 - local / p.life * 0.35);
          p.x = x + Math.cos(a) * rr; p.y = y + Math.sin(a) * rr * squash - climb * local;
          p.sp.position.set(p.x, p.y);
        } });
    }
  }
  // Curved flow of motes from source to target (heals, gaze, soul wisps).
  function flow(tex, sx, sy, x, y, n, color, { speed = 420, bend = 24, arc = 18, size = 9, stagger = 0.05, helix = 0, helixFreq = 2, add = true, spin = 0 } = {}) {
    let end = 0;
    for (let i = 0; i < kit.n(n); i++) {
      end = Math.max(end, projectile(tex, sx, sy, x, y, color, { speed, arc, bend, size: size * (i === 0 ? 1.2 : 0.9), delay: i * stagger,
        helix, helixFreq, phase: i * Math.PI, add, spin }));
    }
    return end;
  }

  // ------------------------------------------------------------ melee impacts per hero
  const MELEE = {
    atlas(x, y, a, p, big) { // Stone at the Heel: heavy downward blow, dust and rock chips
      slash(x, y, Math.PI / 2, p.color, { r: 18, thick: 8, sweep: 1.6, offset: 0.9 });
      groundRing(x, y + 6, 4, 24 * big, 0xc8a878, { add: false, width: 4, alpha: 0.6, life: 0.4 });
      debris("rock", x, y, 4, 0xb49a72, { size: 7 });
      flash(x, y, p.accent, 26 * big);
    },
    ymir(x, y, a, p, big) { // First Ice: frost crescent and flying shards
      slash(x, y, a, p.color, { r: 21, thick: 7 });
      sparks(x, y, 5, p.accent, { tex: "shard", size: 9, speed: 160, gravity: 320, dir: a, spread: 2.2 });
      flash(x, y, p.color, 28 * big);
    },
    heimdall(x, y, a, p, big) { // Watchman's Measure: clean gold arc and a glint
      slash(x, y, a, p.color, { r: 22, thick: 6, sweep: 2.6 });
      kit.spawn("twinkle", x + rand(-6, 6), y - 8, { tint: 0xffffff, size: 18 * big, sizeEnd: 4, life: 0.3, spin: 4 });
    },
    aegir(x, y, a, p, big) { // Breakwater Blow: water crescent and spray
      slash(x, y, a, p.color, { r: 23, thick: 8, core: p.accent });
      sparks(x, y, 6, p.accent, { tex: "drop", size: 7, speed: 140, gravity: 420, up: 60, dir: a, spread: 2.4, add: false });
      flash(x, y, p.color, 26 * big);
    },
    helios(x, y, a, p, big) { // Rim of the Sun: white-hot gold arc and a sun flare
      slash(x, y, a, p.color, { r: 23, thick: 7, core: 0xffffff });
      kit.spawn("twinkle", x, y, { tint: p.accent, size: 30 * big, sizeEnd: 8, life: 0.25, spin: 2 });
      flash(x, y, p.color, 34 * big, { alpha: 0.7 });
    },
    set(x, y, a, p, big) { // Coal-Edge Stroke: flaming sword arc and rising embers
      slash(x, y, a, p.color, { r: 24, thick: 9, core: p.accent });
      sparks(x, y, 6, p.accent, { size: 9, speed: 90, gravity: -140, up: 20, life: 0.5 });
      kit.spawn("flame", x, y - 4, { tint: p.color, size: 16 * big, sizeEnd: 8, vy: -40, life: 0.35 });
    },
    fenrir(x, y, a, p, big) { // Jaw Across the Road: fangs snap shut, venom spills
      for (const side of [-1, 1]) {
        kit.spawn("fang", x + 4 * side, y + side * 16, { tint: 0xeef3f6, size: 9 * big, life: 0.18, rot: side > 0 ? Math.PI : 0, add: false, hold: 0.7,
          path: { x1: x + 4 * side, y1: y + side * 16, x2: x, y2: y + side * 3 } });
      }
      sparks(x, y, 4, p.color, { tex: "drop", size: 7, speed: 80, gravity: 380, up: 40, delay: 0.12, add: false });
      flash(x, y, p.color, 22 * big, { delay: 0.12 });
    },
    nott(x, y, a, p, big) { // Between Hoofbeats: quick night crescent and a star
      slash(x, y, a - 0.4, p.color, { r: 19, thick: 6, core: p.accent });
      kit.spawn("twinkle", x + rand(-8, 8), y - rand(4, 12), { tint: p.accent, size: 14 * big, sizeEnd: 3, life: 0.35, delay: 0.06 });
    },
    hecate(x, y, a, p, big) { // Key at the Turning: three short cuts, one per road
      for (let i = 0; i < 3; i++) slash(x, y, a + i * TAU / 3, p.color, { r: 14, thick: 4, sweep: 1.5, life: 0.2, delay: i * 0.035, core: p.accent, offset: 0 });
      kit.spawn("flame", x, y - 10, { tint: p.accent, size: 9, sizeEnd: 4, vy: -30, life: 0.3 });
    },
    vidar(x, y, a, p, big) { // Measured Answer: one precise thrust glint
      kit.spawn("streak", x - Math.cos(a) * 10, y - Math.sin(a) * 10, { tint: p.accent, size: 34 * big, sizeEnd: 20, stretch: 0.14, rot: a, life: 0.16, hold: 0.2 });
      kit.spawn("twinkle", x, y, { tint: 0xffffff, size: 20 * big, sizeEnd: 5, life: 0.22, rot: 0.4 });
      sparks(x, y, 3, p.color, { dir: a, spread: 1.2, speed: 170, size: 8 });
    },
    thanatos(x, y, a, p, big) { // Quiet Touch: a pale breath and black feathers
      flash(x, y, p.accent, 26 * big, { life: 0.3, alpha: 0.6 });
      for (let i = 0; i < kit.n(2); i++) kit.spawn("feather", x + rand(-8, 8), y - 6, { tint: 0x23262f, size: 5, vx: rand(-25, 25), vy: 10, ay: 30,
        life: 0.8, rot: rand(-1, 1), spin: rand(-3, 3), wobble: 5, wobbleFreq: 1.5, add: false, hold: 0.5 });
      kit.spawn("glow", x, y - 4, { tint: p.color, size: 8, vy: -60, life: 0.5, wobble: 3 });
    },
  };

  // Class builders for heroes without their own entry (recruits): same readability, humbler kit.
  const CLASS_MELEE = {
    tank(x, y, a, p, big) { // shield bash: short heavy arc, dust ring
      slash(x, y, a, p.color, { r: 17, thick: 9, sweep: 1.5, offset: 0.7 });
      groundRing(x, y + 6, 4, 20 * big, 0xb8a888, { add: false, width: 3, alpha: 0.5, life: 0.35 });
      flash(x, y, p.accent, 22 * big);
    },
    warrior(x, y, a, p, big) { // steel arc with a few sparks
      slash(x, y, a, p.color, { r: 21, thick: 7, core: p.accent });
      sparks(x, y, 3, p.accent, { size: 8, speed: 140, dir: a, spread: 1.8 });
    },
    assassin(x, y, a, p, big) { // two quick dagger cuts (the blade glint is added by the dispatch)
      for (let i = 0; i < 2; i++) slash(x, y, a + (i ? 0.7 : -0.7), i ? p.accent : p.color, { r: 16, thick: 5, sweep: 1.7, offset: 0.2, delay: i * 0.07, life: 0.18 });
    },
  };
  const CLASS_SHOTS = {
    mage(e, sx, sy, x, y, p) { // arcane orb on a light arc with a mote trail
      return projectile("glow", sx, sy, x, y, p.color, { speed: p.speed, arc: 18, size: 16,
        trail: moteTrail(p.mote === "ember" ? "ember" : "dot", p.accent, { size: 5, life: 0.3 }), trailEvery: 0.025 });
    },
    archer(e, sx, sy, x, y, p) { // plain arrow with a short streak
      return projectile("arrow", sx, sy, x, y, p.accent, { speed: p.speed, arc: 8, size: 22, add: false, trail: streakTrail(p.color, { size: 20 }) });
    },
    support(e, sx, sy, x, y, p) { // soft pulse with one helper mote
      const end = projectile("glow", sx, sy, x, y, p.color, { speed: p.speed, size: 14 });
      projectile("dot", sx, sy, x, y, p.accent, { speed: p.speed, size: 5, helix: 7, helixFreq: 2, trail: moteTrail("dot", p.color, { size: 4, life: 0.25 }), trailEvery: 0.03 });
      return end;
    },
  };
  const CLASS_IMPACTS = {
    mage(x, y, p, big) {
      flash(x, y, p.color, 28 * big);
      sparks(x, y, 4, p.accent, { tex: p.mote === "ember" ? "ember" : "dot", size: 7, speed: 110 });
    },
    archer(x, y, p, big) {
      kit.spawn("twinkle", x, y, { tint: p.accent, size: 14 * big, sizeEnd: 4, life: 0.2 });
      sparks(x, y, 2, p.color, { tex: "shard", size: 6, speed: 110 });
    },
    support(x, y, p, big) {
      flash(x, y, p.color, 22 * big, { alpha: 0.7 });
      kit.spawn(p.mote === "plus" ? "plus" : "twinkle", x, y - 6, { tint: p.accent, size: 8, vy: -40, life: 0.4 });
    },
  };

  // ------------------------------------------------------------ ranged shots per hero
  // Isis: a horizontal beam of the hidden sun from (sx, sy) toward `dir` (-1 left, 1 right) for
  // `length` px. Layered strokes (halo, gold body, white core) swell and thin out over `life`.
  function sunBeam(sx, sy, dir, length, p, { width = 7, life = 0.3, delay = 0 } = {}) {
    const x0 = sx + dir * 14;
    kit.shape((g, t) => {
      const reach = reducedMotion ? 1 : Math.min(1, t * 6);
      const x1 = x0 + dir * (length - 14) * reach; // `length` counts from the hero, the beam starts 14 px out
      const swell = t < 0.25 ? t / 0.25 : 1 - (t - 0.25) / 0.75;
      for (const [w, color, alpha] of [[width * 3.2, p.color, 0.16], [width * 1.5, p.color, 0.55], [Math.max(1.5, width * 0.5), 0xffffff, 0.95]]) {
        if (swell <= 0.02) return;
        g.moveTo(x0, sy).lineTo(x1, sy).stroke({ width: w * (0.4 + 0.6 * swell), color, alpha: alpha * swell, cap: "round" });
      }
    }, life, { delay });
  }
  // Rays of a small sun: a disc flare with thin spokes (the Lord's sign, and the muzzle of the beam).
  function sunFlare(x, y, p, { size = 40, life = 0.4, delay = 0 } = {}) {
    flash(x, y, p.accent, size, { life, delay, alpha: 0.85 });
    kit.spawn("twinkle", x, y, { tint: 0xffffff, size: size * 0.9, sizeEnd: size * 0.2, life, delay, spin: 2.5 });
    kit.shape((g, t) => {
      const alpha = (1 - t) * 0.8, r0 = size * 0.25, r1 = size * (0.6 + 0.5 * t);
      for (let i = 0; i < 8; i++) {
        const a = i * TAU / 8 + t;
        g.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0 * 0.8).lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1 * 0.8).stroke({ width: 2, color: p.accent, alpha });
      }
    }, life, { delay });
  }

  const SHOTS = {
    isis(e, sx, sy, x, y, p) { // Light of the Hidden Sun: a thin horizontal beam along her row
      const dir = e.beamDir ?? (x < sx ? -1 : 1);
      const length = e.beamLength ?? Math.abs(x - sx); // always the full reach of her line
      sunBeam(sx, sy - 6, dir, length, p, { width: 8, life: 0.22 });
      flash(sx + dir * 14, sy - 6, p.accent, 24, { life: 0.2 });
      for (let i = 0; i < kit.n(4); i++) kit.spawn("twinkle", sx + dir * (20 + Math.random() * length), sy - 6 + rand(-4, 4), { tint: p.accent, size: 8, sizeEnd: 2, life: 0.3, delay: 0.03 * i });
      return 0.1;
    },
    hephaestus(e, sx, sy, x, y, p) { // Scale from the Anvil: lobbed molten fragment
      return projectile("fragment", sx, sy, x, y, p.color, { speed: p.speed, arc: 26, size: 11, spin: 10,
        trail: (tx, ty) => { kit.spawn("ember", tx, ty, { tint: p.accent, size: 8, vx: rand(-20, 20), vy: rand(-10, 20), ay: 160, life: 0.3, align: true, optional: true });
          kit.spawn("glow", tx, ty, { tint: p.color, size: 12, sizeEnd: 4, life: 0.18, optional: true }); }, trailEvery: 0.018 });
    },
    boreas(e, sx, sy, x, y, p) { // Sleet Through the Gap: spiralling shards in a gust
      let end = 0;
      for (let i = 0; i < 3; i++) end = Math.max(end, projectile("shard", sx, sy, x, y, i ? p.color : p.accent, { speed: p.speed, size: 6, helix: 9, helixFreq: 1.5, phase: i * TAU / 3,
        trail: i === 0 ? moteTrail("flake", p.accent, { size: 7, life: 0.35 }) : null, trailEvery: 0.03 }));
      projectile("streak", sx, sy, x, y, p.color, { speed: p.speed, size: 30 });
      return end;
    },
    skadi(e, sx, sy, x, y, p) { // Ridge-Line Arrow: pale arrow with a frost trail
      return projectile("arrow", sx, sy, x, y, p.accent, { speed: p.speed, arc: 10, size: 24, add: false,
        trail: (tx, ty, a) => { streakTrail(p.color, { size: 22 })(tx, ty, a); if (Math.random() < 0.35) kit.spawn("flake", tx, ty, { tint: p.accent, size: 5, vy: 20, life: 0.4, spin: 3, optional: true }); } });
    },
    atalanta(e, sx, sy, x, y, p) { // The Clear Shot: fast arrow with a green streak and leaf flutter
      return projectile("arrow", sx, sy, x, y, 0xfff6d8, { speed: p.speed, arc: 4, size: 24, add: false,
        trail: (tx, ty, a) => { streakTrail(p.color, { size: 30 })(tx, ty, a); if (Math.random() < 0.15) kit.spawn("leaf", tx, ty, { tint: p.color, size: 6, vx: rand(-30, 30), vy: 10, ay: 90, spin: 6, life: 0.5, add: false, optional: true }); } });
    },
    stheno(e, sx, sy, x, y, p) { // Arrow from the Parapet: venom-tipped arrow dripping poison
      return projectile("arrow", sx, sy, x, y, p.accent, { speed: p.speed, arc: 8, size: 24, add: false,
        trail: (tx, ty, a) => { streakTrail(p.color, { size: 20 })(tx, ty, a); if (Math.random() < 0.4) kit.spawn("drop", tx, ty, { tint: p.color, size: 4, vy: 30, ay: 300, life: 0.35, align: true, add: false, optional: true }); } });
    },
    gaia(e, sx, sy, x, y, p) { // Knuckle of Earth: a clod of earth lobbed from her palm, shedding leaves
      return projectile("rock", sx, sy, x, y, p.accent, { speed: p.speed, arc: 28, size: 10, spin: 6, add: false,
        trail: (tx, ty) => { if (Math.random() < 0.4) kit.spawn("leaf", tx, ty, { tint: p.color, size: 6, vx: rand(-20, 20), vy: 10, ay: 90, spin: 6, life: 0.45, add: false, optional: true }); }, trailEvery: 0.03 });
    },
    plutus(e, sx, sy, x, y, p) { // A Portion Set Aside: a spinning coin
      return projectile("coin", sx, sy, x, y, p.color, { speed: p.speed, arc: 30, size: 11, add: false,
        trail: (tx, ty) => kit.spawn("twinkle", tx, ty, { tint: p.accent, size: 7, sizeEnd: 2, life: 0.25, optional: true }), trailEvery: 0.035 });
    },
    harmonia(e, sx, sy, x, y, p) { // Set the Breath: a pulse carried by two harmonising motes
      const end = projectile("glow", sx, sy, x, y, p.color, { speed: p.speed, size: 16 });
      for (let i = 0; i < 2; i++) projectile("dot", sx, sy, x, y, i ? p.accent : 0xffffff, { speed: p.speed, size: 6, helix: 8, helixFreq: 2, phase: i * Math.PI,
        trail: moteTrail("dot", p.color, { size: 4, life: 0.25 }), trailEvery: 0.03 });
      return end;
    },
    asclepius(e, sx, sy, x, y, p) { // Steady Hands: staff pulse with a twin-serpent helix
      const end = projectile("glow", sx, sy, x, y, p.color, { speed: p.speed, size: 15 });
      for (let i = 0; i < 2; i++) projectile("dot", sx, sy, x, y, i ? p.accent : p.color, { speed: p.speed, size: 5, helix: 7, helixFreq: 3, phase: i * Math.PI,
        trail: moteTrail("dot", p.color, { size: 4, life: 0.3 }), trailEvery: 0.025 });
      return end;
    },
  };

  const IMPACTS = {
    isis(x, y, p, big) { // a small sunburst where the beam lands
      flash(x, y, p.accent, 28 * big);
      kit.spawn("twinkle", x, y, { tint: 0xffffff, size: 18 * big, sizeEnd: 4, life: 0.25, spin: 3 });
      sparks(x, y, 3, p.color, { tex: "twinkle", size: 7, speed: 90, gravity: -40, life: 0.4, add: true });
    },
    hephaestus(x, y, p, big) { // anvil sparks spray up and fall
      flash(x, y, p.accent, 30 * big);
      sparks(x, y, 7, p.accent, { speed: 170, up: 120, gravity: 520, size: 10, spread: 2.4, dir: -Math.PI / 2 });
    },
    boreas(x, y, p, big) {
      flash(x, y, p.color, 26 * big);
      debris("flake", x, y, 5, p.accent, { add: true, speed: 90, up: 20, gravity: 60, size: 8, spin: 5, life: 0.6 });
    },
    skadi(x, y, p, big) {
      kit.spawn("twinkle", x, y, { tint: p.accent, size: 18 * big, sizeEnd: 4, life: 0.25, rot: 0.3 });
      sparks(x, y, 3, p.color, { tex: "shard", size: 7, speed: 120 });
    },
    atalanta(x, y, p, big) {
      kit.spawn("twinkle", x, y, { tint: p.accent, size: 16 * big, sizeEnd: 4, life: 0.22 });
      sparks(x, y, 3, p.color, { size: 8, speed: 140 });
    },
    stheno(x, y, p, big) { // venom splash with bubbles
      sparks(x, y, 4, p.color, { tex: "drop", size: 6, speed: 90, up: 50, gravity: 380, add: false });
      for (let i = 0; i < kit.n(2); i++) kit.spawn("bubble", x + rand(-6, 6), y - 4, { tint: p.color, size: 6, sizeEnd: 9, vy: -35, life: 0.55, wobble: 2, add: false, delay: i * 0.08 });
      flash(x, y, p.color, 20 * big, { alpha: 0.6 });
    },
    gaia(x, y, p, big) { // earth bursts up under the target
      debris("rock", x, y + 6, 4, 0x9c8058, { up: 150, speed: 60, spread: 1, size: 7 });
      groundRing(x, y + 6, 4, 20 * big, 0x8a6d45, { add: false, width: 4, alpha: 0.55 });
      flash(x, y, p.color, 22 * big, { alpha: 0.7 });
    },
    plutus(x, y, p, big) {
      for (let i = 0; i < kit.n(3); i++) kit.spawn("twinkle", x + rand(-10, 10), y + rand(-10, 6), { tint: i % 2 ? p.accent : p.color, size: 10 * big, sizeEnd: 2, life: 0.3, delay: i * 0.04 });
      flash(x, y, p.color, 20 * big, { alpha: 0.6 });
    },
    harmonia(x, y, p, big) { // soft chord rings
      for (let i = 0; i < 2; i++) kit.spawn("ring", x, y, { tint: i ? p.accent : p.color, size: 8, sizeEnd: 34 * big, stretch: 0.55, life: 0.35, delay: i * 0.08, alpha: 0.8, hold: 0.2 });
    },
    asclepius(x, y, p, big) {
      flash(x, y, p.color, 24 * big);
      kit.spawn("plus", x, y - 6, { tint: p.accent, size: 8, vy: -40, life: 0.45 });
    },
  };

  // ------------------------------------------------------------ ultimates per hero
  const ULTS = {
    isis(e, p, sx, sy) { // Light of the Hidden Sun: the crown's disc blazes, a wide beam crosses her row, feathers of light follow
      const dir = e.beamDir ?? (e.x < sx ? -1 : 1);
      const length = e.beamLength ?? Math.abs(e.x - sx) + 40;
      const y = sy - 6;
      // charge: the solar disc over her head and a ring of rays at the staff
      sunFlare(sx, sy - 52, p, { size: 46, life: 0.45 });
      sunFlare(sx + dir * 14, y, p, { size: 38, life: 0.4, delay: 0.1 });
      groundRing(sx, sy + 12, 8, 46, p.color, { life: 0.5, width: 3 });
      // the beam itself: wide, with a slim white second pass
      sunBeam(sx, y, dir, length, p, { width: 30, life: 0.55, delay: 0.14 });
      sunBeam(sx, y, dir, length, { ...p, color: p.accent }, { width: 12, life: 0.4, delay: 0.2 });
      // motes and golden feathers streaming along the line
      for (let i = 0; i < kit.n(16); i++) {
        const d = 24 + Math.random() * (length - 24);
        kit.spawn(i % 3 ? "twinkle" : "feather", sx + dir * d, y + rand(-12, 12), { tint: i % 2 ? p.accent : p.color, size: i % 3 ? 11 : 9, sizeEnd: 3,
          vx: dir * rand(60, 140), vy: rand(-26, 10), life: 0.7, delay: 0.16 + (d / length) * 0.12, rot: rand(-1, 1), spin: rand(-3, 3), wobble: 4, wobbleFreq: 2, add: i % 3 !== 0, hold: 0.5 });
      }
      for (let i = 0; i < kit.n(10); i++) kit.spawn("dot", sx + dir * rand(20, length), y, { tint: p.accent, size: 5, vx: dir * rand(20, 70), vy: rand(-90, -30), ay: 120, life: 0.6, delay: 0.2 + i * 0.03 });
      // every enemy the beam strikes: a sunburst, rising light and a ground ring
      for (const [i, hit] of (e.beamHits ?? [{ x: e.x, y: e.y }]).entries()) {
        const delay = 0.16 + Math.min(0.14, Math.abs(hit.x - sx) / length * 0.14);
        sunFlare(hit.x, hit.y - 6, p, { size: 34, life: 0.35, delay });
        groundRing(hit.x, hit.y + 6, 6, 32, p.color, { delay, life: 0.45, width: 3 });
        rise("twinkle", hit.x, hit.y, 3, p.accent, { spread: 14, size: 9, delay: delay + 0.05 + (i % 3) * 0.02, life: 0.6 });
      }
      if (e.awakened) for (const side of [-1, 1]) sunBeam(sx, y + side * 14, dir, length * 0.9, p, { width: 6, life: 0.35, delay: 0.2 });
    },
    atlas(e, p, sx, sy) { // A Place to Stand: the sky vault is lifted, the ground steadies
      kit.shape((g, t) => {
        const lift = reducedMotion ? 1 : Math.min(1, t * 3);
        const alpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
        // moveTo first: the shared Graphics would otherwise join the arc to the previous shape.
        const r = 46 * lift;
        g.moveTo(sx - r, sy - 6).arc(sx, sy - 6, r, Math.PI, TAU).stroke({ width: 6, color: p.color, alpha: alpha * 0.35 });
        g.moveTo(sx - r, sy - 6).arc(sx, sy - 6, r, Math.PI, TAU).stroke({ width: 2, color: p.accent, alpha: alpha * 0.9 });
      }, 1.1);
      for (let i = 0; i < 7; i++) {
        const a = Math.PI + (i + 0.5) / 7 * Math.PI;
        kit.spawn("twinkle", sx + Math.cos(a) * 46, sy - 6 + Math.sin(a) * 46, { tint: p.accent, size: 10, sizeEnd: 4, life: 0.9, delay: 0.15 + i * 0.04, spin: 2 });
      }
      for (let i = 0; i < 2; i++) groundRing(sx, sy + 14, 10, (e.range ?? 70) * 1.2, p.color, { delay: i * 0.18, width: 4, life: 0.6 });
      debris("rock", sx, sy + 14, 6, 0xb49a72, { up: 120, size: 8 });
    },
    ymir(e, p, sx, sy) { // Faults Beneath the Ice: jagged cracks race out, ice spikes erupt
      const reach = (e.range ?? 70) * 1.1;
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * TAU + rand(-0.2, 0.2);
        const ex = sx + Math.cos(a) * reach * rand(0.7, 1), ey = sy + 14 + Math.sin(a) * reach * 0.5 * rand(0.7, 1);
        const pts = kit.boltPoints(sx, sy + 14, ex, ey, { detail: 3, rough: 0.22 });
        kit.shape((g, t) => {
          const grow = Math.min(1, t * 3);
          const upto = Math.max(4, Math.floor(pts.length / 2 * grow) * 2);
          const part = pts.slice(0, upto);
          const alpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
          kit.polyline(g, part, { width: 4, color: 0x2b5c8a, alpha: alpha * 0.8, cap: "round", join: "round" });
          kit.polyline(g, part, { width: 1.5, color: p.accent, alpha, cap: "round", join: "round" });
        }, 1.1);
        kit.spawn("shard", ex, ey, { tint: p.color, size: 7, sizeEnd: 12, stretch: 3.4, vy: -20, life: 0.8, delay: 0.3, hold: 0.6, alpha: 0.95 });
      }
      flash(sx, sy, p.color, 70, { life: 0.5, alpha: 0.5 });
      debris("flake", sx, sy, 10, p.accent, { add: true, up: 60, gravity: 40, speed: 120, life: 0.9, size: 8 });
    },
    heimdall(e, p, sx, sy) { // Bifrost Ward: bridge-coloured rings roll out over his allies
      const colors = [0xff7a7a, 0xffd66e, 0x7ee0a0, 0x7cc8ff, 0xc39bff];
      const reach = (e.range ?? 70) * 1.6;
      colors.forEach((color, i) => groundRing(sx, sy + 12, 14, reach, color, { delay: i * 0.07, life: 0.8, width: 4, alpha: 0.75 }));
      flash(sx, sy - 10, p.accent, 60, { life: 0.35 });
    },
    gaia(e, p, sx, sy) { // Where the Roots Hold: a green field spreads over her range, stone wards rise
      const reach = (e.range ?? 170) * 0.9;
      for (let i = 0; i < 2; i++) groundRing(sx, sy + 12, 15, reach, i ? p.accent : p.color, { delay: i * 0.2, life: 0.9, width: 4, alpha: 0.7 });
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * TAU;
        const x = sx + Math.cos(a) * 46, y = sy + 12 + Math.sin(a) * 22;
        kit.spawn("shard", x, y, { tint: 0xa88a5e, size: 4, sizeEnd: 11, stretch: 3, life: 0.9, delay: i * 0.03, add: false, hold: 0.7 });
      }
      rise("leaf", sx, sy - 8, 8, p.color, { spread: 60, size: 10, life: 1, add: false });
      flash(sx, sy, p.color, 60, { life: 0.4, alpha: 0.5 });
    },
    aegir(e, p, sx, sy) { // The Sea Takes a Step: a rolling wave along his facing
      const facing = e.facing ?? Math.atan2(e.y - sy, e.x - sx);
      for (let i = 0; i < 3; i++) kit.shape((g, t) => {
        const d = 10 + t * 90;
        const cx = sx + Math.cos(facing) * d, cy = sy + Math.sin(facing) * d * 0.7;
        const alpha = (1 - t) * 0.85;
        kit.crescent(g, cx, cy, 34 - i * 5, facing - 1.1, facing + 1.1, { thick: 10, color: p.color, alpha, squash: 0.6 });
        kit.crescent(g, cx, cy, 33 - i * 5, facing - 1.1, facing + 1.1, { thick: 3, color: p.accent, alpha, squash: 0.6 });
      }, 0.6, { delay: i * 0.1 });
      for (let i = 0; i < kit.n(12); i++) {
        const side = rand(-1, 1);
        kit.spawn("drop", sx + Math.cos(facing) * 30 - Math.sin(facing) * side * 30, sy + Math.sin(facing) * 20 + Math.cos(facing) * side * 20,
          { tint: i % 3 ? p.color : p.accent, vx: Math.cos(facing) * 160, vy: Math.sin(facing) * 100 - 90, ay: 420, size: 7, life: 0.55, align: true, delay: i * 0.02, add: false });
      }
    },
    helios(e, p, sx, sy) { // Noon at the Narrow Gate: sun disc, then a cone of noon light
      const facing = e.facing ?? Math.atan2(e.y - sy, e.x - sx);
      flash(sx, sy - 34, p.accent, 46, { life: 0.9, grow: 1.1 });
      kit.shape((g, t) => {
        const alpha = t < 0.5 ? 1 : 1 - (t - 0.5) / 0.5;
        for (let i = 0; i < 12; i++) {
          const a = i / 12 * TAU + t * 1.5;
          g.moveTo(sx + Math.cos(a) * 16, sy - 34 + Math.sin(a) * 16).lineTo(sx + Math.cos(a + 0.12) * 28, sy - 34 + Math.sin(a + 0.12) * 28)
            .lineTo(sx + Math.cos(a - 0.12) * 28, sy - 34 + Math.sin(a - 0.12) * 28).closePath();
        }
        g.fill({ color: p.color, alpha: alpha * 0.8 });
        // Wedge of light (a filled cone that fades, not a tracer).
        const reach = 90 * Math.min(1, t * 3);
        g.poly([sx, sy, sx + Math.cos(facing - 0.6) * reach, sy + Math.sin(facing - 0.6) * reach * 0.7,
          sx + Math.cos(facing + 0.6) * reach, sy + Math.sin(facing + 0.6) * reach * 0.7]).fill({ color: p.accent, alpha: alpha * 0.22 });
      }, 0.9);
      sparks(e.x, e.y, 10, p.color, { speed: 180, size: 12, delay: 0.15, gravity: 0 });
      flash(e.x, e.y, 0xffffff, 60, { delay: 0.15, life: 0.3 });
    },
    set(e, p, sx, sy) { // Fuel for the Last Fire: three sweeps of the burning sword, embers return
      const facing = e.facing ?? Math.atan2(e.y - sy, e.x - sx);
      for (let i = 0; i < 3; i++) slash(sx + Math.cos(facing) * 20, sy + Math.sin(facing) * 14, facing, i === 2 ? p.accent : p.color,
        { r: 46 + i * 8, thick: 13, sweep: 2.6, dir: i % 2 ? -1 : 1, delay: i * 0.13, life: 0.3, core: 0xffe0a0, offset: 0 });
      for (let i = 0; i < kit.n(6); i++) {
        const a = facing + rand(-0.8, 0.8), d = rand(30, 60);
        kit.spawn("flame", sx + Math.cos(a) * d, sy + Math.sin(a) * d * 0.7, { tint: i % 2 ? p.color : p.accent, size: 16, sizeEnd: 26, vy: -60, life: 0.5, delay: 0.1 + i * 0.04 });
      }
      flow("ember", e.x, e.y, sx, sy, 5, p.accent, { speed: 260, bend: 20, size: 10, stagger: 0.07 });
    },
    fenrir(e, p, sx, sy) { // Leave the Wound Open: the great jaw closes, venom floods out
      const facing = e.facing ?? Math.atan2(e.y - sy, e.x - sx);
      const cx = sx + Math.cos(facing) * 40, cy = sy + Math.sin(facing) * 28;
      for (const side of [-1, 1]) for (let i = -1; i <= 1; i++) {
        const x = cx + i * 12;
        kit.spawn("fang", x, cy + side * 34, { tint: 0xeef3f6, size: 14, life: 0.26, rot: side > 0 ? Math.PI : 0, add: false, hold: 0.75,
          path: { x1: x, y1: cy + side * 34, x2: x, y2: cy + side * 6, ease: "in" } });
      }
      groundRing(cx, cy + 8, 10, 80, p.color, { delay: 0.22, width: 5, life: 0.6 });
      sparks(cx, cy, 12, p.color, { tex: "drop", size: 9, speed: 170, up: 60, gravity: 380, delay: 0.22, add: false });
      for (let i = 0; i < kit.n(8); i++) kit.spawn("bubble", cx + rand(-40, 40), cy + rand(-10, 16), { tint: p.color, size: 5, sizeEnd: 11, vy: -30, life: 0.8, delay: 0.25 + i * 0.05, wobble: 3, add: false });
      groundRing(sx, sy, 10, 40, 0xb8c0cc, { width: 2, life: 0.4 });
    },
    nott(e, p, sx, sy) { // Where the Lantern Ends: darkness gathers on the target, four crescent cuts
      kit.shape((g, t) => {
        g.circle(e.x, e.y, 40 * (1 - t) + 6).fill({ color: 0x0b0820, alpha: 0.45 * (1 - t) });
      }, 0.7, { add: false });
      for (let i = 0; i < 4; i++) slash(e.x, e.y, (i % 2 ? -1 : 1) * 0.8 + Math.PI / 2, i % 2 ? p.accent : p.color, { r: 28, thick: 7, delay: 0.08 + i * 0.1, offset: 0, life: 0.25 });
      for (let i = 0; i < kit.n(6); i++) kit.spawn("twinkle", e.x + rand(-30, 30), e.y + rand(-26, 10), { tint: p.accent, size: 10, sizeEnd: 2, life: 0.6, delay: 0.2 + i * 0.05 });
      flash(sx, sy, p.color, 50, { life: 0.3, alpha: 0.6 });
    },
    hecate(e, p, sx, sy) { // Every Exit Is Mine: three torches circle the crossroads, three cuts
      orbit("flame", e.x, e.y - 6, 3, p.accent, { r: 34, size: 14, life: 0.9, speed: 6 });
      for (let i = 0; i < 3; i++) slash(e.x, e.y, i * TAU / 3 + 0.5, p.color, { r: 36, thick: 8, sweep: 1.8, delay: 0.15 + i * 0.12, offset: 0, life: 0.28, core: p.accent });
      groundRing(e.x, e.y + 6, 10, e.awakened ? 90 : 55, p.color, { delay: 0.15, life: 0.6 });
    },
    vidar(e, p, sx, sy) { // The Debt Comes Due: crossed strikes and a heavy stomp
      for (const a of [0.8, -0.8, Math.PI / 2]) slash(e.x, e.y, a + Math.PI / 2, p.accent, { r: 26, thick: 6, offset: 0, delay: 0.05, life: 0.25 });
      groundRing(e.x, e.y + 8, 6, 46, p.color, { delay: 0.2, width: 5, life: 0.5, add: false, alpha: 0.6 });
      debris("rock", e.x, e.y + 8, 5, 0x7d8a6a, { delay: 0.2, size: 7 });
      kit.spawn("twinkle", e.x, e.y - 20, { tint: 0xffffff, size: 36, sizeEnd: 6, life: 0.4, spin: 3 });
    },
    thanatos(e, p, sx, sy) { // One Breath Remaining: a pale scythe sweep, the breath leaves
      kit.shape((g, t) => {
        const prog = Math.min(1, t * 2.5), alpha = t < 0.5 ? 1 : 1 - (t - 0.5) / 0.5;
        kit.crescent(g, e.x, e.y - 6, 42, -2.6, 0.5, { thick: 12, color: 0x14161d, alpha: alpha * 0.7, progress: prog, squash: 0.75 });
      }, 0.55, { add: false });
      kit.shape((g, t) => {
        const prog = Math.min(1, t * 2.5), alpha = t < 0.5 ? 1 : 1 - (t - 0.5) / 0.5;
        kit.crescent(g, e.x, e.y - 6, 42, -2.6, 0.5, { thick: 3, color: p.accent, alpha, progress: prog, squash: 0.75 });
      }, 0.55);
      for (let i = 0; i < kit.n(5); i++) kit.spawn("glow", e.x, e.y - 8, { tint: i % 2 ? p.accent : p.color, size: 12, sizeEnd: 5, life: 0.9, delay: 0.2 + i * 0.07,
        path: { x1: e.x, y1: e.y - 8, x2: e.x + rand(-10, 10), y2: e.y - 70, helix: 8, helixFreq: 1.5, phase: i } });
      for (let i = 0; i < 2; i++) groundRing(e.x, e.y + 6, 8, 36, p.color, { delay: 0.3 + i * 0.3, life: 0.6, width: 2 });
    },
    hephaestus(e, p, sx, sy) { // Work the Living Furnace: the hammer lands; the active zone paints the lava
      const r = e.awakened ? 110 : 72;
      flash(e.x, e.y, 0xffffff, 60, { life: 0.25 });
      sparks(e.x, e.y, 16, p.accent, { speed: 220, up: 160, gravity: 520, size: 12, dir: -Math.PI / 2, spread: 2.6, life: 0.7 });
      for (let i = 0; i < kit.n(6); i++) {
        const a = i / 6 * TAU;
        kit.spawn("flame", e.x + Math.cos(a) * r * 0.55, e.y + Math.sin(a) * r * 0.3, { tint: i % 2 ? p.color : p.accent, size: 14, sizeEnd: 24, vy: -50, life: 0.6, delay: 0.1 + i * 0.03 });
      }
    },
    boreas(e, p, sx, sy) { // Winter Comes Through the Door: an ice shockwave fills his attack range
      const r = e.range ?? 160;
      flash(sx, sy, 0xffffff, 60, { life: 0.25 });
      // Round like his range circle (not the squashed ground ring), so the blast matches the area it hits.
      for (let i = 0; i < 3; i++) groundRing(sx, sy, 10, r * (1 - i * 0.12), i ? p.color : p.accent, { delay: i * 0.1, width: 5 - i, life: 0.7, squash: 1 });
      for (let i = 0; i < kit.n(12); i++) {
        const a = i / 12 * TAU;
        kit.spawn("flake", sx, sy, { tint: i % 2 ? p.color : p.accent, size: 10, sizeEnd: 6, life: 0.7, delay: 0.05,
          path: { x1: sx, y1: sy, x2: sx + Math.cos(a) * r, y2: sy + Math.sin(a) * r } });
      }
      flash(sx, sy, p.color, r * 0.8, { life: 0.5, alpha: 0.35 });
    },
    skadi(e, p, sx, sy) { // Follow My Arrow: the hunt mark and a frost ring under the volley
      kit.spawn("twinkle", sx, sy - 30, { tint: p.accent, size: 30, sizeEnd: 8, life: 0.5, spin: 3 });
      groundRing(e.x, e.y + 6, 6, 40, p.color, { life: 0.6, delay: 0.1 });
      debris("flake", e.x, e.y, 6, p.accent, { add: true, up: 40, gravity: 50, speed: 80, life: 0.8, size: 8, delay: 0.1 });
    },
    atalanta(e, p, sx, sy) { // Limitless Shots: wind gathers around her and the leaves lift
      flash(sx, sy - 6, 0xffffff, 54, { life: 0.25 });
      for (let i = 0; i < 3; i++) groundRing(sx, sy + 22, 10, 58, i ? p.accent : p.color, { delay: i * 0.1, life: 0.6, width: 4 - i });
      for (let i = 0; i < kit.n(10); i++) {
        const a = i / 10 * TAU;
        kit.spawn("leaf", sx + Math.cos(a) * 14, sy + 20 + Math.sin(a) * 6, { tint: i % 2 ? p.color : p.accent, size: 9, life: 0.8, vy: -70, vx: Math.cos(a) * 60, ay: 40, spin: rand(-8, 8), delay: i * 0.025, add: false, hold: 0.6 });
      }
    },
    stheno(e, p, sx, sy) { // Hold That Last Step: serpent eyes flare, stone creeps along each gaze
      for (const side of [-1, 1]) flash(sx + side * 6, sy - 12, p.accent, 16, { life: 0.5, grow: 1.1 });
      for (const v of e.gazeTargets ?? [{ x: e.x, y: e.y }]) {
        const end = flow("glow", sx, sy - 12, v.x, v.y, 5, 0xc9d1c4, { speed: 380, bend: 18, arc: 6, size: 10, helix: 10, helixFreq: 2.5, stagger: 0.04 });
        debris("rock", v.x, v.y, 6, 0xb4bab2, { delay: end, size: 8, up: 70 });
        groundRing(v.x, v.y + 4, 4, 26, 0xd2d9cf, { delay: end, life: 0.4 });
      }
    },
    plutus(e, p, sx, sy) { // Enough for Everyone: a fountain of coins for the whole line
      for (let i = 0; i < kit.n(16); i++) {
        const a = -Math.PI / 2 + rand(-0.9, 0.9);
        kit.spawn("coin", sx, sy - 10, { tint: i % 3 ? p.color : p.accent, vx: Math.cos(a) * rand(60, 130), vy: Math.sin(a) * rand(140, 220), ay: 420,
          size: 9, life: 0.9, delay: i * 0.025, rot: rand(0, 3), spin: rand(-8, 8), add: false, hold: 0.7 });
      }
      groundRing(sx, sy + 12, 10, (e.range ?? 90) * 0.9, p.color, { life: 0.8, width: 3 });
      flash(sx, sy, p.accent, 60, { life: 0.4 });
    },
    harmonia(e, p, sx, sy) { // Together, Once More: interlocking rings widen, notes rise
      kit.shape((g, t) => {
        const r = 12 + t * 55, alpha = (1 - t) * 0.9;
        kit.ring(g, sx - r * 0.35, sy, r, { color: p.color, width: 3, alpha, squash: 0.55 });
        kit.ring(g, sx + r * 0.35, sy, r, { color: p.accent, width: 3, alpha, squash: 0.55 });
      }, 0.9);
      rise("note", sx, sy - 10, 7, p.accent, { spread: 50, speed: 50, size: 12, life: 1 });
    },
    asclepius(e, p, sx, sy) { // There Is Still a Pulse: twin serpents climb the staff, two heartbeats
      for (let i = 0; i < 2; i++) for (let j = 0; j < kit.n(6); j++) {
        kit.spawn("dot", sx, sy + 14, { tint: i ? p.accent : p.color, size: 6, life: 0.8, delay: j * 0.06,
          path: { x1: sx, y1: sy + 14, x2: sx, y2: sy - 46, helix: 10, helixFreq: 2, phase: i * Math.PI } });
      }
      for (let i = 0; i < 2; i++) groundRing(sx, sy + 8, 8, 70, p.color, { delay: i * 0.22, width: 4 - i, life: 0.5 });
      rise("plus", sx, sy - 20, 4, p.accent, { spread: 40, size: 9 });
    },
  };

  const CLASS_ULTS = {
    tank(e, p, sx, sy) { // raised shield: a dome over the hero, the ground steadies
      kit.shape((g, t) => {
        const alpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4, r = 38 * (reducedMotion ? 1 : Math.min(1, t * 3));
        g.moveTo(sx - r, sy - 4).arc(sx, sy - 4, r, Math.PI, TAU).stroke({ width: 5, color: p.color, alpha: alpha * 0.4 });
        g.moveTo(sx - r, sy - 4).arc(sx, sy - 4, r, Math.PI, TAU).stroke({ width: 2, color: p.accent, alpha: alpha * 0.9 });
      }, 0.9);
      groundRing(sx, sy + 12, 8, (e.range ?? 60) * 1.1, p.color, { width: 4, life: 0.55 });
      debris("rock", sx, sy + 12, 4, 0xa89878, { up: 90, size: 7 });
    },
    warrior(e, p, sx, sy) { // two wide sweeps and a dust ring
      for (let i = 0; i < 2; i++) slash(e.x, e.y, Math.atan2(e.y - sy, e.x - sx) + (i ? 0.5 : -0.5), i ? p.accent : p.color, { r: 32, thick: 9, sweep: 2.6, offset: 0.1, delay: i * 0.12, life: 0.28, dir: i ? -1 : 1 });
      groundRing(e.x, e.y + 6, 8, 50, p.color, { delay: 0.12, life: 0.5, width: 4 });
      sparks(e.x, e.y, 5, p.accent, { size: 8, speed: 170, delay: 0.12 });
    },
    assassin(e, p, sx, sy) { // three crossed cuts inside a smoke cloud
      kit.shape((g, t) => { g.circle(e.x, e.y, 34 * (1 - t) + 6).fill({ color: 0x1a1824, alpha: 0.35 * (1 - t) }); }, 0.6, { add: false });
      for (let i = 0; i < 3; i++) slash(e.x, e.y, i * TAU / 3 + 0.4, i % 2 ? p.accent : p.color, { r: 26, thick: 6, sweep: 1.8, offset: 0, delay: 0.06 + i * 0.09, life: 0.24 });
      flash(sx, sy, p.color, 40, { life: 0.25, alpha: 0.5 });
    },
    mage(e, p, sx, sy) { // charged orb lands and bursts at the target
      const end = projectile("glow", sx, sy, e.x, e.y, p.accent, { speed: 480, arc: 30, size: 26, trail: moteTrail("dot", p.color, { size: 7, life: 0.35 }), trailEvery: 0.02 });
      flash(e.x, e.y, p.color, 70, { delay: end, life: 0.3 });
      groundRing(e.x, e.y + 4, 8, e.radius ?? 60, p.color, { delay: end, width: 4, life: 0.5 });
      sparks(e.x, e.y, 8, p.accent, { tex: p.mote === "ember" ? "ember" : "dot", size: 9, speed: 190, delay: end });
    },
    archer(e, p, sx, sy) { // a spread volley falling around the target
      for (let i = 0; i < kit.n(5); i++) {
        const tx = e.x + rand(-28, 28), ty = e.y + rand(-16, 16);
        const end = projectile("arrow", sx, sy, tx, ty, p.accent, { speed: p.speed ?? 900, arc: 34, size: 20, add: false, delay: i * 0.06, trail: streakTrail(p.color, { size: 18 }) });
        kit.spawn("twinkle", tx, ty, { tint: p.accent, size: 12, sizeEnd: 3, life: 0.2, delay: end });
      }
      groundRing(e.x, e.y + 6, 6, 42, p.color, { delay: 0.2, life: 0.5 });
    },
    support(e, p, sx, sy) { // widening ring and rising motes over the hero
      for (let i = 0; i < 2; i++) groundRing(sx, sy + 8, 8, (e.range ?? 90) * 0.7, p.color, { delay: i * 0.2, width: 3, life: 0.6 });
      rise(p.mote === "plus" ? "plus" : "twinkle", sx, sy - 12, 6, p.accent, { spread: 40, size: 10, life: 0.9 });
      flash(sx, sy, p.accent, 54, { life: 0.35 });
    },
  };

  // ------------------------------------------------------------ dispatch
  function create(e) {
    const p = PROFILES[e.heroId];
    const sx = e.sourceX ?? e.x1 ?? e.x, sy = e.sourceY ?? e.y1 ?? e.y;
    const x = e.x2 ?? e.x, y = e.y2 ?? e.y;
    const angle = Math.atan2(y - sy, x - sx);
    const big = e.crit ? 1.5 : 1;
    switch (e.type) {
      case "shot": {
        // Melee heroes show their weapon at the impact (hit event); nothing crosses the gap.
        if (!p.ranged) return;
        (SHOTS[e.heroId] ?? CLASS_SHOTS[p.kind] ?? SHOTS.asclepius)(e, sx, sy, x, y, p);
        return;
      }
      case "hit": {
        if (p.ranged) {
          // Impact waits for the projectile launched by the matching shot.
          const delay = travelTime(sx, sy, x, y, p.speed);
          const impact = IMPACTS[e.heroId] ?? CLASS_IMPACTS[p.kind] ?? IMPACTS.asclepius;
          kit.spawn("dot", x, y, { size: 0.1, life: delay, alpha: 0, onEnd: () => {
            impact(x, y, p, big);
            if (e.crit) kit.spawn("twinkle", x, y, { tint: 0xffffff, size: 34, sizeEnd: 8, life: 0.3, spin: 3 });
          } });
          return;
        }
        (MELEE[e.heroId] ?? CLASS_MELEE[p.kind] ?? MELEE.heimdall)(x, y, angle, p, big);
        if (p.kind === "assassin") daggerGlint(x, y, angle, p);
        if (e.crit) kit.spawn("twinkle", x, y, { tint: 0xffffff, size: 34, sizeEnd: 8, life: 0.3, spin: 3 });
        return;
      }
      case "cleave": { // Warrior sweep across the real cleave radius, in the hero's element
        // Crescent wrapped around the target group, sized by the cleave radius.
        const r = Math.min(34, Math.max(20, (e.radius ?? 60) * 0.45));
        slash(e.x, e.y, Math.atan2(e.y - sy, e.x - sx), p.color, { r, thick: 8, sweep: 2.4, offset: 0.2, life: 0.26, core: p.accent, dir: Math.random() < 0.5 ? 1 : -1 });
        if (e.heroId === "aegir") sparks(e.x, e.y, 4, p.accent, { tex: "drop", size: 6, up: 50, gravity: 400, add: false });
        if (e.heroId === "surtr") sparks(e.x, e.y, 4, p.accent, { size: 8, gravity: -120, life: 0.5 });
        if (e.heroId === "fenrir") for (let i = 0; i < kit.n(2); i++) kit.spawn("bubble", e.x + rand(-12, 12), e.y, { tint: p.color, size: 5, sizeEnd: 8, vy: -30, life: 0.5, add: false });
        return;
      }
      case "splash": { // Mage splash at its real radius
        const r = e.radius ?? 42;
        const delay = travelTime(sx, sy, e.x, e.y, p.speed);
        groundRing(e.x, e.y + 4, r * 0.3, r, p.color, { delay, life: 0.35, width: 3 });
        if (e.heroId === "hephaestus") for (let i = 0; i < kit.n(3); i++) kit.spawn("flame", e.x + rand(-r, r) * 0.6, e.y + rand(-r, r) * 0.3, { tint: i % 2 ? p.color : p.accent, size: 10, sizeEnd: 16, vy: -40, life: 0.4, delay });
        if (e.heroId === "boreas") debris("flake", e.x, e.y, 4, p.accent, { add: true, delay, up: 30, gravity: 40, speed: r * 2, life: 0.5, size: 7 });
        return;
      }
      case "dash": { // Assassin reach cue: speed streaks mark the path while the portrait stays at its slot
        for (let i = 0; i < kit.n(4); i++) {
          const t = (i + 1) / 5;
          kit.spawn("streak", sx + (x - sx) * t, sy + (y - sy) * t, { tint: i % 2 ? p.color : p.accent, size: 34, sizeEnd: 12, life: 0.22, delay: i * 0.02, rot: angle, alpha: 0.55, hold: 0 });
        }
        daggerGlint(x, y, angle, p, 0.1);
        slash(x, y, angle, p.color, { r: 18, thick: 6, delay: 0.1, core: p.accent });
        return;
      }
      case "beam": { // Support heal: motes flow along a curve to the ally
        const tex = { plutus: "coin", harmonia: "note", asclepius: "dot", gaia: "leaf", "recruit-poppy": "plus" }[e.heroId] ?? "dot";
        const add = tex === "dot" || tex === "plus";
        const end = flow(tex, sx, sy, x, y, e.heroId === "asclepius" ? 6 : 4, p.color, { speed: 380, bend: 26, arc: 16, size: tex === "dot" ? 6 : 9,
          helix: e.heroId === "asclepius" ? 8 : 0, helixFreq: 3, add, spin: tex === "coin" ? 8 : 0 });
        flash(x, y, p.color, 36, { delay: end, life: 0.3, alpha: 0.6 });
        return;
      }
      case "heal": {
        if (e.heroId === "plutus") {
          for (let i = 0; i < kit.n(5); i++) kit.spawn("coin", x + rand(-16, 16), y - 44, { tint: i % 2 ? p.color : p.accent, vy: 40, ay: 260, size: 8, life: 0.45, delay: i * 0.06, spin: rand(-6, 6), add: false, hold: 0.7 });
        } else if (e.heroId === "surtr" || e.heroId === "hephaestus") {
          orbit("ember", x, y, 6, p.accent, { r: 30, size: 9, life: 0.7, speed: 7, climb: 20 });
        } else {
          const tex = { harmonia: "note", asclepius: "plus", gaia: "leaf", atlas: "twinkle" }[e.heroId] ?? "plus";
          rise(tex, x, y, 5, tex === "plus" ? p.color : p.accent, { size: tex === "note" ? 11 : 9, add: tex !== "leaf" });
        }
        kit.spawn("ring", x, y + 10, { tint: 0x82e89a, size: 20, sizeEnd: 52, stretch: 0.5, life: 0.5, alpha: 0.7, hold: 0.2 });
        return;
      }
      case "extra": { // Window strike (Limitless Shots, Flurry, Solar Rush): one more strike on the target
        const i = e.index ?? 0, n = (e.count ?? 1) + 1;
        const delay = 0.05 + i * 0.05;
        if (e.heroId === "atalanta") { // the arrows fan out around the main shot, each with a spark of the burn
          const off = ((i + 1) - (n - 1) / 2) * 11;
          const tx = x + Math.cos(angle + Math.PI / 2) * off, ty = y + Math.sin(angle + Math.PI / 2) * off;
          const end = projectile("arrow", sx, sy, tx, ty, 0xf1ffd6, { speed: 1100, size: 18, add: false, delay, trail: streakTrail(p.color, { size: 20 }) });
          sparks(tx, ty, 3, 0xff8a3d, { size: 6, up: 30, gravity: 200, life: 0.3, delay: end });
          flash(tx, ty, p.accent, 24, { delay: end, life: 0.15 });
        } else if (e.heroId === "vidar") { // crossed thrusts, alternating sides
          const side = i % 2 ? 0.8 : -0.8;
          daggerGlint(x, y, angle + side, p, delay);
          daggerGlint(x, y, angle - side * 0.4, p, delay + 0.03);
        } else if (e.heroId === "helios") { // the second arc mirrors the first
          slash(x, y, angle, p.color, { r: 20, thick: 8, dir: -1, core: p.accent, delay, life: 0.24 });
        }
        return;
      }
      case "wardhit": { // a blow glances off the bridge-coloured ward
        kit.spawn("twinkle", x + rand(-8, 8), y + rand(-6, 6), { tint: [0xff7a7a, 0xffd66e, 0x7ee0a0, 0x7cc8ff, 0xc39bff][Math.floor(Math.random() * 5)], size: 14, sizeEnd: 4, life: 0.3, spin: 4, optional: true });
        return;
      }
      case "buff": {
        rise(p.mote === "coin" ? "coin" : "twinkle", x, y, 4, p.accent, { size: 9, speed: 55, add: p.mote !== "coin" });
        kit.spawn("glow", x, y, { tint: p.color, size: 40, sizeEnd: 60, life: 0.5, alpha: 0.35 });
        return;
      }
      case "ult": {
        (ULTS[e.heroId] ?? CLASS_ULTS[p.kind] ?? (() => flash(e.x, e.y, p.color, 80)))(e, p, sx, sy);
        // Skill/Evolution improves the utility, not its area. Add a short motif cue
        // rather than enlarging the range ring and suggesting a false hit radius.
        if (UTILITY_ULTS.has(e.heroVariant) && (e.ultimateEffectPower ?? 1) > 1.001) {
          flash(sx, sy - 8, p.accent, 52, { life: 0.35, alpha: 0.4 });
          kit.spawn(p.mote, sx, sy - 26, { tint: p.accent, size: 16, sizeEnd: 5, life: 0.55, alpha: 0.9, add: p.mote !== "leaf" && p.mote !== "coin" });
        }
        return;
      }
    }
  }
  const tmp = { x: 0, y: 0, angle: 0 };

  // ---------------------------------------------------------------- ultimate windows and zones
  // Running states read from the sim every frame: a window on the hero (`hero.win`), a lava
  // zone (`game.zones`) and the Bifrost ward on an ally (`ally.wardFx`). Each gets one shape that
  // lives as long as the state and blinks in its last 1.5 s, so the player sees when it ends.
  const BRIDGE = [0xff7a7a, 0xffd66e, 0x7ee0a0, 0x7cc8ff, 0xc39bff];
  let windowsSeen = new WeakMap(); // hero -> its last `win`
  let zonesSeen = new WeakSet();
  let wardsSeen = new WeakMap(); // ally -> its last `wardUntil`
  const blink = (remaining, age) => (remaining > 1.5 || reducedMotion ? 1 : 0.55 + 0.45 * Math.sin(age * 18));
  // A shape that also ticks `every` seconds of its life (particles) and draws each frame.
  function running(life, every, tick, draw) {
    let next = 0;
    kit.shape((g, t, age) => {
      if (tick && age >= next) { next = age + every; tick(age, life * (1 - t)); }
    }, life, { add: false });
    if (draw) ground.shape((g, t, age) => draw(g, t, age, life * (1 - t)), life);
  }

  function startWindow(hero, life) {
    const p = PROFILES[hero.id];
    if (!p) return;
    const fy = () => hero.y + 22;
    if (hero.id === "atalanta") {
      running(life, 0.16, (age) => {
        const a = age * 4 + Math.random() * 2;
        kit.spawn("leaf", hero.x + Math.cos(a) * 24, fy() - 4 + Math.sin(a) * 8, { tint: p.color, size: 8, vy: -50, vx: Math.cos(a) * 20, life: 0.7, spin: rand(-6, 6), add: false, optional: true });
      }, (g, t, age, left) => {
        const k = blink(left, age);
        kit.ring(g, hero.x, fy(), 30 + Math.sin(age * 5) * 2, { color: p.color, width: 2.5, alpha: 0.6 * k, squash: 0.32 });
        kit.ring(g, hero.x, fy(), 40 + Math.sin(age * 5 + 1) * 3, { color: p.accent, width: 1.5, alpha: 0.35 * k, squash: 0.32 });
      });
    } else if (hero.id === "vidar") {
      running(life, 0.22, () => {
        kit.spawn("streak", hero.x + rand(-14, 14), hero.y + rand(-6, 14), { tint: p.accent, size: 26, sizeEnd: 8, life: 0.2, rot: rand(-0.4, 0.4), alpha: 0.5, optional: true });
      }, (g, t, age, left) => {
        const k = blink(left, age);
        kit.ring(g, hero.x, fy(), 26, { color: p.accent, width: 2, alpha: 0.5 * k, squash: 0.32 });
      });
      // Two fading afterimages trail behind him, drawn dark and flat.
      ground.shape((g, t, age) => {
        const left = life * (1 - t), k = blink(left, age);
        for (let i = 1; i <= 2; i++) g.ellipse(hero.x - i * 12 * Math.sin(age * 3 + i), hero.y + 2, 11, 24).fill({ color: 0x2a3347, alpha: 0.2 / i * k });
      }, life, { add: false });
    } else if (hero.id === "helios") {
      running(life, 0.07, () => {
        kit.spawn("ember", hero.x + rand(-18, 18), hero.y + rand(2, 22), { tint: Math.random() < 0.5 ? p.color : p.accent, size: 7, vy: -80, life: 0.5, optional: true });
      }, (g, t, age, left) => {
        const k = blink(left, age);
        kit.ring(g, hero.x, fy(), 29 + Math.sin(age * 9) * 2, { color: p.color, width: 3, alpha: (0.5 + 0.2 * Math.sin(age * 9)) * k, squash: 0.32 });
      });
    }
  }

  function startLava(z, life, map) {
    const [x, y] = moltenGroundPoint(map, z.x, z.y);
    const edge = Array.from({ length: 16 }, (_, i) => {
      const a = i / 16 * TAU;
      const distance = z.radius * rand(0.75, 0.98);
      return [x + Math.cos(a) * distance, y + Math.sin(a) * distance * 0.43];
    }).flat();
    const veins = Array.from({ length: 6 }, (_, i) => {
      const dy = (i - 2.5) * z.radius * 0.12;
      const halfWidth = z.radius * (0.72 - Math.abs(i - 2.5) * 0.12);
      return kit.boltPoints(x - halfWidth, y + dy, x + halfWidth, y + dy + rand(-8, 8), { detail: 3, rough: 0.18 });
    });
    running(life, 0.11, () => {
      const a = rand(0, TAU), d = Math.sqrt(Math.random()) * z.radius * 0.85;
      kit.spawn("ember", x + Math.cos(a) * d, y + Math.sin(a) * d * 0.43, { tint: Math.random() < 0.5 ? 0xff7a2e : 0xffd27a, size: 8, vy: -55, life: 0.6, optional: true });
      if (Math.random() < 0.3) kit.spawn("flame", x + Math.cos(a) * d, y + Math.sin(a) * d * 0.43, { tint: 0xff7a2e, size: 10, sizeEnd: 18, vy: -35, life: 0.5, optional: true });
    }, (g, _t, age, left) => {
      const fade = Math.min(1, left / 1.2), k = blink(left, age), pulse = 0.65 + 0.35 * Math.sin(age * 4);
      g.poly(edge).fill({ color: 0x180807, alpha: 0.62 * fade });
      for (const v of veins) {
        kit.polyline(g, v, { width: 12, color: 0x721e0a, alpha: 0.65 * fade, cap: "round", join: "round" });
        kit.polyline(g, v, { width: 4, color: 0xff7a20, alpha: 0.65 * pulse * k * fade, cap: "round", join: "round" });
        kit.polyline(g, v, { width: 1.2, color: 0xffcb69, alpha: 0.5 * pulse * k * fade, cap: "round", join: "round" });
      }
    });
  }

  function startWard(ally, life) {
    ground.shape((g, t, age) => {
      if (ally.hpLeft <= 0) return;
      const k = blink(life * (1 - t), age);
      BRIDGE.forEach((color, i) => g.ellipse(ally.x, ally.y + 22, 24 + i * 1.7, 8 + i * 0.6).stroke({ width: 2, color, alpha: 0.55 * k }));
    }, life);
  }

  return {
    reset() { seen = new WeakSet(); windowsSeen = new WeakMap(); zonesSeen = new WeakSet(); wardsSeen = new WeakMap(); },
    update(game, skipEffect = () => false) {
      for (const hero of game.heroes ?? []) {
        const win = hero.win;
        if (win && win.until > game.time && windowsSeen.get(hero) !== win) { windowsSeen.set(hero, win); startWindow(hero, win.until - game.time); }
        if (hero.wardFx === "bifrost" && hero.wardUntil > game.time && wardsSeen.get(hero) !== hero.wardUntil) { wardsSeen.set(hero, hero.wardUntil); startWard(hero, hero.wardUntil - game.time); }
      }
      for (const z of game.zones ?? []) {
        if (zonesSeen.has(z) || z.until <= game.time) continue;
        zonesSeen.add(z);
        startLava(z, z.until - game.time, game.map);
      }
      for (const effect of game.effects) {
        if (seen.has(effect) || !hasHeroFx(effect) || skipEffect(effect)) continue;
        seen.add(effect);
        create(effect);
      }
    },
  };
}
