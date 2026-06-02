/**
 * Regression tests for the synergy-tag detection engine.
 * Locks rule coverage, stemming fixes, false-positive guards, scope gating,
 * and suppressors so future rule edits cannot silently regress.
 *
 * Run: node scripts/test-tag-rules.mjs   (or: npm run validate:tag-rules)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadRules, detectForHero } from "./suggest-synergy-tags.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const rules = loadRules();

const matches = (tag, txt) => rules[tag].patterns.some((re) => re.test(txt));

// Build a minimal hero out of raw sentences for scope/suppressor tests.
function fakeHero(name, sentences) {
  return { id: name.toLowerCase(), name, skills: [{ description: sentences.join(" ") }] };
}

test("rule/tag coverage is 1:1 with tags.json", () => {
  const tags = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/tags.json"), "utf8"));
  const ruleNames = Object.keys(rules);
  assert.deepEqual(
    tags.filter((t) => !ruleNames.includes(t)),
    [],
    "tags without a rule"
  );
  assert.deepEqual(
    ruleNames.filter((r) => !tags.includes(r)),
    [],
    "orphan rules with no tag"
  );
});

test("CC stemming + vocab catches inflected forms", () => {
  assert.ok(matches("CROWD_CONTROL", "silencing enemies in a cone for 3s"));
  assert.ok(matches("CROWD_CONTROL", "dealing 450% ATK and interrupting them"));
  assert.ok(matches("CROWD_CONTROL", "Fires a net at the nearest enemy, ensnaring them"));
  assert.ok(matches("CROWD_CONTROL", "freezing the target for 2s"));
});

test("ENEMY_VULNERABILITY catches spaced 'take X% increased DMG'", () => {
  assert.ok(matches("ENEMY_VULNERABILITY", "causing that enemy to take 20% increased DMG"));
  assert.ok(matches("ENEMY_VULNERABILITY", "Pulled enemies take 10% increased DMG"));
  assert.ok(matches("ENEMY_VULNERABILITY", "Increases DMG taken by hit enemies by 30%"));
});

test("cleanse/revive stemming", () => {
  assert.ok(matches("DEBUFF_CLEANSE_TEAM", "cleansing all debuffs from allies"));
  assert.ok(matches("REVIVE", "reviving the fallen ally"));
});

test("false-positive guards hold", () => {
  // Super Armor is CC-immunity, not an armor-stat gain.
  assert.ok(!matches("GAIN_ARMOR", "Amun-Ra gains Super Armor"), "Super Armor must not be GAIN_ARMOR");
  // Healing reduction is anti-heal, not heal-effect-up.
  assert.ok(!matches("HEAL_EFFECT_UP", "Increases healing reduction to 80%"), "healing reduction must not be HEAL_EFFECT_UP");
});

test("scope gate splits self vs team energy", () => {
  const hits = detectForHero(
    fakeHero("Tester", ["Deals DMG to a target and restores 200 Energy to himself."]),
    rules
  );
  assert.ok(hits.ENERGY_RESTORE, "self energy detected");
  assert.ok(!hits.ENERGY_RESTORE_TEAM, "no team energy without ally word");

  const teamHits = detectForHero(
    fakeHero("Tester", ["Restores 100 Energy to allies in a large area."]),
    rules
  );
  assert.ok(teamHits.ENERGY_RESTORE_TEAM, "team energy detected with ally word");
});

test("suppressors: anti-heal and no-normals", () => {
  const antiHeal = detectForHero(
    fakeHero("Tester", ["Marked enemies cannot be healed for 5s."]),
    rules
  );
  assert.ok(!antiHeal.HEAL_TEAM && !antiHeal.HEAL, "anti-heal sentence suppresses HEAL tags");

  const noNormals = detectForHero(
    fakeHero("Tester", ["This hero no longer performs normal attacks.", "Boosts normal attack damage by 50%."]),
    rules
  );
  assert.ok(!noNormals.BASIC_ATTACK_SCALER, "no-normals suppresses BASIC_ATTACK_SCALER");
});

test("real hero (nezha) detects core tags", () => {
  const nezha = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/heroes/nezha.json"), "utf8"));
  const hits = detectForHero(nezha, rules);
  for (const tag of ["CROWD_CONTROL", "REMOVES_ARMOR", "LIFE_STEAL_UP", "AREA_DAMAGE_DEALER"]) {
    assert.ok(hits[tag], `nezha should detect ${tag}`);
  }
});
