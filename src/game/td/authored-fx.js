import { loadFxAtlas } from './fx-atlas.js';
import { PROFILES, moltenGroundPoint } from './hero-fx.js';

// Presentation only. These entries neither add statuses nor change damage/range/duration.
// Keep travelling chain links, melee arcs, healing returns and persistent ward indicators.
const activation = (tint, recruit = false) => ({
  clip: 'buff', width: recruit ? 82 : 108, alpha: recruit ? 0.5 : 0.65,
  speed: 1.8, tint, replace: true,
});

export const HERO_ATLAS_FX = {
  // Every hero can receive a Lord activation. Keep its own palette and a quieter
  // mortal version for recruits; this also covers skill-generated buff events.
  ...Object.fromEntries(Object.entries(PROFILES).map(([id, profile]) => [id, {
    buff: activation(profile.accent, id.startsWith('recruit-')),
  }])),
  odin: { buff: activation(PROFILES.odin.accent), ult: { clip: 'lightning', width: 245, alpha: 0.72, speed: 1, replace: true } },
  surtr: {
    buff: activation(PROFILES.surtr.accent),
    hit: { clip: 'fire', width: 76, alpha: 0.75, speed: 2.5, replace: false },
    ult: { clip: 'fire', width: 132, alpha: 0.9, speed: 1, replace: false },
  },
  heimdall: { buff: { clip: 'buff', width: 132, alpha: 0.9, speed: 1, replace: true, status: 'ward' } },
};

// Only fire-themed ultimates get flames. Projectiles, their timed impacts and
// persistent lava geometry continue to be drawn by the hero-specific renderer.
for (const id of ['hephaestus', 'recruit-ives']) {
  HERO_ATLAS_FX[id].ult = { clip: 'fire', width: id === 'hephaestus' ? 148 : 98, alpha: 0.8, speed: 1.3, replace: false };
}
for (const id of ['helios', 'vidar', 'atalanta']) HERO_ATLAS_FX[id].buff.status = 'window';
for (const id of ['skadi', 'plutus', 'recruit-wren', 'recruit-poppy']) HERO_ATLAS_FX[id].buff.status = 'attack';
// Keep coins, notes, leaves and healing motes as the readable hero signature.
// Fortune Shower emits heal AND buff: only its buff gets an atlas to avoid doubling.
for (const id of ['atlas', 'gaia', 'harmonia', 'asclepius', 'recruit-bram', 'recruit-jory']) {
  const recruit = id.startsWith('recruit-');
  HERO_ATLAS_FX[id].heal = { clip: 'heal', width: recruit ? 62 : 78, alpha: recruit ? 0.55 : 0.7, speed: 1.6, replace: false };
}

// Ultimate supplements by element (October 8, 2026). Every one keeps the hero's own
// renderer (replace: false) and only adds the baked clip. `at: 'source'` plays on the
// caster (self or ally skills), otherwise on the ult's target point. Themes follow the
// skill names in gameBalance.tuning.json heroSkills; none adds a status or changes a number.
// Heimdall (ward on allies), Plutus and Poppy (coins), Atalanta (attack window) keep
// their activation cues only.
const ULTS = {
  boreas: { clip: 'ice', width: 150 },                                    // Ice Shockwave
  ymir: { clip: 'shockwave', width: 130, tint: 0xbfe8ff },                // Titan's Expose
  aegir: { clip: 'water', width: 150 },                                   // Tidal Surge
  'recruit-sable': { clip: 'shockwave', width: 100, alpha: 0.7 },         // Knockback
  helios: { clip: 'holy', width: 140 },                                   // Solar Rush
  isis: { clip: 'holy', width: 120 },                                     // Sun Beam
  atlas: { clip: 'holy', width: 150, at: 'source', tint: 0xfff1c9 },      // Celestial Bulwark
  'recruit-bram': { clip: 'holy', width: 110, at: 'source', alpha: 0.6 }, // Shield Wall
  gaia: { clip: 'heal', width: 170, at: 'source', tint: 0xc8f5a8 },       // Rooted Sanctuary
  asclepius: { clip: 'heal', width: 170, at: 'source' },                  // Valkyrie's Call
  harmonia: { clip: 'holy', width: 130, at: 'source', tint: 0xffb3c8 },   // Fate Link
  'recruit-jory': { clip: 'holy', width: 100, at: 'source', alpha: 0.6, tint: 0xffe1a8 },
  nott: { clip: 'shadow', width: 110 },                                   // Shadow Step
  hecate: { clip: 'shadow', width: 120, tint: 0xd7a6ff },                 // Claw Sweep
  'recruit-nyra': { clip: 'shadow', width: 90, alpha: 0.7 },              // Claw Sweep
  'recruit-ash': { clip: 'shadow', width: 90, alpha: 0.7 },               // Rapid Strike
  'recruit-elm': { clip: 'shadow', width: 100, alpha: 0.75, tint: 0xd0f5b8 }, // Weaken Burst
  thanatos: { clip: 'feather', width: 150 },                              // Featherfall Judgment
  vidar: { clip: 'wind', width: 110, at: 'source' },                      // Flurry
  fenrir: { clip: 'venom', width: 130 },                                  // Venom Coil
  stheno: { clip: 'stone', width: 140 },                                  // Petrifying Gaze
  skadi: { clip: 'cosmic', width: 130 },                                  // Moon Barrage
  'recruit-wren': { clip: 'cosmic', width: 100, alpha: 0.7 },             // Moon Barrage
  'recruit-hollis': { clip: 'shockwave', width: 80, alpha: 0.6 },         // Piercing Shot
  'recruit-kellan': { clip: 'shockwave', width: 120, at: 'source', tint: 0xffe2a0 }, // War Cry
  'recruit-tilda': { clip: 'shockwave', width: 120, at: 'source', tint: 0xffe2b0 },  // Mass Taunt
};
for (const [id, ult] of Object.entries(ULTS)) HERO_ATLAS_FX[id].ult = { alpha: 0.85, speed: 1, replace: false, ...ult };

// Supports with the passive attack aura: a swirling ground aura instead of the drawn ring.
// Three hue variants of one clip; the drawn range wave and ally rims stay (they carry rules).
const SUPPORT_AURA = { gaia: 'aura', asclepius: 'aura', 'recruit-poppy': 'aura',
  plutus: 'aura-gold', 'recruit-jory': 'aura-gold', harmonia: 'aura-rose' };
for (const [id, clip] of Object.entries(SUPPORT_AURA)) {
  HERO_ATLAS_FX[id].aura = { clip, ground: true, width: id.startsWith('recruit-') ? 96 : 116, alpha: id.startsWith('recruit-') ? 0.6 : 0.75, speed: 1 };
}

// World events without a hero (sim.js emit): boss arrival, boss death, summons.
// Supplements; the particle cues in render.js stay. Cronus strikes play through `play()`.
export const EVENT_ATLAS_FX = {
  boss: { clip: 'boss-rise', width: 150, alpha: 0.8, speed: 1, replace: false },
  bossDown: { clip: 'boss-death', width: 220, alpha: 0.9, speed: 1, replace: false },
  summon: { clip: 'shadow', width: 100, alpha: 0.75, speed: 1.2, replace: false, tint: 0xffa0a0 },
  // Chapter board events (board-events.js, G2): Ashen eruption warning and burst, Tidal flood.
  lavaWarn: { clip: 'fire', width: 78, alpha: 0.75, speed: 0.7, replace: false, tint: 0xffb070 },
  lavaBurst: { clip: 'blast', width: 150, alpha: 0.95, speed: 1, replace: false },
  floodRise: { clip: 'water', width: 120, alpha: 0.8, speed: 1, replace: false },
  frostSet: { clip: 'ice', width: 110, alpha: 0.85, speed: 1.2, replace: false },
  rodStrike: { clip: 'lightning', width: 150, alpha: 0.9, speed: 1.4, replace: false },
  sporeGrow: { clip: 'venom', width: 100, alpha: 0.8, speed: 1, replace: false },
  sporeTrampled: { clip: 'venom', width: 80, alpha: 0.6, speed: 1.8, replace: false },
  prismOn: { clip: 'holy', width: 110, alpha: 0.8, speed: 1, replace: false, tint: 0xd7b8ff },
  ghostRise: { clip: 'shadow', width: 110, alpha: 0.85, speed: 1, replace: false, tint: 0xb8c8ff },
  fruitDrop: { clip: 'feather', width: 110, alpha: 0.85, speed: 1, replace: false, tint: 0xffc56b },
  fruitTaken: { clip: 'buff', width: 110, alpha: 0.9, speed: 1.3, replace: false, tint: 0xffd36b },
  alignOn: { clip: 'cosmic', width: 100, alpha: 0.75, speed: 1, replace: false },
  gearWarn: { clip: 'stone', width: 80, alpha: 0.6, speed: 0.8, replace: false },
  gearJam: { clip: 'shockwave', width: 130, alpha: 0.9, speed: 1, replace: false },
};
// Clips each board event needs, preloaded when the stage's environment has that event.
export const BOARD_EVENT_CLIPS = { eruption: ['fire', 'blast'], flood: ['water'], frostbite: ['ice'], rod: ['lightning'], spores: ['venom'],
  prism: ['holy'], ghosts: ['shadow'], windfall: ['feather', 'buff'], alignment: ['cosmic'], gearjam: ['stone', 'shockwave'] };
export const BOSS_CLIPS = [...new Set(Object.values(EVENT_ATLAS_FX).map(recipe => recipe.clip))];
export const GOD_CLIPS = ['blast', 'fire'];

// Clips a hero can play, so a battle only downloads the families of heroes on the board.
export const heroAtlasClips = id => [...new Set(Object.values(HERO_ATLAS_FX[id] ?? {}).map(recipe => recipe.clip))];

export function locateAuthoredFx(effect, recipe, game, visualHeroPoint) {
  if (effect.type === 'buff' || effect.type === 'heal') {
    const ally = game.heroes.find(hero => Math.hypot(hero.x - effect.x, hero.y - effect.y) < 1);
    if (!ally) return null;
    const expires = () => recipe.status === 'ward' ? ally.wardUntil
      : recipe.status === 'window' ? ally.win?.until
        : recipe.status === 'attack' ? ally.buffUntil : undefined;
    // Lord activations can share the buff event without the skill's status.
    const tracksStatus = expires() > game.time;
    const follow = () => {
      if (ally.hpLeft <= 0 || !game.heroes.includes(ally) || (tracksStatus && !(expires() > game.time))) return null;
      const [x, y] = visualHeroPoint(ally);
      return { x, y: y + 6 };
    };
    const point = follow();
    return point && { ...point, follow };
  }
  if (recipe.at === 'source') {
    const caster = game.heroes.find(hero => hero.entityId === effect.sourceId);
    const [x, y] = caster ? visualHeroPoint(caster) : [effect.sourceX, effect.sourceY];
    return { x, y: y + 6 };
  }
  const [x, y] = recipe.clip === 'fire' ? moltenGroundPoint(game.map, effect.x, effect.y) : [effect.x, effect.y];
  return { x, y: y + 6 };
};

const FADE = 0.2, FADE_IN = 0.12, OVERLAP = 0.65;

export function createAuthoredFx({ atlases = new Map(), parent, groundParent = parent, reducedMotion = false, max = 32, uprightScale = 1,
  locate = effect => ({ x: effect.x, y: effect.y }) } = {}) {
  let seen = new WeakSet(), accepted = new WeakSet();
  const live = [];
  // Sustained loops (support auras): key -> { clip, recipe, x, y } requested this frame.
  let kept = new Map();
  const valid = point => point && Number.isFinite(point.x) && Number.isFinite(point.y);
  const remove = index => { live[index].instance.destroy(); live.splice(index, 1); };
  const spawn = (atlas, recipe, point, extra = {}) => {
    const instance = atlas.create(recipe.ground ? groundParent : parent, point.x, point.y, recipe.width);
    instance.container.alpha = extra.key ? 0 : recipe.alpha;
    instance.container.tint = recipe.tint ?? 0xffffff;
    instance.container.scale.y = uprightScale;
    instance.seek(0);
    live.push({ instance, recipe, age: 0, follow: point.follow, duration: atlas.duration, ...extra });
  };
  return {
    owns: effect => accepted.has(effect),
    count: () => live.length,
    has: clip => atlases.has(clip),
    // One-shot clip at a board point (Cronus strikes). Returns false when it cannot play.
    play(clip, x, y, recipe = {}) {
      const atlas = atlases.get(clip);
      if (reducedMotion || !atlas || live.length >= max || !valid({ x, y })) return false;
      spawn(atlas, { width: undefined, alpha: 1, speed: 1, ...recipe, clip }, { x, y });
      return true;
    },
    // Call every frame while the loop should show; overlapping instances cross-fade, so the
    // clip never visibly restarts. A key not kept for one update fades out and is removed.
    keep(key, recipe, x, y) {
      if (!reducedMotion && atlases.has(recipe.clip) && valid({ x, y })) kept.set(key, { recipe, x, y });
    },
    update(effects, dt) {
      // Advance existing instances before spawning, so new casts begin at frame zero.
      for (let i = live.length - 1; i >= 0; i--) {
        const entry = live[i];
        entry.age += Math.max(0, dt) * entry.recipe.speed;
        if (entry.key !== undefined) {
          const want = kept.get(entry.key);
          if (!want) { remove(i); continue; }
          entry.instance.container.position.set(want.x, want.y);
        }
        if (entry.follow) {
          const point = entry.follow();
          if (!valid(point)) { remove(i); continue; }
          entry.instance.container.position.set(point.x, point.y);
        }
        if (!entry.instance.seek(entry.age)) { remove(i); continue; }
        if (entry.duration > 0) {
          const t = entry.age / entry.duration;
          // Fade the last fifth so clips cut at their atlas length never pop out;
          // loops also fade in so the next instance blends over the previous one.
          const fadeIn = entry.key !== undefined ? Math.min(1, t / FADE_IN) : 1;
          entry.instance.container.alpha = entry.recipe.alpha * Math.min(1, (1 - t) / FADE, fadeIn);
        }
      }
      for (const [key, want] of kept) {
        const atlas = atlases.get(want.recipe.clip);
        const newest = live.reduce((best, entry) => entry.key === key && (!best || entry.age < best.age) ? entry : best, null);
        if (atlas && (!newest || newest.age >= atlas.duration * OVERLAP) && live.length < max) spawn(atlas, want.recipe, want, { key });
      }
      kept = new Map();
      if (reducedMotion) return;
      for (const effect of effects) {
        if (seen.has(effect)) continue;
        seen.add(effect);
        const recipe = effect.heroId ? HERO_ATLAS_FX[effect.heroId]?.[effect.type] : EVENT_ATLAS_FX[effect.type];
        const atlas = recipe && atlases.get(recipe.clip);
        // If a clip is unavailable or the visual budget is exhausted, keep baseline FX.
        if (!atlas || live.length >= max) continue;
        const point = locate(effect, recipe);
        if (!valid(point)) continue;
        spawn(atlas, recipe, point);
        if (recipe.replace) accepted.add(effect);
      }
    },
    clear() {
      while (live.length) remove(live.length - 1);
      seen = new WeakSet(); accepted = new WeakSet(); kept = new Map();
    },
    destroy() {
      this.clear();
      for (const atlas of atlases.values()) atlas.destroy();
      atlases.clear();
    },
  };
}

// Fetches the manifest only; each clip downloads when a hero that uses it joins the board
// (`prepare`) or the stage needs it (`options.preload`: boss and god clips). The first cast
// after a slow download falls back to the baseline effect.
export async function loadAuthoredFx(PIXI, parent, options = {}) {
  // options.groundParent: layer under the units for ground clips (support auras).
  const atlases = new Map(), requested = new Set(), prepared = new Set();
  let manifest = null, destroyed = false;
  if (!options.reducedMotion) {
    try {
      const response = await fetch('/td/fx/effekseer-v1/manifest.json', { signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`FX manifest: HTTP ${response.status}`);
      manifest = new Map((await response.json()).clips.map(clip => [clip.id, clip]));
    } catch (error) {
      console.warn('Authored FX unavailable; using baseline effects.', error);
    }
  }
  const request = id => {
    if (!manifest?.has(id) || requested.has(id)) return;
    requested.add(id);
    loadFxAtlas(PIXI, manifest.get(id)).then(
      atlas => { if (destroyed) atlas.destroy(); else atlases.set(id, atlas); },
      error => console.warn(`Authored FX "${id}" unavailable; using baseline effect.`, error));
  };
  (options.preload ?? []).forEach(request);
  const player = createAuthoredFx({ ...options, parent, atlases });
  return {
    ...player,
    request,
    prepare(heroes) {
      for (const hero of heroes) {
        if (prepared.has(hero.id)) continue;
        prepared.add(hero.id);
        heroAtlasClips(hero.id).forEach(request);
      }
    },
    destroy() { destroyed = true; player.destroy(); },
  };
}
