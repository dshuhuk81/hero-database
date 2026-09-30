// PixelLab animation clips for one tower defense sprite (docs/td-asset-pipeline.md).
// Sends one PixMiniMax image-to-animation job per clip (POST /v2/animate-pixminimax), keeps
// at most 8 jobs running (Tier 1 limit), polls them and saves every frame as
// <out>/<clip>/NN.png (00 = the unchanged input frame). Loops (idle, walk, attack) and hurt send
// the still as last_frame too, so they end in the start pose; death runs open.
//
// Job ids are written to <out>/jobs.json as soon as they exist, so an interrupted run resumes
// without paying again: rerun the same command and finished clips are skipped, running jobs
// are polled. Delete a clip's folder (and its jobs.json entry) to make it again.
//
// Usage:
//   PIXELLAB_API_KEY=... node scripts/td-pixellab-clips.mjs --still public/td/enemies/sprites/brute-v3.webp \
//     --prompts prompts.json --out .td-work/pixellab/brute [--only walk,idle] [--dry-run]
// prompts.json: { "keep": "what must not change", "clips": { "walk": "motion ...", "idle": "...",
//   "attack": "...", "hurt": "...", "death": "..." }, "frames": { "walk": 8 } (optional) }
// The key: env PIXELLAB_API_KEY, else the local `pixellab` MCP config (claude mcp get pixellab).
import sharp from "sharp";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const arg = (name) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : null; };
const still = arg("still"), promptsFile = arg("prompts"), out = arg("out");
const only = arg("only")?.split(",");
const dryRun = process.argv.includes("--dry-run");
if (!still || !promptsFile || !out) {
  console.error("Usage: node scripts/td-pixellab-clips.mjs --still <png|webp> --prompts <json> --out <dir> [--only clips] [--dry-run]");
  process.exit(1);
}

const API = "https://api.pixellab.ai/v2";
const LOOPS = new Set(["idle", "walk", "attack", "hurt"]); // end pinned to the still
const FRAMES = { idle: 4, walk: 8, attack: 8, hurt: 4, death: 8 };
const END = " Stays in place, keeps its size and ground line, and ends in exactly the starting pose.";
const MAX_RUNNING = 8;

function apiKey() {
  if (process.env.PIXELLAB_API_KEY) return process.env.PIXELLAB_API_KEY;
  try {
    const text = execSync("claude mcp get pixellab", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    const match = text.match(/Bearer ([A-Za-z0-9-]+)/);
    if (match) return match[1];
  } catch {}
  throw new Error("No PixelLab key: set PIXELLAB_API_KEY");
}

async function call(path, body) {
  const res = await fetch(API + path, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return res.ok ? json : { error: res.status, detail: json.detail ?? json };
}

const prompts = JSON.parse(readFileSync(promptsFile, "utf8"));
const clips = Object.keys(prompts.clips).filter((clip) => !only || only.includes(clip));
const png = await sharp(still).ensureAlpha().png().toBuffer();
const meta = await sharp(png).metadata();
if (meta.width > 256 || meta.height > 256) throw new Error(`still is ${meta.width}x${meta.height}; PixelLab takes at most 256x256`);
const image = { type: "base64", base64: png.toString("base64") };

const body = (clip) => ({
  first_frame: image,
  ...(LOOPS.has(clip) ? { last_frame: image } : {}),
  description: `${prompts.clips[clip]}${prompts.keep ? ` ${prompts.keep}` : ""}${LOOPS.has(clip) ? END : ""}`,
  frame_count: prompts.frames?.[clip] ?? FRAMES[clip] ?? 8,
  no_background: true,
});

if (dryRun) {
  for (const clip of clips) { const { first_frame, last_frame, ...rest } = body(clip); console.log(clip, JSON.stringify({ ...rest, last_frame: Boolean(last_frame) })); }
  process.exit(0);
}

const KEY = apiKey();
mkdirSync(out, { recursive: true });
const jobsFile = join(out, "jobs.json");
const jobs = existsSync(jobsFile) ? JSON.parse(readFileSync(jobsFile, "utf8")) : {};
const saveJobs = () => writeFileSync(jobsFile, JSON.stringify(jobs, null, 2));
const done = (clip) => existsSync(join(out, clip)) && readdirSync(join(out, clip)).some((f) => f.endsWith(".png"));

let used = 0;
const pending = clips.filter((clip) => !done(clip));
console.log(`${pending.length} clip(s) to make: ${pending.join(", ") || "none"}`);
while (pending.some((clip) => !done(clip))) {
  // Poll running jobs.
  for (const clip of pending.filter((c) => jobs[c] && !done(c))) {
    const job = await call(`/background-jobs/${jobs[clip]}`);
    if (job.status === "completed") {
      mkdirSync(join(out, clip), { recursive: true });
      for (const [i, frame] of job.last_response.images.entries()) {
        await sharp(Buffer.from(frame.base64, "base64")).png().toFile(join(out, clip, `${String(i).padStart(2, "0")}.png`));
      }
      used += job.usage?.generations ?? 0;
      console.log(`done ${clip}: ${job.last_response.images.length} frames`);
    } else if (job.status && !["processing", "pending", "queued"].includes(job.status)) {
      console.log(`FAILED ${clip}: ${job.status}; removing its job id so a rerun submits it again`);
      delete jobs[clip]; saveJobs();
      pending.splice(pending.indexOf(clip), 1);
    }
  }
  // Submit what fits under the concurrency limit.
  const running = pending.filter((c) => jobs[c] && !done(c)).length;
  for (const clip of pending.filter((c) => !jobs[c]).slice(0, Math.max(0, MAX_RUNNING - running))) {
    const res = await call("/animate-pixminimax", body(clip));
    if (!res.background_job_id) { console.log(`waiting to submit ${clip}: ${JSON.stringify(res.detail ?? res).slice(0, 120)}`); break; }
    jobs[clip] = res.background_job_id; saveJobs();
    console.log(`submitted ${clip}`);
  }
  if (pending.some((clip) => !done(clip))) await new Promise((r) => setTimeout(r, 8000));
}
console.log(`all clips saved in ${out} (${used.toFixed(2)} generations this run)`);
