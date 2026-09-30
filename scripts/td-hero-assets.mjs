// Tower defense hero art (docs/td-asset-pipeline.md, part C): from one transparent full-body
// source PNG, writes the three files src/game/td/skin.js loads for a hero:
//   public/td/heroes-alt/{file}-card-240.webp   240 x 587 (portrait, whole figure)
//   public/td/heroes-alt/{file}-thumb-96.webp   96 x 96 (top crop)
//   public/td/heroes-alt/{file}-token-192.webp  192 x 192 (bust crop for the board token)
// {file} is the internal hero id, or {id}-{art} for a redrawn hero (tdSkinMythic.json "art").
// Crops match the mythic review set (review-set-v1/add-hero.mjs). Refuses to overwrite.
//
// Usage: node scripts/td-hero-assets.mjs --id <internal id> --source <png> [--art v2] [--token-width 0.73]
import sharp from "sharp";
import { existsSync } from "node:fs";
import { join } from "node:path";

const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : null; };
const id = arg("id"), source = arg("source"), art = arg("art");
const tokenWidth = Number(arg("token-width") ?? 0.73); // share of the source width in the square bust crop
if (!id || !source) { console.error("Usage: node scripts/td-hero-assets.mjs --id <internal id> --source <png> [--art v2] [--token-width 0.73]"); process.exit(1); }

const dir = "public/td/heroes-alt";
const file = art ? `${id}-${art}` : id;
const out = { card: join(dir, `${file}-card-240.webp`), thumb: join(dir, `${file}-thumb-96.webp`), token: join(dir, `${file}-token-192.webp`) };
for (const path of Object.values(out)) if (existsSync(path)) throw new Error(`${path} exists; R2 caches a year, so new art needs a new --art version`);

const meta = await sharp(source).metadata();
const alpha = await sharp(source).ensureAlpha().extractChannel("alpha").stats();
if (!meta.hasAlpha || alpha.channels[0].min !== 0) throw new Error("source needs a transparent background");
if (meta.height < meta.width * 1.5) console.warn(`warn: source is ${meta.width}x${meta.height}; portraits are tall (the card is 240x587)`);

const clear = { r: 0, g: 0, b: 0, alpha: 0 };
await sharp(source).resize(240, 587, { fit: "contain", background: clear }).webp({ quality: 74, effort: 4 }).toFile(out.card);
await sharp(source).resize(96, 96, { fit: "cover", position: "top" }).webp({ quality: 72 }).toFile(out.thumb);
const side = Math.min(meta.width, meta.height, Math.round(meta.width * tokenWidth));
await sharp(source).extract({ left: Math.round((meta.width - side) / 2), top: 0, width: side, height: side })
  .resize(192, 192).webp({ quality: 82, alphaQuality: 90 }).toFile(out.token);

for (const [name, path] of Object.entries(out)) {
  const m = await sharp(path).metadata();
  console.log(`${name}: ${path} ${m.width}x${m.height}${m.hasAlpha ? " alpha" : ""}`);
}
console.log(`next: python3 scripts/td-idle-anim.py ${source} ${id} ${dir}/anims${art ? ` --version ${art}` : ""}`);
