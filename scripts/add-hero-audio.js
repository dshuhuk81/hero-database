#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const heroId = process.argv[2];
if (!heroId) {
  console.error("Usage: node scripts/add-hero-audio.js <hero-id>");
  console.error("Example: node scripts/add-hero-audio.js ares");
  process.exit(1);
}

const mediaDir = "src/game/media";
const sfxDir = "public/td/sfx";
const audioFiles = ["voice", "attack", "ultimate"];

// Check if WAV files exist
const missingFiles = [];
for (const type of audioFiles) {
  const file = path.join(mediaDir, `${heroId}_${type}.wav`);
  if (!fs.existsSync(file)) {
    missingFiles.push(file);
  }
}

if (missingFiles.length) {
  console.error("Missing audio files:");
  missingFiles.forEach((f) => console.error(`   ${f}`));
  process.exit(1);
}

console.log(`Found audio files for ${heroId}`);

// Convert WAV to OGG
console.log("Converting WAV -> OGG...");
for (const type of audioFiles) {
  const wavFile = path.join(mediaDir, `${heroId}_${type}.wav`);
  const oggFile = path.join(sfxDir, `${heroId}_${type}.ogg`);
  try {
    execSync(`ffmpeg -y -i "${wavFile}" -q:a 6 "${oggFile}"`, {
      stdio: "pipe",
    });
    console.log(`  ✓ ${heroId}_${type}.ogg`);
  } catch (err) {
    console.error(`  ✗ Failed to convert ${heroId}_${type}.wav`);
    process.exit(1);
  }
}

// Update audio.ts
console.log("Updating audio.ts...");
const audioPath = "src/game/td/audio.ts";
let audioContent = fs.readFileSync(audioPath, "utf8");

const heroEntry = `  ${heroId}: { voice: "${heroId}_voice", attack: "${heroId}_attack", ultimate: "${heroId}_ultimate" },`;

// Check if already exists
if (audioContent.includes(`${heroId}:`)) {
  console.log(`  ${heroId} already in HERO_SOUNDS`);
} else {
  // Insert before closing brace of HERO_SOUNDS
  audioContent = audioContent.replace(
    /(\n};)\s*(const MIN_GAP_MS)/,
    `\n  ${heroId}: { voice: "${heroId}_voice", attack: "${heroId}_attack", ultimate: "${heroId}_ultimate" },\n};$2`
  );
  fs.writeFileSync(audioPath, audioContent);
  console.log(`  ✓ Added ${heroId} to HERO_SOUNDS`);
}

console.log(`\nDone! ${heroId} audio ready. Run: npm run dev`);
