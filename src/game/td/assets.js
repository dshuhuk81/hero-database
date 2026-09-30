// Game asset URLs. Assets live on Cloudflare R2 under td/; the page sets the base
// (the R2 public URL in production, the /r2 dev proxy locally) before loading.
let base = "";

export function setAssetBase(url = "") {
  base = url.replace(/\/+$/, "");
}

export function tdAsset(path) {
  return `${base}/td/${path.replace(/^\/+/, "")}`;
}

// Home screen camp scene (TdHome.astro, page/home.ts).
export const campHomeArt = () => tdAsset("ui/camp-home.webp");

// Full-body enemy sprites (enemies/sprites/{file}-{version}.webp); v1 unless listed.
// M24 white label: grunt, runner, flyer, archer, brute (v2) and Lilith with her brood (v3)
// were regenerated from text-only prompts (src/game/td/sprite-spec-for-ai.md).
export const ENEMY_SPRITE_VERSIONS = { grunt: "v2", runner: "v2", flyer: "v2", archer: "v3", brute: "v3", boss: "v2", "boss-lilith": "v4", brood: "v4" };
export const enemySpriteVersion = (file) => ENEMY_SPRITE_VERSIONS[file] ?? "v1";

// Enemy animation sheets (M7): enemies/clips/{file}-{version}.json (Pixi spritesheet) plus
// .webp, named after the still they animate: clips/brood-v4 animates sprites/brood-v4. Built
// by `node scripts/build-td-enemy-anims.mjs <clips> --release` (the packer's set keys are these
// names). A new still version needs new clips; a remade sheet for the same still gets a suffix
// (brood-v4b), since R2 caches a year.
export const ENEMY_SHEETS = new Set([
  "grunt-v2", "runner-v2", "flyer-v2", "archer-v3", "brute-v3", "brood-v4",
  "boss-v2", "boss-lilith-v4", "boss-lerna-v1", "boss-kraghorn-v1", "boss-vorruk-v1",
  "brood-v1", "boss-lilith-v1", // broodcaller and hexer keep the older stills on purpose
]);
export const enemySheetUrl = (file, version = enemySpriteVersion(file)) =>
  (ENEMY_SHEETS.has(`${file}-${version}`) ? tdAsset(`enemies/clips/${file}-${version}.json`) : null);

// M11 enemies without their own art yet reuse an existing full-body sprite
// (enemies/sprites/{file}-{version}.webp), tinted and sized so they read as their own
// kind. Plain <img> previews (glossary) use the .td-enemy-art--{kind} filters in td.css.
// Broodcaller and hexer keep the older text-generated brood and Lilith art (v1) on purpose,
// so they do not look like the summoned brood or the boss; the rest follow the current version.
/** @type {Record<string, { file: string, version: string, tint: number, size: number, glow?: number }>} */
export const ENEMY_ART = {
  mender: { file: "archer", version: enemySpriteVersion("archer"), tint: 0xb8ffd0, size: 44, glow: 0x4ade80 },
  shieldbearer: { file: "grunt", version: enemySpriteVersion("grunt"), tint: 0xb9d8ff, size: 48 },
  broodcaller: { file: "brood", version: "v1", tint: 0xffffff, size: 56 },
  imp: { file: "runner", version: enemySpriteVersion("runner"), tint: 0xff8a8a, size: 30 },
  hexer: { file: "boss-lilith", version: "v1", tint: 0xffffff, size: 52, glow: 0xe879f9 },
};

// A map's final boss sprite: Baphomet is "boss", other bosses "boss-{id}".
export function bossSpriteFile(id) {
  return id && id !== "baphomet" ? `boss-${id}` : "boss";
}
export function bossSprite(id) {
  const file = bossSpriteFile(id);
  return tdAsset(`enemies/sprites/${file}-${enemySpriteVersion(file)}.webp`);
}

// Hero class icon (the game's own glyphs, td/icons/classes/{class}-v1.webp, square).
export function classIcon(heroClass) {
  return tdAsset(`icons/classes/${String(heroClass || "").toLowerCase()}-v1.webp`);
}

// TD class glyphs: simplified solid shapes on a 24px grid (currentColor) that stay
// readable at badge sizes, where the game's detailed webp icons lose their thin lines.
// The main site's hero pages keep the game's own icons.
const CLASS_GLYPHS = {
  tank: '<path d="M12 2 20 5v6c0 5.5-3.4 9.4-8 11-4.6-1.6-8-5.5-8-11V5z"/>',
  warrior: '<g transform="translate(12 12) scale(1.1) rotate(45) translate(-12 -12)"><path d="M12 1.5 14 4.5v10h-4v-10z"/><rect x="7" y="14.5" width="10" height="2.2" rx="1.1"/><rect x="11" y="16.7" width="2" height="3.8"/><circle cx="12" cy="21.3" r="1.6"/></g>',
  assassin: '<g transform="translate(12 12) scale(1.3) rotate(40) translate(-12 -11.5)"><path d="M12 3.5 13.7 6.5 13.4 13h-2.8l-.3-6.5z"/><rect x="9" y="13" width="6" height="1.8" rx=".9"/><rect x="11.2" y="14.8" width="1.6" height="3.6"/><circle cx="12" cy="19.3" r="1.2"/></g><g transform="translate(12 12) scale(1.3) rotate(-40) translate(-12 -11.5)"><path d="M12 3.5 13.7 6.5 13.4 13h-2.8l-.3-6.5z"/><rect x="9" y="13" width="6" height="1.8" rx=".9"/><rect x="11.2" y="14.8" width="1.6" height="3.6"/><circle cx="12" cy="19.3" r="1.2"/></g>',
  mage: '<path d="M12 1.5 14.4 9.6 22.5 12 14.4 14.4 12 22.5 9.6 14.4 1.5 12 9.6 9.6z"/>',
  archer: '<path d="M7 2.5Q21 12 7 21.5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M7 2.5v19" stroke="currentColor" stroke-width="1.2"/><path d="M2.5 12h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M22.5 12 17.5 8.8v6.4z"/>',
  support: '<path d="M9.5 2.5h5v7h7v5h-7v7h-5v-7h-7v-5h7z" stroke-linejoin="round"/>',
};
export function classGlyph(heroClass, size = 16) {
  const glyph = CLASS_GLYPHS[String(heroClass || "").toLowerCase()];
  if (!glyph) return `<img class="td-class-icon" src="${classIcon(heroClass)}" alt="" width="${size}" height="${size}" loading="lazy" decoding="async">`;
  return `<svg class="td-class-icon td-class-glyph" viewBox="0 0 24 24" width="${size}" height="${size}" fill="currentColor" aria-hidden="true" focusable="false">${glyph}</svg>`;
}

// Decorative class icon next to a class name (the name carries the meaning).
export function classIconImg(heroClass, size = 20) {
  return classGlyph(heroClass, size);
}
