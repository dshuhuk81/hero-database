import sharp from "sharp";
import { existsSync, mkdirSync, readdirSync, statSync } from "fs";
import { join, basename, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const HERO_DIR = join(ROOT, "public", "heroes");
const FORCE = process.argv.includes("--force");
const DRY_RUN = process.argv.includes("--dry-run");

const VARIANTS = [
  { dir: "thumbs", suffix: "96", width: 96, quality: 72 },
  { dir: "cards", suffix: "240", width: 240, quality: 74 },
  { dir: "cards", suffix: "360", width: 360, quality: 76 },
  { dir: "cards", suffix: "480", width: 480, quality: 78 },
];

function ensureDir(path) {
  if (!DRY_RUN) mkdirSync(path, { recursive: true });
}

function sourceHeroImages() {
  if (!existsSync(HERO_DIR)) {
    throw new Error(`Missing source directory: ${HERO_DIR}`);
  }

  return readdirSync(HERO_DIR)
    .map((entry) => join(HERO_DIR, entry))
    .filter((path) => statSync(path).isFile())
    .filter((path) => extname(path).toLowerCase() === ".webp");
}

async function createVariant(sourcePath, variant) {
  const id = basename(sourcePath, extname(sourcePath));
  const targetDir = join(HERO_DIR, variant.dir);
  const targetPath = join(targetDir, `${id}-${variant.suffix}.webp`);

  if (!FORCE && existsSync(targetPath)) {
    return { targetPath, skipped: true };
  }

  ensureDir(targetDir);

  if (!DRY_RUN) {
    await sharp(sourcePath)
      .resize({
        width: variant.width,
        height: variant.width,
        fit: "cover",
        position: "top",
        withoutEnlargement: true,
      })
      .webp({
        quality: variant.quality,
        effort: 6,
        lossless: false,
      })
      .toFile(targetPath);
  }

  return { targetPath, skipped: false };
}

async function main() {
  const sources = sourceHeroImages();
  console.log(`Found ${sources.length} hero source images in public/heroes`);

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const sourcePath of sources) {
    for (const variant of VARIANTS) {
      try {
        const result = await createVariant(sourcePath, variant);
        if (result.skipped) {
          skipped += 1;
          console.log(`  SKIP ${result.targetPath.replace(ROOT + "/", "")}`);
        } else {
          created += 1;
          console.log(`  ${DRY_RUN ? "PLAN" : "OK  "} ${result.targetPath.replace(ROOT + "/", "")}`);
        }
      } catch (error) {
        failed += 1;
        console.error(`  ERR  ${sourcePath}: ${error.message}`);
      }
    }
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped, ${failed} failed`);
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exitCode = 1;
});
