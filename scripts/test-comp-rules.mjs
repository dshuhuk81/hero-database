/**
 * Regression tests for the synergy-partner (comp) engine.
 * Locks the contribution universe (team/debuff only, no self-buffs), need->tag
 * matching, self/unreleased exclusion, rating tie-break, and comp shape.
 *
 * Run: node scripts/test-comp-rules.mjs   (or: npm run validate:comp-rules)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadRules as loadVirtueDrivers } from "./suggest-virtues.mjs";
import { loadCompRules, rankPartners } from "./suggest-comps.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const virtueDrivers = loadVirtueDrivers();
const rules = loadCompRules();

const dps = (id, over = {}) => ({
  id,
  name: id,
  class: "Warrior",
  skills: [{ description: "Deals 200% of ATK as DMG." }],
  synergies: [],
  ...over,
});

test("contribution universe = team + enemy-debuff only (no self-buffs)", () => {
  assert.ok(rules.contributionUniverse.has("TEAM_SHIELD"), "team tag included");
  assert.ok(rules.contributionUniverse.has("ENEMY_ARMOR_REDUCTION"), "debuff tag included");
  assert.ok(!rules.contributionUniverse.has("SELF_SHIELD"), "self SELF_SHIELD excluded");
  assert.ok(!rules.contributionUniverse.has("SELF_ATK_UP"), "self SELF_ATK_UP excluded");
});

test("need->tag map references only real tags", () => {
  const tags = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/tags.json"), "utf8")));
  for (const [driver, list] of Object.entries(rules.needTags)) {
    for (const t of list) assert.ok(tags.has(t), `needTags.${driver} references unknown tag ${t}`);
  }
});

test("partner counts team contribution, ignores self-buffs", () => {
  const target = dps("target");
  const heroes = [
    target,
    dps("buffer", { synergies: ["TEAM_BUFF", "TEAM_ATK_SPD_UP"] }), // team -> matches ATK_SCALER needs
    dps("selfish", { synergies: ["SELF_ATK_UP", "SELF_SHIELD"] }), // self only -> no match
  ];
  const { partners } = rankPartners(target, heroes, virtueDrivers, rules);
  const ids = partners.map((p) => p.id);
  assert.ok(ids.includes("buffer"), "team buffer is a partner");
  assert.ok(!ids.includes("selfish"), "self-only hero is not a partner");
});

test("self and unreleased excluded", () => {
  const target = dps("target", { synergies: ["TEAM_BUFF"] });
  const heroes = [
    target,
    dps("ok", { synergies: ["TEAM_BUFF"] }),
    dps("unreleased", { synergies: ["TEAM_BUFF"], release: false }),
  ];
  const { partners } = rankPartners(target, heroes, virtueDrivers, rules);
  const ids = partners.map((p) => p.id);
  assert.ok(!ids.includes("target"), "target not its own partner");
  assert.ok(!ids.includes("unreleased"), "unreleased excluded");
});

test("tie-break prefers higher overall rating", () => {
  const target = dps("target");
  const heroes = [
    target,
    dps("low", { synergies: ["TEAM_BUFF"] }),
    dps("high", { synergies: ["TEAM_BUFF"] }),
  ];
  const ratings = { low: { overall: "B" }, high: { overall: "S+" } };
  const { partners } = rankPartners(target, heroes, virtueDrivers, rules, ratings);
  // both score 1; higher rating first
  assert.equal(partners[0].id, "high", "S+ ranks above B at equal score");
});

test("real heroes produce sensible directional partners", () => {
  const heroes = fs
    .readdirSync(path.join(ROOT, "src/data/heroes"))
    .filter((f) => f.endsWith(".json") && f !== "index.js")
    .map((f) => JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/heroes", f), "utf8")));
  const nezha = heroes.find((h) => h.id === "nezha");
  const { partners } = rankPartners(nezha, heroes, virtueDrivers, rules);
  assert.equal(partners.length, 5, "fills a 5-partner set");
  assert.ok(!partners.some((p) => p.id === "nezha"), "hero is not its own partner");
  for (const p of partners) assert.ok(p.matched.length > 0, "every partner has matched evidence tags");
});
