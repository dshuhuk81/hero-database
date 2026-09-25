// Normalizes AI-generated enemy sprites (see src/game/td/sprite-spec-for-ai.md)
// into the files the renderer loads: public/td/enemies/sprites/{kind}-v1.webp,
// 256x256, transparent, subject trimmed and fitted to 80% of the canvas.
// Upload with: node scripts/upload-to-r2.mjs --prefix td/enemies/sprites
//
// Usage: node scripts/build-td-enemy-sprites.mjs <folder with grunt.png, runner.png, ... boss_baphomet.png> [--out dir]
import sharp from "sharp";
import { existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const outArg = process.argv.indexOf("--out");
const OUT_DIR = outArg > 0 ? process.argv[outArg + 1] : join(ROOT, "public/td/enemies/sprites");
const VERSION = "v1"; // matches ENEMY_SPRITE_VERSION in render.js; bump both for changed art
const SIZE = 256;
const FILL = 0.8;
// Spec file name -> output name. Baphomet is "boss"; other final bosses are boss-{id}
// (render.js picks the map's boss). lilith_child is her summoned children ("brood").
const FILES = { grunt: "grunt", runner: "runner", flyer: "flyer", archer: "archer", brute: "brute", boss_baphomet: "boss", boss_lilith: "boss-lilith", lilith_child: "brood" };

const inDir = process.argv[2];
if (!inDir) { console.error("Usage: node scripts/build-td-enemy-sprites.mjs <input folder>"); process.exit(1); }
mkdirSync(OUT_DIR, { recursive: true });

for (const [name, kind] of Object.entries(FILES)) {
  const file = [".png", ".webp"].map((ext) => join(inDir, name + ext)).find(existsSync);
  if (!file) { console.log(`skip ${name}: not found`); continue; }
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  // A generator that ignored "transparent background" leaves opaque corners.
  const cornerAlpha = [0, info.width - 1, (info.height - 1) * info.width, info.height * info.width - 1].map((i) => data[i * 4 + 3]);
  if (cornerAlpha.some((a) => a > 16)) console.warn(`warn ${name}: corners are not transparent; remove the background first`);
  const trimmed = await sharp(file).ensureAlpha().trim({ threshold: 1 }).png().toBuffer();
  const inner = Math.round(SIZE * FILL);
  const fitted = await sharp(trimmed).resize(inner, inner, { fit: "inside" }).png().toBuffer();
  const meta = await sharp(fitted).metadata();
  const out = join(OUT_DIR, `${kind}-${VERSION}.webp`);
  await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: fitted, left: Math.round((SIZE - meta.width) / 2), top: Math.round((SIZE - meta.height) / 2) }])
    .webp({ quality: 85, alphaQuality: 90 })
    .toFile(out);
  console.log(`built ${kind} <- ${name}`);
}
