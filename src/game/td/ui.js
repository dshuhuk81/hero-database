// Pure UI helpers for the tower defense page: battlefield fitting, popover
// placement, screen-space hit targets and reason-based pausing.

export const WORLD_WIDTH = 960;
export const WORLD_HEIGHT = 540;

// One-line battlefield role per class (M6 class kits in tuning.classes).
export const CLASS_ROLES = {
  Tank: "Holds up to 3 enemies and shrugs off part of every hit. Its ultimate pins every ground enemy nearby in place.",
  Warrior: "Holds 2 enemies and cleaves the enemies next to its target.",
  Assassin: "Holds 1 enemy and dashes to enemies that slip past the line, hitting fast runners hardest. Its ultimate makes it untouchable for a moment while it strikes an extra enemy.",
  Mage: "Slow magic blasts that splash around the target (Zeus chains instead). Best against packs and armored Brutes.",
  Archer: "Slow, heavy shots at the toughest enemy in range. Pierces armor and hits flyers twice as hard.",
  Support: "Heals the most injured ally in range and raises the attack of allies inside its ring. Barely attacks.",
};

// Largest rectangle with the world aspect ratio that fits inside the container.
// A container without a usable height falls back to width-only fitting.
export function fitRect(containerWidth, containerHeight, aspect = WORLD_WIDTH / WORLD_HEIGHT) {
  const width = Math.max(0, containerWidth || 0);
  const height = Math.max(0, containerHeight || 0);
  if (!width) return { width: WORLD_WIDTH, height: WORLD_HEIGHT };
  if (!height) return { width: Math.round(width), height: Math.round(width / aspect) };
  const fitted = width / height > aspect
    ? { width: height * aspect, height }
    : { width, height: width / aspect };
  return { width: Math.floor(fitted.width), height: Math.floor(fitted.height) };
}

// Converts a world point into coordinates local to a container element,
// given both elements' bounding rects.
export function worldToLocal(canvasRect, containerRect, point) {
  return {
    x: canvasRect.left - containerRect.left + point.x * canvasRect.width / WORLD_WIDTH,
    y: canvasRect.top - containerRect.top + point.y * canvasRect.height / WORLD_HEIGHT,
  };
}

// Slot hit radius in world units. Keeps a physical target size of roughly
// `targetPx` CSS pixels (radius) regardless of how small the map is rendered.
export function slotHitRadius(scale, pointerType = "mouse", { min = 38, max = 60 } = {}) {
  const targetPx = pointerType === "touch" || pointerType === "pen" ? 28 : 20;
  const world = targetPx / Math.max(scale || 1, 0.01);
  return Math.min(max, Math.max(min, world));
}

// Places a box next to an anchor point without covering it. Tries right, left,
// above and below; the cross axis is clamped into bounds. Returns
// { mode: "sheet" } when no side fits.
export function placePopover({ anchor, size, bounds, gap = 12, margin = 8 }) {
  const maxX = bounds.width - margin - size.width;
  const maxY = bounds.height - margin - size.height;
  if (maxX < margin || maxY < margin) return { mode: "sheet" };
  const clampX = (x) => Math.min(maxX, Math.max(margin, x));
  const clampY = (y) => Math.min(maxY, Math.max(margin, y));
  const candidates = [
    { side: "right", x: anchor.x + gap, y: clampY(anchor.y - size.height / 2) },
    { side: "left", x: anchor.x - gap - size.width, y: clampY(anchor.y - size.height / 2) },
    { side: "above", x: clampX(anchor.x - size.width / 2), y: anchor.y - gap - size.height },
    { side: "below", x: clampX(anchor.x - size.width / 2), y: anchor.y + gap },
  ];
  const fit = candidates.find((c) => c.x >= margin && c.x <= maxX && c.y >= margin && c.y <= maxY);
  if (!fit) return { mode: "sheet" };
  return { mode: "anchored", side: fit.side, x: Math.round(fit.x), y: Math.round(fit.y) };
}

// Pause with named reasons: closing a panel removes only its own reason, so a
// manual pause survives panels opening and closing on top of it.
/** @param {(paused: boolean, reasons: Set<string>) => void} [apply] */
export function createPauseController(apply = () => {}) {
  const reasons = new Set();
  const sync = () => apply(reasons.size > 0, reasons);
  return {
    add(reason) { reasons.add(reason); sync(); },
    remove(reason) { reasons.delete(reason); sync(); },
    toggle(reason) {
      if (reasons.has(reason)) reasons.delete(reason); else reasons.add(reason);
      sync();
      return reasons.has(reason);
    },
    has(reason) { return reasons.has(reason); },
    clear() { reasons.clear(); sync(); },
    sync,
    get paused() { return reasons.size > 0; },
  };
}

// Short display form of a blessing effect ({ type, value }) for large-number cards.
const BLESSING_STATS = {
  atk: "Attack",
  res: "Armor & Res",
  hp: "Max Health",
  heal: "Healing",
  regen: "Ult Charge",
  crit: "Crit Chance",
  dodge: "Dodge",
};

export function blessingDisplay(effect) {
  if (!effect || !BLESSING_STATS[effect.type]) return { value: "", stat: effect?.type ?? "", tone: "none" };
  return { value: `+${Math.round((effect.value || 0) * 100)}%`, stat: BLESSING_STATS[effect.type], tone: effect.type };
}

// Short stat tags for the on-map buff bar, in a fixed display order.
export const BUFF_ORDER = ["atk", "res", "hp", "crit", "dodge", "regen", "heal"];
const BUFF_SHORT = { atk: "ATK", res: "RES", hp: "HP", crit: "CRIT", dodge: "DODGE", regen: "ULT", heal: "HEAL" };

// Turns summed modifiers ({ atk: 0.3, ... }) into buff chips; zero entries are dropped.
export function buffChips(modifiers) {
  return BUFF_ORDER
    .filter((type) => (modifiers?.[type] || 0) > 0)
    .map((type) => ({ type, value: `+${Math.round(modifiers[type] * 100)}%`, short: BUFF_SHORT[type] }));
}

// Run statistics (M14). Rows for the result screen's damage table, highest damage first.
export function damageRows(heroStats = {}) {
  const rows = Object.values(heroStats);
  const total = rows.reduce((sum, row) => sum + row.damage, 0);
  return rows
    .map((row) => ({ ...row, share: total ? row.damage / total : 0 }))
    .sort((a, b) => b.damage - a.damage || b.heal + b.buff - (a.heal + a.buff));
}

// Compact number for tables: 950, 12.4k, 1.2M.
export function shortNumber(value) {
  const n = Math.round(value);
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e4) return `${Math.round(n / 1e3)}k`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return String(n);
}

const LEAK_NAMES = { grunt: "Grunts", runner: "Runners", flyer: "Flyers", archer: "Archers", brute: "Brutes", boss: "the boss", brood: "Lilith's Children", mender: "Menders' packs", shieldbearer: "Shieldbearers", hexer: "Hexers", broodcaller: "Broodcallers", imp: "Imps" };
const LEAK_HINTS = {
  grunt: "Crowds overran the line: Warrior cleave and Mage splash thin them out.",
  runner: "Runners slip past full blockers: Assassins catch loose enemies, Tanks hold 3, and Frost or Crippling slow them.",
  flyer: "Flyers pass over road heroes: add platform heroes, Archers hit them twice as hard.",
  archer: "Enemy archers shoot your blockers from range: keep a Support behind the line.",
  brute: "Brutes are armored: Mages deal magic damage, Sunder and Hunter's Mark help physical heroes.",
  boss: "The boss got through: Archers, Hunter's Mark and Boss first targeting focus it.",
  brood: "While her children stand, Lilith cannot be hit: splash and cleave clear them faster.",
  mender: "Menders kept their pack alive: splash damage or Last enemy targeting reach them.",
  shieldbearer: "Shields soaked your damage: many quick hits (cleave, splash, fast attackers) break them.",
  hexer: "Hexers stopped your heroes: Archers outrange them, and a Support on the Purify path lifts hexes.",
  broodcaller: "Broodcallers keep calling Imps: snipe them early with Archers.",
  imp: "Imps swarmed the line: kill Broodcallers early and bring splash damage.",
};

// Loss analysis (M14): which enemy kind cost the most lives on the wave the run ended,
// with a one-line hint. Null when nothing leaked.
export function lossReport(waveStats) {
  const kinds = Object.entries(waveStats?.leakKinds ?? {});
  const total = kinds.reduce((sum, [, lives]) => sum + lives, 0);
  if (!total) return null;
  // Imps count with their Broodcaller: the answer is the same.
  const merged = {};
  for (const [kind, lives] of kinds) {
    const key = kind === "imp" && kinds.some(([k]) => k === "broodcaller") ? "broodcaller" : kind;
    merged[key] = (merged[key] || 0) + lives;
  }
  const [kind, lives] = Object.entries(merged).sort((a, b) => b[1] - a[1])[0];
  return { wave: waveStats.wave, kind, lives, total, share: lives / total, name: LEAK_NAMES[kind] ?? kind, hint: LEAK_HINTS[kind] ?? "" };
}
