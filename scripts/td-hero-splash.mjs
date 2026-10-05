// Tower defense hero splash art (Summon screen, large portrait): from each hero's full-size master
// (the 2514 x 6144 transparent figure in the mythic review set, or any tall transparent PNG/WebP)
// writes public/td/heroes-alt/{file}-splash-720.webp, 720 px wide (a quarter of the master), and
// sets `"splash": true` for the hero in src/data/tdSkinMythic.json so skin.js serves it.
// {file} is the internal id, or {id}-{art} for a redrawn hero (tdSkinMythic.json "art").
// Refuses to overwrite (R2 caches a year).
//
// Usage:
//   node scripts/td-hero-splash.mjs --all                       every mythic hero that has a master
//   node scripts/td-hero-splash.mjs --id isis --source <file>   one hero from a given master
// Masters for --all: public/td/heroes-alt/review-set-v1/{file}.webp.
import sharp from "sharp";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : null; };
const skinPath = "src/data/tdSkinMythic.json";
const skin = JSON.parse(readFileSync(skinPath, "utf8"));
const dir = "public/td/heroes-alt";
const masters = join(dir, "review-set-v1");

const jobs = process.argv.includes("--all")
  ? Object.entries(skin.heroes).map(([id, entry]) => ({ id, entry, source: join(masters, `${entry.art ? `${id}-${entry.art}` : id}.webp`) }))
  : arg("id") && arg("source") ? [{ id: arg("id"), entry: skin.heroes[arg("id")], source: arg("source") }] : null;
if (!jobs) { console.error("Usage: node scripts/td-hero-splash.mjs --all | --id <id> --source <file>"); process.exit(1); }

let written = 0;
for (const { id, entry, source } of jobs) {
  if (!entry) throw new Error(`${id}: no entry in ${skinPath}`);
  const file = entry.art ? `${id}-${entry.art}` : id;
  const out = join(dir, `${file}-splash-720.webp`);
  if (!existsSync(source)) { console.log(`skip ${id}: no master at ${source}`); continue; }
  if (existsSync(out)) { console.log(`skip ${id}: ${out} exists`); entry.splash = true; continue; }
  const meta = await sharp(source).metadata();
  if (!meta.hasAlpha) throw new Error(`${id}: master needs a transparent background`);
  await sharp(source).resize({ width: 720 }).webp({ quality: 80, alphaQuality: 90, effort: 5 }).toFile(out);
  const m = await sharp(out).metadata();
  entry.splash = true;
  written += 1;
  console.log(`${id}: ${out} ${m.width}x${m.height}`);
}
writeFileSync(skinPath, `${JSON.stringify(skin, null, 2)}\n`);
console.log(`${written} splash file(s) written`);
