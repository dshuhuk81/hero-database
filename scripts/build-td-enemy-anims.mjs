// Packs enemy animation strips into one sheet per kind for the renderer (M7, see
// docs/tower-defense-ui-plan.md): {kind}.webp plus a Pixi spritesheet {kind}.json with one
// animation per clip (idle, walk, attack, hurt, death) and a `td` block (feet anchor, body
// height, fps). Frames are cropped to one shared box per kind, so the feet stay put.
//
// Input: horizontal strips of square frames, one PNG per clip (frame size = strip height).
// SETS map each kind to its strips. `pixel`: a free pixel-art pack under
// ~/hero-database-assets/td/newAssetTest (license not confirmed: local only, not on R2).
// `painted`: warp frames from our own sprites (scripts/td-warp-anim.py), e.g.
// ~/hero-database-assets/td/warp-anims. Each set goes to its own folder; the renderer picks
// one with ?anim=sheets&set=<name> (default painted).
//
// Usage: node scripts/build-td-enemy-anims.mjs <source root> --set painted|pixel [--out public/td-local/sheets] [--only grunt]
import sharp from "sharp";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
const SET = arg("--set") ?? "pixel";
const OUT_DIR = join(arg("--out") ?? join(ROOT, "public/td-local/sheets"), SET);
const ONLY = arg("--only")?.split(",");
const FPS = 12;

// set -> kind -> strips relative to the source root. `idle` frame 0 sets the feet anchor.
// pixelArt: lossless sheet and nearest-neighbour scaling in the renderer.
const clipFiles = (prefix, attack = "attack") => ({ idle: `${prefix}_idle`, walk: `${prefix}_walk`, attack: `${prefix}_${attack}`, hurt: `${prefix}_hurt`, death: `${prefix}_death` });
const SETS = {
  pixel: {
    grunt: { dir: "Orc/Orc", pixelArt: true, clips: { idle: "Orc_Idle", walk: "Orc_Walk", attack: "Orc_Attack01", hurt: "Orc_Hurt", death: "Orc_Death" } },
    archer: { dir: "Soldier/Soldier", pixelArt: true, clips: { idle: "Soldier_Idle", walk: "Soldier_Walk", attack: "Soldier_Attack03", hurt: "Soldier_Hurt", death: "Soldier_Death" } },
  },
  painted: {
    grunt: { dir: "grunt", clips: clipFiles("grunt") },
  },
};
const PACKS = SETS[SET];
if (!PACKS) { console.error(`unknown --set ${SET}; one of ${Object.keys(SETS).join(", ")}`); process.exit(1); }

const srcRoot = process.argv[2];
if (!srcRoot) { console.error("Usage: node scripts/build-td-enemy-anims.mjs <source root> [--out dir] [--only kinds]"); process.exit(1); }
mkdirSync(OUT_DIR, { recursive: true });

// Alpha bounding box of one frame inside a raw RGBA strip, or null when empty.
function frameBox(data, stripWidth, x0, size) {
  let minX = Infinity, minY = Infinity, maxX = -1, maxY = -1;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (data[((y * stripWidth) + x0 + x) * 4 + 3] === 0) continue;
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  return maxX < 0 ? null : { minX, minY, maxX, maxY };
}

for (const [kind, pack] of Object.entries(PACKS)) {
  if (ONLY && !ONLY.includes(kind)) continue;
  const clips = [];
  for (const [clip, file] of Object.entries(pack.clips)) {
    const path = join(srcRoot, pack.dir, `${file}.png`);
    if (!existsSync(path)) { console.log(`skip ${kind}: missing ${path}`); clips.length = 0; break; }
    const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const size = info.height;
    const count = Math.floor(info.width / size);
    const boxes = Array.from({ length: count }, (_, i) => frameBox(data, info.width, i * size, size));
    clips.push({ clip, path, size, count, boxes });
  }
  if (!clips.length) continue;

  // One crop box for every frame of every clip (1 px margin), so nothing jumps between clips.
  const all = clips.flatMap((c) => c.boxes).filter(Boolean);
  const size = clips[0].size;
  const box = {
    x: Math.max(0, Math.min(...all.map((b) => b.minX)) - 1),
    y: Math.max(0, Math.min(...all.map((b) => b.minY)) - 1),
  };
  box.w = Math.min(size, Math.max(...all.map((b) => b.maxX)) + 2) - box.x;
  box.h = Math.min(size, Math.max(...all.map((b) => b.maxY)) + 2) - box.y;
  const idle = clips.find((c) => c.clip === "idle").boxes[0];

  // Sheet: one row per clip.
  const columns = Math.max(...clips.map((c) => c.count));
  const composites = [];
  const frames = {};
  const animations = {};
  for (const [row, c] of clips.entries()) {
    animations[c.clip] = [];
    for (let i = 0; i < c.count; i++) {
      const name = `${c.clip}_${i}`;
      const x = i * box.w, y = row * box.h;
      composites.push({ input: await sharp(c.path).extract({ left: i * size + box.x, top: box.y, width: box.w, height: box.h }).png().toBuffer(), left: x, top: y });
      frames[name] = { frame: { x, y, w: box.w, h: box.h }, rotated: false, trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: box.w, h: box.h }, sourceSize: { w: box.w, h: box.h } };
      animations[c.clip].push(name);
    }
  }
  const width = columns * box.w, height = clips.length * box.h;
  await sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(composites).webp(pack.pixelArt ? { lossless: true } : { quality: 82, alphaQuality: 90 }).toFile(join(OUT_DIR, `${kind}.webp`));
  const json = {
    frames, animations,
    meta: { image: `${kind}.webp`, format: "RGBA8888", size: { w: width, h: height }, scale: "1" },
    // Renderer data: feet point inside a frame (idle frame 0: bottom centre of the body),
    // the idle body height for scaling to the kind's sprite size, and the frame rate.
    td: { anchor: { x: (idle.minX + idle.maxX + 1) / 2 - box.x, y: idle.maxY + 1 - box.y }, bodyHeight: idle.maxY - idle.minY + 1, fps: FPS, pixelArt: Boolean(pack.pixelArt) },
  };
  writeFileSync(join(OUT_DIR, `${kind}.json`), JSON.stringify(json, null, 1));
  console.log(`built ${kind}: ${clips.map((c) => `${c.clip} ${c.count}`).join(", ")}; frame ${box.w}x${box.h}, sheet ${width}x${height}`);
}
