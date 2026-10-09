// World landmarks share the combat atlas format, but own their continuous animation and layers.
// Effekseer supplies the moving energy; retained soft textures supply contact light and crystal art.
import { loadFxAtlas } from './fx-atlas.js';
import { mapLanes } from './lanes.js';

const TAU = Math.PI * 2;
const BASE = '/td/fx/effekseer-v1';

export function portalLayout(path, cell = 70) {
  const origin = path?.[0] ?? [0, 0];
  const next = path?.find(([x, y]) => x !== origin[0] || y !== origin[1]) ?? [origin[0] + 1, origin[1]];
  const dx = next[0] - origin[0], dy = next[1] - origin[1], length = Math.hypot(dx, dy);
  return { radius: Math.min(42, cell * 0.36), direction: [dx / length, dy / length] };
}

export function createPortalClock() {
  let wall = null, simulation = null, elapsed = 0;
  return (game, now) => {
    const time = game.time ?? 0;
    const dt = wall === null ? 0 : Math.max(0, Math.min(0.1, (now - wall) / 1000));
    if (simulation !== null && time < simulation) elapsed = 0;
    else if (!game.paused) elapsed += game.running ? Math.max(0, time - (simulation ?? time)) : dt;
    wall = now;
    simulation = time;
    return elapsed;
  };
}

export function portalLoopSamples(time, duration) {
  return [0, duration / 2].map(offset => {
    const age = ((time + offset) % duration + duration) % duration;
    return { time: age, alpha: Math.sin(Math.PI * age / duration) ** 2 };
  });
}

export async function loadWorldPortalAtlases(PIXI) {
  try {
    const response = await fetch(`${BASE}/manifest.json`, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`Portal manifest: HTTP ${response.status}`);
    const { clips } = await response.json();
    const results = await Promise.allSettled(['portal-red', 'portal-blue'].map(async id => {
      const clip = clips.find(entry => entry.id === id);
      if (!clip) throw new Error(`Missing ${id}`);
      return loadFxAtlas(PIXI, clip);
    }));
    return Object.fromEntries(results.map((result, index) => {
      if (result.status === 'rejected') console.warn('Portal animation unavailable; using luminous fallback.', result.reason);
      return [index ? 'home' : 'spawn', result.status === 'fulfilled' ? result.value : null];
    }));
  } catch (error) {
    console.warn('Portal animations unavailable; using luminous fallback.', error);
    return {};
  }
}

function paintTextures(PIXI) {
  const make = (width, height, paint) => {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    paint(canvas.getContext('2d'), width, height);
    return PIXI.Texture.from(canvas);
  };
  const glow = make(128, 128, c => {
    const fill = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    for (const [at, alpha] of [[0, 0.95], [0.25, 0.64], [0.55, 0.2], [1, 0]]) fill.addColorStop(at, `rgba(255,255,255,${alpha})`);
    c.fillStyle = fill; c.fillRect(0, 0, 128, 128);
  });
  // Irregular feathered rim: also keeps the landmark readable if an atlas request fails.
  const rim = make(256, 256, c => {
    const pixels = c.createImageData(256, 256);
    for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
      const px = (x - 128) / 128, py = (y - 128) / 128;
      const r = Math.hypot(px, py), a = Math.atan2(py, px);
      const edge = 0.70 + Math.sin(a * 7) * 0.025 + Math.sin(a * 13 + 1.8) * 0.013;
      const band = Math.exp(-(((r - edge) / 0.035) ** 2));
      const bloom = Math.exp(-(((r - edge) / 0.12) ** 2)) * 0.3;
      const whorl = Math.max(0, Math.sin(a * 3 + r * 22)) ** 8 * Math.exp(-(((r - 0.5) / 0.24) ** 2)) * 0.15;
      const alpha = Math.min(1, (band * 0.65 + bloom + whorl) * (0.72 + 0.28 * Math.sin(a * 5 + 0.5)));
      const i = (y * 256 + x) * 4;
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 255;
      pixels.data[i + 3] = alpha * 255;
    }
    c.putImageData(pixels, 0, 0);
  });
  const beam = make(64, 192, c => {
    const pixels = c.createImageData(64, 192);
    for (let y = 0; y < 192; y++) for (let x = 0; x < 64; x++) {
      const along = y / 192, across = (x - 32) / (3 + along * 9);
      const i = (y * 64 + x) * 4;
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 255;
      pixels.data[i + 3] = Math.exp(-across * across) * Math.sin(along * Math.PI) * 155;
    }
    c.putImageData(pixels, 0, 0);
  });
  const crystal = make(96, 144, c => {
    const facet = (points, light, dark) => {
      c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath();
      const gradient = c.createLinearGradient(20, 20, 74, 122);
      gradient.addColorStop(0, light); gradient.addColorStop(1, dark);
      c.fillStyle = gradient; c.fill();
    };
    c.shadowColor = '#30bfff'; c.shadowBlur = 10;
    facet([[46, 7], [74, 53], [66, 99], [47, 136], [21, 85], [25, 43]], '#78e4ff', '#1245af');
    c.shadowBlur = 0;
    facet([[46, 7], [48, 59], [25, 43]], '#e4ffff', '#4cbbea');
    facet([[46, 7], [74, 53], [48, 59]], '#85e8ff', '#286ce0');
    facet([[25, 43], [48, 59], [41, 94], [21, 85]], '#62d4ff', '#193cba');
    facet([[48, 59], [74, 53], [66, 99], [41, 94]], '#348fe7', '#123789');
    facet([[21, 85], [41, 94], [47, 136]], '#3383dc', '#102966');
    facet([[41, 94], [66, 99], [47, 136]], '#287bdd', '#4edcff');
    c.lineWidth = 1.5; c.strokeStyle = '#b9f5ff';
    c.beginPath(); c.moveTo(46, 9); c.lineTo(48, 59); c.lineTo(25, 43); c.stroke();
    c.strokeStyle = '#63caff'; c.beginPath(); c.moveTo(48, 59); c.lineTo(41, 94); c.lineTo(47, 133); c.stroke();
  });
  return { glow, rim, beam, crystal };
}

export function createWorldPortals(PIXI, game, { ground, units, foreground, cell = 70, tiltK = 1,
  reducedMotion = false, atlases = {} }) {
  const textures = paintTextures(PIXI), roots = [], instances = [];
  const tick = createPortalClock();
  let hitAt = -Infinity, lastLives = game.lives, lastTime = 0;
  const maxLives = Math.max(1, game.maxLives ?? game.lives ?? 1);
  const group = (parent, point, label) => {
    const node = new PIXI.Container(); node.label = label;
    node.position.set(point.x, point.y); parent.addChild(node); roots.push(node);
    return node;
  };
  const sprite = (parent, texture, width, height, tint, alpha = 1, blend = 'add') => {
    const node = new PIXI.Sprite(texture); node.anchor.set(0.5); node.width = width; node.height = height;
    node.tint = tint; node.alpha = alpha; node.blendMode = blend; parent.addChild(node); return node;
  };
  const makePortal = (point, path, role, phase) => {
    const layout = portalLayout(path, cell), radius = layout.radius, blue = role === 'home';
    const color = blue ? 0x299fff : 0xff2438;
    const floor = group(ground, point, `${role}-portal-ground`);
    const light = sprite(floor, textures.glow, radius * 3.25, radius * 3.25, color, 0.5);
    // The centre has a soft edge and transmits the ground texture. Never an opaque oval.
    sprite(floor, textures.glow, radius * 2.1, radius * 2.1, blue ? 0x092255 : 0x350010, 0.65, 'normal');
    const flow = new PIXI.Container(); floor.addChild(flow);
    const atlas = atlases[role];
    const loops = atlas ? [0, 1].map(() => {
      const instance = atlas.create(flow, 0, 0, radius * 3.1);
      instances.push(instance); return instance;
    }) : [];
    const rim = sprite(floor, textures.rim, radius * 2.65, radius * 2.65, blue ? 0x58c9ff : 0xff3a4a, 0.8);
    const body = group(units, point, `${role}-portal-body`);
    body.zIndex = point.y - 0.1; body.scale.y = 1 / tiltK;
    // Upright objects use the units' depth plane; the pool remains on the ground plane.
    let crystal, crystalLight, ray;
    if (blue) {
      ray = sprite(body, textures.beam, radius * 0.72, radius * 2.7, 0x3ab8ff, 0.5);
      ray.y = -radius * 1.1;
      crystalLight = sprite(body, textures.glow, radius * 1.25, radius * 1.65, 0x38baff, 0.55);
      crystalLight.y = -radius * 0.78;
      crystal = sprite(body, textures.crystal, radius * 0.84, radius * 1.26, 0xffffff, 1, 'normal');
      crystal.y = -radius * 0.78;
    } else {
      // Four short obsidian teeth. Leave the road exit clear; each tooth sorts by its own foot.
      const heading = Math.atan2(layout.direction[1], layout.direction[0]);
      for (const angle of [0.7, 2.15, 3.9, 5.55]) {
        const a = angle + heading, x = Math.cos(a) * radius * 0.85, y = Math.sin(a) * radius * 0.85;
        const tooth = group(units, { x: point.x + x, y: point.y + y }, 'spawn-obsidian');
        tooth.zIndex = point.y + y; tooth.scale.y = 1 / tiltK;
        const g = new PIXI.Graphics(), side = Math.sign(x) || 1, h = radius * 0.37;
        g.poly([-5, 2, -3, -h * 0.5, side * 6, -h, 4, -2, 2, 3]).fill(0x2d101a);
        g.poly([-3, -h * 0.5, side * 6, -h, 1, -3, -5, 2]).fill(0x702535);
        g.moveTo(side * 6, -h).lineTo(1, -3).stroke({ color: 0xff5260, alpha: 0.8, width: 1 });
        tooth.addChild(g);
      }
    }
    const sparks = group(foreground, point, `${role}-portal-sparks`);
    sparks.scale.y = 1 / tiltK;
    const motes = Array.from({ length: blue ? 7 : 10 }, (_, i) => {
      const mote = sprite(sparks, textures.glow, i % 3 ? 3.5 : 5, i % 3 ? 3.5 : 5, blue ? 0x9ee6ff : 0xff8761);
      return mote;
    });
    return { point, layout, radius, blue, phase, light, flow, rim, atlas, loops, crystal, crystalLight, ray, motes };
  };
  const portals = [
    ...mapLanes(game.map).map((lane, i) => makePortal(lane.spawn, lane.path, 'spawn', i * 0.73)),
    makePortal(game.map.base, null, 'home', 0.37),
  ];
  return {
    draw(now) {
      const clock = tick(game, now), time = reducedMotion ? 0 : clock;
      if (clock < lastTime) hitAt = -Infinity;
      if (game.lives < lastLives) hitAt = clock;
      lastLives = game.lives; lastTime = clock;
      const hit = Math.max(0, 1 - (clock - hitAt) / 0.65);
      const integrity = Math.max(0, Math.min(1, game.lives / maxLives));
      for (const portal of portals) {
        const { radius, phase, blue } = portal, t = time + phase;
        const activity = blue ? hit : (game.enemies ?? []).some(enemy => !enemy.dead &&
          Math.hypot(enemy.x - portal.point.x, enemy.y - portal.point.y) < radius * 1.4) ? 0.45 : 0;
        const pulse = 0.94 + Math.sin(t * 1.8) * 0.06;
        portal.light.alpha = (blue ? 0.4 + integrity * 0.16 : 0.62) * pulse + activity * 0.2;
        portal.rim.alpha = 0.6 + pulse * 0.16 + activity * 0.2;
        portal.rim.rotation = t * (blue ? -0.15 : 0.2);
        portal.flow.rotation = t * (blue ? -0.1 : 0.08);
        if (portal.atlas) {
          const samples = portalLoopSamples(t * 0.7, portal.atlas.duration);
          portal.loops.forEach((instance, i) => {
            instance.seek(samples[i].time);
            instance.container.alpha = samples[i].alpha * (blue ? 0.68 : 0.88) * (1 + activity * 0.35);
          });
        }
        if (portal.crystal) {
          const lift = -radius * 0.78 + Math.sin(t * 1.7) * (reducedMotion ? 0 : 2);
          portal.crystal.y = portal.crystalLight.y = lift;
          portal.crystal.rotation = Math.sin(t * 0.7) * 0.06;
          portal.crystal.alpha = 0.65 + integrity * 0.35;
          portal.crystalLight.alpha = 0.42 + integrity * 0.2 + hit * 0.5;
          portal.crystalLight.tint = hit ? 0xffb6cb : 0x38baff;
          portal.ray.alpha = (0.3 + integrity * 0.2) * pulse;
        }
        portal.motes.forEach((mote, i) => {
          const cycle = (t * (blue ? 0.2 : 0.28) + i * 0.618) % 1;
          const a = i * 2.4 + t * (blue ? -0.22 : 0.35), r = radius * (0.65 + 0.16 * Math.sin(i));
          mote.position.set(Math.cos(a) * r, Math.sin(a) * r * tiltK - cycle * radius * 0.62);
          mote.alpha = reducedMotion ? 0 : Math.sin(cycle * Math.PI) * (blue ? 0.75 : 0.95);
        });
      }
    },
    destroy() {
      instances.forEach(instance => instance.destroy());
      roots.forEach(root => { root.removeFromParent(); root.destroy({ children: true }); });
      Object.values(textures).forEach(texture => texture.destroy(true));
      new Set(Object.values(atlases)).forEach(atlas => atlas?.destroy());
    },
  };
}
