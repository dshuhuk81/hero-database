import { RATING_SCORES } from "../data/ratings/ratingSystem.js";

/** Lookup is done on the lowercased rating string. */
export const RATING_ORDER: Record<string, number> = {
  ...Object.fromEntries(Object.entries(RATING_SCORES).map(([tier, score]) => [tier.toLowerCase(), score])),
  "n/a": 0,
};

/** Numeric weight for a rating string; unknown/empty ratings sort last. */
export function ratingWeight(rating: string | null | undefined): number {
  return RATING_ORDER[String(rating ?? "").toLowerCase()] ?? 0;
}

/** Descending comparator: best rating first. */
export function compareRatingsDesc(a: string | null | undefined, b: string | null | undefined): number {
  return ratingWeight(b) - ratingWeight(a);
}
