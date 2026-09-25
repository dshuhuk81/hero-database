// Hero sound levels (M3): measures every hero voice/attack/ultimate in public/td/sfx with
// ffmpeg and writes a per-file gain (dB) to src/data/tdAudioLevels.json, so each category
// plays at one loudness target. Boosts are capped so the peak stays under PEAK_CEILING.
// Loudness is EBU R128 integrated (LUFS); files too short for it fall back to RMS.
// Run with: node scripts/td-audio-levels.mjs   (needs ffmpeg on PATH)
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sfxDir = path.join(root, "public/td/sfx");
const outPath = path.join(root, "src/data/tdAudioLevels.json");
// Attacks repeat constantly, so they sit below voices and ultimates.
const TARGET = { voice: -17, attack: -20, ultimate: -17 };
const PEAK_CEILING = -1;

function measure(file) {
  // ffmpeg reports on stderr; the last "I:" line is the summary's integrated loudness.
  const { stderr: log } = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "volumedetect,ebur128", "-f", "null", "-"], { encoding: "utf8" });
  const lufs = [...log.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].at(-1)?.[1];
  const num = (re) => Number(log.match(re)?.[1]);
  return { lufs: Number(lufs), mean: num(/mean_volume: (-?[\d.]+) dB/), peak: num(/max_volume: (-?[\d.]+) dB/) };
}

const levels = {};
for (const name of fs.readdirSync(sfxDir).sort()) {
  const match = name.match(/^(.+)_(voice|attack|ultimate)\.ogg$/);
  if (!match) continue;
  const { lufs, mean, peak } = measure(path.join(sfxDir, name));
  const loudness = Number.isFinite(lufs) && lufs > -60 ? lufs : mean;
  const gain = Math.min(TARGET[match[2]] - loudness, PEAK_CEILING - peak);
  levels[name.replace(/\.ogg$/, "")] = Math.round(gain * 10) / 10;
}
fs.writeFileSync(outPath, `${JSON.stringify(levels, null, 2)}\n`);
console.log(`Hero sound levels: ${Object.keys(levels).length} files -> ${path.relative(root, outPath)}`);
