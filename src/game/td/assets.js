// Game asset URLs. Assets live on Cloudflare R2 under td/; the page sets the base
// (the R2 public URL in production, the /r2 dev proxy locally) before loading.
let base = "";

export function setAssetBase(url = "") {
  base = url.replace(/\/+$/, "");
}

export function tdAsset(path) {
  return `${base}/td/${path.replace(/^\/+/, "")}`;
}

// Site-wide R2 assets outside td/ (shared with the rest of the site).
export function r2Asset(path) {
  return `${base}/${path.replace(/^\/+/, "")}`;
}

// M11 enemies without their own art yet reuse an existing full-body sprite
// (enemies/sprites/{file}-{version}.webp), tinted and sized so they read as their own
// kind. Plain <img> previews (glossary) use the .td-enemy-art--{kind} filters in td.css.
/** @type {Record<string, { file: string, version: string, tint: number, size: number, glow?: number }>} */
export const ENEMY_ART = {
  mender: { file: "archer", version: "v1", tint: 0xb8ffd0, size: 44, glow: 0x4ade80 },
  shieldbearer: { file: "grunt", version: "v1", tint: 0xb9d8ff, size: 48 },
  broodcaller: { file: "brood", version: "v1", tint: 0xffffff, size: 56 },
  imp: { file: "runner", version: "v1", tint: 0xff8a8a, size: 30 },
  hexer: { file: "boss-lilith", version: "v1", tint: 0xffffff, size: 52, glow: 0xe879f9 },
};

// Hero class icon (the same hexagon icons the boss and calendar pages use).
export function classIcon(heroClass) {
  return r2Asset(`icons/classes/${String(heroClass || "").toLowerCase()}.webp`);
}

// Decorative class icon next to a class name (the name carries the meaning).
export function classIconImg(heroClass, size = 20) {
  return `<img class="td-class-icon" src="${classIcon(heroClass)}" alt="" width="${size}" height="${Math.round(size * 82 / 72)}" loading="lazy" decoding="async">`;
}
