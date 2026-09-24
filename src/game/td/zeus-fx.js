// Zeus-only visual experiment. CC0 textures; no combat changes.
export function createZeusFx(PIXI, parent, { reducedMotion = false } = {}) {
  const layer = new PIXI.Container();
  parent.addChild(layer);
  const active = new Map();
  const textures = [];
  ["lightning_b", "lightning1_b", "lightning2_b", "lightning3_b"].forEach((name, i) => {
    PIXI.Assets.load(`/td/fx/zeus/${name}.png`).then(t => { textures[i] = t; }).catch(() => {});
  });
  // Shared soft flash, without a filter for every particle.
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.12, "rgba(220,240,255,0.95)");
  gradient.addColorStop(0.35, "rgba(110,150,255,0.4)");
  gradient.addColorStop(1, "rgba(90,60,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const glow = PIXI.Texture.from(canvas);
  function sprite(container) {
    const sp = new PIXI.Sprite(glow);
    sp.anchor.set(0.5);
    sp.blendMode = "add";
    container.addChild(sp);
    return sp;
  }
  function create(effect) {
    const container = new PIXI.Container();
    layer.addChild(container);
    const graphics = new PIXI.Graphics();
    graphics.blendMode = "add";
    const bolts = [];
    const ultimate = effect.type === "ult";
    const count = effect.type === "shot" ? 1 : ultimate ? 5 : 0;
    for (let i = 0; i < count; i++) {
      const angle = i * Math.PI * 2 / count;
      const x2 = ultimate ? effect.x + Math.cos(angle) * (i ? 48 : 0) : effect.x2;
      const y2 = ultimate ? effect.y + Math.sin(angle) * 26 : effect.y2;
      bolts.push({ x1: ultimate ? x2 - 25 + Math.random() * 50 : effect.x1,
        y1: ultimate ? Math.max(0, y2 - 175) : effect.y1,
        x2, y2, strip: sprite(container), branches: [sprite(container), sprite(container)],
        delay: ultimate ? i * 0.055 : 0 });
    }
    container.addChild(graphics);
    const flash = sprite(container);
    flash.position.set(effect.type === "shot" ? effect.x2 : effect.x,
      effect.type === "shot" ? effect.y2 : effect.y);
    const sparks = Array.from({ length: reducedMotion ? 0 : ultimate ? 16 : effect.type === "hit" ? 7 : 0 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 90 + Math.random() * 160;
      return { sp: sprite(container), vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed, length: 4 + Math.random() * 8 };
    });
    return { container, graphics, bolts, flash, sparks, life: effect.life, seed: Math.random() * 1000 };
  }
  function strip(sp, x1, y1, x2, y2, width, alpha, frame) {
    const tex = textures[frame % 4] || textures.find(Boolean);
    sp.visible = Boolean(tex) && alpha > 0;
    if (!sp.visible) return;
    sp.texture = tex;
    sp.position.set((x1 + x2) / 2, (y1 + y2) / 2);
    sp.rotation = Math.atan2(y2 - y1, x2 - x1);
    sp.width = Math.hypot(x2 - x1, y2 - y1);
    sp.height = width;
    sp.alpha = alpha;
  }
  function draw(effect, state) {
    // Simulation lifetime also freezes animation when the game is paused.
    const age = Math.max(0, state.life - effect.life);
    const progress = Math.min(1, age / Math.max(0.001, state.life));
    const fade = Math.max(0, 1 - progress);
    const frame = reducedMotion ? 0 : Math.floor(age * 28);
    const g = state.graphics;
    g.clear();
    const noise = n => Math.sin(n * 127.1 + state.seed + frame * 13.7);
    for (const [index, bolt] of state.bolts.entries()) {
      const localAge = age - (reducedMotion ? 0 : bolt.delay);
      const alpha = localAge < 0 ? 0 : fade * (reducedMotion ? 0.35 : 0.85);
      const dx = bolt.x2 - bolt.x1, dy = bolt.y2 - bolt.y1;
      const length = Math.max(1, Math.hypot(dx, dy));
      strip(bolt.strip, bolt.x1, bolt.y1, bolt.x2, bolt.y2,
        effect.type === "ult" ? 44 : 28, alpha, frame + index);
      // Animated core connects the endpoints, and doubles as a texture-load fallback.
      const points = Array.from({ length: 9 }, (_, i) => {
        const t = i / 8;
        const offset = i === 0 || i === 8 ? 0 : noise(i + index * 9) * 9;
        return [bolt.x1 + dx * t - dy / length * offset, bolt.y1 + dy * t + dx / length * offset];
      });
      for (const [width, color, strength] of [[5, 0x727aff, 0.25], [1.3, 0xe8f6ff, 0.9]]) {
        g.moveTo(...points[0]);
        for (const point of points.slice(1)) g.lineTo(...point);
        g.stroke({ width, color, alpha: alpha * strength });
      }
      bolt.branches.forEach((sp, i) => {
        const [x, y] = points[3 + i * 2];
        const side = i ? 1 : -1;
        strip(sp, x, y, x + dx * 0.2 - dy / length * side * 24,
          y + dy * 0.2 + dx / length * side * 24, 13,
          reducedMotion ? 0 : alpha * 0.6, frame + i + 1);
      });
    }
    const ultimate = effect.type === "ult";
    const size = ultimate ? 140 : effect.type === "hit" ? 60 : 30;
    state.flash.width = state.flash.height = size * (0.65 + progress * 0.65);
    state.flash.alpha = fade * fade * (reducedMotion ? 0.25 : 0.9);
    if (effect.type !== "shot") {
      const radius = reducedMotion ? (ultimate ? 42 : 12) : (ultimate ? 18 + progress * 70 : 5 + progress * 25);
      g.ellipse(effect.x, effect.y, radius, radius * 0.55)
        .stroke({ width: ultimate ? 2.5 : 1.2, color: 0x9eaaff, alpha: fade * 0.65 });
      if (ultimate && !reducedMotion) g.ellipse(effect.x, effect.y, radius * 0.7, radius * 0.38)
        .stroke({ width: 1.5, color: 0xe3edff, alpha: fade * 0.5 });
    }
    for (const { sp, vx, vy, length } of state.sparks) {
      sp.position.set(effect.x + vx * age, effect.y + vy * age + age * age * 65);
      sp.rotation = Math.atan2(vy + age * 130, vx);
      sp.width = length;
      sp.height = 3;
      sp.alpha = fade;
    }
  }
  return {
    update(effects) {
      const live = new Set(effects.filter(effect => effect.heroVariant === "chain_lightning"
        && ["shot", "hit", "ult"].includes(effect.type)));
      for (const [effect, state] of active) {
        if (!live.has(effect)) {
          state.container.destroy({ children: true });
          active.delete(effect);
        }
      }
      for (const effect of live) {
        if (!active.has(effect)) active.set(effect, create(effect));
        draw(effect, active.get(effect));
      }
    },
  };
}
