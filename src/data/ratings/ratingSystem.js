// Single source of truth for the public rating methodology.
// Keep the documentation in README.md in sync when changing player-facing wording.

export const RATING_TIERS = ["D", "C", "B", "A", "S", "S+"];

export const RATING_SCORES = {
  D: 1,
  C: 2,
  B: 3,
  A: 4,
  S: 5,
  "S+": 6,
};

// Weights describe the default player: progression-first, with PvE carrying
// more weight than PvP. They must add up to 1.
export const RATING_FACTORS = [
  { key: "pveearly", label: "Early", group: "PvE", weight: 0.25 },
  { key: "pvemidgame", label: "Midgame", group: "PvE", weight: 0.25 },
  { key: "pveendgame", label: "Endgame", group: "PvE", weight: 0.20 },
  { key: "pvpearly", label: "Early", group: "PvP", weight: 0.05 },
  { key: "pvpmidgame", label: "Midgame", group: "PvP", weight: 0.10 },
  { key: "pvpendgame", label: "Endgame", group: "PvP", weight: 0.15 },
];

// The first threshold at or below the weighted score wins.
export const OVERALL_THRESHOLDS = [
  { tier: "S+", min: 5.5 },
  { tier: "S", min: 4.6 },
  { tier: "A", min: 3.6 },
  { tier: "B", min: 2.6 },
  { tier: "C", min: 1.6 },
  { tier: "D", min: 1.0 },
];

export const MAX_OVERALL_ADJUSTMENT = 1;

export const PROGRESSION_STAGES = {
  early: {
    label: "Early",
    chapters: "Ch. 1–39",
    relic: "Relic 0–10",
    definition: "Limited resources and low hero investment.",
  },
  midgame: {
    label: "Midgame",
    chapters: "Ch. 40–54",
    relic: "Relic 10–30",
    definition: "Selective investment in a developing roster.",
  },
  endgame: {
    label: "Endgame",
    chapters: "Ch. 55+",
    relic: "Relic 30+",
    definition: "High to maximum investment and mature teams.",
  },
};

export const HERO_RATING_FIELDS = [
  { key: "overall", label: "Overall", group: "Core" },
  ...RATING_FACTORS.map(({ key, label, group }) => ({ key, label, group })),
];

export const HERO_MANUAL_RATING_FIELDS = HERO_RATING_FIELDS.filter(({ key }) => key !== "overall");
export const HERO_RATING_KEYS = HERO_RATING_FIELDS.map(({ key }) => key);
export const HERO_MANUAL_RATING_KEYS = HERO_MANUAL_RATING_FIELDS.map(({ key }) => key);
export const HERO_RATING_DATA_KEYS = [
  ...HERO_MANUAL_RATING_KEYS,
  "overallAdjustment",
  "overallReason",
];

function tierForScore(score) {
  return OVERALL_THRESHOLDS.find(({ min }) => score >= min)?.tier ?? "D";
}

function adjustedTier(baseTier, adjustment) {
  const baseIndex = RATING_TIERS.indexOf(baseTier);
  const nextIndex = Math.min(
    RATING_TIERS.length - 1,
    Math.max(0, baseIndex + adjustment),
  );
  return RATING_TIERS[nextIndex];
}

export function calculateOverall(rawRatings = {}) {
  const ratedFactors = RATING_FACTORS.filter(({ key }) => RATING_SCORES[rawRatings[key]]);
  const availableWeight = ratedFactors.reduce((sum, { weight }) => sum + weight, 0);

  if (!availableWeight) {
    return {
      tier: null,
      baseTier: null,
      score: null,
      adjustment: 0,
      reason: "",
      ratedFields: 0,
      totalFields: RATING_FACTORS.length,
      complete: false,
    };
  }

  const weightedTotal = ratedFactors.reduce(
    (sum, { key, weight }) => sum + RATING_SCORES[rawRatings[key]] * weight,
    0,
  );
  const score = weightedTotal / availableWeight;
  const baseTier = tierForScore(score);
  const requestedAdjustment = Number.parseInt(rawRatings.overallAdjustment, 10) || 0;
  const adjustment = Math.min(
    MAX_OVERALL_ADJUSTMENT,
    Math.max(-MAX_OVERALL_ADJUSTMENT, requestedAdjustment),
  );
  const reason = String(rawRatings.overallReason ?? "").trim();

  return {
    tier: adjustedTier(baseTier, adjustment),
    baseTier,
    score: Math.round(score * 100) / 100,
    adjustment,
    reason,
    ratedFields: ratedFactors.length,
    totalFields: RATING_FACTORS.length,
    complete: ratedFactors.length === RATING_FACTORS.length,
  };
}

export function resolveHeroRatings(rawRatings = {}) {
  const overallMeta = calculateOverall(rawRatings);
  return {
    ...Object.fromEntries(HERO_MANUAL_RATING_KEYS.map((key) => [key, rawRatings[key] || null])),
    overall: overallMeta.tier,
    overallAdjustment: overallMeta.adjustment,
    overallReason: overallMeta.reason,
    overallMeta,
  };
}
