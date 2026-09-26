// Challenge goals per map and run length (M20): optional conditions checked after a
// finished 10 or 20 wave run. A challenge counts when the run is won and its condition
// held for the whole run. Each one pays a one-time Favor reward per map and run length;
// clearing it again on a higher difficulty pays the difference. Minigame balance only,
// not game facts. Pure logic; the page shows it (page/challenges.ts, results.ts).

// Run lengths that have challenges; endless has no win to check.
export const CHALLENGE_MODES = ["classic", "long"];
export const hasChallenges = (mode) => CHALLENGE_MODES.includes(mode);

const TIER_RANK = { normal: 0, heroic: 1, mythic: 2 };
const tierRank = (tier) => TIER_RANK[tier] ?? -1;

// Favor for the first clear on Normal, per run length; Heroic and Mythic multiply it
// by their Favor factor (tuning.tiers).
export const CHALLENGE_REWARD = { classic: 40, long: 60 };

// Thresholds per run length, from bot runs on Normal (3 maps x 3 seeds). Swift: bots
// without blessings need 410-670s (10 waves) and 800-1020s (20 waves); with every blessing
// the S-tier squad takes 250-345s and 520-660s. Hoarder: upgrading bots end with 150-550
// gold; bots that never upgrade end with 1250-1970 (10 waves) and 7000-8600 (20 waves).
export const SWIFT_SECONDS = { classic: 300, long: 600 };
export const HOARDER_GOLD = { classic: 2000, long: 5000 };
export const TRIO_MAX = 3;

function minutes(seconds) {
  const whole = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return rest ? `${whole}m ${rest}s` : `${whole} minutes`;
}

// `text` is the condition shown in the run length panel; `icon` is a 24x24 SVG path.
export const CHALLENGES = [
  { id: "perfect", name: "Perfect Defense", icon: "M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z", text: "Win without losing a single life." },
  { id: "trio", name: "Trio", icon: "M7 9a2.5 2.5 0 1 0 0-.01zM17 9a2.5 2.5 0 1 0 0-.01zM12 17a2.5 2.5 0 1 0 0-.01z", text: `Win with at most ${TRIO_MAX} different heroes deployed over the whole run.` },
  { id: "oneClass", name: "One Class", icon: "M12 4l7 8-7 8-7-8z", text: "Win with every deployed hero from the same class." },
  { id: "unrefined", name: "Unrefined", icon: "M12 4a8 8 0 1 0 0 16a8 8 0 1 0 0-16zM6.5 6.5l11 11", text: "Win without buying a level, Awakening or training." },
  { id: "swift", name: "Swift", icon: "M13 3L5 14h6l-1 7 8-11h-6z", text: `Win within ${minutes(SWIFT_SECONDS.classic)} of battle time (${minutes(SWIFT_SECONDS.long)} on 20 waves). Time between waves does not count.` },
  { id: "hoarder", name: "Hoarder", icon: "M12 5a7 7 0 1 0 0 14a7 7 0 1 0 0-14zM12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6z", text: `Win with at least ${HOARDER_GOLD.classic} gold left (${HOARDER_GOLD.long} on 20 waves).` },
];
export const CHALLENGE_IDS = CHALLENGES.map((entry) => entry.id);


// The facts a finished run is judged on. `game` is a finished TowerDefenseGame.
export function runFacts(game) {
  const fielded = [...(game.fieldedIds ?? game.team ?? [])];
  return {
    won: !!game.won,
    mode: game.mode,
    // Daily Trial runs (M19) have a fixed roster or preset mutators; they do not count.
    trial: !!game.allowedHeroes || !!game.presetMutators?.length,
    tier: game.tier,
    perfect: !!game.perfect,
    fielded,
    classes: [...new Set(fielded.map((id) => game.heroesById?.get(id)?.class).filter(Boolean))],
    upgrades: game.upgradesBought ?? 0,
    seconds: game.runDuration ?? 0,
    gold: game.gold ?? 0,
  };
}

const CHECKS = {
  perfect: (f) => f.perfect,
  trio: (f) => f.fielded.length > 0 && f.fielded.length <= TRIO_MAX,
  oneClass: (f) => f.classes.length === 1,
  unrefined: (f) => f.upgrades === 0,
  swift: (f) => f.seconds <= (SWIFT_SECONDS[f.mode] ?? 0),
  hoarder: (f) => f.gold >= (HOARDER_GOLD[f.mode] ?? Infinity),
};

// Ids of the challenges this run completed (in CHALLENGES order); none for a loss or endless.
export function evaluateChallenges(facts) {
  if (!facts?.won || facts.trial || !hasChallenges(facts.mode)) return [];
  return CHALLENGE_IDS.filter((id) => CHECKS[id](facts));
}

// Favor a clear on `tier` is worth in total; `tiers` is tuning.tiers.
export function challengeReward(mode, tier, tiers = {}) {
  return Math.round((CHALLENGE_REWARD[mode] ?? 0) * (tiers?.[tier]?.favor ?? 1));
}

// Records completed ids in `progress` ({ runKey: { challengeId: highest tier } }, mutated)
// and returns the Favor to grant plus one entry per completed id: `isNew` for a first clear,
// `tierUp` when it beat the tier stored before. Only the difference in reward is paid.
export function recordChallenges(progress, key, ids, mode, tier, tiers = {}) {
  const entry = progress[key] ?? (progress[key] = {});
  let favor = 0;
  const results = ids.map((id) => {
    const before = entry[id];
    const isNew = !before;
    const tierUp = !isNew && tierRank(tier) > tierRank(before);
    const gain = isNew || tierUp ? challengeReward(mode, tier, tiers) - (isNew ? 0 : challengeReward(mode, before, tiers)) : 0;
    if (isNew || tierUp) entry[id] = tier;
    favor += gain;
    return { id, isNew, tierUp, favor: gain };
  });
  if (!Object.keys(entry).length) delete progress[key];
  return { favor, results };
}

// Save cleanup: keeps known challenge ids with a known tier.
export function sanitizeChallenges(value) {
  const isRecord = (v) => !!v && typeof v === "object" && !Array.isArray(v);
  if (!isRecord(value)) return {};
  const clean = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!isRecord(entry)) continue;
    const kept = Object.fromEntries(Object.entries(entry).filter(([id, tier]) => CHALLENGE_IDS.includes(id) && tier in TIER_RANK));
    if (Object.keys(kept).length) clean[key] = kept;
  }
  return clean;
}
