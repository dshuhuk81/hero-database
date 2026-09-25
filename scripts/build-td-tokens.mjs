// Builds the tower defense board tokens: head-and-shoulders cutouts from the
// full-body hero art on R2 (already transparent), 192px WebP with alpha.
// Output: public/td/tokens/{id}-v1.webp (upload with upload-to-r2.mjs --prefix td/tokens).
// Crop is found from the alpha channel: top of the figure, centered on the
// opaque pixels of the head band. Per-hero fixes go in src/data/tdTokenCrops.json
// as { id: { dx, dy, scale } } (fractions of the auto crop size) or, where the
// auto crop misses (wings, ribbons, raised arms), { id: { fx, fy, size } }: face
// center as fractions of the image and crop side as a fraction of its width.
//
// Usage: node scripts/build-td-tokens.mjs [--only zeus,nuwa] [--sheet path.png]
import sharp from "sharp";
import { mkdirSync, readFileSync, existsSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import heroes from "../src/data/gameBalance.json" with { type: "json" };

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R2 = "https://pub-a33abfbc3135413881a1d8eb86543559.r2.dev";
const OUT_DIR = join(ROOT, "public/td/tokens");
const CACHE_DIR = join(ROOT, ".cache/td-token-src");
const VERSION = "v1"; // R2 objects are immutable-cached: bump for changed images
const SIZE = 192;
const overridesPath = join(ROOT, "src/data/tdTokenCrops.json");
const overrides = existsSync(overridesPath) ? JSON.parse(readFileSync(overridesPath, "utf8")) : {};

const arg = (name) => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : null;
const only = arg("--only")?.split(",");
const sheetPath = arg("--sheet");

async function source(id) {
  const file = join(CACHE_DIR, `${id}.webp`);
  if (!existsSync(file)) {
    const res = await fetch(`${R2}/heroes/${id}.webp`);
    if (!res.ok) throw new Error(`${id}: ${res.status}`);
    writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  }
  return file;
}

// Auto crop on a downscaled alpha map: first row that is meaningfully opaque is
// the top of the hair; the head band below it gives the horizontal center.
async function autoCrop(file) {
  const meta = await sharp(file).metadata();
  const f = 8;
  const w = Math.round(meta.width / f), h = Math.round(meta.height / f);
  const { data } = await sharp(file).resize(w, h).ensureAlpha().extractChannel("alpha").raw().toBuffer({ resolveWithObject: true });
  const opaque = (x, y) => data[y * w + x] > 128;
  let top = 0;
  for (let y = 0; y < h; y++) {
    let count = 0;
    for (let x = 0; x < w; x++) if (opaque(x, y)) count++;
    if (count > w * 0.04) { top = y; break; }
  }
  const band = Math.round(w * 0.3); // head band height
  let sum = 0, n = 0;
  for (let y = top; y < Math.min(h, top + band); y++) for (let x = 0; x < w; x++) if (opaque(x, y)) { sum += x; n++; }
  const cx = n ? sum / n : w / 2;
  const side = w * 0.6;
  return { width: meta.width, height: meta.height, left: (cx - side / 2) * f, top: (top - side * 0.08) * f, side: side * f };
}

async function build(hero) {
  const file = await source(hero.id);
  const crop = await autoCrop(file);
  const o = overrides[hero.id] || {};
  let side, left, top;
  if (o.fx !== undefined) {
    // Absolute: face center as fractions of the image, crop side as a fraction of its width.
    side = Math.round((o.size ?? 0.5) * crop.width);
    left = Math.round(o.fx * crop.width - side / 2);
    top = Math.round(o.fy * crop.height - side * 0.4);
  } else {
    side = Math.round(crop.side * (o.scale ?? 1));
    left = Math.round(crop.left + (o.dx ?? 0) * crop.side);
    top = Math.round(crop.top + (o.dy ?? 0) * crop.side);
  }
  // Pad with transparency where the crop leaves the canvas.
  const pad = { top: Math.max(0, -top), left: Math.max(0, -left), bottom: Math.max(0, top + side - crop.height), right: Math.max(0, left + side - crop.width) };
  // Separate pass: within one pipeline sharp would extract before extending.
  const padded = await sharp(file).extend({ ...pad, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  left += pad.left; top += pad.top;
  const out = join(OUT_DIR, `${hero.id}-${VERSION}.webp`);
  await sharp(padded).extract({ left, top, width: side, height: side }).resize(SIZE, SIZE).webp({ quality: 82, alphaQuality: 90 }).toFile(out);
  return out;
}

mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(CACHE_DIR, { recursive: true });
const list = heroes.filter((hero) => !only || only.includes(hero.id));
const built = [];
for (const hero of list) {
  built.push({ id: hero.id, file: await build(hero) });
  console.log(`built ${hero.id}`);
}

// Optional review sheet: every token on a dark tile with its id.
if (sheetPath) {
  const cols = 5, tile = SIZE + 24;
  const rows = Math.ceil(built.length / cols);
  const composites = [];
  for (const [i, entry] of built.entries()) {
    const x = (i % cols) * tile + 12, y = Math.floor(i / cols) * (tile + 20) + 12;
    composites.push({ input: entry.file, left: x, top: y });
    composites.push({ input: Buffer.from(`<svg width="${SIZE}" height="18"><text x="0" y="14" font-family="sans-serif" font-size="14" fill="#ccc">${entry.id}</text></svg>`), left: x, top: y + SIZE + 2 });
  }
  await sharp({ create: { width: cols * tile, height: rows * (tile + 20), channels: 4, background: "#1b1a26" } }).composite(composites).png().toFile(sheetPath);
  console.log(`sheet ${sheetPath}`);
}
