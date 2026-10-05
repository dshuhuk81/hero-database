// "Lean" wave shape (dev experiment, TOWER_DEFENSE_ROADMAP.md, "Wave-shape variants"): fewer enemies
// with the same total health, attack, leak damage and reward, and a longer spawn gap. Applied only
// by `?lean=<count multiplier>` (e.g. ?lean=0.6) and by scripts/td-wave-variants.mjs; never by default.
export const LEAN_GAP = 1.5;
// The bot wins clearly less against fewer, tougher enemies at equal total health, so stages also
// need less health (measured about 0.55-0.8 of today's hpScale at count x0.6). First guess.
export const LEAN_HP_FACTOR = 0.7;

export function leanWaveTuning(tuning, countMultiplier, gapMultiplier = LEAN_GAP) {
  const next = JSON.parse(JSON.stringify(tuning));
  const shape = next.board?.waveShape;
  if (!shape || !(countMultiplier > 0)) return next;
  const scale = (cfg) => {
    for (const key of ["hp", "attack", "leak", "power"]) if (cfg[key] != null) cfg[key] /= countMultiplier;
    if (cfg.count != null) cfg.count *= countMultiplier;
  };
  scale(shape);
  for (const kind of Object.values(shape.kinds ?? {})) scale(kind);
  shape.gap *= gapMultiplier;
  return next;
}

// Reads `?lean=` from a query string; returns the count multiplier (0 < x <= 1) or null.
export function leanParam(search) {
  const raw = new URLSearchParams(search).get("lean");
  if (raw == null) return null;
  const value = raw === "" ? 0.6 : Number(raw);
  return value > 0 && value <= 1 ? value : null;
}
