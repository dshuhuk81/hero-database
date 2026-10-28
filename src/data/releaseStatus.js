// Pure release-date helpers. Dates are ISO strings (YYYY-MM-DD), so plain string comparison orders them.

/** @returns {"released" | "upcoming" | "unscheduled"} the release day itself counts as released */
export function releaseStatus(globalRelease, today) {
  if (!globalRelease) return "unscheduled";
  return globalRelease <= today ? "released" : "upcoming";
}

/**
 * The client date is authoritative. Without one, the earliest event that features the hero
 * (banner, Sea War, direct purchase) is the best available release signal.
 * @returns {{ date: string | null, source: "client" | "event" | "none" }}
 */
export function effectiveRelease(globalRelease, eventStarts) {
  if (globalRelease) return { date: globalRelease, source: "client" };
  const earliest = [...eventStarts].sort()[0];
  return earliest ? { date: earliest, source: "event" } : { date: null, source: "none" };
}
