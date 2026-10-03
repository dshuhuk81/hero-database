// `npm run build` entry point. Astro 7 needs Node >= 22.12. Local machines and the Cloudflare
// production build already have it and run `astro build` directly. A Cloudflare preview build
// that still comes up on an older Node (e.g. 20.x from a stale environment setting) re-runs the
// same build under Node 24 via `npx node@24`, so branch previews work without dashboard changes.
//   node scripts/build-with-supported-node.mjs [--dry-run]
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const astroBin = fileURLToPath(new URL("../node_modules/astro/bin/astro.mjs", import.meta.url));
const [major, minor] = process.versions.node.split(".").map(Number);
const supported = major > 22 || (major === 22 && minor >= 12);
const command = supported
  ? [process.execPath, [astroBin, "build"]]
  : [process.platform === "win32" ? "npx.cmd" : "npx", ["--yes", "node@24", astroBin, "build"]];

if (process.argv.includes("--dry-run")) {
  console.log(`Node ${process.versions.node} (${supported ? "supported" : "too old"}): ${command[0]} ${command[1].join(" ")}`);
  process.exit(0);
}
if (!supported) console.log(`Node ${process.versions.node} is too old for Astro 7 (needs >= 22.12); building with node@24 through npx.`);
const result = spawnSync(command[0], command[1], { stdio: "inherit" });
process.exit(result.status ?? 1);
