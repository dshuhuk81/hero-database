export const HERO_RATING_FIELDS = [
  { key: "overall", label: "Overall", group: "Core" },
  { key: "pveentry", label: "PvE", group: "Entry" },
  { key: "pvpentry", label: "PvP", group: "Entry" },
  { key: "pvemax", label: "PvE", group: "Maximum" },
  { key: "pvpmax", label: "PvP", group: "Maximum" },
];

export const HERO_RATING_KEYS = HERO_RATING_FIELDS.map(({ key }) => key);
