/**
 * Regression tests for the virtue-set recommendation engine.
 * Locks driver detection, set mapping integrity, owned-set filtering,
 * and the Fervor=energy-only guard so rule edits cannot silently regress.
 *
 * Run: node scripts/test-virtue-rules.mjs   (or: npm run validate:virtue-rules)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadRules, loadSetMeta, detectDrivers, recommendForHero } from "./suggest-virtues.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const drivers = loadRules();
const setMeta = loadSetMeta();

function fakeHero(over) {
  return { id: "t", name: "T", class: "Warrior", role: "Physical", skills: [{ description: "" }], virtueSets: [], ...over };
}

test("every driver maps only to sets that exist in virtues.json", () => {
  for (const [name, def] of Object.entries(drivers)) {
    for (const set of def.sets) {
      assert.ok(setMeta[set], `driver ${name} maps to unknown set ${set}`);
    }
  }
});

test("set meta resolves stat + members from virtues.json", () => {
  assert.equal(setMeta.Desire.stat, "atk");
  assert.equal(setMeta.Insight.stat, "critRate");
  assert.ok(setMeta.Desire.members.includes("desire_1"), "Desire members resolved");
});

test("ATK_SCALER needs DPS class AND ATK% text", () => {
  const warrior = detectDrivers(fakeHero({ class: "Warrior", skills: [{ description: "Deals 200% of ATK as DMG." }] }), drivers);
  assert.ok(warrior.ATK_SCALER, "warrior with ATK% fires");

  const support = detectDrivers(fakeHero({ class: "Support", skills: [{ description: "Deals 200% of ATK as DMG." }] }), drivers);
  assert.ok(!support.ATK_SCALER, "support does not fire ATK_SCALER (class gate)");

  const warriorNoAtk = detectDrivers(fakeHero({ class: "Warrior", skills: [{ description: "Shields the team." }] }), drivers);
  assert.ok(!warriorNoAtk.ATK_SCALER, "warrior without ATK% does not fire");
});

test("SURVIVABILITY is structural (Tank/Support class, no pattern)", () => {
  assert.ok(detectDrivers(fakeHero({ class: "Tank", skills: [{ description: "x" }] }), drivers).SURVIVABILITY);
  assert.ok(detectDrivers(fakeHero({ class: "Support", skills: [{ description: "x" }] }), drivers).SURVIVABILITY);
  assert.ok(!detectDrivers(fakeHero({ class: "Mage", skills: [{ description: "x" }] }), drivers).SURVIVABILITY);
});

test("CRIT fires on crit text", () => {
  assert.ok(detectDrivers(fakeHero({ skills: [{ description: "Also gains 30% CRIT Rate." }] }), drivers).CRIT);
});

test("Fervor is energy-only (not suggested for pure ATK scaler)", () => {
  const atkOnly = recommendForHero(
    fakeHero({ class: "Warrior", skills: [{ description: "Deals 270% ATK as DMG and knocks them down." }] }),
    drivers,
    setMeta
  );
  const sets = atkOnly.suggestedAdd.map((a) => a.set);
  assert.ok(!sets.includes("Fervor"), "Fervor must not come from ATK_SCALER alone");
  assert.ok(sets.includes("Desire"), "ATK scaler gets Desire");

  const energy = recommendForHero(
    fakeHero({ class: "Warrior", skills: [{ description: "Deals 200% ATK and gains 200 Energy at combat start." }] }),
    drivers,
    setMeta
  );
  assert.ok(energy.suggestedAdd.map((a) => a.set).includes("Fervor"), "energy dep gets Fervor");
});

test("owned sets are excluded from suggestions", () => {
  const rec = recommendForHero(
    fakeHero({ class: "Warrior", skills: [{ description: "Deals 200% of ATK." }], virtueSets: [{ label: "Desire", virtues: [] }] }),
    drivers,
    setMeta
  );
  assert.ok(!rec.suggestedAdd.map((a) => a.set).includes("Desire"), "already-owned Desire not re-suggested");
});

test("real hero (nezha) detects ATK_SCALER and energy", () => {
  const nezha = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/heroes/nezha.json"), "utf8"));
  const fired = detectDrivers(nezha, drivers);
  assert.ok(fired.ATK_SCALER, "nezha is an ATK scaler");
  assert.ok(fired.ENERGY_DEP, "nezha relic is energy dependent");
});
