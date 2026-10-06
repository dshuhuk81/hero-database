import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import groups from "../src/data/tdMythologyGroups.json" with { type: "json" };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "assets/td/mythology-groups");
const outputDir = path.join(root, "public/td/icons/mythology");

await mkdir(outputDir, { recursive: true });

for (const [groupId, group] of Object.entries(groups)) {
  const source = path.join(sourceDir, `${groupId}-source.png`);
  const output = path.join(root, "public", group.icon.replace(/^\//, ""));
  const content = await sharp(source)
    .ensureAlpha()
    .trim({ threshold: 1 })
    .resize(112, 112, { fit: "inside", withoutEnlargement: false })
    .png()
    .toBuffer();
  const metadata = await sharp(content).metadata();
  const left = Math.floor((128 - (metadata.width ?? 0)) / 2);
  const top = Math.floor((128 - (metadata.height ?? 0)) / 2);

  await sharp({
    create: {
      width: 128,
      height: 128,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: content, left, top }])
    .webp({ quality: 88, alphaQuality: 100 })
    .toFile(output);

  console.log(`${groupId}: ${path.relative(root, output)}`);
}
