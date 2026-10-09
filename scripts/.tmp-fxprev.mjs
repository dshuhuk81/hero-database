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
const out = '/private/tmp/claude-502/-Users-daschultheiss-hero-database/b91ce1de-aa42-4bd4-a609-03d48b3a1e2e/scratchpad/fxprev';
const clips = [
  { id: 'barrior1', source: '00_Version16/Barrior01.efkefc', author: 'Effekseer', view: 10, targetY: 2, start: 0, frames: 60, ticks: 2, width: 120 },
  { id: 'barrior2', source: '00_Version16/Barrior02.efkefc', author: 'Effekseer', view: 10, targetY: 2, start: 0, frames: 60, ticks: 2, width: 120 },
  { id: 'barrior3', source: '00_Version16/Barrior03.efkefc', author: 'Effekseer', view: 10, targetY: 2, start: 0, frames: 60, ticks: 2, width: 120 },
  { id: 'shield', source: '01_NextSoft01/MagicShield.efk', author: 'NextSoft', view: 8, targetY: 2, start: 0, frames: 60, width: 120 },
  { id: 'snowstorm', source: '01_Suzuki01/003_snowstorm_effect/snowstorm11.efk', author: 'Suzuki', view: 30, targetY: 4, start: 0, frames: 90, width: 150 },
  { id: 'cold', source: '01_NextSoft01/MagicCold.efk', author: 'NextSoft', view: 14, targetY: 4, start: 0, frames: 70, width: 150 },
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
