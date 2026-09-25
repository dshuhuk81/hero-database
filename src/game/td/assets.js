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

// Hero class icon (the same hexagon icons the boss and calendar pages use).
export function classIcon(heroClass) {
  return r2Asset(`icons/classes/${String(heroClass || "").toLowerCase()}.webp`);
}

// Decorative class icon next to a class name (the name carries the meaning).
export function classIconImg(heroClass, size = 20) {
  return `<img class="td-class-icon" src="${classIcon(heroClass)}" alt="" width="${size}" height="${Math.round(size * 82 / 72)}" loading="lazy" decoding="async">`;
}
