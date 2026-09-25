// Renders each tower defense hero's in-game Spine idle loop into a horizontal
// sprite sheet: public/td/anims/{id}-idle-v1.webp (FRAMES frames of SIZE px), plus
// the loop durations in src/data/tdHeroAnims.json.
//
// 1. Extract the game data first (needs ~/android, UnityPy):
//    python3 scripts/td-spine/extract_spine_bundle.py <bundle> .cache/td-spine/<id>
//    (bundle names per hero in heroes.json; see the extractor for the format)
// 2. PW=<folder containing node_modules/playwright> node scripts/td-spine/render-sheets.cjs [--only zeus,nuwa]
// 3. node scripts/upload-to-r2.mjs --prefix td/anims
const http = require("http");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { chromium } = require(process.env.PW ? path.join(process.env.PW, "playwright") : "playwright");

const ROOT = path.join(__dirname, "../..");
const FRAMES = 24;
const SIZE = 160;
const VERSION = "v1"; // matches ANIM_VERSION in recruit.ts; bump both for changed output
const OUT_DIR = path.join(ROOT, "public/td/anims");
const heroes = JSON.parse(fs.readFileSync(path.join(__dirname, "heroes.json"), "utf8"));
const onlyArg = process.argv.indexOf("--only");
const only = onlyArg > 0 ? process.argv[onlyArg + 1].split(",") : null;

// Tiny static server for the page and the extracted files.
const TYPES = { ".html": "text/html", ".png": "image/png", ".atlas": "text/plain", ".json": "application/json", ".skel": "application/octet-stream" };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split("?")[0]));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  // Loop durations for the page (src/data/tdHeroAnims.json), merged so --only keeps the rest.
  const manifestPath = path.join(ROOT, "src/data/tdHeroAnims.json");
  const manifest = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, "utf8")) : {};
  for (const id of Object.keys(heroes)) {
    if (only && !only.includes(id)) continue;
    const dir = `.cache/td-spine/${id}`;
    const files = fs.existsSync(path.join(ROOT, dir)) ? fs.readdirSync(path.join(ROOT, dir)) : [];
    const skel = files.find((f) => f.endsWith(".skel") || f.endsWith(".json"));
    const atlas = files.find((f) => f.endsWith(".atlas"));
    if (!skel || !atlas) { console.log(`skip ${id}: not extracted`); continue; }
    const page = await browser.newPage({ viewport: { width: 512, height: 512 } });
    await page.goto(`http://localhost:${port}/scripts/td-spine/render.html?dir=/${dir}&skel=${skel}&atlas=${atlas}`);
    await page.waitForFunction(() => window.anim || window.failed, null, { timeout: 30000 });
    const failed = await page.evaluate(() => window.failed);
    if (failed) { console.log(`fail ${id}: ${failed}`); await page.close(); continue; }
    const anim = await page.evaluate(() => window.anim);
    const raw = [];
    for (let i = 0; i < FRAMES; i += 1) {
      const url = await page.evaluate((t) => window.renderFrame(t), (anim.duration * i) / FRAMES);
      raw.push(Buffer.from(url.split(",")[1], "base64"));
    }
    await page.close();
    // One crop for all frames (union of the visible pixels, squared) so the hero
    // fills the frame without jittering between frames.
    let box = null;
    for (const png of raw) {
      const { data, info } = await sharp(png).ensureAlpha().extractChannel("alpha").raw().toBuffer({ resolveWithObject: true });
      for (let y = 0; y < info.height; y += 1) for (let x = 0; x < info.width; x += 1) {
        if (data[y * info.width + x] < 24) continue;
        box = box ? { l: Math.min(box.l, x), t: Math.min(box.t, y), r: Math.max(box.r, x), b: Math.max(box.b, y) } : { l: x, t: y, r: x, b: y };
      }
    }
    const side = Math.max(box.r - box.l, box.b - box.t) + 8;
    const cx = (box.l + box.r) / 2, cy = (box.t + box.b) / 2;
    const crop = { left: Math.round(cx - side / 2), top: Math.round(cy - side / 2), width: side, height: side };
    const frames = [];
    for (const png of raw) {
      const pad = 256; // room for crops that pass the canvas edge
      const padded = await sharp(png).extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
      frames.push(await sharp(padded).extract({ ...crop, left: crop.left + pad, top: crop.top + pad }).resize(SIZE, SIZE).png().toBuffer());
    }
    const out = path.join(OUT_DIR, `${id}-idle-${VERSION}.webp`);
    await sharp({ create: { width: SIZE * FRAMES, height: SIZE, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite(frames.map((input, i) => ({ input, left: i * SIZE, top: 0 })))
      .webp({ quality: 80, alphaQuality: 85 })
      .toFile(out);
    manifest[id] = { frames: FRAMES, duration: Math.round(anim.duration * 100) / 100 };
    console.log(`built ${id} (${anim.name}, ${anim.duration.toFixed(2)}s)`);
  }
  await browser.close();
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  server.close();
})();
