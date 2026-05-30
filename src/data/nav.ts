// SINGLE SOURCE OF TRUTH for site navigation.
//
// Both the index.astro teaser grid and the Sidebar.astro rail / mobile bar are
// derived from this one array. Add, remove or reorder an entry here and BOTH
// surfaces update automatically - never edit nav in two places again.
//
// Rules:
//  - Array order drives display order on BOTH surfaces. On the sidebar, items
//    are bucketed by `group` (primary / content / meta) but keep this array's
//    relative order within each bucket. The teaser grid shows every entry with
//    `teaser: true` in this array's order.
//  - `label` is the only label. The teaser shows it as the card headline; the
//    sidebar uses it for the desktop tooltip and the mobile/more-sheet text.
//  - `badge` is rendered ONLY on the index teaser, never on the sidebar.
//  - `icon` is the inner SVG markup (24x24 viewBox, stroke-based, Lucide-style).

export interface NavEntry {
  /** Display label. Teaser headline + sidebar tooltip/mobile text. */
  label: string;
  href: string;
  /** Inner SVG markup for a 24x24 stroke icon. */
  icon: string;
  /** Sidebar bucket. */
  group: "primary" | "content" | "meta";
  /** Show this entry as a card on the index.astro teaser grid. */
  teaser?: boolean;
  /** Teaser card sub-text. Only used when `teaser` is true. */
  description?: string;
  /** Teaser-only badge. Never shown on the sidebar. */
  badge?: { text: string; color?: string };
  /** Marks the destination as under maintenance (disables the link). */
  status?: { type: "maintenance"; tooltip?: string };
}

export const defaultMaintenanceTooltip = "currently under maintenance";

export const navEntries: NavEntry[] = [
  {
    label: "Home",
    href: "/",
    group: "primary",
    icon: `<path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>`,
  },
  {
    label: "Hero List",
    href: "/heros",
    group: "primary",
    teaser: true,
    description: "Browse all heroes with stats & ratings",
    badge: { text: "Updated", color: "var(--accent-purple)" },
    icon: `<path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/><path d="M19.5 6.5L21 3l-3.5 1.5"/><path d="M9.5 17.5L21 6V3h-3L6.5 14.5"/><path d="M11 19l-6-6"/><path d="M8 16l-4 4"/><path d="M4.5 6.5L3 3l3.5 1.5"/>`,
  },
  {
    label: "Hero Stats",
    href: "/hero-stats",
    group: "primary",
    teaser: true,
    description: "Compare all heroes with their stats",
    badge: { text: "New", color: "var(--accent-new)" },
    icon: `<line x1="6" y1="20" x2="6" y2="14"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="18" y1="20" x2="18" y2="10"/><line x1="3" y1="20" x2="21" y2="20"/>`,
  },
  {
    label: "CN vs Global",
    href: "/cn-preview",
    group: "primary",
    teaser: true,
    description: "Compare Global hero skills against the Chinese base version",
    badge: { text: "New", color: "var(--accent-new)" },
    icon: `<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/><path d="M8 7h4"/><path d="M10 5v4"/><path d="M15.5 15h.01"/><path d="M17.5 17h.01"/><path d="M14.5 18.5h.01"/>`,
  },
  {
    label: "Virtue Guide",
    href: "/virtues",
    group: "content",
    teaser: true,
    description: "New deity upgrade pieces - sets, rarities & farming guide",
    badge: { text: "New", color: "var(--accent-new)" },
    icon: `<rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="3" width="8" height="8" rx="1"/><rect x="3" y="13" width="8" height="8" rx="1"/>`,
  },
  {
    label: "Delusion Den Guide",
    href: "/delusions-den",
    group: "content",
    teaser: true,
    description: "Recommended teams and strategy for each stage",
    icon: `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`,
  },
  {
    label: "Tips",
    href: "/tips",
    group: "content",
    teaser: true,
    description: "Beginner tips & shrine system breakdowns",
    icon: `<path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><circle cx="12" cy="12" r="10"/><line x1="12" y1="17" x2="12.01" y2="17"/>`,
  },
  {
    label: "Boss Encounters",
    href: "/bosses",
    group: "content",
    teaser: true,
    description: "Boss counters & recommended team comps",
    icon: `<circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><path d="M8 20v-4a8 8 0 1 1 8 0v4"/><path d="M12 20v-2"/><path d="M8 20h8"/>`,
  },
  {
    label: "Events",
    href: "/events",
    group: "content",
    teaser: true,
    description: "Campaign stages & event team guides",
    icon: `<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>`,
      badge: { text: "Updated", color: "var(--accent-purple)" },

  },
  {
    label: "Totems",
    href: "/totems",
    group: "content",
    teaser: true,
    description: "All totems with effects, tags & ratings",
    icon: `<path d="M12 2L8 6v3l-2 2v4l2 2v3l4 2 4-2v-3l2-2v-4l-2-2V6z"/><line x1="12" y1="2" x2="12" y2="22"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="6" y1="15" x2="18" y2="15"/>`,
  },
  {
    label: "Summon Calendar",
    href: "/summon-calendar",
    group: "content",
    teaser: true,
    description: "Possible guesses on upcoming releases - based on CN data.",
    icon: `<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><circle cx="8" cy="16" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="16" r="1" fill="currentColor" stroke="none"/><circle cx="16" cy="16" r="1" fill="currentColor" stroke="none"/>`,
  },
  {
    label: "Changes",
    href: "/changelog",
    group: "meta",
    icon: `<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><circle cx="12" cy="15" r="3"/><path d="M12 13.5V15l1 1"/>`,
  },
  {
    label: "Status",
    href: "/status",
    group: "meta",
    icon: `<path d="M4 19V5"/><path d="M4 19h16"/><rect x="7" y="11" width="3" height="5" rx="1"/><rect x="12" y="7" width="3" height="9" rx="1"/><rect x="17" y="3" width="3" height="13" rx="1"/>`,
  },
  {
    label: "About",
    href: "/about",
    group: "meta",
    icon: `<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>`,
  },
];

/** Entries shown on the index.astro teaser grid, in array order. */
export const teaserEntries = navEntries.filter((e) => e.teaser);
