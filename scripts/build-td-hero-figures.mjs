// Packs the anim lab's hero clips (public/td-local/anim-lab/, see docs/td-asset-pipeline.md)
// into board sheets: public/td/heroes-alt/figures/{figure}-{version}.webp + .json (Pixi
// spritesheet, animations idle / attack / ultimate). Frames are cropped to the union of all
// frames of that figure and scaled so the body is TARGET_BODY px tall (80 CSS px at 2x).
// `td` in the JSON carries what the renderer needs in sheet pixels: anchor (feet), bodyHeight
// and hand (where ranged shots start). Register new figures in HERO_FIGURES (assets.js).
//
// Usage: node scripts/build-td-hero-figures.mjs [--only boreas,surtr] [--version v1]
// Refuses to overwrite a published sheet: a remade figure needs the next version.
import sharp from "sharp";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const LAB = join(ROOT, "public/td-local/anim-lab");
const OUT = join(ROOT, "public/td/heroes-alt/figures");
const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : null; };
const ONLY = arg("only")?.split(",");
const VERSION = arg("version") ?? "v1";
const SKIP = new Set(["lotus"]); // lab-only test figure, not a game hero
const CLIPS = ["idle", "attack", "ultimate"];
const TARGET_BODY = 160;
const PAD = 2;
const COLS = 12;
const FEET_Y = 247; // lab frames: 256x256, feet on this row, body about 225 px tall

const manifest = JSON.parse(readFileSync(join(LAB, "manifest.json"), "utf8"));
mkdirSync(OUT, { recursive: true });

async function alphaBox(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let minX = info.width, minY = info.height, maxX = -1, maxY = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] > 8) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  }
  return { minX, minY, maxX, maxY };
}

for (const char of manifest.characters) {
  if (SKIP.has(char.id) || (ONLY && !ONLY.includes(char.id))) continue;
  const name = `${char.id}-${VERSION}`;
  if (existsSync(join(OUT, `${name}.json`))) { console.log(`skip ${name}: already published (use the next --version)`); continue; }
  const files = Object.fromEntries(CLIPS.map((clip) => [clip, (char.clips[clip]?.frames ?? []).map((f) => join(ROOT, "public", f))]));
  if (CLIPS.some((clip) => !files[clip].length)) { console.log(`skip ${char.id}: missing clips`); continue; }

  // Crop box shared by every frame, so the feet stay on the same pixel in all clips.
  const boxes = await Promise.all(Object.values(files).flat().map(alphaBox));
  const idleBoxes = await Promise.all(files.idle.map(alphaBox));
  const box = {
    x: Math.max(0, Math.min(...boxes.map((b) => b.minX)) - PAD),
    y: Math.max(0, Math.min(...boxes.map((b) => b.minY)) - PAD),
    r: Math.min(256, Math.max(...boxes.map((b) => b.maxX)) + 1 + PAD),
    b: Math.min(256, Math.max(...boxes.map((b) => b.maxY)) + 1 + PAD),
  };
  const idleTop = Math.min(...idleBoxes.map((b) => b.minY));
  const scale = TARGET_BODY / (FEET_Y - idleTop);
  const fw = Math.round((box.r - box.x) * scale), fh = Math.round((box.b - box.y) * scale);

  const frames = {}, animations = {}, composites = [];
  let row = 0;
  for (const clip of CLIPS) {
    animations[clip] = [];
    for (const [i, file] of files[clip].entries()) {
      const col = i % COLS, r = row + Math.floor(i / COLS);
      const key = `${clip}_${i}`;
      const input = await sharp(file).extract({ left: box.x, top: box.y, width: box.r - box.x, height: box.b - box.y })
        .resize(fw, fh, { kernel: "lanczos3" }).png().toBuffer();
      composites.push({ input, left: col * fw, top: r * fh });
      frames[key] = { frame: { x: col * fw, y: r * fh, w: fw, h: fh }, rotated: false, trimmed: false, spriteSourceSize: { x: 0, y: 0, w: fw, h: fh }, sourceSize: { w: fw, h: fh } };
      animations[clip].push(key);
    }
    row += Math.ceil(files[clip].length / COLS);
  }
  const width = COLS * fw, height = row * fh;
  await sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(composites).webp({ quality: 80, alphaQuality: 90 }).toFile(join(OUT, `${name}.webp`));
  const toSheet = ([x, y]) => [Math.round((x - box.x) * scale), Math.round((y - box.y) * scale)];
  const td = {
    anchor: { x: Math.round((128 - box.x) * scale), y: Math.round((FEET_Y - box.y) * scale) },
    bodyHeight: TARGET_BODY,
    ...(char.hand ? { hand: toSheet(char.hand) } : {}),
  };
  writeFileSync(join(OUT, `${name}.json`), JSON.stringify({ frames, animations, meta: { image: `${name}.webp`, format: "RGBA8888", size: { w: width, h: height }, scale: "1" }, td }));
  console.log(`${name}: ${fw}x${fh} frames, sheet ${width}x${height}${char.hand ? ", hand" : ""}`);
}
