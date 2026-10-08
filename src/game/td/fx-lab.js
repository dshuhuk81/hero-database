// Local visual spike. Shares the existing map painter, hero art and baseline FX code;
// never creates a combat session or touches saved progress.
import maps from '../../data/tdMaps.json';
import { createMapScene, mapSceneFor } from './map-scene.js';
import { createFxKit } from './fx-kit.js';
import { createHeroFx } from './hero-fx.js';
import { createOdinFx } from './odin-fx.js';
import { createStatusFx } from './status-fx.js';
import { loadFxAtlas } from './fx-atlas.js';

const PIXI_CDN = 'https://cdn.jsdelivr.net/npm/pixi.js@8.21.0/dist/pixi.mjs';
const BASE = '/td/fx/effekseer-v1';
const DURATION = 4;
const CASTS = [
  { id: 'lightning', heroId: 'odin', label: 'ODIN / BLITZ', source: [185, 211], target: [303, 211], at: 0.15 },
  { id: 'fire', heroId: 'surtr', label: 'SURTR / FEUER', source: [185, 329], target: [421, 329], at: 0.65 },
  { id: 'buff', heroId: 'heimdall', label: 'HEIMDALL / BUFF', source: [657, 329], target: [657, 329], at: 1.05 },
];

export async function startFxLab() {
  const $ = id => document.getElementById(id);
  const canvas = $('fx-canvas');
  if (!canvas) return;
  const loading = $('fx-loading');
  const pauseButton = $('fx-pause');
  const replayButton = $('fx-replay');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const events = new AbortController();
  let app, scene, raf = 0, disposed = false;
  const atlases = [], instances = [];
  const cleanup = () => {
    disposed = true;
    cancelAnimationFrame(raf);
    events.abort();
    instances.forEach(instance => instance.destroy());
    scene?.destroy();
    if (app?.renderer) app.destroy(false, { children: true });
    atlases.forEach(atlas => atlas.destroy());
  };
  window.addEventListener('pagehide', cleanup, { once: true });
  try {
    const [PIXI, manifest] = await Promise.all([
      import(/* @vite-ignore */ PIXI_CDN),
      fetch(`${BASE}/manifest.json`).then(response => { if (!response.ok) throw new Error('Effektdateien fehlen'); return response.json(); }),
    ]);
    if (disposed) return;
    app = new PIXI.Application();
    await app.init({ canvas, width: 960, height: 540, antialias: true, autoDensity: true, resolution: Math.min(devicePixelRatio || 1, 2), backgroundColor: 0x192630 });
    app.ticker.stop();
    const map = maps.find(map => map.id === 'moonlit-pass');
    const theme = mapSceneFor(map);
    const [mapTextures, figures, enemyTexture, effects] = await Promise.all([
      Promise.all(['terrain', 'spawn', 'base', 'road', 'platform'].map(async key => [key, await PIXI.Assets.load(theme.assets[key])])),
      Promise.all(CASTS.map(cast => PIXI.Assets.load(`/td/heroes-alt/figures/${cast.heroId}-v1.json`))),
      PIXI.Assets.load('/td/enemies/sprites/grunt-v2.webp'),
      Promise.all(manifest.clips.map(clip => loadFxAtlas(PIXI, clip))),
    ]);
    atlases.push(...effects);
    if (disposed) { atlases.forEach(atlas => atlas.destroy()); if (app?.renderer) app.destroy(false, { children: true }); return; }
    const textures = Object.fromEntries(mapTextures);
    const root = app.stage;
    const backdrop = new PIXI.Sprite(textures.terrain);
    backdrop.width = 960; backdrop.height = 540;
    root.addChild(backdrop);
    const layers = {};
    for (const key of ['ground', 'structures', 'slots', 'groundFx', 'units', 'foreground', 'fx', 'overlay']) {
      layers[key] = new PIXI.Container(); root.addChild(layers[key]);
    }
    const game = { map, time: 0, lives: 20, maxLives: 20, started: true, effects: [], heroes: [], enemies: [], zones: [] };
    scene = createMapScene(PIXI, game, { ...layers, textures, reducedMotion });
    // Match the map's existing platform placements, without adding gameplay hit zones.
    // The scene painter already owns roads, gates and the sanctuary.
    for (const [x, y] of map.platformSlots) {
      const tile = new PIXI.Sprite(textures.platform);
      tile.anchor.set(0.5, 0.5); tile.position.set(x, y + 9);
      tile.width = 100; tile.height = 55; tile.alpha = 0.85;
      layers.slots.addChild(tile);
    }
    const kit = createFxKit(PIXI, layers.fx, { reducedMotion, max: 400 });
    const groundKit = createFxKit(PIXI, layers.groundFx, { reducedMotion, max: 120 });
    const heroFx = createHeroFx(kit, { groundKit, reducedMotion });
    const lightningFx = createOdinFx(PIXI, layers.fx, kit, { reducedMotion });
    const statusFx = createStatusFx(kit, { reducedMotion });
    const baseline = [...layers.fx.children, ...layers.groundFx.children];
    const atlasById = new Map(manifest.clips.map((clip, i) => [clip.id, atlases[i]]));
    const units = [];
    for (const [i, cast] of CASTS.entries()) {
      const sheet = figures[i];
      const frame = sheet.animations.idle[0];
      const hero = new PIXI.Sprite(frame);
      const td = sheet.data.td;
      hero.anchor.set(td.anchor.x / frame.width, td.anchor.y / frame.height);
      hero.scale.set(79 / td.bodyHeight);
      hero.position.set(...cast.source);
      layers.units.addChild(hero);
      const shadow = new PIXI.Graphics().ellipse(cast.source[0], cast.source[1], 24, 8).fill({ color: 0x000000, alpha: 0.3 });
      layers.groundFx.addChild(shadow);
      const label = new PIXI.Text({ text: cast.label, style: { fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: '600', fill: 0xe4d5b1, stroke: { color: 0x15222a, width: 3 }, letterSpacing: 0.7 } });
      label.anchor.set(0.5, 0); label.position.set(cast.source[0], cast.source[1] + 22);
      layers.overlay.addChild(label);
      const spriteFx = atlasById.get(cast.id).create(layers.fx, ...cast.target);
      spriteFx.seek(-1); instances.push(spriteFx);
      const unit = { cast, sheet, hero, label, shadow, spriteFx, enemy: null };
      if (cast.id !== 'buff') {
        const enemy = new PIXI.Sprite(enemyTexture);
        enemy.anchor.set(0.5, 0.94); enemy.height = 65; enemy.scale.x = enemy.scale.y;
        enemy.position.set(...cast.target); layers.units.addChild(enemy); unit.enemy = enemy;
      }
      units.push(unit);
    }
    let mode = 'effekseer', selected = 'all', time = 0, speed = 1, paused = reducedMotion, last = null;
    let previousTime = -1, sampleFrames = 0, sampleStart = performance.now();
    const active = cast => selected === 'all' || selected === cast.id;
    const showState = () => {
      pauseButton.textContent = paused ? 'Fortsetzen' : 'Pause';
      pauseButton.setAttribute('aria-pressed', String(paused));
      $('fx-state').textContent = paused ? (reducedMotion && time === 0 ? 'Bewegung reduziert · zum Starten Fortsetzen wählen' : 'Pausiert') : time >= DURATION ? 'Sequenz beendet' : 'Sequenz läuft';
    };
    const reset = () => {
      time = 0; previousTime = -1; game.time = 0; game.effects = []; game.zones = [];
      kit.clear(); groundKit.clear(); heroFx.reset(); lightningFx.update([]);
      instances.forEach(instance => instance.seek(-1));
      showState();
    };
    const castBaseline = cast => {
      const [x, y] = cast.target, [sourceX, sourceY] = cast.source;
      const type = cast.id === 'buff' ? 'buff' : cast.id === 'lightning' ? 'ult' : 'hit';
      game.effects.push({ type, heroId: cast.heroId, heroVariant: cast.id === 'lightning' ? 'chain_lightning' : 'fire', sourceX, sourceY, x, y, x1: sourceX, y1: sourceY, x2: x, y2: y, life: 0.9, at: cast.at, radius: 40 });
    };
    const syncControls = () => {
      mode = document.querySelector('input[name=mode]:checked').value;
      selected = document.querySelector('input[name=effect]:checked').value;
      $('fx-mode-label').textContent = mode === 'effekseer' ? 'Effekseer' : 'Bisherige Effekte';
      reset();
    };
    document.querySelectorAll('input[name=mode], input[name=effect]').forEach(input => input.addEventListener('change', syncControls, { signal: events.signal }));
    $('fx-speed').addEventListener('change', event => { speed = Number(event.target.value); }, { signal: events.signal });
    pauseButton.addEventListener('click', () => { paused = !paused; if (!paused && time >= DURATION) reset(); showState(); }, { signal: events.signal });
    replayButton.addEventListener('click', () => { paused = false; reset(); }, { signal: events.signal });
    document.addEventListener('visibilitychange', () => { last = null; }, { signal: events.signal });
    const draw = now => {
      if (disposed) return;
      const wallDt = last === null || document.hidden ? 0 : Math.min((now - last) / 1000, 0.05);
      last = now;
      const dt = paused ? 0 : wallDt * speed;
      if (time >= DURATION && !paused && $('fx-repeat').checked) reset();
      time = Math.min(DURATION, time + dt); game.time = time;
      baseline.forEach(layer => { layer.visible = mode === 'current'; });
      if (mode === 'current') {
        for (const cast of CASTS) if (active(cast) && previousTime < cast.at && time >= cast.at) castBaseline(cast);
        game.effects = game.effects.filter(effect => { effect.life = 0.9 - (time - effect.at); return effect.life > 0; });
        heroFx.update(game); lightningFx.update(game.effects);
        const fire = CASTS[1];
        const burning = active(fire) && time >= fire.at && time < fire.at + 1.8;
        statusFx.update(burning ? [fire] : [], dt, () => ({ x: fire.target[0], y: fire.target[1], top: fire.target[1] - 58, width: 32 }), () => ['burn']);
        kit.update(dt); groundKit.update(dt);
      }
      for (const unit of units) {
        const { cast, hero, sheet, spriteFx } = unit;
        const local = time - cast.at;
        const isActive = active(cast);
        spriteFx.seek(mode === 'effekseer' && isActive ? local : -1);
        // Only the large sky strike is attenuated; its source example was authored for a full-screen attack.
        spriteFx.container.alpha = cast.id === 'lightning' ? 0.72 : 0.9;
        const clip = isActive && local >= 0 && local < 0.6 ? sheet.animations.attack : sheet.animations.idle;
        hero.texture = clip[Math.floor(time * 8) % clip.length];
        hero.alpha = isActive ? 1 : 0.4;
        unit.label.alpha = isActive ? 1 : 0.4;
        if (unit.enemy) unit.enemy.alpha = isActive ? 1 : 0.4;
      }
      previousTime = time;
      scene.draw(time * 1000);
      app.renderer.render(root);
      $('fx-progress').value = time;
      $('fx-time').textContent = `${time.toFixed(2)} / 4.00 s`;
      if (time >= DURATION) showState();
      sampleFrames++;
      if (now - sampleStart > 600) {
        $('fx-fps').textContent = `${Math.round(sampleFrames * 1000 / (now - sampleStart))} FPS`;
        sampleStart = now; sampleFrames = 0;
      }
      canvas.dataset.mode = mode;
      canvas.dataset.time = time.toFixed(3);
      raf = requestAnimationFrame(draw);
    };
    loading.hidden = true;
    pauseButton.disabled = replayButton.disabled = false;
    canvas.dataset.ready = 'true';
    showState();
    raf = requestAnimationFrame(draw);
  } catch (error) {
    console.error('FX lab failed', error);
    cleanup();
    loading.hidden = false;
    loading.textContent = `Die Vorschau konnte nicht geladen werden. ${error instanceof Error ? error.message : String(error)}. Bitte Seite neu laden.`;
  }
}
