import { timelineTotals } from "./timeline.js";

// Challenge goals per map (M20): optional conditions checked after a won Free Play run. A challenge
// counts when the run is won and its condition held for the whole run. Each one pays a one-time Favor
// reward per map; clearing it again on a higher difficulty pays the difference. Minigame balance only,
// not game facts. Pure logic; the page shows it (page/challenges.ts, results.ts).

const TIER_RANK = { normal: 0, heroic: 1, mythic: 2 };
const tierRank = (tier) => TIER_RANK[tier] ?? -1;

// Favor for the first clear on Normal; Heroic and Mythic multiply it by their Favor factor (tuning.tiers).
export const CHALLENGE_REWARD = 40;

// Thresholds, first guesses (tune by hand). Swift: the stage must be won within SWIFT_GRACE_SECONDS after its
// last scheduled spawn, so the limit follows the map's own timeline. Hoarder: placement points left at the win.
export const SWIFT_GRACE_SECONDS = 45;
export const HOARDER_PLACEMENT = 150;
export const TRIO_MAX = 3;

// `text` is the condition shown in the difficulty panel; `icon` is a 24x24 SVG path.
export const CHALLENGES = [
  { id: "perfect", name: "Perfect Defense", icon: "M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z", text: "Win without losing a single life." },
  { id: "trio", name: "Trio", icon: "M7 9a2.5 2.5 0 1 0 0-.01zM17 9a2.5 2.5 0 1 0 0-.01zM12 17a2.5 2.5 0 1 0 0-.01z", text: `Win with at most ${TRIO_MAX} different heroes deployed over the whole run.` },
  { id: "oneClass", name: "One Class", icon: "M12 4l7 8-7 8-7-8z", text: "Win with every deployed hero from the same class." },
  { id: "unrefined", name: "Hold Position", icon: "M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16zM6.5 6.5l11 11", text: "Win without relocating a hero." },
  { id: "swift", name: "Swift", icon: "M13 3L5 14h6l-1 7 8-11h-6z", text: `Win within ${SWIFT_GRACE_SECONDS} seconds of the last enemy spawning.` },
  { id: "hoarder", name: "Hoarder", icon: "M12 5a7 7 0 1 0 0 14a7 7 0 1 0 0-14zM12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6z", text: `Win with at least ${HOARDER_PLACEMENT} placement left.` },
];
export const CHALLENGE_IDS = CHALLENGES.map((entry) => entry.id);


// The facts a finished run is judged on. `game` is a finished TowerDefenseGame.
export function runFacts(game) {
  const fielded = [...(game.fieldedIds ?? game.team ?? [])];
  return {
    won: !!game.won,
    timelineEnd: timelineTotals(game.timeline ?? []).lastAt,
    // Daily Trial runs (M19) have a fixed roster or preset mutators; they do not count.
    trial: !!game.allowedHeroes || !!game.presetMutators?.length,
    tier: game.tier,
    perfect: !!game.perfect,
    fielded,
    classes: [...new Set(fielded.map((id) => game.heroesById?.get(id)?.class).filter(Boolean))],
    relocations: game.relocations ?? 0,
    seconds: game.runDuration ?? 0,
    placement: game.placement ?? 0,
  };
}

const CHECKS = {
  perfect: (f) => f.perfect,
  trio: (f) => f.fielded.length > 0 && f.fielded.length <= TRIO_MAX,
  oneClass: (f) => f.classes.length === 1,
  unrefined: (f) => f.relocations === 0,
  swift: (f) => f.seconds <= f.timelineEnd + SWIFT_GRACE_SECONDS,
  hoarder: (f) => f.placement >= HOARDER_PLACEMENT,
};

// Ids of the challenges this run completed (in CHALLENGES order); none for a loss.
export function evaluateChallenges(facts) {
  if (!facts?.won || facts.trial) return [];
  return CHALLENGE_IDS.filter((id) => CHECKS[id](facts));
}

// Favor a clear on `tier` is worth in total; `tiers` is tuning.tiers.
export function challengeReward(tier, tiers = {}) {
  return Math.round(CHALLENGE_REWARD * (tiers?.[tier]?.favor ?? 1));
}

// Records completed ids in `progress` ({ runKey: { challengeId: highest tier } }, mutated)
// and returns the Favor to grant plus one entry per completed id: `isNew` for a first clear,
// `tierUp` when it beat the tier stored before. Only the difference in reward is paid.
export function recordChallenges(progress, key, ids, tier, tiers = {}) {
  const entry = progress[key] ?? (progress[key] = {});
  let favor = 0;
  const results = ids.map((id) => {
    const before = entry[id];
    const isNew = !before;
    const tierUp = !isNew && tierRank(tier) > tierRank(before);
    const gain = isNew || tierUp ? challengeReward(tier, tiers) - (isNew ? 0 : challengeReward(before, tiers)) : 0;
    if (isNew || tierUp) entry[id] = tier;
    favor += gain;
    return { id, isNew, tierUp, favor: gain };
  });
  if (!Object.keys(entry).length) delete progress[key];
  return { favor, results };
}

// Save cleanup: keeps known challenge ids with a known tier. Keys of the removed run lengths ("map@long") fold into
// the plain map key, keeping the higher tier per challenge.
export function sanitizeChallenges(value) {
  const isRecord = (v) => !!v && typeof v === "object" && !Array.isArray(v);
  if (!isRecord(value)) return {};
  const clean = {};
  for (const [rawKey, entry] of Object.entries(value)) {
    if (!isRecord(entry)) continue;
    const key = rawKey.split("@")[0];
    const kept = Object.fromEntries(Object.entries(entry).filter(([id, tier]) => CHALLENGE_IDS.includes(id) && tier in TIER_RANK));
    for (const [id, tier] of Object.entries(kept)) {
      const merged = clean[key] ?? (clean[key] = {});
      if (!merged[id] || tierRank(tier) > tierRank(merged[id])) merged[id] = tier;
    }
  }
  return clean;
}
