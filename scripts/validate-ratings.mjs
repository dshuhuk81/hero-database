import heroRatings from "../src/data/ratings/hero-ratings.json" with { type: "json" };
import {
  HERO_MANUAL_RATING_KEYS,
  MAX_OVERALL_ADJUSTMENT,
  RATING_FACTORS,
  RATING_TIERS,
  calculateOverall,
} from "../src/data/ratings/ratingSystem.js";

const allowedKeys = new Set([
  "name",
  ...HERO_MANUAL_RATING_KEYS,
  "overallAdjustment",
  "overallReason",
]);
const errors = [];
const warnings = [];
const provisional = [];

const totalWeight = RATING_FACTORS.reduce((sum, { weight }) => sum + weight, 0);
if (Math.abs(totalWeight - 1) > Number.EPSILON * 10) {
  errors.push(`Rating weights add up to ${totalWeight}, expected 1.`);
}

for (const [id, ratings] of Object.entries(heroRatings)) {
  for (const key of Object.keys(ratings)) {
    if (!allowedKeys.has(key)) errors.push(`${id}: unsupported field "${key}".`);
  }

  for (const key of HERO_MANUAL_RATING_KEYS) {
    const value = ratings[key];
    if (value && !RATING_TIERS.includes(value)) {
      errors.push(`${id}.${key}: "${value}" is not a valid tier.`);
    }
  }

  const adjustment = Number(ratings.overallAdjustment ?? 0);
  const reason = String(ratings.overallReason ?? "").trim();
  if (!Number.isInteger(adjustment) || Math.abs(adjustment) > MAX_OVERALL_ADJUSTMENT) {
    errors.push(`${id}.overallAdjustment: use -1, 0, or 1.`);
  }
  if (adjustment !== 0 && !reason) {
    errors.push(`${id}: an Overall adjustment requires overallReason.`);
  }
  if (adjustment === 0 && reason) {
    warnings.push(`${id}: overallReason is present but overallAdjustment is 0.`);
  }

  const result = calculateOverall(ratings);
  if (result.tier && !result.complete) {
    provisional.push(`${id}: provisional Overall ${result.tier} (${result.ratedFields}/${result.totalFields} ratings).`);
  }
}

if (warnings.length) {
  console.warn(`Rating warnings (${warnings.length}):`);
  warnings.forEach((warning) => console.warn(`- ${warning}`));
}

if (provisional.length) {
  console.warn(`${provisional.length} heroes have a provisional Overall. Run npm run ratings:report for coverage.`);
  if (process.argv.includes("--verbose")) {
    provisional.forEach((warning) => console.warn(`- ${warning}`));
  }
}

if (errors.length) {
  console.error(`Rating validation failed (${errors.length}):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log(`Rating validation passed for ${Object.keys(heroRatings).length} heroes.`);
}
