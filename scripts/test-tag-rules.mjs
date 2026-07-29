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
const OLD_AMBIGUOUS_TAGS = [
  "ATK_SPD_UP",
  "BUFF_TEAM",
  "CC_IMMUNITY_TEAM",
  "CDR_TEAM",
  "DAMAGE_REDUCTION_TEAM",
  "DEBUFF_CLEANSE_TEAM",
  "ENERGY_RESTORE_TEAM",
  "HEAL_TEAM",
  "SHIELD_TEAM",
  "ATK_DOWN",
  "ATK_SPD_DOWN",
  "BUFF_DISPEL",
  "CROWD_CONTROL",
  "ENERGY_DRAIN",
  "REDUCES_ATTRIBUTES",
  "REMOVES_ARMOR",
  "TAUNT",
  "AREA_DAMAGE_DEALER",
  "BASIC_ATTACK_SCALER",
  "ATK_SPEED",
  "ATK_UP",
  "CC_RESISTANCE",
  "DMG_RED",
  "DODGE_BUFF",
  "ENERGY_RESTORE",
  "GAIN_ARMOR",
  "HEAL",
  "HEAL_EFFECT_UP",
  "HIT_AVOID",
  "HP_UP",
  "LIFE_STEAL_UP",
  "SHIELD",
];

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

test("old ambiguous tag names are not canonical", () => {
  const tags = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/tags.json"), "utf8"));
  const tagsSet = new Set(tags);
  for (const oldTag of OLD_AMBIGUOUS_TAGS) {
    assert.ok(!tagsSet.has(oldTag), `old tag must not be canonical: ${oldTag}`);
    assert.ok(!rules[oldTag], `old tag must not have a detection rule: ${oldTag}`);
  }

  const heroFiles = fs
    .readdirSync(path.join(ROOT, "src/data/heroes"))
    .filter((f) => f.endsWith(".json"));
  for (const file of heroFiles) {
    const hero = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/heroes", file), "utf8"));
    for (const tag of hero.synergies || []) {
      assert.ok(!OLD_AMBIGUOUS_TAGS.includes(tag), `${hero.id} uses old synergy tag ${tag}`);
      assert.ok(tagsSet.has(tag), `${hero.id} uses unknown synergy tag ${tag}`);
    }
    for (const partner of hero.synergyPartners || []) {
      for (const tag of partner.via || []) {
        assert.ok(!OLD_AMBIGUOUS_TAGS.includes(tag), `${hero.id} partner ${partner.heroId} uses old via tag ${tag}`);
        assert.ok(tagsSet.has(tag), `${hero.id} partner ${partner.heroId} uses unknown via tag ${tag}`);
      }
    }
  }
});

test("CC stemming + vocab catches inflected forms", () => {
  assert.ok(matches("ENEMY_CROWD_CONTROL", "silencing enemies in a cone for 3s"));
  assert.ok(matches("ENEMY_CROWD_CONTROL", "dealing 450% ATK and interrupting them"));
  assert.ok(matches("ENEMY_CROWD_CONTROL", "Fires a net at the nearest enemy, ensnaring them"));
  assert.ok(matches("ENEMY_CROWD_CONTROL", "freezing the target for 2s"));
});

test("ENEMY_VULNERABILITY catches spaced 'take X% increased DMG'", () => {
  assert.ok(matches("ENEMY_VULNERABILITY", "causing that enemy to take 20% increased DMG"));
  assert.ok(matches("ENEMY_VULNERABILITY", "Pulled enemies take 10% increased DMG"));
  assert.ok(matches("ENEMY_VULNERABILITY", "Increases DMG taken by hit enemies by 30%"));
});

test("cleanse/revive stemming", () => {
  assert.ok(matches("TEAM_DEBUFF_CLEANSE", "cleansing all debuffs from allies"));
  assert.ok(matches("REVIVE", "reviving the fallen ally"));
});

test("false-positive guards hold", () => {
  // Super Armor is CC-immunity, not an armor-stat gain.
  assert.ok(!matches("SELF_ARMOR_UP", "Amun-Ra gains Super Armor"), "Super Armor must not be SELF_ARMOR_UP");
  // Healing reduction is anti-heal, not heal-effect-up.
  assert.ok(!matches("SELF_HEAL_EFFECT_UP", "Increases healing reduction to 80%"), "healing reduction must not be SELF_HEAL_EFFECT_UP");
});

test("audit false positives stay suppressed", () => {
  const shield = detectForHero(
    fakeHero("Pisces", ["Grants a shield to the weakest ally, absorbing DMG equal to 250% ATK for 8s."]),
    rules
  );
  assert.ok(!shield.TEAM_BUFF, "shield scaling must not become TEAM_BUFF");
  assert.ok(!shield.SELF_ATK_UP, "shield scaling must not become SELF_ATK_UP");

  const supportArea = detectForHero(
    fakeHero("Caishen", ["Restores 100 Energy to allies in a large area around him."]),
    rules
  );
  assert.ok(!supportArea.PLAYSTYLE_AREA_DAMAGE, "support radius must not become area damage");

  const visualSummon = detectForHero(
    fakeHero("Pisces", ["Pisces summons a whale to crash down on the target, dealing AoE DMG."]),
    rules
  );
  assert.ok(!visualSummon.SUMMON, "visual spell summons must not become SUMMON utility");

  const dodgeIgnore = detectForHero(
    fakeHero("Zeus", ["This skill ignores Dodge Rate."]),
    rules
  );
  assert.ok(!dodgeIgnore.SELF_DODGE, "Dodge ignore must not become SELF_DODGE");

  const antiHeal = detectForHero(
    fakeHero("Medusa", ["Petrified units have their healing effects reduced by 80%."]),
    rules
  );
  assert.ok(!antiHeal.SELF_HEAL, "healing reduction must not become SELF_HEAL");
});

test("scope gate splits self vs team energy", () => {
  const hits = detectForHero(
    fakeHero("Tester", ["Deals DMG to a target and restores 200 Energy to himself."]),
    rules
  );
  assert.ok(hits.SELF_ENERGY_RESTORE, "self energy detected");
  assert.ok(!hits.TEAM_ENERGY_RESTORE, "no team energy without ally word");

  const teamHits = detectForHero(
    fakeHero("Tester", ["Restores 100 Energy to allies in a large area."]),
    rules
  );
  assert.ok(teamHits.TEAM_ENERGY_RESTORE, "team energy detected with ally word");
});

test("suppressors: anti-heal and no-normals", () => {
  const antiHeal = detectForHero(
    fakeHero("Tester", ["Marked enemies cannot be healed for 5s."]),
    rules
  );
  assert.ok(!antiHeal.TEAM_HEAL && !antiHeal.SELF_HEAL, "anti-heal sentence suppresses SELF_HEAL tags");

  const noNormals = detectForHero(
    fakeHero("Tester", ["This hero no longer performs normal attacks.", "Boosts normal attack damage by 50%."]),
    rules
  );
  assert.ok(!noNormals.PLAYSTYLE_BASIC_ATTACK_SCALER, "no-normals suppresses PLAYSTYLE_BASIC_ATTACK_SCALER");
});

test("ally-as-trigger suppresses team scope (scope gate fix)", () => {
  // Relic pattern: "when ally falls, HERO gains X" - ally is trigger, hero is recipient
  const nezhaRelic = detectForHero(
    fakeHero("Nezha", [
      "Whenever an ally (excluding minions) falls in battle, Nezha restores 150 Energy, increases DMG dealt by 15%, and reduces DMG taken by 10% for 25s.",
    ]),
    rules
  );
  assert.ok(!nezhaRelic.TEAM_ENERGY_RESTORE, "when-ally-falls sentence must not trigger TEAM_ENERGY_RESTORE");
  assert.ok(!nezhaRelic.TEAM_DAMAGE_REDUCTION, "when-ally-falls sentence must not trigger TEAM_DAMAGE_REDUCTION");

  // "until any ally falls" is a termination condition, not a recipient
  const amunraSkill = detectForHero(
    fakeHero("Amunra", [
      "Amun-Ra gains Energy Regen boost, increasing his Energy Regen by 50%, until any ally falls.",
    ]),
    rules
  );
  assert.ok(!amunraSkill.TEAM_ENERGY_RESTORE, "until-ally sentence must not trigger TEAM_ENERGY_RESTORE");

  const allyCastTrigger = detectForHero(
    fakeHero("Isis", [
      "For every 5 Ultimates cast by allies, Isis gains 20% increased ATK SPD, stacking up to 4 times.",
    ]),
    rules
  );
  assert.ok(!allyCastTrigger.TEAM_ATK_SPD_UP, "ally cast trigger must not become team TEAM_ATK_SPD_UP");
  assert.ok(allyCastTrigger.SELF_ATK_SPEED, "self ATK speed should still be detected");

  const allyBuffTrigger = detectForHero(
    fakeHero("Zeus", [
      "Increases ATK SPD by 8% and Ultimate DMG by 2% when gaining a buff from an ally.",
    ]),
    rules
  );
  assert.ok(!allyBuffTrigger.TEAM_ATK_SPD_UP, "buff from ally must not become team TEAM_ATK_SPD_UP");
  assert.ok(!allyBuffTrigger.TEAM_BUFF, "buff from ally must not become TEAM_BUFF");

  // Legitimate team energy restore must still fire
  const realTeam = detectForHero(
    fakeHero("Tester", ["Restores 150 Energy to all allies when cast."]),
    rules
  );
  assert.ok(realTeam.TEAM_ENERGY_RESTORE, "direct team energy restore must still fire");
});

test("real hero (nezha) detects core tags", () => {
  const nezha = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/heroes/nezha.json"), "utf8"));
  const hits = detectForHero(nezha, rules);
  for (const tag of ["ENEMY_CROWD_CONTROL", "ENEMY_ARMOR_REDUCTION", "SELF_LIFESTEAL_UP", "PLAYSTYLE_AREA_DAMAGE"]) {
    assert.ok(hits[tag], `nezha should detect ${tag}`);
  }
});

test("context inheritance keeps colon payloads and upgrades on the team target", () => {
  const contextual = {
    id: "contextual",
    name: "Contextual",
    skills: [{
      description: "Grants all allies [Tempo] for 5s: ATK SPD +50%, Energy Regen +30%.",
      upgrades: {
        level2: "Increases ATK SPD to 60%.",
        level3: "Restoring HP equal to 100% ATK to the weakest ally.",
      },
    }],
  };
  const hits = detectForHero(contextual, rules);
  assert.ok(hits.TEAM_ATK_SPD_UP, "colon payload inherits team target");
  assert.equal(hits.TEAM_ATK_SPD_UP.scopeSource, "carried-clause");
  assert.ok(hits.TEAM_ENERGY_RESTORE, "second colon effect inherits team target");
  assert.ok(!hits.SELF_ATK_SPEED, "team upgrade must not become self ATK speed");
  assert.ok(!hits.SELF_ENERGY_RESTORE, "team colon payload must not become self energy");
  assert.ok(hits.TEAM_HEAL, "restoring morphology is recognized");
});

test("cleanse recipient is not mistaken for an ally trigger", () => {
  const hits = detectForHero(
    fakeHero("Tester", ["Removes all debuffs from an ally and makes them immune to Crowd Control."]),
    rules
  );
  assert.ok(hits.TEAM_DEBUFF_CLEANSE);
  assert.ok(hits.TEAM_CC_IMMUNITY);
});

test("Dionysus full skill audit confirms evidenced manual tags without bogus self inheritance", () => {
  const dionysus = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/heroes/dionysus.json"), "utf8"));
  const hits = detectForHero(dionysus, rules);
  for (const tag of dionysus.synergies.filter((tag) => tag !== "ENEMY_VULNERABILITY")) {
    assert.ok(hits[tag], `Dionysus should detect manual tag ${tag}`);
  }
  assert.ok(!hits.ENEMY_VULNERABILITY, "taking less damage from an enemy is not enemy vulnerability");
  for (const tag of ["SELF_ATK_SPEED", "SELF_ATK_UP", "SELF_ENERGY_RESTORE", "SELF_HEAL", "SELF_SUSTAIN"]) {
    assert.ok(!hits[tag], `Dionysus team effects must not produce ${tag}`);
  }
  assert.equal(hits.TEAM_ATK_SPD_UP.source, "skills[0].description");
  assert.equal(hits.TEAM_ATK_SPD_UP.scopeSource, "carried-clause");
});

test("large real-hero corpus audit retains useful agreement and evidence provenance", () => {
  const heroDir = path.join(ROOT, "src/data/heroes");
  const heroes = fs.readdirSync(heroDir)
    .filter((file) => file.endsWith(".json") && !file.startsWith("_"))
    .map((file) => JSON.parse(fs.readFileSync(path.join(heroDir, file), "utf8")));

  let manual = 0;
  let matched = 0;
  let confirmed = 0;
  for (const hero of heroes) {
    const hits = detectForHero(hero, rules);
    const current = new Set(hero.synergies || []);
    manual += current.size;
    matched += Object.keys(hits).length;
    confirmed += Object.keys(hits).filter((tag) => current.has(tag)).length;
    for (const [tag, hit] of Object.entries(hits)) {
      assert.ok(hit.evidence, `${hero.id}/${tag} has evidence`);
      assert.ok(hit.source, `${hero.id}/${tag} has source provenance`);
      assert.ok(["explicit", "carried-clause", "inherited-upgrade", "unknown"].includes(hit.scopeSource));
    }
  }

  const recall = confirmed / manual;
  const precisionVsManual = confirmed / matched;
  assert.ok(heroes.length >= 80, `expected broad corpus, got ${heroes.length} heroes`);
  assert.ok(recall >= 0.75, `manual agreement recall regressed to ${(recall * 100).toFixed(1)}%`);
  assert.ok(precisionVsManual >= 0.8, `manual agreement precision regressed to ${(precisionVsManual * 100).toFixed(1)}%`);
});

test("distinct mitigation taxonomy does not collapse into older tags", () => {
  const cronus = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/heroes/cronus.json"), "utf8"));
  const eris = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/heroes/eris.json"), "utf8"));
  const hephaestus = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/heroes/hephaestus.json"), "utf8"));
  const meret = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/heroes/meret.json"), "utf8"));
  const nuba = JSON.parse(fs.readFileSync(path.join(ROOT, "src/data/heroes/nuba.json"), "utf8"));

  const cronusHits = detectForHero(cronus, rules);
  assert.ok(cronusHits.DEATH_PREVENTION, "Cronus rewind is death prevention");
  assert.ok(!cronusHits.REVIVE, "Cronus rewind must not become revive");

  const erisHits = detectForHero(eris, rules);
  assert.ok(erisHits.SELF_DEF_IGNORE, "Eris ignores target DEF");
  assert.ok(!erisHits.ENEMY_ARMOR_REDUCTION, "DEF ignore must not become Armor reduction");

  const nubaHits = detectForHero(nuba, rules);
  assert.ok(nubaHits.ENEMY_DAMAGE_DEALT_DOWN, "Nuba reduces enemy damage dealt");
  assert.ok(!nubaHits.ENEMY_ATTRIBUTE_REDUCTION, "damage dealt down must not become generic attribute reduction");

  assert.ok(detectForHero(hephaestus, rules).ENEMY_DAMAGE_DEALT_DOWN, "Hephaestus reduces enemy damage dealt");
  assert.ok(detectForHero(meret, rules).DEATH_PREVENTION, "Meret prevents an ally's death");
});
