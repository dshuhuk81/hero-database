// Offline export only: no Effekseer runtime is shipped with the game.
// See docs/td-fx-lab.md for the pinned downloads and CLI preparation.
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { createRequire } from 'node:module';
import sharp from 'sharp';

const arg = name => process.argv[process.argv.indexOf(`--${name}`) + 1];
if (!['samples', 'runtime', 'playwright'].every(name => process.argv.includes(`--${name}`))) {
  throw new Error('Usage: node scripts/export-td-effekseer.mjs --samples PATH --runtime PATH --playwright PATH_TO_PACKAGE [--only id,id]');
}
const samples = resolve(arg('samples'));
const runtime = resolve(arg('runtime'));
const { chromium } = createRequire(import.meta.url)(resolve(arg('playwright')));
const out = resolve('public/td/fx/effekseer-v1');
const clips = [
  { id: 'lightning', source: '01_Pierre01/LightningStrike.efk', author: 'Pierre', view: 140, targetY: 15, start: 0, frames: 60, width: 245 },
  { id: 'fire', source: '01_NextSoft01/MagicFire1.efk', author: 'NextSoft', view: 10, targetY: 3, start: 0, frames: 60, width: 132 },
  { id: 'buff', source: '01_NextSoft01/PowerUp.efk', author: 'NextSoft', view: 6, targetY: 1, start: 0, frames: 90, width: 132 },
  // Element families for the rest of the roster (October 8, 2026). `hue` rotates the baked
  // colours (sharp modulate) when a sample's shape fits but its palette does not.
  { id: 'ice', source: '01_NextSoft01/MagicCold.efk', author: 'NextSoft', view: 14, targetY: 4, start: 0, frames: 70, width: 150 },
  { id: 'water', source: '01_NextSoft01/MagicWater.efk', author: 'NextSoft', view: 10, targetY: 1, start: 0, frames: 75, width: 150 },
  { id: 'heal', source: '01_NextSoft01/MagicHeal2.efk', author: 'NextSoft', view: 17, targetY: 4.5, start: 0, frames: 100, width: 160 },
  { id: 'holy', source: '01_Pierre02/Benediction.efk', author: 'Pierre', view: 44, targetY: 3, start: 0, frames: 75, width: 130 },
  { id: 'shadow', source: '01_NextSoft01/MagicDark.efk', author: 'NextSoft', view: 6.5, targetY: 1.6, start: 0, frames: 60, width: 110 },
  { id: 'feather', source: '01_Pierre02/FeatherBomb.efk', author: 'Pierre', view: 26, targetY: 3, start: 0, frames: 75, width: 150 },
  { id: 'cosmic', source: '01_Pierre02/CosmicMist.efk', author: 'Pierre', view: 46, targetY: 3, start: 0, frames: 90, width: 130 },
  { id: 'wind', source: '01_NextSoft01/MagicTornade.efk', author: 'NextSoft', view: 13, targetY: 5.2, start: 0, frames: 90, width: 110 },
  { id: 'shockwave', source: '01_Pierre01/SonicBoom.efk', author: 'Pierre', view: 34, targetY: 3, start: 0, frames: 50, width: 120 },
  { id: 'venom', source: '01_Pierre02/BloodLance.efk', author: 'Pierre', view: 34, targetY: 3, start: 60, frames: 80, width: 130, hue: 110 },
  { id: 'stone', source: '01_Pierre01/HolySandstorm.efk', author: 'Pierre', view: 80, targetY: 12, start: 90, frames: 75, width: 140 },
  // Support auras (looped by overlapping instances), bosses and the Cronus god strike.
  // `ticks` = 60 Hz Effekseer updates per atlas frame (fps = 60 / ticks).
  { id: 'aura', source: '00_Version16/Aura01.efkefc', author: 'Effekseer', view: 8, targetY: 2.5, start: 0, frames: 80, ticks: 3, width: 120 },
  { id: 'aura-gold', source: '00_Version16/Aura01.efkefc', author: 'Effekseer', view: 8, targetY: 2.5, start: 0, frames: 80, ticks: 3, width: 120, hue: -70 },
  { id: 'aura-rose', source: '00_Version16/Aura01.efkefc', author: 'Effekseer', view: 8, targetY: 2.5, start: 0, frames: 80, ticks: 3, width: 120, hue: 210 },
  { id: 'boss-rise', source: '00_Version16/Barrior02.efkefc', author: 'Effekseer', view: 10, targetY: 2, start: 0, frames: 30, ticks: 4, width: 150 },
  { id: 'boss-death', source: '01_AndrewFM01/boss_death.efk', author: 'AndrewFM', view: 60, targetY: 2, start: 100, frames: 90, width: 220 },
  { id: 'blast', source: '01_Pierre02/FireBall.efk', author: 'Pierre', view: 50, targetY: 5, start: 160, frames: 45, width: 150 },
  // Frost (October 9, 2026): Ymir's ultimate and the Freeze status. ToonHit shifted to ice blue is
  // a shattering burst; Barrior02 shifted to ice blue is a cracked ice dome that encases a frozen enemy.
  { id: 'frost-burst', source: '02_Tktk03/ToonHit.efkefc', author: 'Tktk', view: 14, targetY: 1, start: 0, frames: 30, width: 170, hue: 180 },
  { id: 'frost-shell', source: '00_Version16/Barrior02.efkefc', author: 'Effekseer', view: 10, targetY: 2, start: 8, frames: 60, width: 90, hue: 185 },
  // Persistent world portals: bake the flowing Aura01 from overhead. Pixi projects this ground
  // plane with the board; using the combat camera here would flatten the circle twice.
  { id: 'portal-red', source: '00_Version16/Aura01.efkefc', author: 'Effekseer', view: 8, targetY: 0,
    eye: [0, 40, 0.01], start: 35, frames: 60, width: 96, size: 256, hue: -115 },
  { id: 'portal-blue', source: '00_Version16/Aura01.efkefc', author: 'Effekseer', view: 8, targetY: 0,
    eye: [0, 40, 0.01], start: 35, frames: 60, width: 96, size: 256, hue: 90 },
].map(clip => ({ size: 192, columns: 8, ticks: 2, ...clip, fps: 60 / (clip.ticks ?? 2) }));
// --only id,id re-exports some clips and keeps the other manifest entries unchanged.
const only = process.argv.includes('--only') ? arg('only').split(',') : null;

const html = `<!doctype html><canvas id="capture"></canvas>
<script src="/runtime/effekseer.js"></script><script src="/runtime/Sample/three.min.js"></script>
<script>
window.ready = new Promise((resolve, reject) => effekseer.initRuntime('/runtime/effekseer.wasm', resolve, reject));
window.record = async function(clip) {
  await ready;
  const canvas = document.getElementById('capture');
  canvas.width = canvas.height = clip.size;
  const gl = canvas.getContext('webgl2', { alpha: false, preserveDrawingBuffer: true, antialias: false });
  if (!gl) throw new Error('WebGL2 unavailable');
  const context = effekseer.createContext();
  context.init(gl);
  let effect;
  try {
    effect = await new Promise((resolve, reject) => {
      const loaded = context.loadEffect('/sample/' + clip.source, 1, () => resolve(loaded), (message, url) => reject(new Error(message + ' ' + url)));
    });
    const camera = new THREE.OrthographicCamera(-clip.view / 2, clip.view / 2, clip.view / 2, -clip.view / 2, 0.1, 1000);
    camera.position.set(...(clip.eye ?? [0, clip.targetY + 20, 40]));
    camera.lookAt(new THREE.Vector3(0, clip.targetY, 0));
    camera.updateMatrixWorld();
    context.setProjectionMatrix(camera.projectionMatrix.elements);
    context.setCameraMatrix(camera.matrixWorldInverse.elements);
    const handle = context.play(effect, 0, 0, 0);
    handle.setRandomSeed(42);
    for (let i = 0; i < clip.start; i++) context.update(1);
    const layers = [0, 1].map(() => {
      const sheet = document.createElement('canvas');
      sheet.width = clip.columns * clip.size;
      sheet.height = Math.ceil(clip.frames / clip.columns) * clip.size;
      return sheet;
    });
    const contexts = layers.map(layer => layer.getContext('2d'));
    const black = new Uint8Array(clip.size * clip.size * 4);
    const gray = new Uint8Array(black.length);
    const draw = (background, buffer) => {
      gl.viewport(0, 0, clip.size, clip.size);
      gl.clearColor(background, background, background, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      context.draw();
      gl.readPixels(0, 0, clip.size, clip.size, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
    };
    for (let frame = 0; frame < clip.frames; frame++) {
      for (let tick = 0; tick < clip.ticks; tick++) context.update(1); // Effekseer: 60 Hz; 2 ticks = 30 fps
      draw(0, black); draw(64 / 255, gray);
      const normal = contexts[0].createImageData(clip.size, clip.size);
      const add = contexts[1].createImageData(clip.size, clip.size);
      for (let y = 0; y < clip.size; y++) for (let x = 0; x < clip.size; x++) {
        const from = ((clip.size - 1 - y) * clip.size + x) * 4, to = (y * clip.size + x) * 4;
        // Two-background approximation of transmission + emission in an LDR capture.
        // This preserves dark smoke; it does not preserve HDR or scene distortion.
        const transmission = [0, 1, 2].filter(c => gray[from + c] < 254).map(c => (gray[from + c] - black[from + c]) / 64);
        const alpha = transmission.length ? Math.max(0, Math.min(1, 1 - transmission.reduce((a, b) => a + b, 0) / transmission.length)) : 0;
        const emission = [0, 1, 2].map(c => Math.max(0, black[from + c] - alpha * 255));
        const addAlpha = Math.max(...emission) / 255;
        for (let c = 0; c < 3; c++) {
          normal.data[to + c] = alpha > 0 ? Math.min(black[from + c], alpha * 255) / alpha : 0;
          add.data[to + c] = addAlpha > 0 ? emission[c] / addAlpha : 0;
        }
        normal.data[to + 3] = alpha * 255;
        add.data[to + 3] = addAlpha * 255;
      }
      const x = frame % clip.columns * clip.size, y = Math.floor(frame / clip.columns) * clip.size;
      contexts[0].putImageData(normal, x, y); contexts[1].putImageData(add, x, y);
    }
    const origin = new THREE.Vector3(0, 0, 0).project(camera);
    return { images: layers.map(layer => layer.toDataURL('image/png')), anchor: [(origin.x + 1) / 2, (1 - origin.y) / 2] };
  } finally {
    if (effect) context.releaseEffect(effect);
    effekseer.releaseContext(context);
  }
};
</script>`;
const server = createServer(async (req, res) => {
  try {
    if (req.url === '/') { res.setHeader('Content-Type', 'text/html'); res.end(html); return; }
    const url = new URL(req.url, 'http://localhost');
    const root = url.pathname.startsWith('/runtime/') ? runtime : samples;
    const file = resolve(root, decodeURIComponent(url.pathname.replace(/^\/(runtime|sample)\//, '')));
    if (!file.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
    const types = { '.wasm': 'application/wasm', '.js': 'text/javascript', '.png': 'image/png' };
    res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream');
    res.end(await readFile(file));
  } catch (error) { res.writeHead(404); res.end(String(error)); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
let browser;
try {
  browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  page.on('response', response => { if (!response.ok()) failures.push(`${response.status()} ${response.url()}`); });
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await mkdir(out, { recursive: true });
  for (const clip of clips.filter(clip => !only || only.includes(clip.id))) {
    const result = await page.evaluate(clip => window.record(clip), clip);
    if (failures.length) throw new Error(failures.join('\n'));
    clip.anchor = result.anchor;
    for (const [i, layer] of ['normal', 'add'].entries()) {
      await sharp(Buffer.from(result.images[i].split(',')[1], 'base64')).modulate({ hue: clip.hue ?? 0 }).webp({ quality: 92, alphaQuality: 100 }).toFile(resolve(out, `${clip.id}-${layer}.webp`));
    }
    console.log(`Exported ${clip.id}: ${clip.frames} frames at ${clip.fps} fps`);
  }
  const previous = only ? JSON.parse(await readFile(resolve(out, 'manifest.json'), 'utf8')).clips : [];
  const written = clips.map(clip => only && !only.includes(clip.id) ? previous.find(entry => entry.id === clip.id) : clip).filter(Boolean);
  await writeFile(resolve(out, 'manifest.json'), JSON.stringify({ version: 1, tool: 'Effekseer 1.80.7', seed: 42, clips: written }, null, 2) + '\n');
} finally {
  await browser?.close();
  server.close();
}
