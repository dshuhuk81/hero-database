export const HERO_RATING_FIELDS = [
  { key: "overall", label: "Overall", group: "Core" },
  { key: "pveearly", label: "Early", group: "PvE" },
  { key: "pvemidgame", label: "Midgame", group: "PvE" },
  { key: "pveendgame", label: "Endgame", group: "PvE" },
  { key: "pvpearly", label: "Early", group: "PvP" },
  { key: "pvpmidgame", label: "Midgame", group: "PvP" },
  { key: "pvpendgame", label: "Endgame", group: "PvP" },
];

export const HERO_RATING_KEYS = HERO_RATING_FIELDS.map(({ key }) => key);
