// Collects R2 asset paths ("heroes/a.webp") referenced in source text.
// Only literal URLs are found; URLs assembled at runtime (e.g. iconUrl() in
// summon-calendar.astro) are invisible here and must be checked separately.
const MEDIA = "webp|png|jpe?g|svg|gif|mp4|webm";

export function extractR2Paths(text, base) {
  const host = base.replace(/\/+$/, "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?:${host}|/r2)/([A-Za-z0-9_./%() -]+?\\.(?:${MEDIA}))(?=[?"'\\s)#]|$)`, "gi");
  const found = new Set();
  for (const match of text.matchAll(pattern)) found.add(decodeURIComponent(match[1]));
  return [...found].sort();
}
