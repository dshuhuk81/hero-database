/**
 * Helpers for boss pages: reward data from src/data/generated/bosses.global.json
 * (export_bosses.py) and mechanic categories for the icon tiles.
 *
 * @typedef {[number, number, number]} Reward  [type, id, amount]
 * @typedef {{ name: string | null, icon: string | null, description?: string | null,
 *   choose?: { count: number, options: Reward[] } }} RewardItem
 * @typedef {{ damage: number, rewards: Reward[] }} Milestone
 */

const UNITS = [
  { value: 1e12, suffix: "T" },
  { value: 1e9, suffix: "B" },
  { value: 1e6, suffix: "M" },
  { value: 1e3, suffix: "K" },
];

/** 200000 -> "200K", 1500000000 -> "1.5B". Below `min` the number is printed in full. */
export function formatCompact(value, min = 1000) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  if (Math.abs(n) < min) return n.toLocaleString("en-US");
  const unit = UNITS.find(({ value: v }) => Math.abs(n) >= v) ?? UNITS[UNITS.length - 1];
  const scaled = n / unit.value;
  const digits = scaled >= 100 || Number.isInteger(scaled) ? 0 : 1;
  return `${scaled.toFixed(digits).replace(/\.0$/, "")}${unit.suffix}`;
}

/** "4.5B", "300m", "1,200,000" -> number; null when it cannot be read. */
export function parseCompact(text) {
  const match = String(text ?? "").trim().replace(/,/g, "").match(/^(\d+(?:\.\d+)?)\s*([kmbt])?$/i);
  if (!match) return null;
  const unit = UNITS.find(({ suffix }) => suffix === (match[2] ?? "").toUpperCase());
  return Number(match[1]) * (unit?.value ?? 1);
}

export const rewardKey = (/** @type {Reward} */ reward) => `${reward[0]}/${reward[1]}`;

/**
 * Sum every reward of the milestones at or below `damage`, keeping first-seen order.
 * @param {Milestone[]} milestones
 * @param {number} damage
 * @returns {{ key: string, reward: Reward }[]}
 */
export function rewardsUpTo(milestones, damage) {
  const totals = new Map();
  for (const milestone of milestones) {
    if (milestone.damage > damage) break;
    for (const reward of milestone.rewards) {
      const key = rewardKey(reward);
      const current = totals.get(key);
      totals.set(key, current ? [reward[0], reward[1], current[2] + reward[2]] : [...reward]);
    }
  }
  return [...totals].map(([key, reward]) => ({ key, reward }));
}

/** Distinct reward keys of the given milestones, first-seen order. */
export function rewardKeys(milestones) {
  return [...new Set(milestones.flatMap((milestone) => milestone.rewards.map(rewardKey)))];
}

/** Chests among the rewards that let the player choose (e.g. Rift Chest), each once. */
export function chooseChests(rewardLists, items) {
  const keys = new Set(rewardLists.flat().map(rewardKey));
  return [...keys].filter((key) => items[key]?.choose).map((key) => ({ key, item: items[key] }));
}

/**
 * Visual colour band for an item's client quality number (2-13 in the boss data). This is only a
 * colour ramp for the tile border, not a claim about the game's own rarity colours: neutral, blue,
 * purple, gold, red from low to high quality. Items without a quality stay neutral.
 * @param {number | undefined | null} quality
 * @returns {"plain" | "rare" | "epic" | "legendary" | "mythic"}
 */
export function rewardRarity(quality) {
  const q = Number(quality);
  if (!Number.isFinite(q) || q < 4) return "plain";
  if (q < 6) return "rare";
  if (q < 8) return "epic";
  if (q < 10) return "legendary";
  return "mythic";
}

// Mechanic categories for the mechanics ledger and skill chips. Tags come from bosses.json; free
// text is matched by keyword when a line has no tags. Keywords are whole words or stems that start
// a word, so "partial" is not "part" and "added" is not "add".
export const MECHANIC_CATEGORIES = {
  energy: { label: "Energy", tags: ["ENERGY_DRAIN", "ENERGY_INTERACTION_NON_ULT_DAMAGE", "RESOURCE_SCALING"], words: /\benergy|\bdrain|\brage\b/i },
  defense: { label: "Defense", tags: ["DAMAGE_REDUCTION_PHASE", "DMG_RESISTANCE", "MAIN_UNTARGETABLE", "UNDISPELLABLE", "NO_DAMAGE"], words: /\bstance\b|\breduc|\bresist|\bimmun|\buntargetable|\bshield|\binvulnerab|\bbarrier/i },
  control: { label: "Control", tags: ["SILENCE", "ROOT", "PETRIFY", "KNOCKBACK", "KNOCKDOWN", "PERMANENT_FREEZE"], words: /\bsilenc|\bstun|\bfreez|\broots?\b|\bpetrif|\bknock|\bcontrol|\bfrozen/i },
  targeting: { label: "Targeting", tags: ["TARGETS_TOP_DPS", "FIXED_TARGET", "FIXED_TARGET_BACKLINE", "RANDOM_TARGET", "INDEPENDENT_TARGETING"], words: /\btarget|\btop dps\b|\bbackline\b|\brandom\b/i },
  ramp: { label: "Scaling", tags: ["RAMPING_AURA", "RAMPING_VULNERABILITY", "BERSERK_SCALING", "ATK_SPEED_BUFF", "ATK_SPEED_BUFF_TO_TARGET", "ATK_SPEED_GLOBAL", "GLOBAL_BUFF", "DMG_VULNERABILITY", "HEAL_REDUCTION"], words: /\bramp|\bstack|\bincreas|\bberserk|\benrag|\bover time\b|\batk spd\b|\bvulnerab|\bheal/i },
  adds: { label: "Summons & parts", tags: ["SUMMONS", "MULTI_PART", "MULTI_PART_BOSS"], words: /\bsummon|\bparts?\b|\bclones?\b|\bminions?\b|\badds?\b|\bchild|\bheads?\b|\brespawn/i },
  other: { label: "Other", tags: [], words: /(?!)/ },
};

/**
 * Category id for a mechanic: by tag first; otherwise the category whose keyword appears earliest
 * in the text (the lead clause is the point of the line); "other" when nothing matches.
 */
export function mechanicCategory({ tags = [], text = "" } = {}) {
  for (const [id, category] of Object.entries(MECHANIC_CATEGORIES)) {
    if (tags.some((tag) => category.tags.includes(tag))) return id;
  }
  let best = "other";
  let bestIndex = Infinity;
  for (const [id, category] of Object.entries(MECHANIC_CATEGORIES)) {
    const at = text.search(category.words);
    if (at !== -1 && at < bestIndex) {
      best = id;
      bestIndex = at;
    }
  }
  return best;
}
