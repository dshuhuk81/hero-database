// Minimal WebAudio player for the tower defense minigame, plus background music.
// Kenney impact/interface sounds from td/sfx on R2 (CC0). Volume and mute persist
// in localStorage; hit sounds are capped so a full wave stays pleasant.
import { tdAsset } from "./assets.js";
import levels from "../../data/tdAudioLevels.json";

const SOUNDS = {
  hit: ["impactGeneric_light_000", "impactGeneric_light_001"],
  heavy: ["impactMetal_heavy_000"],
  blocked: ["impactMetal_light_000"],
  select: ["click_001"],
  place: ["confirmation_001"],
  upgrade: ["maximize_001"],
  clear: ["bong_001"],
  error: ["error_001"],
};

const HERO_SOUNDS: Record<string, { voice?: string; attack?: string; ultimate?: string }> = {
  zeus: { voice: "zeus_voice", attack: "zeus_attack", ultimate: "zeus_ultimate" },
  caishen: { voice: "caishen_voice", attack: "caishen_attack", ultimate: "caishen_ultimate" },
  demeter: { voice: "demeter_voice", attack: "demeter_attack", ultimate: "demeter_ultimate" },
  poseidon: { voice: "poseidon_voice", attack: "poseidon_attack", ultimate: "poseidon_ultimate" },
  diana: { voice: "diana_voice", attack: "diana_attack", ultimate: "diana_ultimate" },
  anubis: { voice: "anubis_voice", attack: "anubis_attack", ultimate: "anubis_ultimate" },
  fengyi: { voice: "fengyi_voice", attack: "fengyi_attack", ultimate: "fengyi_ultimate" },
  amunra: { voice: "amunra_voice", attack: "amunra_attack", ultimate: "amunra_ultimate" },
  artemis: { voice: "artemis_voice", attack: "artemis_attack", ultimate: "artemis_ultimate" },
  bastet: { voice: "bastet_voice", attack: "bastet_attack", ultimate: "bastet_ultimate" },
  freya: { voice: "freya_voice", attack: "freya_attack", ultimate: "freya_ultimate" },
  horus: { voice: "horus_voice", attack: "horus_attack", ultimate: "horus_ultimate" },
  jormungandr: { voice: "jormungandr_voice", attack: "jormungandr_attack", ultimate: "jormungandr_ultimate" },
  medusa: { voice: "medusa_voice", attack: "medusa_attack", ultimate: "medusa_ultimate" },
  momus: { voice: "momus_voice", attack: "momus_attack", ultimate: "momus_ultimate" },
  nuwa: { voice: "nuwa_voice", attack: "nuwa_attack", ultimate: "nuwa_ultimate" },
  nyx: { voice: "nyx_voice", attack: "nyx_attack", ultimate: "nyx_ultimate" },
  phoenix: { voice: "phoenix_voice", attack: "phoenix_attack", ultimate: "phoenix_ultimate" },
  prometheus: { voice: "prometheus_voice", attack: "prometheus_attack", ultimate: "prometheus_ultimate" },
  set: { voice: "set_voice", attack: "set_attack", ultimate: "set_ultimate" },
  yuelao: { voice: "yuelao_voice", attack: "yuelao_attack", ultimate: "yuelao_ultimate" },
};

const MIN_GAP_MS = { hit: 120, blocked: 150, heavy: 150 };
const MAX_WITHIN_WINDOW = { hit: { count: 3, windowMs: 600 } };
// Hero attack sounds fire on every hit, so each hero gets a cooldown and all heroes
// share a cap; ultimates and voices are rare enough to play every time.
const HERO_ATTACK_GAP_MS = 700;
const HERO_ATTACK_CAP = { count: 4, windowMs: 1000 };
// Per-file gain in dB (scripts/td-audio-levels.mjs) evens out loudness per category.
const LEVELS = levels as Record<string, number>;

export function createAudio() {
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
    const promise = fetch(tdAsset(`sfx/${name}.ogg`))
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
    if (kind === "attack" && heroId && HERO_SOUNDS[heroId] && !heroAttackAllowed(heroId)) return;
    let name: string | undefined;

    if (heroId && kind in { voice: 1, attack: 1, ultimate: 1 }) {
      const heroSounds = HERO_SOUNDS[heroId];
      if (heroSounds) name = heroSounds[kind as keyof typeof heroSounds];
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
    audio.play().catch(() => {});
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
