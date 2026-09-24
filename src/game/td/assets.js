// Game asset URLs. Assets live on Cloudflare R2 under td/; the page sets the base
// (the R2 public URL in production, the /r2 dev proxy locally) before loading.
let base = "";

export function setAssetBase(url = "") {
  base = url.replace(/\/+$/, "");
}

export function tdAsset(path) {
  return `${base}/td/${path.replace(/^\/+/, "")}`;
}
