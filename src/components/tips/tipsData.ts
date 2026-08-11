const R2_BASE = "https://pub-a33abfbc3135413881a1d8eb86543559.r2.dev/heroes/cards";

export const WISHLIST_DATA: Record<string, { id: string; image: string }[]> = {
  Hearts: [
    { id: "caishen", image: `${R2_BASE}/caishen-360.webp` },
    { id: "yuelao", image: `${R2_BASE}/yuelao-360.webp` },
    { id: "mengpo", image: `${R2_BASE}/mengpo-360.webp` },
    { id: "idunn", image: `${R2_BASE}/idunn-360.webp` },

  ],
  Diamonds: [
    { id: "bastet", image: `${R2_BASE}/bastet-360.webp` },
    { id: "serket", image: `${R2_BASE}/serket-360.webp` },
    { id: "meret", image: `${R2_BASE}/meret-360.webp` },
    { id: "heracles", image: `${R2_BASE}/heracles-360.webp` },

  ],
  Spades: [
    { id: "poseidon", image: `${R2_BASE}/poseidon-360.webp` },
    { id: "nut", image: `${R2_BASE}/nut-360.webp` },
    { id: "skadi", image: `${R2_BASE}/skadi-360.webp` },
    { id: "momus", image: `${R2_BASE}/momus-360.webp` },

  ],
  Clubs: [
    { id: "xuannv", image: `${R2_BASE}/xuannv-360.webp` },
    { id: "nuba", image: `${R2_BASE}/nuba-360.webp` },
    { id: "anubis", image: `${R2_BASE}/anubis-360.webp` },
    { id: "eris", image: `${R2_BASE}/eris-360.webp` },
  ],
};

const R2_ICONS = "https://pub-a33abfbc3135413881a1d8eb86543559.r2.dev/icons/factions";

export const FACTION_META: Record<string, { color: string; glow: string; dim: string; icon: string }> = {
  Hearts: {
    color: "#ef4444",
    glow: "rgba(239, 68, 68, 0.55)",
    dim: "rgba(239, 68, 68, 0.12)",
    icon: `${R2_ICONS}/hearts.webp`,
  },
  Diamonds: {
    color: "#facc15",
    glow: "rgba(250, 204, 21, 0.55)",
    dim: "rgba(250, 204, 21, 0.12)",
    icon: `${R2_ICONS}/diamonds.webp`,
  },
  Spades: {
    color: "#3b82f6",
    glow: "rgba(59, 130, 246, 0.55)",
    dim: "rgba(59, 130, 246, 0.12)",
    icon: `${R2_ICONS}/spades.webp`,
  },
  Clubs: {
    color: "#22c55e",
    glow: "rgba(34, 197, 94, 0.55)",
    dim: "rgba(34, 197, 94, 0.12)",
    icon: `${R2_ICONS}/clubs.webp`,
  },
};
