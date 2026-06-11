const R2_BASE = "https://pub-a33abfbc3135413881a1d8eb86543559.r2.dev/heroes";

export const WISHLIST_DATA: Record<string, { id: string; image: string }[]> = {
  Hearts: [
    { id: "caishen", image: `${R2_BASE}/caishen.webp` },
    { id: "yuelao", image: `${R2_BASE}/yuelao.webp` },
    { id: "mengpo", image: `${R2_BASE}/mengpo.webp` },
    { id: "isis", image: `${R2_BASE}/isis.webp` },

  ],
  Diamonds: [
    { id: "phoenix", image: `${R2_BASE}/phoenix.webp` },
    { id: "set", image: `${R2_BASE}/set.webp` },
    { id: "meret", image: `${R2_BASE}/meret.webp` },
    { id: "heracles", image: `${R2_BASE}/heracles.webp` },

  ],
  Spades: [
    { id: "hecate", image: `${R2_BASE}/hecate.webp` },
    { id: "tefnut", image: `${R2_BASE}/tefnut.webp` },
    { id: "skadi", image: `${R2_BASE}/skadi.webp` },
    { id: "momus", image: `${R2_BASE}/momus.webp` },

  ],
  Clubs: [
    { id: "fengyi", image: `${R2_BASE}/fengyi.webp` },
    { id: "nuba", image: `${R2_BASE}/nuba.webp` },
    { id: "anubis", image: `${R2_BASE}/anubis.webp` },
    { id: "pan", image: `${R2_BASE}/pan.webp` },
  ],
};

const R2_ICONS = "https://pub-a33abfbc3135413881a1d8eb86543559.r2.dev/icons/factions";

export const FACTION_META: Record<string, { color: string; glow: string; dim: string; icon: string }> = {
  Hearts: {
    color: "#c0446e",
    glow: "rgba(192, 68, 110, 0.55)",
    dim: "rgba(192, 68, 110, 0.12)",
    icon: `${R2_ICONS}/hearts.webp`,
  },
  Diamonds: {
    color: "#5588cc",
    glow: "rgba(85, 136, 204, 0.55)",
    dim: "rgba(85, 136, 204, 0.12)",
    icon: `${R2_ICONS}/diamonds.webp`,
  },
  Spades: {
    color: "#8899aa",
    glow: "rgba(136, 153, 170, 0.55)",
    dim: "rgba(136, 153, 170, 0.12)",
    icon: `${R2_ICONS}/spades.webp`,
  },
  Clubs: {
    color: "#3a8a4a",
    glow: "rgba(58, 138, 74, 0.55)",
    dim: "rgba(58, 138, 74, 0.12)",
    icon: `${R2_ICONS}/clubs.webp`,
  },
};
