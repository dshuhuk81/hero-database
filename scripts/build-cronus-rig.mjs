// Builds the Cronus God-Mode rig: downsizes the generated layers and writes rig.json with the
// joint positions (measured on the 1254 px originals, stored here in output pixels).
//   node scripts/build-cronus-rig.mjs [sourceDir]
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const SRC = process.argv[2] ?? "/Users/daschultheiss/hero-database/public/td/god-mode/cronus";
const OUT = "public/td/god-mode/cronus";
const SOURCE_SIZE = 1254;
const SIZE = 640;
const K = SIZE / SOURCE_SIZE;

// Joint positions on the originals. `side` is the body side the arm was authored for: the glowing
// cut face of the arm sits at its pivot and points at the torso (viewer-left arm = cut face right).
const rig = {
  size: SIZE,
  torso: { file: "cronus-torso", stumpL: [75, 718], stumpR: [1177, 718], headTop: [627, 0], armInset: 60 },
  headRoar: { file: "cronus-head-roar-v2", top: [627, 0], defaultScale: 0.55 },
  arms: {
    rest: { file: "cronus-arm-rest", pivot: [859, 204], side: "L" },
    raised: { file: "cronus-arm-raised", pivot: [1034, 1012], side: "L" },
    strike: { file: "cronus-arm-strike", pivot: [1192, 252], side: "L", fist: [567, 836] },
    sweep: { file: "cronus-arm-sweep", pivot: [52, 530], side: "R" },
  },
};

const scale = (p) => p.map((v) => Math.round(v * K * 10) / 10);

// The torso's shoulder stumps end in a glowing cut face. The arms sit behind the torso, so that face
// would show as a seam. Replace it with rock texture copied from further inside the stump.
async function healedTorso(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const px = (x, y) => (y * w + x) * 4;
  const heal = (x0, x1, y0, y1, srcDx) => {
    const glow = new Uint8Array(w * h);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = px(x, y);
      if (data[i + 3] > 40 && data[i] > 150 && data[i + 2] < 110) glow[y * w + x] = 1;
    }
    const R = 7; // dilate by 7 px so the soft glow around the face goes too
    const mask = new Uint8Array(w * h);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      if (data[px(x, y) + 3] <= 40) continue;
      let hit = false;
      for (let dy = -R; dy <= R && !hit; dy++) for (let dx = -R; dx <= R; dx++) {
        const yy = y + dy, xx = x + dx;
        if (yy >= 0 && yy < h && xx >= 0 && xx < w && glow[yy * w + xx]) { hit = true; break; }
      }
      if (hit) mask[y * w + x] = 1;
    }
    const copy = Buffer.from(data);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      if (!mask[y * w + x]) continue;
      const from = px(Math.min(w - 1, Math.max(0, x + srcDx)), y), to = px(x, y);
      for (let c = 0; c < 4; c++) data[to + c] = copy[from + c];
    }
  };
  heal(30, 130, 600, 830, 70);
  heal(1124, 1224, 600, 830, -70);
  return sharp(data, { raw: { width: w, height: h, channels: 4 } });
}

const files = new Set([rig.torso.file, rig.headRoar.file, ...Object.values(rig.arms).map((a) => a.file)]);

fs.mkdirSync(OUT, { recursive: true });
for (const name of files) {
  const input = path.join(SRC, `${name}.png`);
  const image = name === rig.torso.file ? await healedTorso(input) : sharp(input);
  await image.resize(SIZE, SIZE, { kernel: "lanczos3" }).webp({ quality: 92, alphaQuality: 100 }).toFile(path.join(OUT, `${name}.webp`));
}

// Arena art: the wide canyon backdrop and the floor that is masked to the board trapezoid.
const maps = { "map_bg_1.png": "cronus-arena-wide.webp", "map_bg_2.png": "cronus-arena-floor.webp" };
for (const [from, to] of Object.entries(maps)) {
  await sharp(path.join(SRC, from)).webp({ quality: 86 }).toFile(path.join(OUT, to));
}

const out = {
  size: SIZE,
  arena: { wide: maps["map_bg_1.png"], floor: maps["map_bg_2.png"] },
  torso: { file: `${rig.torso.file}.webp`, stumpL: scale(rig.torso.stumpL), stumpR: scale(rig.torso.stumpR), headTop: scale(rig.torso.headTop), armInset: Math.round(rig.torso.armInset * K * 10) / 10 },
  headRoar: { file: `${rig.headRoar.file}.webp`, top: scale(rig.headRoar.top), defaultScale: rig.headRoar.defaultScale },
  arms: Object.fromEntries(Object.entries(rig.arms).map(([key, a]) => [key, { file: `${a.file}.webp`, pivot: scale(a.pivot), side: a.side, ...(a.fist ? { fist: scale(a.fist) } : {}) }])),
};
fs.writeFileSync(path.join(OUT, "rig.json"), JSON.stringify(out, null, 2) + "\n");
console.log(`wrote ${files.size} layers and rig.json to ${OUT}`);
