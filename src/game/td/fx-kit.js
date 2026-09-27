// Shared particle and shape toolkit for tower defense effects (M24c).
// One pooled sprite system plus two shared Graphics (normal and additive) that are
// cleared and redrawn every frame. Hero, lightning and status effects all draw through
// here, so a crowded endless wave costs a bounded number of sprites and two Graphics.
// Browser only: textures are painted on canvases when the kit is created.

const TAU = Math.PI * 2;

// White silhouettes, tinted at runtime. Sizes are texture pixels; sprites scale them.
function paintTextures(PIXI) {
  const out = new Map();
  const draw = (name, w, h, paint) => {
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const c = canvas.getContext("2d");
    c.fillStyle = "white"; c.strokeStyle = "white"; c.lineCap = "round"; c.lineJoin = "round";
    paint(c, w, h);
    out.set(name, PIXI.Texture.from(canvas));
  };
  const radial = (c, x, y, r, stops) => {
    const g = c.createRadialGradient(x, y, 0, x, y, r);
    for (const [at, a] of stops) g.addColorStop(at, `rgba(255,255,255,${a})`);
    c.fillStyle = g;
  };
  // Soft round glow, the workhorse for flashes, motes and trails.
  draw("glow", 64, 64, (c) => { radial(c, 32, 32, 32, [[0, 1], [0.25, 0.75], [0.6, 0.18], [1, 0]]); c.fillRect(0, 0, 64, 64); });
  draw("dot", 16, 16, (c) => { radial(c, 8, 8, 8, [[0, 1], [0.55, 0.9], [1, 0]]); c.fillRect(0, 0, 16, 16); });
  // Stretched spark: drawn along +x, aligned to velocity.
  draw("ember", 32, 8, (c) => {
    const g = c.createLinearGradient(0, 0, 32, 0);
    g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.7, "rgba(255,255,255,0.8)"); g.addColorStop(1, "rgba(255,255,255,1)");
    c.fillStyle = g; c.beginPath(); c.ellipse(16, 4, 16, 3, 0, 0, TAU); c.fill();
  });
  // Motion streak: tapered tail for arrows and gusts.
  draw("streak", 64, 8, (c) => {
    const g = c.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(255,255,255,0.9)");
    c.fillStyle = g; c.beginPath(); c.moveTo(0, 4); c.lineTo(64, 1); c.lineTo(64, 7); c.closePath(); c.fill();
  });
  draw("bubble", 32, 32, (c) => {
    c.fillStyle = "rgba(255,255,255,0.28)"; c.beginPath(); c.arc(16, 16, 13, 0, TAU); c.fill();
    c.lineWidth = 2.5; c.strokeStyle = "rgba(255,255,255,0.95)"; c.beginPath(); c.arc(16, 16, 13, 0, TAU); c.stroke();
    c.fillStyle = "white"; c.beginPath(); c.ellipse(11, 10, 3.5, 2.5, -0.6, 0, TAU); c.fill();
  });
  draw("ring", 64, 64, (c) => { c.lineWidth = 4; c.beginPath(); c.arc(32, 32, 28, 0, TAU); c.stroke(); });
  draw("drop", 24, 32, (c) => {
    c.beginPath(); c.moveTo(12, 2); c.bezierCurveTo(15, 12, 22, 17, 20, 23); c.bezierCurveTo(17, 32, 7, 32, 4, 23);
    c.bezierCurveTo(2, 17, 9, 12, 12, 2); c.fill();
  });
  draw("flame", 32, 48, (c) => {
    const g = c.createLinearGradient(0, 48, 0, 0);
    g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.6, "rgba(255,255,255,0.8)"); g.addColorStop(1, "rgba(255,255,255,0)");
    c.fillStyle = g; c.beginPath(); c.moveTo(16, 1); c.bezierCurveTo(22, 14, 30, 24, 28, 34);
    c.bezierCurveTo(26, 46, 6, 46, 4, 34); c.bezierCurveTo(2, 24, 12, 18, 16, 1); c.fill();
  });
  draw("flake", 32, 32, (c) => {
    c.translate(16, 16); c.lineWidth = 2.2;
    for (let i = 0; i < 6; i++) {
      c.rotate(TAU / 6); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -14);
      c.moveTo(0, -8); c.lineTo(-4, -12); c.moveTo(0, -8); c.lineTo(4, -12); c.stroke();
    }
  });
  draw("shard", 16, 40, (c) => {
    c.beginPath(); c.moveTo(8, 0); c.lineTo(15, 24); c.lineTo(8, 40); c.lineTo(1, 24); c.closePath(); c.fill();
  });
  draw("coin", 32, 32, (c) => {
    c.beginPath(); c.arc(16, 16, 14, 0, TAU); c.fill();
    c.globalCompositeOperation = "destination-out"; c.lineWidth = 2; c.beginPath(); c.arc(16, 16, 10, 0, TAU); c.stroke();
    c.fillRect(13, 13, 6, 6); c.globalCompositeOperation = "source-over";
  });
  draw("leaf", 32, 32, (c) => {
    c.translate(16, 16); c.beginPath(); c.moveTo(-14, 7); c.quadraticCurveTo(-11, -15, 14, -7); c.quadraticCurveTo(7, 13, -14, 7); c.fill();
  });
  draw("feather", 16, 48, (c) => {
    c.beginPath(); c.moveTo(8, 1); c.bezierCurveTo(16, 14, 15, 34, 8, 47); c.bezierCurveTo(1, 34, 0, 14, 8, 1); c.fill();
    c.globalCompositeOperation = "destination-out"; c.lineWidth = 1;
    for (let y = 10; y < 42; y += 6) { c.beginPath(); c.moveTo(8, y); c.lineTo(2, y - 5); c.moveTo(8, y); c.lineTo(14, y - 5); c.stroke(); }
    c.globalCompositeOperation = "source-over";
  });
  draw("note", 32, 32, (c) => {
    c.beginPath(); c.ellipse(11, 24, 6, 4.5, -0.4, 0, TAU); c.fill();
    c.lineWidth = 2.5; c.beginPath(); c.moveTo(16, 23); c.lineTo(16, 4); c.quadraticCurveTo(24, 8, 26, 14); c.stroke();
  });
  draw("plus", 24, 24, (c) => { c.fillRect(9, 2, 6, 20); c.fillRect(2, 9, 20, 6); });
  draw("rock", 32, 32, (c) => {
    c.beginPath(); c.moveTo(6, 11); c.lineTo(17, 3); c.lineTo(29, 14); c.lineTo(22, 29); c.lineTo(5, 24); c.closePath(); c.fill();
  });
  // Four-point twinkle for glints and stars.
  draw("twinkle", 32, 32, (c) => {
    c.translate(16, 16); c.beginPath();
    for (let i = 0; i < 8; i++) { const r = i % 2 ? 3 : 15; const a = i / 8 * TAU; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    c.closePath(); c.fill();
  });
  // Proper arrow, pointing along +x: shaft, head and fletching.
  draw("arrow", 64, 16, (c) => {
    c.lineWidth = 2.5; c.beginPath(); c.moveTo(6, 8); c.lineTo(52, 8); c.stroke();
    c.beginPath(); c.moveTo(63, 8); c.lineTo(49, 2); c.lineTo(52, 8); c.lineTo(49, 14); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(2, 2); c.lineTo(14, 8); c.lineTo(2, 14); c.lineTo(7, 8); c.closePath(); c.fill();
  });
  // Molten or icy fragment, a jagged pebble.
  draw("fragment", 24, 24, (c) => {
    c.beginPath(); c.moveTo(4, 12); c.lineTo(10, 3); c.lineTo(19, 6); c.lineTo(22, 15); c.lineTo(13, 22); c.closePath(); c.fill();
  });
  // Curved fang for bites.
  draw("fang", 24, 40, (c) => {
    c.beginPath(); c.moveTo(3, 2); c.quadraticCurveTo(22, 4, 20, 38); c.quadraticCurveTo(12, 16, 3, 12); c.closePath(); c.fill();
  });
  // Three Elder Futhark-style glyphs for Odin (straight-stroke runes).
  const runes = [
    [[[10, 4], [10, 28]], [[10, 8], [22, 14]], [[10, 16], [22, 22]]],     // fehu-like
    [[[16, 4], [16, 28]], [[8, 10], [16, 16]], [[24, 10], [16, 16]]],     // algiz-like
    [[[8, 4], [8, 28]], [[24, 4], [24, 28]], [[8, 4], [24, 28]], [[24, 4], [8, 28]]], // dagaz-like
  ];
  runes.forEach((strokes, i) => draw(`rune${i}`, 32, 32, (c) => {
    c.lineWidth = 3;
    for (const [[x1, y1], [x2, y2]] of strokes) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
  }));
  return out;
}

export function createFxKit(PIXI, parent, { reducedMotion = false, max = 900 } = {}) {
  const layer = new PIXI.Container();
  parent.addChild(layer);
  const under = new PIXI.Graphics();          // normal blend: dust, shadows, dark smoke
  const partNormal = new PIXI.Container();    // normal blend particles (bubbles, coins, arrows)
  const partAdd = new PIXI.Container();       // additive particles (glow, sparks, flames)
  const glow = new PIXI.Graphics();           // additive shapes: arcs, bolts, rings
  glow.blendMode = "add";
  layer.addChild(under, partNormal, partAdd, glow);
  const textures = paintTextures(PIXI);

  const live = [];
  const free = [];
  const shapes = [];
  const MAX_SHAPES = 160;

  function texture(name, extra) {
    return textures.get(name) ?? extra?.get(name) ?? PIXI.Texture.EMPTY;
  }

  // Particle options (all optional):
  //   vx, vy, ax, ay (px/s, px/s^2), drag (1/s), life, delay, size, sizeEnd, stretch (height/width),
  //   alpha, fadeIn (fraction of life), rot, spin, align (face velocity), tint, add (additive blend),
  //   wobble/wobbleFreq (sideways sway px/Hz), path {x1,y1,x2,y2,arc,helix,helixFreq,phase,ease},
  //   onStep(p, dt), onEnd(p), optional (skip instead of recycling when the pool is full).
  function spawn(name, x, y, o = {}) {
    if (live.length >= max) {
      if (o.optional) return null;
      kill(0);
    }
    let p = free.pop();
    if (!p) { const sp = new PIXI.Sprite(PIXI.Texture.EMPTY); sp.anchor.set(0.5); p = { sp }; }
    const sp = p.sp;
    const tex = o.texture ?? texture(name);
    sp.texture = tex;
    sp.tint = o.tint ?? 0xffffff;
    sp.visible = false;
    (o.add === false ? partNormal : partAdd).addChild(sp);
    p.x = x; p.y = y; p.x0 = x; p.y0 = y;
    p.vx = o.vx ?? 0; p.vy = o.vy ?? 0; p.ax = o.ax ?? 0; p.ay = o.ay ?? 0; p.drag = o.drag ?? 0;
    p.life = Math.max(0.01, o.life ?? 0.4); p.age = 0; p.delay = o.delay ?? 0;
    p.size = o.size ?? 16; p.sizeEnd = o.sizeEnd ?? p.size; p.stretch = o.stretch ?? (tex.height / Math.max(1, tex.width));
    p.alpha = o.alpha ?? 1; p.fadeIn = o.fadeIn ?? 0.08; p.hold = o.hold ?? 0.35;
    p.rot = o.rot ?? 0; p.spin = o.spin ?? 0; p.align = !!o.align;
    p.wobble = o.wobble ?? 0; p.wobbleFreq = o.wobbleFreq ?? 3; p.phase = o.phase ?? Math.random() * TAU;
    p.path = o.path ?? null; p.onStep = o.onStep ?? null; p.onEnd = o.onEnd ?? null; p.data = o.data ?? null;
    p.invW = 1 / Math.max(1, tex.width);
    if (reducedMotion && !p.path) { p.vx = 0; p.vy = 0; p.ax = 0; p.ay = 0; p.spin = 0; p.wobble = 0; p.sizeEnd = p.size; }
    live.push(p);
    return p;
  }

  function kill(index) {
    const p = live[index];
    live[index] = live[live.length - 1];
    live.pop();
    p.sp.visible = false;
    p.sp.parent?.removeChild(p.sp);
    p.onStep = p.onEnd = p.path = p.data = null;
    free.push(p);
  }

  // Quadratic bezier from (x1,y1) to (x2,y2) with the control point lifted by `arc`
  // (negative = up on screen) and an optional helix wobble around the curve.
  function pathPoint(path, t, out) {
    const { x1, y1, x2, y2 } = path;
    const arc = path.arc ?? 0;
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const len = Math.hypot(x2 - x1, y2 - y1) || 1;
    const nx = -(y2 - y1) / len, ny = (x2 - x1) / len;
    // Arc lifts toward the screen top for lobbed shots; `bend` bows sideways.
    const cx = mx + nx * (path.bend ?? 0), cy = my + ny * (path.bend ?? 0) - arc;
    const u = 1 - t;
    let x = u * u * x1 + 2 * u * t * cx + t * t * x2;
    let y = u * u * y1 + 2 * u * t * cy + t * t * y2;
    const tx = 2 * u * (cx - x1) + 2 * t * (x2 - cx), ty = 2 * u * (cy - y1) + 2 * t * (y2 - cy);
    if (path.helix) {
      const tl = Math.hypot(tx, ty) || 1;
      const off = Math.sin(t * TAU * (path.helixFreq ?? 2) + (path.phase ?? 0)) * path.helix * Math.sin(Math.PI * t);
      x += -ty / tl * off; y += tx / tl * off;
    }
    out.x = x; out.y = y; out.angle = Math.atan2(ty, tx);
    return out;
  }
  const tmp = { x: 0, y: 0, angle: 0 };

  function stepParticles(dt) {
    for (let i = live.length - 1; i >= 0; i--) {
      const p = live[i];
      p.age += dt;
      const local = p.age - p.delay;
      if (local < 0) { p.sp.visible = false; continue; }
      const t = local / p.life;
      if (t >= 1) {
        const end = p.onEnd;
        const snapshot = end ? { x: p.x, y: p.y, angle: p.rot, data: p.data } : null;
        kill(i);
        if (end) end(snapshot);
        continue;
      }
      const sp = p.sp;
      sp.visible = true;
      if (p.path) {
        const ease = p.path.ease === "in" ? t * t : t;
        pathPoint(p.path, ease, tmp);
        const dx = tmp.x - p.x, dy = tmp.y - p.y;
        p.x = tmp.x; p.y = tmp.y;
        p.vx = dx / Math.max(dt, 1e-4); p.vy = dy / Math.max(dt, 1e-4);
        p.rot = tmp.angle;
      } else {
        p.vx += p.ax * dt; p.vy += p.ay * dt;
        if (p.drag) { const k = Math.max(0, 1 - p.drag * dt); p.vx *= k; p.vy *= k; }
        p.x += p.vx * dt; p.y += p.vy * dt;
      }
      const sway = p.wobble ? Math.sin(local * p.wobbleFreq * TAU + p.phase) * p.wobble : 0;
      sp.position.set(p.x + sway, p.y);
      sp.rotation = p.path || p.align ? (p.path ? p.rot : Math.atan2(p.vy, p.vx)) : p.rot + p.spin * local;
      const size = p.size + (p.sizeEnd - p.size) * t;
      const s = size * p.invW;
      sp.scale.set(s, s * p.stretch * (sp.texture.width / Math.max(1, sp.texture.height)));
      const fadeIn = p.fadeIn > 0 ? Math.min(1, t / p.fadeIn) : 1;
      const fadeOut = t > p.hold ? 1 - (t - p.hold) / (1 - p.hold) : 1;
      sp.alpha = p.alpha * fadeIn * fadeOut * (reducedMotion ? 0.6 : 1);
      if (p.onStep) p.onStep(p, dt, t);
    }
  }

  // Shapes are redrawn every frame into the shared Graphics: draw(g, t, age, shape).
  function shape(draw, life, { delay = 0, add = true } = {}) {
    if (shapes.length >= MAX_SHAPES) shapes.shift();
    const s = { draw, life: Math.max(0.01, life), delay, age: 0, add };
    shapes.push(s);
    return s;
  }

  function stepShapes(dt) {
    glow.clear(); under.clear();
    for (let i = shapes.length - 1; i >= 0; i--) {
      const s = shapes[i];
      s.age += dt;
      const local = s.age - s.delay;
      if (local < 0) continue;
      const t = local / s.life;
      if (t >= 1) { shapes.splice(i, 1); continue; }
      s.draw(s.add ? glow : under, t, local, s);
    }
  }

  // ---------------------------------------------------------------- geometry helpers

  // Midpoint displacement lightning: returns flat [x0,y0,x1,y1,...] from a to b.
  function boltPoints(x1, y1, x2, y2, { detail = 4, rough = 0.28, rand = Math.random } = {}) {
    let pts = [x1, y1, x2, y2];
    let spread = Math.hypot(x2 - x1, y2 - y1) * rough;
    for (let level = 0; level < detail; level++) {
      const next = [pts[0], pts[1]];
      for (let i = 0; i < pts.length - 2; i += 2) {
        const ax = pts[i], ay = pts[i + 1], bx = pts[i + 2], by = pts[i + 3];
        const len = Math.hypot(bx - ax, by - ay) || 1;
        const off = (rand() - 0.5) * spread;
        next.push((ax + bx) / 2 - (by - ay) / len * off, (ay + by) / 2 + (bx - ax) / len * off, bx, by);
      }
      pts = next;
      spread *= 0.5;
    }
    return pts;
  }

  function polyline(g, pts, style) {
    g.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]);
    g.stroke(style);
  }

  // Layered bolt stroke: wide soft halo, colored body, white-hot core.
  function drawBolt(g, pts, { color = 0x8fb4ff, width = 3, alpha = 1 } = {}) {
    if (alpha <= 0.01) return;
    polyline(g, pts, { width: width * 4, color, alpha: alpha * 0.14, cap: "round", join: "round" });
    polyline(g, pts, { width: width * 1.8, color, alpha: alpha * 0.55, cap: "round", join: "round" });
    polyline(g, pts, { width: Math.max(1, width * 0.6), color: 0xffffff, alpha: alpha * 0.95, cap: "round", join: "round" });
  }

  // Tapered crescent swept from a0 toward a1 (radians) around (cx, cy); progress reveals it.
  function crescent(g, cx, cy, r, a0, a1, { thick = 8, color = 0xffffff, alpha = 1, progress = 1, squash = 0.7, tail = 1 } = {}) {
    if (alpha <= 0.01 || progress <= 0) return;
    const n = 14;
    const head = a0 + (a1 - a0) * progress;
    const start = a0 + (a1 - a0) * Math.max(0, progress - tail);
    const outer = [], inner = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n, a = start + (head - start) * u;
      const w = thick * Math.sin(Math.PI * Math.min(1, u * 1.15)) + 0.4;
      outer.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r * squash);
      inner.unshift(cx + Math.cos(a) * (r - w), cy + Math.sin(a) * (r - w) * squash); // keeps x,y order
    }
    g.poly(outer.concat(inner)).fill({ color, alpha });
  }

  // Ground ellipse ring (isometric-ish squash).
  function ring(g, x, y, r, { color = 0xffffff, width = 2, alpha = 1, squash = 0.5 } = {}) {
    if (alpha <= 0.01 || r <= 0) return;
    g.ellipse(x, y, r, r * squash).stroke({ width, color, alpha });
  }

  function clear() {
    for (let i = live.length - 1; i >= 0; i--) kill(i);
    shapes.length = 0;
    glow.clear(); under.clear();
  }

  return {
    PIXI, textures, reducedMotion,
    spawn, shape, update(dt) { stepParticles(dt); stepShapes(dt); },
    clear, texture, boltPoints, drawBolt, polyline, crescent, ring, pathPoint,
    count: () => live.length,
    load: () => live.length / max,
    // Scale requested particle counts down for reduced motion.
    n: (count) => (reducedMotion ? Math.min(count, Math.max(1, Math.ceil(count / 4))) : count),
    rand: (a, b) => a + Math.random() * (b - a),
    TAU,
  };
}
