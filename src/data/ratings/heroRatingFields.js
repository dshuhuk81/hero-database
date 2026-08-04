export const HERO_RATING_FIELDS = [
  { key: "overall", label: "Overall", group: "Core" },
  { key: "pvp", label: "PvP", group: "Modes" },
  { key: "pve", label: "PvE", group: "Modes" },
  { key: "pveEarly", label: "PvE Early", group: "Modes" },
  { key: "pveLate", label: "PvE Late", group: "Modes" },
  { key: "grimSurgeBoss1", label: "Spirit of the Night Hag", group: "Grim Surge" },
  { key: "grimSurgeBoss2", label: "Epica", group: "Grim Surge" },
  { key: "odyssey", label: "Odyssey", group: "Others" },
  { key: "spire", label: "Spire", group: "Others" },
  { key: "delusionsDen", label: "Delusions Den", group: "Others" },
  { key: "realmRover", label: "Realm Rover", group: "Others" },
  { key: "tormentRiftBaphomet", label: "Baphomet", group: "Torment Rift" },
  { key: "tormentRiftLilith", label: "Lilith", group: "Torment Rift" },
  { key: "tormentRiftBoss3", label: "Isthar IV", group: "Torment Rift" },
];

export const HERO_RATING_KEYS = HERO_RATING_FIELDS.map(({ key }) => key);
