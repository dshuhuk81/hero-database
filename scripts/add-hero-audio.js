#!/usr/bin/env node
// Adds a hero's tower defense sounds: converts src/game/media/<id>_{voice,attack,ultimate}.wav
// to public/td/sfx/*.ogg, registers the hero in HERO_SOUNDS (src/game/td/audio.ts) and
// uploads the three files to R2 (the game loads td/ assets from R2, also in dev via /r2).
//
//   npm run td:hero-audio -- <hero-id> [--no-upload]
//   FFMPEG=/path/to/ffmpeg npm run td:hero-audio -- <hero-id>
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const MEDIA_DIR = "src/game/media";
const SFX_DIR = "public/td/sfx";
const AUDIO_TS = "src/game/td/audio.ts";
const ROSTER = "src/data/gameBalance.json";
const TYPES = ["voice", "attack", "ultimate"];

// Inserts the hero into the HERO_SOUNDS block. Returns the new source, or null when
// the hero is already registered.
export function registerHero(source, heroId) {
  const block = source.match(/const HERO_SOUNDS[^=]*= \{\n([\s\S]*?)\n\};/);
  if (!block) throw new Error("HERO_SOUNDS block not found in audio.ts");
  if (new RegExp(`^\\s+${heroId}:\\s*\\{`, "m").test(block[1])) return null;
  const entry = `  ${heroId}: { voice: "${heroId}_voice", attack: "${heroId}_attack", ultimate: "${heroId}_ultimate" },`;
  const updated = block[0].replace(/\n\};$/, `\n${entry}\n};`);
  return source.replace(block[0], updated);
}

function findFfmpeg() {
  for (const candidate of [process.env.FFMPEG, "ffmpeg", "/tmp/ffmpeg-bin/ffmpeg"].filter(Boolean)) {
    try {
      execFileSync(candidate, ["-version"], { stdio: "ignore" });
      return candidate;
    } catch {}
  }
  return null;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function main() {
  const args = process.argv.slice(2);
  const heroId = args.find((arg) => !arg.startsWith("--"));
  const upload = !args.includes("--no-upload");
  if (!heroId) fail("Usage: npm run td:hero-audio -- <hero-id> [--no-upload]\nExample: npm run td:hero-audio -- anubis");
  if (!/^[a-z0-9_]+$/.test(heroId)) fail(`Invalid hero id "${heroId}": use lowercase letters, digits and _.`);

  const roster = JSON.parse(fs.readFileSync(ROSTER, "utf8"));
  if (!roster.some((hero) => hero.id === heroId)) {
    console.warn(`WARNING: ${heroId} is not in ${ROSTER}. The sounds are added, but only play once the hero is in the tower defense roster.`);
  }

  const missing = TYPES.map((type) => path.join(MEDIA_DIR, `${heroId}_${type}.wav`)).filter((file) => !fs.existsSync(file));
  if (missing.length) fail(`Missing audio files:\n${missing.map((file) => `  ${file}`).join("\n")}`);

  const ffmpeg = findFfmpeg();
  if (!ffmpeg) fail("ffmpeg not found. Install it (brew install ffmpeg) or set FFMPEG=/path/to/ffmpeg.");

  console.log(`Converting WAV to OGG for ${heroId}...`);
  fs.mkdirSync(SFX_DIR, { recursive: true });
  for (const type of TYPES) {
    const wav = path.join(MEDIA_DIR, `${heroId}_${type}.wav`);
    const ogg = path.join(SFX_DIR, `${heroId}_${type}.ogg`);
    try {
      execFileSync(ffmpeg, ["-y", "-i", wav, "-q:a", "6", ogg], { stdio: "pipe" });
      console.log(`  OK  ${ogg}`);
    } catch (error) {
      fail(`  ERR ${wav}: ${error.stderr?.toString().split("\n").filter(Boolean).at(-1) ?? error.message}`);
    }
  }

  const source = fs.readFileSync(AUDIO_TS, "utf8");
  const updated = registerHero(source, heroId);
  if (updated) {
    fs.writeFileSync(AUDIO_TS, updated);
    console.log(`  OK  added ${heroId} to HERO_SOUNDS in ${AUDIO_TS}`);
  } else {
    console.log(`  --  ${heroId} already in HERO_SOUNDS`);
  }

  if (upload) {
    // --force: re-recorded sounds replace the old files (browsers may cache old copies for a while).
    console.log("Uploading to R2...");
    execFileSync("node", ["scripts/upload-to-r2.mjs", "--prefix", `td/sfx/${heroId}_`, "--force"], { stdio: "inherit" });
  } else {
    console.log(`Skipped upload. Later: npm run upload-assets -- --prefix td/sfx/${heroId}_`);
  }
  console.log(`\nDone: ${heroId} audio ready.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
