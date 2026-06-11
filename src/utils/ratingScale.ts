// SINGLE SOURCE OF TRUTH for the hero rating scale.
//
// Ratings live in src/data/ratings/hero-ratings.json as strings like
// "S+", "S", "A+", "A", "A~S" (range), "B", "C", "D". Any sorting or
// comparison of ratings must go through this module so the scale can
// never drift between the data and the UI again.

/** Lookup is done on the lowercased rating string. */
export const RATING_ORDER: Record<string, number> = {
  "s+": 9,
  "s": 8,
  "a~s": 7.5,
  "a+": 7,
  "a": 6,
  "b": 5,
  "c": 4,
  "d": 3,
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
