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
