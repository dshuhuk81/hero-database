// SINGLE SOURCE OF TRUTH for the deep-dive hero guide index.
// The /guides landing page renders its card grid from this array.
// Adding a new guide = create src/pages/guides/{id}.astro + add one entry here.
// System guides (no hero) set `image` instead of `heroId`.

export interface GuideEntry {
  /** Hero id - matches all_heroes_db key and R2 card image name. Omit for system guides. */
  heroId?: string;
  /** Card image path for system guides (used when heroId is not set). */
  image?: string;
  /** Hide from the production guide index (mirrors nav.ts localOnly). */
  localOnly?: boolean;
  href: string;
  /** Card headline, e.g. "Nut - Goddess of the Sky". */
  title: string;
  /** YYYY-MM-DD of last content update. */
  updated?: string;
}

/** Newest guide first - drives display order on /guides. */
export const guides: GuideEntry[] = [
  {
    href: "/guides/divine-throne",
    image: "https://pub-a33abfbc3135413881a1d8eb86543559.r2.dev/bg_neutral.webp",
    localOnly: true,
    title: "Divine Throne - System Guide",
    hook: "New endgame system: unlock requirements, Ether upgrades and the first wave of throne heroes.",
  },
  {
    heroId: "nephtys",
    href: "/guides/nephtys",
    title: "Nephtys"
  },
  {
    heroId: "xuannv",
    href: "/guides/xuannv",
    title: "Xuannv"
  },
  {
    heroId: "nut",
    href: "/guides/nut",
    title: "Nut"
    },
];
