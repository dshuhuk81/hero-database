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
  /** Card sub-text under the headline. */
  hook?: string;
  /** YYYY-MM-DD of last content update. */
  updated?: string;
}

/** Newest guide first - drives display order on /guides. */
export const guides: GuideEntry[] = [
  {
    href: "/guides/golden-arcanum",
    image: "/features/golden-arcanum/assets/ui/illustration01.png",
    title: "Golden Arcanum - Event Guide",
    hook: "Weekly bottle mini-game: where the good chests spawn, which materials climb, and what to buy first.",
  },
  {
    href: "/guides/votive-festival",
    image: "/features/gold-miner/assets/ui/menu-item.png",
    title: "Votive Festival - Event Guide",
    hook: "Weekly lantern claw mini-game: time the swinging hook, snipe the Optional lantern, and what to buy first.",
  },
  {
    href: "/guides/benevolent-feast",
    image: "/features/water-game/assets/ui/illustration01.png",
    title: "Benevolent Feast - Event Guide",
    hook: "Weekly wind mini-game: take the Optional and reset, or target Cattle for coins.",
  },
  {
    heroId: "idunn",
    href: "/guides/idunn",
    title: "Idunn"
  },
  {
    href: "/guides/divine-throne",
    image: "https://pub-a33abfbc3135413881a1d8eb86543559.r2.dev/bg_neutral.webp",
    localOnly: true,
    title: "Divine Throne - System Guide",
    hook: "New hero system: unlock requirements, Ether upgrades and the first wave of throne heroes.",
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
