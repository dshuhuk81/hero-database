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
  HERO_ATLAS_FX[id].heal = { ...activation(PROFILES[id].accent, id.startsWith('recruit-')), alpha: 0.55, speed: 2.2, replace: false };
}

export function locateAuthoredFx(effect, recipe, game, visualHeroPoint) {
  if (recipe.clip === 'buff') {
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
  const [x, y] = recipe.clip === 'fire' ? moltenGroundPoint(game.map, effect.x, effect.y) : [effect.x, effect.y];
  return { x, y: y + 6 };
};

export function createAuthoredFx({ atlases = new Map(), parent, reducedMotion = false, max = 32, uprightScale = 1,
  locate = effect => ({ x: effect.x, y: effect.y }) } = {}) {
  let seen = new WeakSet(), accepted = new WeakSet();
  const live = [];
  const valid = point => point && Number.isFinite(point.x) && Number.isFinite(point.y);
  const remove = index => { live[index].instance.destroy(); live.splice(index, 1); };
  return {
    owns: effect => accepted.has(effect),
    count: () => live.length,
    update(effects, dt) {
      // Advance existing instances before spawning, so new casts begin at frame zero.
      for (let i = live.length - 1; i >= 0; i--) {
        const entry = live[i];
        entry.age += Math.max(0, dt) * entry.recipe.speed;
        if (entry.follow) {
          const point = entry.follow();
          if (!valid(point)) { remove(i); continue; }
          entry.instance.container.position.set(point.x, point.y);
        }
        if (!entry.instance.seek(entry.age)) remove(i);
      }
      if (reducedMotion) return;
      for (const effect of effects) {
        if (seen.has(effect)) continue;
        seen.add(effect);
        const recipe = HERO_ATLAS_FX[effect.heroId]?.[effect.type];
        const atlas = recipe && atlases.get(recipe.clip);
        // If a clip is unavailable or the visual budget is exhausted, keep baseline FX.
        if (!atlas || live.length >= max) continue;
        const point = locate(effect, recipe);
        if (!valid(point)) continue;
        const instance = atlas.create(parent, point.x, point.y, recipe.width);
        instance.container.alpha = recipe.alpha;
        instance.container.tint = recipe.tint ?? 0xffffff;
        instance.container.scale.y = uprightScale;
        instance.seek(0);
        live.push({ instance, recipe, age: 0, follow: point.follow });
        if (recipe.replace) accepted.add(effect);
      }
    },
    clear() {
      while (live.length) remove(live.length - 1);
      seen = new WeakSet(); accepted = new WeakSet();
    },
    destroy() {
      this.clear();
      for (const atlas of atlases.values()) atlas.destroy();
      atlases.clear();
    },
  };
}

export async function loadAuthoredFx(PIXI, parent, options = {}) {
  const atlases = new Map();
  if (!options.reducedMotion) {
    try {
      const response = await fetch('/td/fx/effekseer-v1/manifest.json', { signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`FX manifest: HTTP ${response.status}`);
      const { clips } = await response.json();
      const results = await Promise.allSettled(clips.map(async clip => [clip.id, await loadFxAtlas(PIXI, clip)]));
      for (const result of results) {
        if (result.status === 'fulfilled') atlases.set(...result.value);
        else console.warn('Authored FX unavailable; using baseline effect.', result.reason);
      }
    } catch (error) {
      console.warn('Authored FX unavailable; using baseline effects.', error);
    }
  }
  return createAuthoredFx({ ...options, parent, atlases });
}
