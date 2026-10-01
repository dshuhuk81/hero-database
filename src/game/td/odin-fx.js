// Odin's runic lightning (heroVariant chain_lightning, M24c). Also used by the Mage Arc path.
// Bolts are midpoint-displaced, forked and re-struck ~20 times a second; CC0 lightning strips
// (public/td/fx/odin) overlay the procedural core. Presentation only; no combat changes.
import { tdAsset } from "./assets.js";

const BOLT = 0x8fb4ff;
const DEEP = 0x5b6cff;

export function createOdinFx(PIXI, parent, kit, { reducedMotion = false } = {}) {
  const layer = new PIXI.Container();
  parent.addChild(layer);
  const graphics = new PIXI.Graphics();
  graphics.blendMode = "add";
  const active = new Map();
  const textures = [];
  ["lightning_b", "lightning1_b", "lightning2_b", "lightning3_b"].forEach((name, i) => {
    PIXI.Assets.load(tdAsset(`fx/odin/${name}.png`)).then((t) => { textures[i] = t; }).catch(() => {});
  });
  const strips = new PIXI.Container();
  layer.addChild(strips, graphics);
  const stripPool = [];
  let stripUsed = 0;
  let boltsThisFrame = 0;

  function strip(x1, y1, x2, y2, width, alpha, frame) {
    const tex = textures[frame % 4] || textures.find(Boolean);
    if (!tex || alpha <= 0.02) return;
    let sp = stripPool[stripUsed];
    if (!sp) { sp = new PIXI.Sprite(tex); sp.anchor.set(0.5); sp.blendMode = "add"; strips.addChild(sp); stripPool.push(sp); }
    stripUsed += 1;
    sp.visible = true;
    sp.texture = tex;
    sp.position.set((x1 + x2) / 2, (y1 + y2) / 2);
    sp.rotation = Math.atan2(y2 - y1, x2 - x1);
    sp.width = Math.hypot(x2 - x1, y2 - y1);
    sp.height = width;
    sp.alpha = alpha;
  }

  // One strike: main path plus 1-3 short forks, rebuilt when `frame` changes.
  function strike(x1, y1, x2, y2, rough = 0.3) {
    const main = kit.boltPoints(x1, y1, x2, y2, { detail: 4, rough });
    const forks = [];
    const count = reducedMotion ? 0 : 1 + Math.floor(Math.random() * 2.5);
    const len = Math.hypot(x2 - x1, y2 - y1);
    for (let i = 0; i < count; i++) {
      const k = 2 * (4 + Math.floor(Math.random() * (main.length / 2 - 8)));
      const bx = main[k], by = main[k + 1];
      const a = Math.atan2(y2 - y1, x2 - x1) + (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.6);
      const fl = len * (0.18 + Math.random() * 0.2);
      forks.push(kit.boltPoints(bx, by, bx + Math.cos(a) * fl, by + Math.sin(a) * fl, { detail: 3, rough: 0.35 }));
    }
    return { main, forks };
  }

  function runeMark(x, y, size, delay = 0) {
    kit.spawn(`rune${Math.floor(Math.random() * 3)}`, x, y - 16, { tint: 0xdbe7ff, size, sizeEnd: size * 1.3, vy: -18, life: 0.55, delay, hold: 0.3 });
  }

  function create(effect) {
    const bolts = [];
    const ult = effect.type === "ult";
    if (effect.type === "shot") {
      bolts.push({ x1: effect.x1, y1: effect.y1 - 8, x2: effect.x2, y2: effect.y2, width: 2.6, delay: 0 });
      // Arrival: bright node, sparks, a fading rune.
      kit.spawn("glow", effect.x2, effect.y2, { tint: BOLT, size: 34, sizeEnd: 50, life: 0.22, hold: 0.1 });
    } else if (effect.type === "hit") {
      kit.spawn("glow", effect.x, effect.y, { tint: 0xffffff, size: 26, sizeEnd: 44, life: 0.2, hold: 0.1 });
      for (let i = 0; i < kit.n(effect.crit ? 9 : 5); i++) {
        const a = Math.random() * kit.TAU, v = 90 + Math.random() * 150;
        kit.spawn("ember", effect.x, effect.y, { tint: i % 2 ? 0xffffff : BOLT, vx: Math.cos(a) * v, vy: Math.sin(a) * v, ay: 200, drag: 2, size: 10, sizeEnd: 4, life: 0.3, align: true });
      }
      if (effect.crit || Math.random() < 0.35) runeMark(effect.x, effect.y, effect.crit ? 18 : 12);
    } else if (ult) {
      // The Answer Travels: a rune circle opens, bolts fall from the sky into it.
      for (let i = 0; i < 5; i++) {
        const a = i / 5 * kit.TAU + Math.random() * 0.4;
        const x2 = effect.x + (i ? Math.cos(a) * 46 : 0), y2 = effect.y + (i ? Math.sin(a) * 24 : 0);
        bolts.push({ x1: x2 - 30 + Math.random() * 60, y1: Math.max(0, y2 - 190), x2, y2, width: i ? 3 : 4.5, delay: reducedMotion ? 0 : 0.08 + i * 0.06, sky: true });
      }
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * kit.TAU;
        kit.spawn(`rune${i % 3}`, effect.x, effect.y, { tint: 0xcfe0ff, size: 14, life: 0.9, hold: 0.6,
          onStep: (p) => {
            const local = p.age - p.delay, ang = a + (reducedMotion ? 0 : local * 1.6);
            p.sp.position.set(effect.x + Math.cos(ang) * 56, effect.y + Math.sin(ang) * 30);
            p.sp.rotation = 0;
          } });
      }
      kit.spawn("glow", effect.x, effect.y, { tint: DEEP, size: 90, sizeEnd: 150, life: 0.6, alpha: 0.6, delay: 0.1 });
      for (let i = 0; i < kit.n(14); i++) {
        const a = Math.random() * kit.TAU, v = 120 + Math.random() * 180;
        kit.spawn("ember", effect.x, effect.y, { tint: i % 2 ? 0xffffff : BOLT, vx: Math.cos(a) * v, vy: Math.sin(a) * v * 0.7 - 60, ay: 260, drag: 1.5, size: 14, sizeEnd: 5, life: 0.55, align: true, delay: 0.12 });
      }
    }
    return { bolts, life: effect.life, ult, x: effect.x, y: effect.y, frame: -1, cache: [] };
  }

  function draw(effect, state) {
    // Simulation lifetime also freezes animation when the game is paused.
    const age = Math.max(0, state.life - effect.life);
    const progress = Math.min(1, age / Math.max(0.001, state.life));
    const fade = Math.max(0, 1 - progress);
    const frame = reducedMotion ? 0 : Math.floor(age * 20);
    const restrike = frame !== state.frame;
    state.frame = frame;
    state.bolts.forEach((bolt, i) => {
      const local = age - bolt.delay;
      if (local < 0) return;
      if (restrike || !state.cache[i]) state.cache[i] = strike(bolt.x1, bolt.y1, bolt.x2, bolt.y2, bolt.sky ? 0.22 : 0.3);
      // Flicker: strong on the first frames, then dimming pulses.
      const flicker = reducedMotion ? 0.5 : (frame % 2 ? 0.75 : 1);
      const alpha = fade * flicker;
      const { main, forks } = state.cache[i];
      // Many simultaneous bolts (an ultimate hitting a crowd) would add up to a white blot:
      // only the first few get the texture strip, later ones are drawn thinner.
      boltsThisFrame += 1;
      const crowded = boltsThisFrame > 4;
      if (!crowded) strip(bolt.x1, bolt.y1, bolt.x2, bolt.y2, bolt.sky ? 36 : 20, alpha * 0.4, frame + i);
      kit.drawBolt(graphics, main, { color: BOLT, width: crowded ? bolt.width * 0.6 : bolt.width, alpha: crowded ? alpha * 0.6 : alpha });
      for (const f of forks) kit.drawBolt(graphics, f, { color: DEEP, width: bolt.width * 0.5, alpha: alpha * 0.8 });
    });
    if (state.ult) {
      const r = reducedMotion ? 50 : 20 + progress * 60;
      kit.ring(graphics, state.x, state.y, r, { color: BOLT, width: 3, alpha: fade * 0.8, squash: 0.52 });
      kit.ring(graphics, state.x, state.y, 56, { color: 0xcfe0ff, width: 1.5, alpha: fade * 0.6, squash: 0.53 });
    }
  }

  return {
    update(effects) {
      graphics.clear();
      stripUsed = 0;
      boltsThisFrame = 0;
      const live = new Set();
      for (const effect of effects) {
        if (effect.heroVariant !== "chain_lightning" || !["shot", "hit", "ult"].includes(effect.type)) continue;
        live.add(effect);
        if (!active.has(effect)) active.set(effect, create(effect));
        draw(effect, active.get(effect));
      }
      for (const effect of active.keys()) if (!live.has(effect)) active.delete(effect);
      for (let i = stripUsed; i < stripPool.length; i++) stripPool[i].visible = false;
    },
  };
}
