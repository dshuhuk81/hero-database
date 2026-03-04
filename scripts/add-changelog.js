#!/usr/bin/env node

/**
 * Interactive CLI to add a new changelog entry.
 * Usage: npm run changelog:add
 *
 * Prompts for version, title, and changes (feature/improvement/fix).
 * Prepends the new entry to src/data/changelog.json.
 */

import { createInterface } from "readline";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHANGELOG_PATH = resolve(__dirname, "../src/data/changelog.json");

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((res) => rl.question(q, res));

const TYPES = ["feature", "improvement", "fix"];
const TYPE_LABELS = { feature: "Feature (+)", improvement: "Improvement (↑)", fix: "Fix (×)" };

async function main() {
  console.log("\n📝  Add Changelog Entry\n");

  // Read existing
  const existing = JSON.parse(readFileSync(CHANGELOG_PATH, "utf-8"));
  const lastVersion = existing[0]?.version || "0.0.0";
  console.log(`   Last version: ${lastVersion}\n`);

  // Version
  const version = (await ask(`Version [${bumpPatch(lastVersion)}]: `)).trim() || bumpPatch(lastVersion);

  // Title
  const title = (await ask("Title: ")).trim();
  if (!title) {
    console.log("❌ Title is required.");
    rl.close();
    process.exit(1);
  }

  // Date
  const today = new Date().toISOString().slice(0, 10);
  const date = (await ask(`Date [${today}]: `)).trim() || today;

  // Changes
  console.log("\nAdd changes (empty line to finish):");
  console.log("  Type a number to pick type, then enter text.");
  console.log("  1 = Feature  |  2 = Improvement  |  3 = Fix\n");

  const changes = [];
  while (true) {
    const typeInput = (await ask("Type (1/2/3) or ENTER to finish: ")).trim();
    if (!typeInput) break;

    const typeIndex = parseInt(typeInput, 10) - 1;
    if (typeIndex < 0 || typeIndex > 2) {
      console.log("  → Pick 1, 2, or 3.");
      continue;
    }
    const type = TYPES[typeIndex];

    const text = (await ask(`  ${TYPE_LABELS[type]} text: `)).trim();
    if (!text) {
      console.log("  → Skipped (empty text).");
      continue;
    }
    changes.push({ type, text });
    console.log(`  ✓ Added ${type}`);
  }

  if (!changes.length) {
    console.log("❌ At least one change is required.");
    rl.close();
    process.exit(1);
  }

  // Build entry & prepend
  const entry = { date, version, title, changes };
  existing.unshift(entry);

  writeFileSync(CHANGELOG_PATH, JSON.stringify(existing, null, 2) + "\n", "utf-8");

  console.log(`\n✅ Added v${version} — "${title}" (${changes.length} change(s))`);
  console.log(`   Saved to src/data/changelog.json\n`);

  rl.close();
}

function bumpPatch(v) {
  const parts = v.split(".").map(Number);
  parts[2] = (parts[2] || 0) + 1;
  return parts.join(".");
}

main().catch((err) => {
  console.error(err);
  rl.close();
  process.exit(1);
});
