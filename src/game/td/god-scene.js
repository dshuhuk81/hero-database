// God-Mode scene (the arena and the layered Cronus rig). It stands in for map-scene.js when the
// run is a God-Mode challenge: lava canyon backdrop, the board floor, the campaign
// tile art per cell type, the god's idle life and attack poses, telegraphs and impacts.
// Everything is driven by the sim: `game.godAttack` (phase, clock, index) and the god effects
// (godTelegraph, godStrike). Pure view code; nothing here touches combat state.
import { boardOf, cellCenter } from "./board.js";
import { godPerspectiveFloorSpan, godPerspectiveQuad, godPerspectiveSweepQuad } from "./god-mode-arena.js";
import { createSlotPainter, mapSceneFor } from "./map-scene.js";

const DIR = "/td/god-mode/cronus/";
const TAU = Math.PI * 2;
const EMBER_TINTS = [0xff7a1a, 0xffb03a, 0xffe08a];
const SWING = 0.14; // seconds of the arm's fall, right before the blow lands

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const clamp01 = (t) => Math.max(0, Math.min(1, t));
const easeOut = (t) => 1 - (1 - t) * (1 - t);

// The arena borrows the Ashen theme for its tile art, so the placement tiles match the campaign boards.
const TILE_THEME = "ashen-sanctuary-v1";

// Keep every threatened tile legible, but give wide attacks one visual focal point.
export function godImpactPlan(attack, cells) {
  if (attack === "sweep") return { burstCells: [], crackCells: [], sweepCells: cells };
  if (attack === "embers") return { burstCells: cells, crackCells: cells, sweepCells: [] };
  const centre = cells.reduce((best, cell) => {
    const neighbours = cells.filter(([c, r]) => Math.abs(c - cell[0]) + Math.abs(r - cell[1]) === 1).length;
    return neighbours > best.neighbours ? { cell, neighbours } : best;
  }, { cell: cells[0], neighbours: -1 }).cell;
  return { burstCells: centre ? [centre] : [], crackCells: cells, sweepCells: [] };
}

export async function createGodScene(PIXI, game, { layers, tilt = null, perspective = false, reducedMotion = false, authoredFx = null, onImpact = () => {} }) {
  const cfg = game.god;
  const board = boardOf(game.map);
  const rig = await fetch(`${DIR}rig.json`).then((response) => response.json());
  const names = [rig.torso.file, rig.headRoar.file, ...Object.values(rig.arms).map((arm) => arm.file)];
  const theme = mapSceneFor({ art: TILE_THEME });
  const [wideTex, floorTex, roadTex, ...partTex] = await Promise.all([
    PIXI.Assets.load(`${DIR}${rig.arena.wide}`),
    PIXI.Assets.load(`${DIR}${rig.arena.floor}`),
    PIXI.Assets.load(theme.assets.road).catch(() => null),
    ...names.map((name) => PIXI.Assets.load(`${DIR}${name}`)),
  ]);
  const tex = Object.fromEntries(names.map((name, index) => [name, partTex[index]]));

  const ks = cfg.rig.scale; // rig sprite scale: one texture pixel in world pixels
  const baseY = cfg.rig.baseY; // where the torso's bottom edge sits (hidden behind the board floor)
  const half = rig.size / 2;
  const toWorld = (p) => [480 + (p[0] - half) * ks, baseY + (p[1] - rig.size) * ks];
  const boardLeft = board.origin[0], boardTop = board.origin[1];
  const boardRight = boardLeft + board.cols * board.cell;
  const wallTop = boardTop - 26; // smoke rises from the board's far edge

  // ---- layers ----
  // With a tilted board (like the campaign) the board layers are squashed to k. The backdrop, the
  // god and the flash stay undistorted: they live in flat containers that undo the squash and
  // put the god's feet where the board's far edge lands on screen.
  const k = tilt?.k ?? 1, offsetY = tilt?.offsetY ?? 0;
  const shift = tilt ? offsetY + k * boardTop - boardTop : 0;
  const flat = (parent, dy = shift) => {
    const container = new PIXI.Container();
    container.scale.y = 1 / k;
    container.y = (dy - offsetY) / k;
    parent.addChild(container);
    return container;
  };
  const make = (parent) => { const container = new PIXI.Container(); parent.addChild(container); return container; };
  const bodyFlat = flat(layers.bgTex);
  const backdrop = new PIXI.Sprite(wideTex);
  backdrop.width = 1260; backdrop.height = 560; backdrop.x = -150; backdrop.y = -10; backdrop.tint = 0xd8c8c0;
  const backdropShade = new PIXI.Graphics().rect(-150, -10, 1260, 560).fill({ color: 0x120706, alpha: 0.4 });
  if (tilt && layers.band) layers.band.addChild(backdrop, backdropShade); // the bands above and below the squashed board show the arena
  else bodyFlat.addChild(backdrop, backdropShade);
  const smokeBack = make(bodyFlat);
  const armRear = make(bodyFlat); // both arms at rest and in the windup: behind the torso
  const bossLayer = make(bodyFlat);
  const smokeFront = make(bodyFlat);

  const torso = new PIXI.Sprite(tex[rig.torso.file]);
  torso.anchor.set(0.5, 1); torso.scale.set(ks); torso.position.set(480, baseY);
  const head = new PIXI.Sprite(tex[rig.headRoar.file]);
  head.anchor.set(rig.headRoar.top[0] / rig.size, rig.headRoar.top[1] / rig.size);
  head.scale.set(ks * rig.headRoar.defaultScale);
  head.position.set(480 + (rig.torso.headTop[0] - half) * ks, baseY + (rig.torso.headTop[1] - rig.size) * ks);
  head.visible = false;
  bossLayer.addChild(torso, head);

  // The prototype warps the actual floor artwork into the tapered arena once on startup.
  // This avoids a hard trapezoid crop around an otherwise top-down rectangular texture.
  let warpedFloor = null;
  if (perspective) {
    try {
      const image = new Image();
      image.src = `${DIR}${rig.arena.floor}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = 960; canvas.height = 540;
      const ctx = canvas.getContext("2d");
      const sourceRow = image.naturalHeight / canvas.height;
      const top = Math.max(0, boardTop - 6);
      for (let y = top; y < canvas.height; y++) {
        const [left, right] = godPerspectiveFloorSpan(board, y + 0.5);
        ctx.drawImage(image, 0, y * sourceRow, image.naturalWidth, sourceRow,
          left, y, right - left, 1);
      }
      warpedFloor = PIXI.Texture.from(canvas);
    } catch (error) {
      console.warn("Cronus perspective floor unavailable; using the unwarped arena art.", error);
    }
  }
  const floor = new PIXI.Sprite(warpedFloor ?? floorTex);
  floor.width = 960; floor.height = 540;
  if (!warpedFloor) {
    const floorMask = new PIXI.Graphics().roundRect(boardLeft - 14, boardTop - 6, boardRight - boardLeft + 28, 540 - boardTop + 6, 10).fill(0xffffff);
    floor.mask = floorMask;
    layers.bgTex.addChild(floorMask);
  }
  layers.bgTex.addChild(floor);
  // The melee front is paved like the campaign road: the theme's road texture under those cells.
  if (roadTex) {
    const paving = new PIXI.TilingSprite({ texture: roadTex, width: 960, height: 540 });
    paving.tileScale.set(0.12);
    paving.tint = theme.road.tint;
    paving.alpha = 0.7;
    const pavingMask = new PIXI.Graphics();
    for (const cell of board.road) {
      const [x, y] = cellCenter(board, cell);
      if (perspective) pavingMask.poly(godPerspectiveQuad(board, cell)).fill(0xffffff);
      else pavingMask.rect(x - board.cell / 2 + 2, y - board.cell / 2 + 2, board.cell - 4, board.cell - 4).fill(0xffffff);
    }
    paving.mask = pavingMask;
    layers.bgTex.addChild(pavingMask, paving);
  }

  const marks = new PIXI.Graphics(); // telegraph tiles, strike flashes, lava pools
  layers.groundFx.addChild(marks);
  const foreFlat = flat(layers.fore);
  const armFront = make(foreFlat); // the striking arm, above the board and heroes
  const overlayLayer = make(foreFlat);
  const partsLayer = make(layers.parts); // strike particles: board space
  const flatParts = flat(layers.parts); // ambient embers and ash around the god
  const flashG = new PIXI.Graphics().rect(0, 0, 960, 540).fill(0xfff1d6);
  flashG.alpha = 0;
  flat(layers.hud, 0).addChild(flashG);

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
    for (; acc.ember >= 1; acc.ember--) { const [x, y] = bodyPoint(); emit(flatParts, { x, y, vx: rnd(-12, 12), vy: -rnd(25, 55), life: rnd(1.2, 2.2), sz: 3, tint: pick(EMBER_TINTS), add: true }); }
    for (; acc.ash >= 1; acc.ash--) { const [x, y] = bodyPoint(); emit(flatParts, { x, y, vx: rnd(8, 30), vy: rnd(-8, 8), life: rnd(2.5, 4), sz: 3, a: 0.8, tint: pick([0x1b1614, 0x3a322d]), vr: rnd(-2, 2) }); }
    for (; acc.smoke >= 1; acc.smoke--) emit(smokeFront, { tex: texPuff, x: 480 + rnd(-210, 210), y: wallTop - 4, vx: rnd(-8, 8), vy: -rnd(14, 24), life: rnd(3, 4.5), sz: 40, sz1: 95, a: 0.5, tint: pick([0x2a2522, 0x3a332e, 0x4a423c]), bell: true });
    for (; acc.smokeBack >= 1; acc.smokeBack--) emit(smokeBack, { tex: texPuff, x: 480 + rnd(-170, 170), y: rnd(wallTop - 150, wallTop - 20), vx: rnd(-6, 6), vy: -rnd(6, 14), life: rnd(4, 6), sz: 70, sz1: 150, a: 0.35, tint: 0x1c1a20, bell: true });
  }
  for (let i = 0; i < 60; i++) { ambient(0.05); updateParticles(0.05); } // pre-warm

  // ---- impacts ----
  const fissures = [], sweeps = [];
  let flash = 0;
  function strikeCell(cell, attack) {
    const [x, y] = cellCenter(board, cell);
    const heavy = attack === "slam";
    for (let i = 0; i < (heavy ? 12 : 6); i++) emit(partsLayer, { x: x + rnd(-30, 30), y: y + rnd(-6, 6), vx: rnd(-200, 200), vy: -rnd(160, 340), g: 900, life: rnd(0.7, 1.1), sz: rnd(4, 7), tint: pick([0x2b2420, 0x4b3a30, 0x1b1614]), vr: rnd(-8, 8) });
    for (let i = 0; i < 20; i++) emit(partsLayer, { x, y, vx: rnd(-240, 240), vy: -rnd(120, 380), g: 800, life: rnd(0.5, 0.9), sz: 3, tint: pick(EMBER_TINTS), add: true });
    for (let i = 0; i < 6; i++) emit(partsLayer, { tex: texPuff, x: x + rnd(-40, 40), y: y + rnd(-6, 8), vx: rnd(-80, 80), vy: -rnd(10, 40), life: rnd(0.7, 1.1), sz: 18, sz1: 60, a: 0.55, tint: 0x5a4f46 });
    // Baked lava blast (authored-fx.js GOD_CLIPS) on top of the chunky debris; presentation only.
    authoredFx?.play("blast", x, y, { width: heavy ? 180 : 120, alpha: 0.95 });
  }

  // ---- reading the sim ----
  const seen = new WeakSet();
  let elapsed = 0, last = null;
  function readEffects() {
    for (const effect of game.effects) {
      if (seen.has(effect)) continue;
      seen.add(effect);
      if (effect.type === "godStrike") {
        const plan = godImpactPlan(effect.attack, effect.cells);
        for (const [c, r] of plan.crackCells) fissures.push({ c, r, t0: elapsed });
        if (plan.sweepCells.length) {
          sweeps.push({ cells: plan.sweepCells, t0: elapsed });
          const [firstX, rowY] = cellCenter(board, plan.sweepCells[0]);
          const [lastX] = cellCenter(board, plan.sweepCells.at(-1));
          for (let i = 0; i < 20; i++) emit(partsLayer, { x: rnd(firstX, lastX), y: rowY + rnd(-8, 8), vx: rnd(-100, 120), vy: rnd(-120, -35), g: 280, life: rnd(0.25, 0.55), sz: rnd(2, 4), tint: pick(EMBER_TINTS), add: true });
          for (const cell of plan.sweepCells) authoredFx?.play("fire", ...cellCenter(board, cell), { width: 90, alpha: 0.8, speed: 1.6 });
        }
        for (const cell of plan.burstCells) strikeCell(cell, effect.attack);
        flash = 0.16;
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
  function drawFissure(c, r, strength, growth = 1) {
    const [x, y] = cellCenter(board, [c, r]);
    const flip = (c * 3 + r) % 2 ? -1 : 1;
    const bend = ((c * 7 + r * 3) % 5 - 2) * 2;
    const point = (dx, dy) => [x + dx * flip * growth, y + (dy + bend) * growth];
    const paths = [
      [point(-29, 12), point(-12, 3), point(-3, 9), point(9, -4), point(28, -14)],
      [point(-12, 3), point(-18, -12), point(-26, -17)],
      [point(9, -4), point(19, 11), point(27, 14)],
    ];
    const outline = [point(-33, 15), point(-11, -2), point(3, 2), point(17, -15), point(32, -17), point(14, 1), point(1, 15), point(-17, 8)];
    marks.poly(outline.flat()).fill({ color: 0x150d0a, alpha: 0.28 * strength });
    for (const [width, color, alpha] of [[8, 0xb32d0d, 0.18], [2.5, 0xffa347, 0.78]]) {
      for (const path of paths) {
        marks.moveTo(...path[0]);
        for (const point of path.slice(1)) marks.lineTo(...point);
        marks.stroke({ color, width, alpha: alpha * strength, cap: "round", join: "round" });
      }
    }
  }

  function drawSweep(cells, strength, progress = 1) {
    if (!cells.length) return;
    const quad = perspective ? godPerspectiveSweepQuad(board, cells) : (() => {
      const [left, y] = cellCenter(board, cells[0]);
      const [right] = cellCenter(board, cells.at(-1));
      return [left - board.cell * 0.47, y - 24, right + board.cell * 0.47, y - 24,
        right + board.cell * 0.47, y + 24, left - board.cell * 0.47, y + 24];
    })();
    const endTop = quad[0] + (quad[2] - quad[0]) * progress;
    const endBottom = quad[6] + (quad[4] - quad[6]) * progress;
    const top = quad[1] + 9, bottom = quad[7] - 9;
    marks.poly([quad[0], top, endTop, top, endBottom, bottom, quad[6], bottom])
      .fill({ color: 0x230b05, alpha: 0.55 * strength });
    const upper = [], lower = [];
    const segments = Math.max(2, Math.ceil((endTop - quad[0]) / 26));
    for (let i = 0; i <= segments; i++) {
      const p = i / segments;
      const x = quad[0] + (endTop - quad[0]) * p;
      const y = (top + bottom) / 2 + Math.sin(i * 2.8) * 5;
      upper.push(x, y - 5 - (i % 3) * 2);
      lower.unshift(y + 5 + (i % 4)); lower.unshift(x);
    }
    marks.poly(upper.concat(lower)).fill({ color: 0xa8370d, alpha: 0.56 * strength });
    marks.moveTo(upper[0], upper[1] + 5);
    for (let i = 2; i < upper.length; i += 2) marks.lineTo(upper[i], upper[i + 1] + 5);
    marks.stroke({ color: 0xffa145, width: 2.5, alpha: 0.75 * strength, join: "round" });
  }

  function drawMarks() {
    marks.clear();
    const state = game.godAttack;
    if (state?.phase === "telegraph" && game.running) {
      const pulse = 0.45 + 0.18 * Math.sin(elapsed * 12);
      const attack = cfg.cycle[state.index % cfg.cycle.length];
      if (attack.attack === "sweep") drawSweep(state.cells, pulse, 1);
      for (const [c, r] of attack.attack === "sweep" ? [] : state.cells) {
        drawFissure(c, r, pulse, 0.55);
        const [x, y] = cellCenter(board, [c, r]);
        if (Math.random() < 0.3) emit(partsLayer, { x: x + rnd(-board.cell / 2, board.cell / 2), y: y + rnd(-6, 8), vy: -rnd(30, 70), life: rnd(0.5, 0.9), sz: 3, tint: pick(EMBER_TINTS), add: true });
      }
    }
    for (let i = sweeps.length - 1; i >= 0; i--) {
      const sweep = sweeps[i], age = elapsed - sweep.t0;
      if (age > 0.55) { sweeps.splice(i, 1); continue; }
      drawSweep(sweep.cells, 1 - age / 0.55, Math.min(1, age / 0.16));
    }
    for (let i = fissures.length - 1; i >= 0; i--) {
      const mark = fissures[i], age = elapsed - mark.t0;
      if (age > 1.4) { fissures.splice(i, 1); continue; }
      drawFissure(mark.c, mark.r, 1 - age / 1.4, Math.min(1, age / 0.14));
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

  // ---- tiles (render.js calls this for every placement tile): Campaign by default,
  // tapered God-only quads for the visual comparison ----
  const campaignSlot = createSlotPainter(PIXI, { theme, board, tilt, textures: {} });
  const raisedSlots = new Set(Object.entries(game.map.rings ?? {})
    .filter(([key, kind]) => key.startsWith("platform:") && kind === "highground")
    .map(([key]) => game.map.platformSlots[Number(key.split(":")[1])]?.join(",")));
  function drawSlot(container, x, y, type, occupied, highlighted, mode = "") {
    if (!perspective) return campaignSlot(container, x, y, type, occupied, highlighted, mode);
    const c = Math.floor((x - board.origin[0]) / board.cell);
    const r = Math.floor((y - board.origin[1]) / board.cell);
    const quad = godPerspectiveQuad(board, [c, r]);
    const raised = raisedSlots.has(`${x},${y}`);
    const platform = type === "platform";
    const eligible = highlighted || mode === "eligible";
    const strength = highlighted ? 1 : occupied ? 0.65 : mode === "dim" ? 0.32 : mode === "idle" ? 0.55 : 0.85;
    const accent = raised ? 0xe5bd68 : platform ? theme.pad.platform : theme.pad.road;
    const top = raised ? 0x655a4b : platform ? 0x5a554d : 0x3a302b;
    const lip = platform ? 10 + r * 2 : 0;
    const face = new PIXI.Graphics();
    container.addChild(face);
    if (platform) {
      face.poly(quad.map((value, index) => index % 2 ? value + lip + 3 : value))
        .fill({ color: 0x050505, alpha: 0.22 });
      face.poly([quad[6], quad[7], quad[4], quad[5], quad[4], quad[5] + lip, quad[6], quad[7] + lip])
        .fill({ color: 0x211e1a, alpha: 0.98 });
      face.poly([quad[2], quad[3], quad[4], quad[5], quad[4], quad[5] + lip, quad[2] + 3, quad[3] + lip * 0.35])
        .fill({ color: 0x302922, alpha: 0.92 });
      face.moveTo(quad[6] + 2, quad[7] + lip - 1).lineTo(quad[4] - 2, quad[5] + lip - 1)
        .stroke({ color: 0x080706, width: 2, alpha: 0.6 });
      if (warpedFloor) {
        const stone = new PIXI.Sprite(warpedFloor);
        stone.width = 960; stone.height = 540; stone.tint = 0xb5a99a;
        const stoneMask = new PIXI.Graphics().poly(quad).fill(0xffffff);
        stone.mask = stoneMask;
        container.addChild(stoneMask, stone);
      }
    }
    const g = new PIXI.Graphics();
    container.addChild(g);
    g.poly(quad).fill({ color: top, alpha: platform ? warpedFloor ? 0.4 : 0.96 : 0.42 * strength })
      .stroke({ color: eligible ? 0xffe8aa : accent, width: highlighted ? 3 : 1.5, alpha: (eligible ? 0.95 : 0.48) * strength, join: "round" });
    g.moveTo(quad[0] + 5, quad[1] + 3).lineTo(quad[2] - 5, quad[3] + 3)
      .stroke({ color: 0xe4d8be, width: 1.3, alpha: 0.28 * strength });
    if (platform) {
      const left = quad[0] + (quad[2] - quad[0]) * 0.24;
      const right = quad[0] + (quad[2] - quad[0]) * 0.73;
      g.moveTo(left, quad[1] + 7).lineTo(left + 5, y - 2).lineTo(left - 2, quad[7] - 8)
        .moveTo(right, quad[3] + 5).lineTo(right - 6, y + 1).lineTo(right + 1, quad[5] - 9)
        .stroke({ color: 0x211d19, width: 1.2, alpha: 0.3, join: "round" });
    }
    if (raised) {
      const bx = quad[2] - 10, by = quad[3] + 10;
      g.circle(bx, by, 8).fill({ color: 0x17140f, alpha: 0.9 }).stroke({ color: accent, width: 1.7, alpha: strength });
      g.moveTo(bx, by - 4).lineTo(bx + 4, by + 3).lineTo(bx - 4, by + 3).closePath().fill({ color: accent, alpha: strength });
    }
    if (eligible) g.poly(quad).fill({ color: accent, alpha: highlighted ? 0.16 : 0.08 });
    return g;
  }

  return { draw, drawSlot, destroy() { warpedFloor?.destroy(true); } };
}
