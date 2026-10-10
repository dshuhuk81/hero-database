// Game asset URLs. Assets live on Cloudflare R2 under td/; the page sets the base
// (the R2 public URL in production, the /r2 dev proxy locally) before loading.
let base = "";

export function setAssetBase(url = "") {
  base = url.replace(/\/+$/, "");
}

// Local dev loads assets through the /r2 proxy (astro.config.mjs).
export const devAssets = () => base === "/r2";

export function tdAsset(path) {
  return `${base}/td/${path.replace(/^\/+/, "")}`;
}

// Home screen camp scene (TdHome.astro, page/home.ts).
export const campHomeArt = () => tdAsset("ui/camp-home.webp");
// Home screen emblems (PixelLab, 128 px): ui/emblems/{name}-{version}.webp.
export const HOME_EMBLEM_VERSION = "v3"; // v3: every ring scaled to one diameter and centered
export const homeEmblemPath = (name) => `ui/emblems/${name}-${HOME_EMBLEM_VERSION}.webp`;
// Daily Quests art (PixelLab): chest states and the activity coin, ui/quests/{name}-v1.webp.
export const questArtPath = (name) => `ui/quests/${name}-v1.webp`;
// Daily Trial mutator emblems (PixelLab, crimson center): ui/mutators/{id}-v1.webp.
export const mutatorArtPath = (id) => `ui/mutators/${id}-v1.webp`;

// Loads a UI image from R2; a file not uploaded yet falls back to the copy in public/td.
export function loadTdImage(img, path) {
  img.addEventListener("error", () => { if (!img.dataset.local) { img.dataset.local = "1"; img.src = `/td/${path}`; } }, { once: true });
  img.src = tdAsset(path);
}

// Talent icons (PixelLab, 64 px): ui/talents/{id}-v1.webp; the tab icon is "tab". Markup carries data-td-art and
// hydrateTdArt() loads it after the markup is in the page, with the same public/td fallback as loadTdImage.
export const talentArtPath = (id) => `ui/talents/${id}-v1.webp`;
export function talentArtImg(id, cls = "td-talent-art", size = 48) {
  return `<img class="${cls}" data-td-art="${talentArtPath(id)}" width="${size}" height="${size}" alt="" decoding="async">`;
}
// Hero screen tab icons (PixelLab, 64 px): ui/hero-tabs/{id}-v1.webp (level, stars, evolution, skills).
export const heroTabArtPath = (id) => `ui/hero-tabs/${id}-v1.webp`;
export function heroTabArtImg(id) {
  return `<img class="td-tab-art" data-td-art="${heroTabArtPath(id)}" width="20" height="20" alt="" decoding="async">`;
}
export function hydrateTdArt(root) {
  for (const img of root.querySelectorAll("img[data-td-art]")) if (!img.dataset.tdLoaded) { img.dataset.tdLoaded = "1"; loadTdImage(img, img.dataset.tdArt); }
}

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
  "boss-v2", "boss-lilith-v4b", "boss-lerna-v1b", "burrower-v1", "vinebinder-v1", "jaguar-v1", "sporeling-v1", "boss-lerna-v1", "boss-kraghorn-v1", "boss-vorruk-v1", "boss-ochenta-v1",
  "boss-skeld-v1", "boss-thyrak-v1", "boss-neressa-v1", "boss-morthul-v1",
  "boss-ilyr-v1", "boss-eidros-v1", "boss-astreon-v1", "boss-brontax-v1", "caravan-v2",
  "brood-v1", "boss-lilith-v1", // broodcaller and hexer keep the older stills on purpose
]);
// Remade sheets for a still: still name -> sheet name with a suffix.
export const ENEMY_SHEET_REMAKES = { "boss-lilith-v4": "boss-lilith-v4b", "boss-lerna-v1": "boss-lerna-v1b" };
export const enemySheetUrl = (file, version = enemySpriteVersion(file)) => {
  const still = `${file}-${version}`, sheet = ENEMY_SHEET_REMAKES[still] ?? still;
  return ENEMY_SHEETS.has(sheet) ? tdAsset(`enemies/clips/${sheet}.json`) : null;
};

// Hero board figures: heroes-alt/figures/{figure}-{version}.json (Pixi spritesheet with idle,
// attack and ultimate) plus .webp, drawn instead of the token (render.js). Built from the anim
// lab by `node scripts/build-td-hero-figures.mjs`; recruit pairs share one figure per class.
// A remade figure gets the next version (boreas-v2), since R2 caches a year.
export const HERO_FIGURES = {
  boreas: "boreas-v1", surtr: "surtr-v1", fenrir: "fenrir-v1", asclepius: "asclepius-v1", ymir: "ymir-v2",
  heimdall: "heimdall-v1", gaia: "gaia-v1", aegir: "aegir-v1", nott: "nott-v1", vidar: "vidar-v1",
  plutus: "plutus-v1", harmonia: "harmonia-v1", skadi: "skadi-v1", atalanta: "atalanta-v1", stheno: "stheno-v1",
  odin: "odin-v1", helios: "helios-v1", hephaestus: "hephaestus-v1", hecate: "hecate-v1", thanatos: "thanatos-v1",
  atlas: "atlas-v1", isis: "isis-v1", houyi: "houyi-v1",
  "recruit-bram": "recruit-tank-v1", "recruit-tilda": "recruit-tank-v1",
  "recruit-kellan": "recruit-warrior-v1", "recruit-sable": "recruit-warrior-v1",
  "recruit-ash": "recruit-assassin-v1", "recruit-nyra": "recruit-assassin-v1",
  "recruit-elm": "recruit-mage-v1", "recruit-ives": "recruit-mage-v1",
  "recruit-wren": "recruit-archer-v1", "recruit-hollis": "recruit-archer-v1",
  "recruit-poppy": "recruit-support-v1", "recruit-jory": "recruit-support-v1",
};
export const heroFigureUrl = (heroId) => (HERO_FIGURES[heroId] ? tdAsset(`heroes-alt/figures/${HERO_FIGURES[heroId]}.json`) : null);

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
  // Chapter creatures (A4 of the gameplay ideas): own stills and sheets (artifacts/td-chapter-enemies-v1).
  burrower: { file: "burrower", version: "v1", tint: 0xffffff, size: 46 },
  vinebinder: { file: "vinebinder", version: "v1", tint: 0xffffff, size: 54 },
  jaguar: { file: "jaguar", version: "v1", tint: 0xffffff, size: 44 },
  sporeling: { file: "sporeling", version: "v1", tint: 0xffffff, size: 34 },
  // Escort caravan (G4, stage 3-2): own still, a wagon with an ox (PixelLab), walks the road as an escorted unit.
  // v2: ground shadow removed; its sheet (clips/caravan-v2) turns the wheels and moves the ox's legs.
  caravan: { file: "caravan", version: "v2", tint: 0xffffff, size: 84 },
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
