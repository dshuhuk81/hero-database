// Wave tables per run mode. Classic plays tdWaves.json as is. The 20-wave mode and
// endless reuse it for waves 1-10 (plus a boss on wave 5), then continue with generated
// waves: a boss every `bossEvery` waves, the rest cycle through the late base waves
// with more enemies and shorter gaps. Deterministic, so seeded runs stay reproducible.

export const RUN_MODES = ["classic", "long", "endless"];
export const MODE_WAVES = { classic: 10, long: 20, endless: Infinity };
export const MODE_LABELS = { classic: "10 waves", long: "20 waves", endless: "Endless" };

const DEFAULTS = { bossEvery: 5, midBossScale: 0.4, countGrowth: 0.02, gapShrink: 0.02, gapFloor: 0.55 };

export const isRunMode = (mode) => RUN_MODES.includes(mode);

export function isBossWave(n, mode, cfg = {}) {
  if (mode === "classic") return n === MODE_WAVES.classic;
  return n % (cfg.bossEvery ?? DEFAULTS.bossEvery) === 0;
}

// Wave n (1-based) for a mode. `base` is tdWaves.json; its last wave is the boss template.
export function buildWave(base, n, mode, cfg = {}) {
  const opts = { ...DEFAULTS, ...cfg };
  const total = MODE_WAVES[mode] ?? MODE_WAVES.classic;
  const boss = isBossWave(n, mode, opts);
  // The final boss of a finite mode fights at full strength; earlier ones are scaled down.
  const bossScale = mode === "classic" || n === total || (mode === "endless" && n >= MODE_WAVES.long) ? 1 : opts.midBossScale;
  const withBoss = (spawns) => spawns.some((group) => group.kind === "boss")
    ? spawns.map((group) => group.kind === "boss" && bossScale !== 1 ? { ...group, scale: bossScale } : group)
    : [{ kind: "boss", count: 1, gapMs: 1000, ...(bossScale !== 1 && { scale: bossScale }) }, ...spawns];

  if (n <= base.length) {
    const spawns = base[n - 1].spawns.map((group) => ({ ...group }));
    return { wave: n, spawns: boss ? withBoss(spawns) : spawns };
  }

  // Non-boss waves cycle through the base waves between the last two bosses (6-9).
  const bossTemplate = base.length;
  const cycle = [];
  for (let w = bossTemplate - opts.bossEvery + 1; w < bossTemplate; w += 1) cycle.push(w);
  const templateWave = boss ? bossTemplate : cycle[(n - base.length - 1) % cycle.length];
  const beyond = n - templateWave;
  const countScale = 1 + opts.countGrowth * beyond;
  const gapScale = Math.max(opts.gapFloor, 1 - opts.gapShrink * beyond);
  const spawns = base[templateWave - 1].spawns.map((group) => group.kind === "boss"
    ? { ...group }
    : { ...group, count: Math.round(group.count * countScale), gapMs: Math.round(group.gapMs * gapScale) });
  return { wave: n, spawns: boss ? withBoss(spawns) : spawns };
}

// Finite table for classic and 20 waves; endless starts with the 20-wave table and the
// sim appends more with buildWave as the run goes on.
export function wavesForMode(base, mode, cfg = {}) {
  if (mode === "classic" || !isRunMode(mode)) return base.map((wave) => ({ ...wave, spawns: wave.spawns.map((group) => ({ ...group })) }));
  return Array.from({ length: MODE_WAVES.long }, (_, i) => buildWave(base, i + 1, mode, cfg));
}
