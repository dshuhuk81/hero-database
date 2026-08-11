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
    heroId: "heket",
    href: "/guides/heket",
    title: "Heket",
    updated: "2026-08-06",
  },
  {
    heroId: "audhumla",
    href: "/guides/audhumla",
    title: "Audhumla",
    updated: "2026-07-28",
  },
  {
    heroId: "hades",
    href: "/guides/hades",
    title: "Hades",
    updated: "2026-07-27",
  },
  {
    href: "/guides/golden-arcanum",
    image: "/features/golden-arcanum/assets/ui/illustration01.png",
    title: "Golden Arcanum - Event Guide",
  },
  {
    href: "/guides/votive-festival",
    image: "/features/gold-miner/assets/ui/menu-item.png",
    title: "Votive Festival - Event Guide",
  },
  {
    href: "/guides/benevolent-feast",
    image: "/features/water-game/assets/ui/illustration01.png",
    title: "Benevolent Feast - Event Guide",
  },
  {
    heroId: "idunn",
    href: "/guides/idunn",
    title: "Idunn"
  },
  {
    href: "/guides/divine-throne",
    image: "https://pub-a33abfbc3135413881a1d8eb86543559.r2.dev/bg_neutral.webp",
    title: "Divine Throne - System Guide",
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
