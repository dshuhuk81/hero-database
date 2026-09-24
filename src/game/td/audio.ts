// Minimal WebAudio player for the tower defense minigame.
// Kenney impact/interface sounds from public/td/sfx (CC0). Volume and mute persist
// in localStorage; hit sounds are capped so a full wave stays pleasant.

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

const MIN_GAP_MS = { hit: 120, blocked: 150, heavy: 150 };
const MAX_WITHIN_WINDOW = { hit: { count: 3, windowMs: 600 } };

export function createAudio() {
  let context = null;
  const buffers = new Map();
  const lastPlayedAt = new Map();
  const recentHits: number[] = [];
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
    const promise = fetch(`/td/sfx/${name}.ogg`)
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

  async function play(kind: keyof typeof SOUNDS) {
    if (muted || !allowed(kind)) return;
    const variants = SOUNDS[kind];
    const name = variants[Math.floor(Math.random() * variants.length)];
    const data = await buffer(name);
    if (!data || muted) return;
    const ctx = ensureContext();
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    gain.gain.value = volume;
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
