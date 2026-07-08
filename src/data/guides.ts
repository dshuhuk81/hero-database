// SINGLE SOURCE OF TRUTH for the deep-dive hero guide index.
// The /guides landing page renders its card grid from this array.
// Adding a new guide = create src/pages/guides/{id}.astro + add one entry here.
// divine-throne is intentionally NOT listed - it has its own nav entry.

export interface GuideEntry {
  /** Hero id - matches all_heroes_db key and R2 card image name. */
  heroId: string;
  href: string;
  /** Card headline, e.g. "Nut - Goddess of the Sky". */
  title: string;
  /** One-line card blurb. */
  hook: string;
  /** YYYY-MM-DD of last content update. */
  updated?: string;
}

/** Newest guide first - drives display order on /guides. */
export const guides: GuideEntry[] = [
  {
    heroId: "nephtys",
    href: "/guides/nephtys",
    title: "Nephtys - Soul Harvest Bruiser",
    hook: "Team-dependent bruiser: Soul Harvest engine, skill breakdown, synergies, counters, gear stats and virtues.",
    updated: "2026-07-08",
  },
  {
    heroId: "xuannv",
    href: "/guides/xuannv",
    title: "Xuannv - Goddess of Strategy",
    hook: "Dual-stance mechanics and the Relic damage engine: skill breakdown, synergies, counters, gear stats and virtues.",
  },
  {
    heroId: "nut",
    href: "/guides/nut",
    title: "Nut - Goddess of the Sky",
    hook: "Starfall burst DPS: kit analysis, Starfall calculator, synergies, counters, gear stats and virtues.",
  },
];
