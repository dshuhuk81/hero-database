// Checks every literal R2 asset path referenced under src/ against the public bucket.
//   node scripts/check-r2-refs.mjs
// Exits 1 when any path answers 404. See docs/r2-missing-assets.md for the known gaps.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { extractR2Paths } from "./lib/r2-refs.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const R2_BASE = "https://pub-e35e94828bf347ca93c3d2c6a50d06f6.r2.dev";
const SOURCE_EXT = /\.(astro|ts|js|mjs|json|css)$/;
const CONCURRENCY = 16;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (SOURCE_EXT.test(name)) yield path;
  }
}

const refs = new Set();
for (const file of walk(join(ROOT, "src"))) {
  for (const path of extractR2Paths(readFileSync(file, "utf-8"), R2_BASE)) refs.add(path);
}

const queue = [...refs].sort();
const missing = [];
async function worker() {
  while (queue.length) {
    const path = queue.shift();
    const res = await fetch(`${R2_BASE}/${path.split("/").map(encodeURIComponent).join("/")}`, { method: "HEAD" });
    if (res.status === 404) missing.push(path);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

missing.sort();
console.log(`${refs.size} referenced paths, ${missing.length} missing`);
for (const path of missing) console.log(`  404 ${path}`);
process.exit(missing.length ? 1 : 0);
