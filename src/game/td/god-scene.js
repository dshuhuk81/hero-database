// God-Mode scene (the arena and the layered Cronus rig). It stands in for map-scene.js when the
// run is a God-Mode challenge: lava canyon backdrop, the board floor, the parapet the god stands
// behind, tile art per cell type, the god's idle life and attack poses, telegraphs and impacts.
// Everything is driven by the sim: `game.godAttack` (phase, clock, index) and the god effects
// (godTelegraph, godStrike). Pure view code; nothing here touches combat state.
import { boardOf, cellCenter } from "./board.js";

const DIR = "/td/god-mode/cronus/";
const TAU = Math.PI * 2;
const EMBER_TINTS = [0xff7a1a, 0xffb03a, 0xffe08a];
const SWING = 0.14; // seconds of the arm's fall, right before the blow lands

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const easeOut = (t) => 1 - (1 - t) * (1 - t);

// Tile art per cell type: melee front (road tiles), platforms, raised gallery (high ground).
const TILES = {
  road: { fill: 0x6d4826, alpha: 0.62, stroke: 0xffbd52 },
  platform: { fill: 0x1d4c5f, alpha: 0.58, stroke: 0x62d5ef },
  highground: { fill: 0x4a3b1c, alpha: 0.64, stroke: 0xe5bd68 },
};

export async function createGodScene(PIXI, game, { layers, reducedMotion = false, onImpact = () => {} }) {
  const cfg = game.god;
  const board = boardOf(game.map);
  const rig = await fetch(`${DIR}rig.json`).then((response) => response.json());
  const names = [rig.torso.file, rig.headRoar.file, ...Object.values(rig.arms).map((arm) => arm.file)];
  const [wideTex, floorTex, ...partTex] = await Promise.all([
    PIXI.Assets.load(`${DIR}${rig.arena.wide}`),
    PIXI.Assets.load(`${DIR}${rig.arena.floor}`),
    ...names.map((name) => PIXI.Assets.load(`${DIR}${name}`)),
  ]);
  const tex = Object.fromEntries(names.map((name, index) => [name, partTex[index]]));

  const ks = cfg.rig.scale; // rig sprite scale: one texture pixel in world pixels
  const baseY = cfg.rig.baseY; // where the torso's bottom edge sits (hidden behind the parapet and floor)
  const half = rig.size / 2;
  const toWorld = (p) => [480 + (p[0] - half) * ks, baseY + (p[1] - rig.size) * ks];
  const boardLeft = board.origin[0], boardTop = board.origin[1];
  const boardRight = boardLeft + board.cols * board.cell;
  const wallTop = boardTop - 26;

  // ---- layers, back to front inside the ground background ----
  const make = (parent) => { const container = new PIXI.Container(); parent.addChild(container); return container; };
  const backdrop = new PIXI.Sprite(wideTex);
  backdrop.width = 1260; backdrop.height = 540; backdrop.x = -150; backdrop.tint = 0xd8c8c0;
  layers.bgTex.addChild(backdrop, new PIXI.Graphics().rect(0, 0, 960, 540).fill({ color: 0x120706, alpha: 0.4 }));
  const smokeBack = make(layers.bgTex);
  const armRear = make(layers.bgTex); // both arms at rest and in the windup: behind the torso
  const bossLayer = make(layers.bgTex);
  const smokeFront = make(layers.bgTex);

  const torso = new PIXI.Sprite(tex[rig.torso.file]);
  torso.anchor.set(0.5, 1); torso.scale.set(ks); torso.position.set(480, baseY);
  const head = new PIXI.Sprite(tex[rig.headRoar.file]);
  head.anchor.set(rig.headRoar.top[0] / rig.size, rig.headRoar.top[1] / rig.size);
  head.scale.set(ks * rig.headRoar.defaultScale);
  head.position.set(480 + (rig.torso.headTop[0] - half) * ks, baseY + (rig.torso.headTop[1] - rig.size) * ks);
  head.visible = false;
  bossLayer.addChild(torso, head);

  // The painted floor remains below the boss; only a quiet basalt parapet separates them.
  const floor = new PIXI.Sprite(floorTex);
  floor.width = 960; floor.height = 540;
  const floorMask = new PIXI.Graphics().roundRect(boardLeft - 14, boardTop - 6, boardRight - boardLeft + 28, 540 - boardTop + 6, 10).fill(0xffffff);
  floor.mask = floorMask;
  layers.bgTex.addChild(floorMask, floor);
  const parapet = new PIXI.Graphics();
  parapet.poly([boardLeft - 30, wallTop, boardRight + 30, wallTop, boardRight + 14, boardTop + 4, boardLeft - 14, boardTop + 4]).fill({ color: 0x3b322f, alpha: 0.9 });
  parapet.poly([boardLeft - 14, boardTop - 4, boardRight + 14, boardTop - 4, boardRight + 4, boardTop + 14, boardLeft - 4, boardTop + 14]).fill({ color: 0x1e1a1c, alpha: 0.9 });
  layers.bgTex.addChild(parapet);

  const marks = new PIXI.Graphics(); // telegraph tiles, strike flashes, lava pools
  layers.groundFx.addChild(marks);
  const armFront = make(layers.fore); // the striking arm, above parapet and heroes
  const overlayLayer = make(layers.fore);
  const partsLayer = make(layers.parts);
  const flashG = new PIXI.Graphics().rect(0, 0, 960, 540).fill(0xfff1d6);
  flashG.alpha = 0;
  layers.hud.addChild(flashG);

  // A masked copy of the torso covers the tucked-in shoulder end of the striking arm.
  const torsoOverlay = new PIXI.Sprite(tex[rig.torso.file]);
  torsoOverlay.anchor.set(0.5, 1); torsoOverlay.scale.set(ks); torsoOverlay.position.set(480, baseY);
  const overlayMask = new PIXI.Graphics();
  torsoOverlay.mask = overlayMask;
  torsoOverlay.visible = false;
  overlayLayer.addChild(torsoOverlay, overlayMask);

  // ---- arms: authored for one body side, mirrored for the other; the shoulder never moves ----
  const arms = { L: new PIXI.Sprite(), R: new PIXI.Sprite() };
  const poseKey = { L: "", R: "" };
  armRear.addChild(arms.L, arms.R);
  function setArm(side, pose) {
    const def = rig.arms[pose];
    if (poseKey[side] !== pose) {
      poseKey[side] = pose;
      arms[side].texture = tex[def.file];
      arms[side].anchor.set(def.pivot[0] / rig.size, def.pivot[1] / rig.size);
    }
    return def.side === side ? 1 : -1;
  }
  setArm("L", "rest"); setArm("R", "rest");
  const shoulder = {
    L: toWorld([rig.torso.stumpL[0] + rig.torso.armInset, rig.torso.stumpL[1]]),
    R: toWorld([rig.torso.stumpR[0] - rig.torso.armInset, rig.torso.stumpR[1]]),
  };
  function place(side, pose, rotation, front) {
    const mirror = setArm(side, pose), sprite = arms[side];
    sprite.position.set(shoulder[side][0], shoulder[side][1]);
    sprite.scale.set(ks * mirror, ks);
    sprite.rotation = rotation * mirror;
    const layer = front ? armFront : armRear;
    if (sprite.parent !== layer) layer.addChild(sprite);
  }

  // ---- particles: pooled sprites with chunky nearest-neighbour textures ----
  const makeTexture = (size, draw) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    draw(canvas.getContext("2d"), size);
    const texture = PIXI.Texture.from(canvas);
    texture.source.scaleMode = "nearest";
    return texture;
  };
  const texSq = makeTexture(4, (ctx, s) => { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, s, s); });
  const texPuff = makeTexture(24, (ctx, s) => { ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 2, 0, TAU); ctx.fill(); });
  const live = [], pool = [];
  const MAX = 600;
  function emit(layer, o) {
    if (reducedMotion || live.length >= MAX) return;
    const s = pool.pop() ?? new PIXI.Sprite();
    s.texture = o.tex ?? texSq; s.anchor.set(0.5);
    s.tint = o.tint ?? 0xffffff; s.blendMode = o.add ? "add" : "normal";
    s.position.set(o.x, o.y); s.rotation = o.rot ?? 0; s.visible = true;
    layer.addChild(s);
    const k = 1 / s.texture.width;
    s.scale.set(o.sz * k);
    live.push({ s, layer, vx: o.vx ?? 0, vy: o.vy ?? 0, g: o.g ?? 0, life: o.life, age: 0, sz0: o.sz, sz1: o.sz1 ?? o.sz, k, a0: o.a ?? 1, vr: o.vr ?? 0, bell: !!o.bell });
  }
  function updateParticles(dt) {
    for (let i = live.length - 1; i >= 0; i--) {
      const p = live[i];
      p.age += dt;
      const t = p.age / p.life;
      if (t >= 1) { p.layer.removeChild(p.s); p.s.visible = false; pool.push(p.s); live.splice(i, 1); continue; }
      p.vy += p.g * dt;
      p.s.x += p.vx * dt; p.s.y += p.vy * dt; p.s.rotation += p.vr * dt;
      p.s.scale.set((p.sz0 + (p.sz1 - p.sz0) * t) * p.k);
      p.s.alpha = p.a0 * (p.bell ? Math.sin(Math.PI * t) : 1 - t);
    }
  }

  const acc = { ember: 0, ash: 0, smoke: 0, smokeBack: 0 };
  const bodyPoint = () => [480 + rnd(-250, 250) * ks, baseY + rnd(-620, -280) * ks];
  function ambient(dt) {
    acc.ember += 26 * dt; acc.ash += 14 * dt; acc.smoke += 3.5 * dt; acc.smokeBack += 3 * dt;
    for (; acc.ember >= 1; acc.ember--) { const [x, y] = bodyPoint(); emit(partsLayer, { x, y, vx: rnd(-12, 12), vy: -rnd(25, 55), life: rnd(1.2, 2.2), sz: 3, tint: pick(EMBER_TINTS), add: true }); }
    for (; acc.ash >= 1; acc.ash--) { const [x, y] = bodyPoint(); emit(partsLayer, { x, y, vx: rnd(8, 30), vy: rnd(-8, 8), life: rnd(2.5, 4), sz: 3, a: 0.8, tint: pick([0x1b1614, 0x3a322d]), vr: rnd(-2, 2) }); }
    for (; acc.smoke >= 1; acc.smoke--) emit(smokeFront, { tex: texPuff, x: 480 + rnd(-210, 210), y: wallTop - 4, vx: rnd(-8, 8), vy: -rnd(14, 24), life: rnd(3, 4.5), sz: 40, sz1: 95, a: 0.5, tint: pick([0x2a2522, 0x3a332e, 0x4a423c]), bell: true });
    for (; acc.smokeBack >= 1; acc.smokeBack--) emit(smokeBack, { tex: texPuff, x: 480 + rnd(-170, 170), y: rnd(wallTop - 150, wallTop - 20), vx: rnd(-6, 6), vy: -rnd(6, 14), life: rnd(4, 6), sz: 70, sz1: 150, a: 0.35, tint: 0x1c1a20, bell: true });
  }
  for (let i = 0; i < 60; i++) { ambient(0.05); updateParticles(0.05); } // pre-warm

  // ---- impacts ----
  const rings = [], decals = [];
  let flash = 0;
  function strikeCell(cell, attack) {
    const [x, y] = cellCenter(board, cell);
    rings.push({ x, y, t0: elapsed, dur: 0.5, rx: board.cell * 1.1, color: 0xff8a3d });
    decals.push({ x, y, t0: elapsed, cracks: Array.from({ length: 6 }, () => rnd(0, TAU)) });
    const heavy = attack === "slam";
    for (let i = 0; i < (heavy ? 12 : 6); i++) emit(partsLayer, { x: x + rnd(-30, 30), y: y + rnd(-6, 6), vx: rnd(-200, 200), vy: -rnd(160, 340), g: 900, life: rnd(0.7, 1.1), sz: rnd(4, 7), tint: pick([0x2b2420, 0x4b3a30, 0x1b1614]), vr: rnd(-8, 8) });
    for (let i = 0; i < 20; i++) emit(partsLayer, { x, y, vx: rnd(-240, 240), vy: -rnd(120, 380), g: 800, life: rnd(0.5, 0.9), sz: 3, tint: pick(EMBER_TINTS), add: true });
    for (let i = 0; i < 6; i++) emit(partsLayer, { tex: texPuff, x: x + rnd(-40, 40), y: y + rnd(-6, 8), vx: rnd(-80, 80), vy: -rnd(10, 40), life: rnd(0.7, 1.1), sz: 18, sz1: 60, a: 0.55, tint: 0x5a4f46 });
  }

  // ---- reading the sim ----
  const seen = new WeakSet();
  let elapsed = 0, last = null;
  function readEffects() {
    for (const effect of game.effects) {
      if (seen.has(effect)) continue;
      seen.add(effect);
      if (effect.type === "godStrike") {
        for (const cell of effect.cells) strikeCell(cell, effect.attack);
        flash = 0.32;
        onImpact(effect.attack);
      }
    }
  }

  // The poses for the sim's attack state: windup while the telegraph runs, the swing in its last
  // moments, a short hold, then the arm returns. Which arm swings follows the attack's side.
  function poseFor() {
    const state = game.godAttack;
    const attack = state && cfg.cycle[state.index % cfg.cycle.length];
    const idle = () => { place("L", "rest", Math.sin(elapsed / 0.9) * 0.02, false); place("R", "rest", Math.sin(elapsed / 0.9 + 2) * 0.02, false); return { roar: false, front: false }; };
    if (!state || !attack || !game.running) return idle();
    const side = attack.side === "L" || attack.attack === "sweep" ? "L" : "R";
    const other = side === "L" ? "R" : "L";
    if (state.phase === "telegraph") {
      const total = attack.telegraph, remaining = state.clock;
      const p = clamp01(1 - remaining / total);
      if (attack.attack === "embers") {
        // Both arms rise, the mouth opens: embers rain on the marked cells.
        const arm = p < 0.25 ? "rest" : "raised";
        place("L", arm, -0.1 * (1 - easeOut(clamp01((p - 0.25) / 0.75))), false);
        place("R", arm, -0.1 * (1 - easeOut(clamp01((p - 0.25) / 0.75))), false);
        return { roar: p > 0.4, front: false };
      }
      place(other, "rest", Math.sin(elapsed / 0.9) * 0.02, false);
      if (remaining > SWING) {
        const w = clamp01(1 - (remaining - SWING) / (total - SWING));
        if (w < 0.25) place(side, "rest", 0, false);
        else place(side, "raised", -0.12 * (1 - easeOut((w - 0.25) / 0.75)), false);
        return { roar: w > 0.55, front: false };
      }
      const q = clamp01(1 - remaining / SWING);
      if (attack.attack === "sweep") place(side, "sweep", 0.4 * (1 - q * q), true);
      else place(side, "strike", 0.45 * (1 - q * q), true);
      return { roar: true, front: true };
    }
    if (state.phase === "recover") {
      const e = attack.recovery - state.clock;
      place(other, "rest", Math.sin(elapsed / 0.9) * 0.02, false);
      if (attack.attack === "embers") {
        place(side, e < 0.5 ? "raised" : "rest", 0, false);
        if (side !== "L") place("L", e < 0.5 ? "raised" : "rest", 0, false);
        return { roar: e < 0.3, front: false };
      }
      if (e < 0.3) place(side, attack.attack === "sweep" ? "sweep" : "strike", 0, true);
      else if (e < 0.55) place(side, "raised", 0, false);
      else place(side, "rest", 0, false);
      return { roar: e < 0.3, front: e < 0.3 };
    }
    return idle();
  }

  // ---- per frame ----
  function drawMarks() {
    marks.clear();
    const state = game.godAttack;
    if (state?.phase === "telegraph" && game.running) {
      const pulse = 0.2 + 0.14 * Math.sin(elapsed * 18);
      for (const cell of state.cells) {
        const [x, y] = cellCenter(board, cell), size = board.cell - 6;
        marks.roundRect(x - size / 2, y - size / 2, size, size, 8).fill({ color: 0xff442f, alpha: pulse }).stroke({ color: 0xff9b69, width: 3, alpha: 0.85 });
        if (Math.random() < 0.3) emit(partsLayer, { x: x + rnd(-board.cell / 2, board.cell / 2), y: y + rnd(-6, 8), vy: -rnd(30, 70), life: rnd(0.5, 0.9), sz: 3, tint: pick(EMBER_TINTS), add: true });
      }
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i], t = (elapsed - r.t0) / r.dur;
      if (t >= 1) { rings.splice(i, 1); continue; }
      const rx = r.rx * easeOut(t);
      marks.ellipse(r.x, r.y, rx, rx * 0.5).stroke({ color: r.color, width: 6 * (1 - t) + 1, alpha: 0.85 * (1 - t) });
    }
    for (let i = decals.length - 1; i >= 0; i--) {
      const d = decals[i], age = elapsed - d.t0;
      if (age > 4) { decals.splice(i, 1); continue; }
      const grow = Math.min(1, age / 0.25), fade = age < 1.6 ? 1 : 1 - (age - 1.6) / 2.4;
      const rx = board.cell * 0.55 * easeOut(grow);
      marks.ellipse(d.x, d.y, rx * 1.1, rx * 0.7).fill({ color: 0x2a1208, alpha: 0.6 * fade });
      marks.ellipse(d.x, d.y, rx * 0.8, rx * 0.5).fill({ color: 0xff6a1f, alpha: 0.5 * fade });
      marks.ellipse(d.x, d.y, rx * 0.4, rx * 0.25).fill({ color: 0xffd166, alpha: 0.4 * fade });
      for (const a of d.cracks) marks.moveTo(d.x + Math.cos(a) * rx * 0.3, d.y + Math.sin(a) * rx * 0.2).lineTo(d.x + Math.cos(a) * rx * 1.3, d.y + Math.sin(a) * rx * 0.85).stroke({ color: 0xff8a3d, width: 2, alpha: 0.7 * fade });
    }
  }

  function draw(now) {
    const wall = now / 1000;
    const dt = last === null ? 0 : Math.min(0.05, wall - last);
    last = wall;
    const step = game.paused ? 0 : dt;
    elapsed += step;
    readEffects();
    const { roar, front } = poseFor();
    head.visible = roar;
    torso.scale.set(ks, ks * (1 + Math.sin(elapsed / 0.7) * 0.008));
    torsoOverlay.visible = front;
    overlayMask.clear();
    if (front) {
      torsoOverlay.scale.copyFrom(torso.scale);
      for (const side of ["L", "R"]) overlayMask.rect(shoulder[side][0] - 75, 0, 150, boardTop - 8).fill(0xffffff);
    }
    ambient(step);
    updateParticles(step);
    drawMarks();
    flash = Math.max(0, flash - step * 1.6);
    flashG.alpha = reducedMotion ? 0 : flash;
  }

  // ---- tiles (render.js calls this for every placement tile) ----
  const ringAt = new Map();
  for (const [key, kind] of Object.entries(game.map.rings ?? {})) {
    const [type, index] = key.split(":");
    const pos = (type === "road" ? game.map.roadSlots : game.map.platformSlots)[Number(index)];
    if (pos) ringAt.set(`${pos[0]},${pos[1]}`, kind);
  }
  function drawSlot(container, x, y, type, occupied, highlighted, mode = "") {
    const raised = ringAt.get(`${x},${y}`) === "highground";
    const style = type === "road" ? TILES.road : raised ? TILES.highground : TILES.platform;
    const size = board.cell - 10, edge = size / 2;
    const fade = highlighted ? 1 : occupied ? 0.4 : mode === "dim" ? 0.18 : mode === "idle" ? 0.32 : 1;
    const g = new PIXI.Graphics();
    if (raised) g.roundRect(x - edge, y - edge + 7, size, size, 8).fill({ color: 0x0b0c12, alpha: 0.7 * fade }); // the gallery's shadow
    g.roundRect(x - edge, y - edge, size, size, 8).fill({ color: style.fill, alpha: style.alpha * fade * (mode === "idle" ? 0.6 : 1) }).stroke({ color: highlighted ? 0xffffff : style.stroke, width: highlighted ? 3 : 2, alpha: 0.75 * fade });
    container.addChild(g);
  }

  return { draw, drawSlot, destroy() {} };
}
