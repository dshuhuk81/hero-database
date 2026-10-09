// Minimal WebAudio player for the tower defense minigame, plus background music.
// Combat and interface sounds from td/sfx on R2 (Tactical Interface SFX, commercial license;
// public/td/sfx/CREDITS-mythic.txt). Volume and mute persist in localStorage; hit sounds are
// capped so a crowded stage stays pleasant.
import { devAssets, tdAsset } from "./assets.js";
import levels from "../../data/tdAudioLevels.json";

const SOUNDS = {
  hit: ["ui-hit-a-v1", "ui-hit-b-v1"],
  heavy: ["ui-heavy-v1"],
  blocked: ["ui-blocked-v1"],
  select: ["ui-select-v1"],
  place: ["ui-place-v1"],
  upgrade: ["ui-upgrade-v1"],
  clear: ["ui-clear-v1"],
  error: ["ui-error-v1"],
};

const MIN_GAP_MS = { hit: 120, blocked: 150, heavy: 150 };
const MAX_WITHIN_WINDOW = { hit: { count: 3, windowMs: 600 } };
// Hero attack sounds fire on every hit, so each hero gets a cooldown and all heroes
// share a cap; ultimates and voices are rare enough to play every time.
const HERO_ATTACK_GAP_MS = 700;
const HERO_ATTACK_CAP = { count: 4, windowMs: 1000 };
// Per-file gain in dB (scripts/td-audio-levels.mjs) evens out loudness per category.
const LEVELS = levels as Record<string, number>;

// heroSounds: per-hero sound keys from the hero skin (skin.js).
export function createAudio(heroSounds: Record<string, { voice?: string; attack?: string; ultimate?: string }> = {}) {
  let context: AudioContext | null = null;
  const buffers = new Map();
  const lastPlayedAt = new Map();
  const recentHits: number[] = [];
  const recentAttacks: number[] = [];
  let volume = 0.7;
  let muted = false;

  try {
    const saved = JSON.parse(localStorage.getItem("td:audio") || "null");
    if (saved && typeof saved.volume === "number") volume = Math.min(1, Math.max(0, saved.volume));
    if (saved) muted = !!saved.muted;
  } catch {}

  const persist = () => { try { localStorage.setItem("td:audio", JSON.stringify({ volume, muted })); } catch {} };

  function ensureContext() {
    if (!context) context = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (context.state === "suspended") context.resume().catch(() => {});
    return context;
  }

  async function buffer(name: string) {
    if (buffers.has(name)) return buffers.get(name)!;
    // Dev: revalidate so sounds replaced on R2 under the same name are not served from an old cache entry.
    const promise = fetch(tdAsset(`sfx/${name}.ogg`), devAssets() ? { cache: "no-cache" } : undefined)
      .then((response) => response.arrayBuffer())
      .then((data) => ensureContext().decodeAudioData(data))
      .catch(() => null);
    buffers.set(name, promise);
    return promise;
  }

  function allowed(kind: string) {
    const now = performance.now();
    const gap = MIN_GAP_MS[kind as keyof typeof MIN_GAP_MS];
    if (gap && now - (lastPlayedAt.get(kind) || 0) < gap) return false;
    const cap = MAX_WITHIN_WINDOW[kind as keyof typeof MAX_WITHIN_WINDOW];
    if (cap) {
      while (recentHits.length && now - recentHits[0] > cap.windowMs) recentHits.shift();
      if (recentHits.length >= cap.count) return false;
      recentHits.push(now);
    }
    lastPlayedAt.set(kind, now);
    return true;
  }

  function heroAttackAllowed(heroId: string) {
    const now = performance.now();
    const key = `attack:${heroId}`;
    if (now - (lastPlayedAt.get(key) || 0) < HERO_ATTACK_GAP_MS) return false;
    while (recentAttacks.length && now - recentAttacks[0] > HERO_ATTACK_CAP.windowMs) recentAttacks.shift();
    if (recentAttacks.length >= HERO_ATTACK_CAP.count) return false;
    recentAttacks.push(now);
    lastPlayedAt.set(key, now);
    return true;
  }

  async function play(kind: keyof typeof SOUNDS | string, heroId?: string) {
    if (muted || !allowed(kind)) return;
    if (kind === "attack" && heroId && heroSounds[heroId] && !heroAttackAllowed(heroId)) return;
    let name: string | undefined;

    if (heroId && kind in { voice: 1, attack: 1, ultimate: 1 }) {
      const sounds = heroSounds[heroId];
      if (sounds) name = sounds[kind as keyof typeof sounds];
    }

    if (!name) {
      const variants = SOUNDS[kind as keyof typeof SOUNDS];
      if (!variants) return;
      name = variants[Math.floor(Math.random() * variants.length)];
    }

    const data = await buffer(name);
    if (!data || muted) return;
    const ctx = ensureContext();
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    gain.gain.value = volume * 10 ** ((LEVELS[name] ?? 0) / 20);
    source.buffer = data;
    source.connect(gain).connect(ctx.destination);
    source.start();
  }

  return {
    play,
    get muted() { return muted; },
    get volume() { return volume; },
    toggleMute() { muted = !muted; persist(); return muted; },
    setVolume(value: number) { volume = Math.min(1, Math.max(0, value)); if (volume > 0) muted = false; persist(); },
  };
}

// Background music: one looping <audio> element per page, streamed from td/music on
// R2 and only fetched once a map starts unmuted. Routed through a GainNode because
// iOS Safari ignores HTMLMediaElement.volume. Own volume/mute, persisted separately.
export function createMusic() {
  let element: HTMLAudioElement | null = null;
  let context: AudioContext | null = null;
  let gain: GainNode | null = null;
  let track = "";
  let volume = 0.05;
  let muted = false;

  try {
    const saved = JSON.parse(localStorage.getItem("td:music") || "null");
    if (saved && typeof saved.volume === "number") volume = Math.min(1, Math.max(0, saved.volume));
    if (saved) muted = !!saved.muted;
  } catch {}

  const persist = () => { try { localStorage.setItem("td:music", JSON.stringify({ volume, muted })); } catch {} };

  function ensureElement() {
    if (element) return element;
    element = new Audio();
    element.crossOrigin = "anonymous";
    element.loop = true;
    element.preload = "auto";
    try {
      context = new (window.AudioContext || (window as any).webkitAudioContext)();
      gain = context.createGain();
      context.createMediaElementSource(element).connect(gain).connect(context.destination);
    } catch {
      context = null;
      gain = null;
    }
    return element;
  }

  function applyVolume() {
    if (gain) gain.gain.value = volume;
    else if (element) element.volume = volume;
  }

  function sync() {
    if (!track || muted || volume === 0 || document.hidden) {
      element?.pause();
      return;
    }
    const audio = ensureElement();
    if (audio.dataset.track !== track) {
      audio.src = tdAsset(`music/${track}.m4a`);
      audio.dataset.track = track;
    }
    applyVolume();
    if (context?.state === "suspended") context.resume().catch(() => {});
    audio.play().catch(() => {
      // Autoplay is blocked until the first tap or key press (the menu track starts on load).
      document.addEventListener("pointerdown", sync, { once: true });
      document.addEventListener("keydown", sync, { once: true });
    });
  }

  document.addEventListener("visibilitychange", sync);

  return {
    // Same track again (restart run on the same map) keeps playing without a restart.
    play(name: string) { track = name || ""; sync(); },
    stop() {
      track = "";
      if (!element) return;
      element.pause();
      element.removeAttribute("src");
      delete element.dataset.track;
      element.load();
    },
    get muted() { return muted; },
    get volume() { return volume; },
    toggleMute() { muted = !muted; persist(); sync(); return muted; },
    setVolume(value: number) { volume = Math.min(1, Math.max(0, value)); if (volume > 0) muted = false; persist(); sync(); },
  };
}
