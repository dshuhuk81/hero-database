import assert from "node:assert/strict";
import fs from "node:fs";
import { registerHero } from "./add-hero-audio.js";

const source = fs.readFileSync("src/game/td/audio.ts", "utf8");

// New hero lands inside HERO_SOUNDS, block stays well-formed.
{
  const updated = registerHero(source, "testhero");
  const block = updated.match(/const HERO_SOUNDS[^=]*= \{\n([\s\S]*?)\n\};\n/);
  assert.ok(block, "block still closes with its own line");
  assert.match(block[1], /\n  testhero: \{ voice: "testhero_voice", attack: "testhero_attack", ultimate: "testhero_ultimate" \},$/, "entry appended last");
  assert.equal(updated.length - source.length, block[1].split("\n").at(-1).length + 1, "only the entry was added");
}

// Existing hero is not duplicated; ids that only match other keys are still added.
{
  assert.equal(registerHero(source, "zeus"), null, "zeus already registered");
  assert.ok(registerHero(source, "hit"), "SOUNDS key 'hit' is not a HERO_SOUNDS entry");
}

console.log("Hero audio script checks passed.");
