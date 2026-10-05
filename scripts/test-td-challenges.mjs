// Challenge goals per map (M20): evaluation of finished runs, Favor rewards and save handling.
// Run: node scripts/test-td-challenges.mjs
import assert from "node:assert/strict";
import { CHALLENGES, CHALLENGE_IDS, challengeReward, evaluateChallenges, HOARDER_PLACEMENT, recordChallenges, runFacts, sanitizeChallenges, SWIFT_GRACE_SECONDS, TRIO_MAX } from "../src/game/td/challenges.js";
import { emptySave, encodeSaveCode, parseSaveText, runKey, sanitizeSave } from "../src/game/td/page/save.ts";
import { TowerDefenseGame } from "../src/game/td/sim.js";
import heroes from "../src/data/gameBalance.json" with { type: "json" };
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import maps from "../src/data/tdMaps.json" with { type: "json" };
import { timelineForMap } from "../src/game/td/stage-for-map.js";
import campaign from "../src/data/tdCampaign.json" with { type: "json" };

const tiers = tuning.tiers;

// A won run that clears every challenge; each case below breaks exactly one. The timeline ends at 100 s.
const base = { won: true, tier: "normal", trial: false, perfect: true, fielded: ["odin", "boreas"], classes: ["Mage"], relocations: 0, timelineEnd: 100, seconds: 100 + SWIFT_GRACE_SECONDS, placement: HOARDER_PLACEMENT };
assert.deepEqual(evaluateChallenges(base), CHALLENGE_IDS, "all six at the exact thresholds");
assert.equal(CHALLENGES.find((entry) => entry.id === "unrefined").name, "Hold Position", "legacy challenge id has the new name");

const breaks = {
  perfect: { perfect: false },
  trio: { fielded: ["odin", "boreas", "hephaestus", "skadi"] },
  oneClass: { classes: ["Mage", "Archer"] },
  unrefined: { relocations: 1 },
  swift: { seconds: 100 + SWIFT_GRACE_SECONDS + 0.5 },
  hoarder: { placement: HOARDER_PLACEMENT - 1 },
};
for (const [id, change] of Object.entries(breaks)) {
  const ids = evaluateChallenges({ ...base, ...change });
  assert.ok(!ids.includes(id), `${id} fails when its condition breaks`);
  assert.equal(ids.length, CHALLENGE_IDS.length - 1, `${id}: the other challenges still count`);
}
assert.equal(TRIO_MAX, 3, "Trio allows 3 heroes");
assert.ok(evaluateChallenges({ ...base, fielded: ["odin", "boreas", "hephaestus"] }).includes("trio"), "exactly 3 heroes is a Trio");
assert.ok(!evaluateChallenges({ ...base, fielded: [], classes: [] }).includes("trio"), "no hero deployed is no Trio");

// No challenges for losses and Daily Trial runs; Swift follows the map's own timeline.
assert.deepEqual(evaluateChallenges({ ...base, won: false }), [], "loss counts nothing");
assert.deepEqual(evaluateChallenges({ ...base, trial: true }), [], "Daily Trial runs do not count");
{
  const longMap = evaluateChallenges({ ...base, timelineEnd: 200, seconds: 200 + SWIFT_GRACE_SECONDS });
  assert.ok(longMap.includes("swift"), "a longer timeline gets a longer limit");
  const quick = evaluateChallenges({ ...base, timelineEnd: 50 });
  assert.ok(!quick.includes("swift"), "a shorter timeline gets a shorter limit");
}

// runFacts reads a real game: sold heroes stay counted, relocations are counted, classes derived.
{
  const map = maps[0];
  const g = new TowerDefenseGame({ heroes, tuning, map, timeline: timelineForMap(map, campaign), seed: 7 });
  g.placement = 5000;
  const odin = heroes.find((h) => h.id === "odin");
  const boreas = heroes.find((h) => h.id === "boreas");
  assert.ok(g.place("odin", odin.slot, 0), "odin placed");
  assert.ok(g.place("boreas", boreas.slot, 1), "boreas placed");
  let facts = runFacts(g);
  assert.deepEqual(facts.fielded, ["odin", "boreas"], "fielded heroes");
  assert.deepEqual(facts.classes, ["Mage"], "one class");
  assert.equal(facts.relocations, 0, "nothing moved yet");
  const unit = g.heroes.find((h) => h.id === "boreas");
  assert.ok(g.relocate(unit.entityId, "platform", 2).ok, "hero relocated");
  g.sell(unit.entityId);
  assert.ok(g.place("skadi", "platform", 1), "skadi placed on the freed ring");
  facts = runFacts(g);
  assert.deepEqual(facts.fielded, ["odin", "boreas", "skadi"], "a sold hero stays fielded");
  assert.deepEqual(facts.classes.sort(), ["Archer", "Mage"], "classes of every fielded hero");
  assert.equal(facts.relocations, 1, "sold hero's relocation still counts");
  g.reset();
  assert.deepEqual(runFacts(g).fielded, [], "reset clears fielded heroes");
  assert.equal(runFacts(g).relocations, 0, "reset clears relocations");
  const trial = new TowerDefenseGame({ heroes, tuning, map, timeline: timelineForMap(map, campaign), seed: 7, allowedHeroes: ["odin"] });
  assert.equal(runFacts(trial).trial, true, "restricted roster marks a Daily Trial run");
}

// Rewards: once per challenge and map; a higher tier pays the difference.
{
  const progress = {};
  const key = runKey("moonlit-pass");
  let out = recordChallenges(progress, key, ["perfect", "trio"], "normal", tiers);
  assert.equal(out.favor, 2 * challengeReward("normal", tiers), "two first clears");
  assert.equal(challengeReward("normal", tiers), 40, "a clear pays 40 on Normal");
  assert.ok(out.results.every((r) => r.isNew), "both new");
  out = recordChallenges(progress, key, ["perfect"], "normal", tiers);
  assert.equal(out.favor, 0, "repeat clear pays nothing");
  assert.equal(out.results[0].isNew, false, "repeat is not new");
  out = recordChallenges(progress, key, ["perfect"], "mythic", tiers);
  assert.equal(out.favor, challengeReward("mythic", tiers) - 40, "Mythic pays the difference");
  assert.equal(out.results[0].tierUp, true, "tier up flagged");
  assert.equal(progress[key].perfect, "mythic", "highest tier stored");
  out = recordChallenges(progress, key, ["perfect"], "heroic", tiers);
  assert.equal(out.favor, 0, "lower tier pays nothing");
  assert.equal(progress[key].perfect, "mythic", "lower tier keeps Mythic");
  recordChallenges(progress, "empty", [], "normal", tiers);
  assert.ok(!("empty" in progress), "no empty records");
}

// Save: challenges persist across reload and save codes; junk is dropped; old saves still load.
{
  const rules = { heroIds: new Set(["odin"]) };
  const save = { ...emptySave(), bestScore: 10 };
  recordChallenges(save.challenges, runKey("moonlit-pass"), ["swift", "hoarder"], "heroic", tiers);
  const reloaded = sanitizeSave(JSON.parse(JSON.stringify(save)), rules);
  assert.deepEqual(reloaded.challenges, { "moonlit-pass": { swift: "heroic", hoarder: "heroic" } }, "reload keeps challenges");
  assert.deepEqual(parseSaveText(encodeSaveCode(save), rules).challenges, save.challenges, "save code keeps challenges");
  const old = { ...save };
  delete old.challenges;
  assert.deepEqual(sanitizeSave(old, rules).challenges, {}, "saves from before M20 start empty");
  assert.deepEqual(sanitizeChallenges({ a: { perfect: "legendary", trio: "normal", ghost: "normal" }, b: "x", c: { perfect: "mythic" }, d: [] }), { a: { trio: "normal" }, c: { perfect: "mythic" } }, "unknown ids and tiers dropped");
  assert.deepEqual(sanitizeChallenges(null), {}, "missing challenges");
  assert.deepEqual(sanitizeChallenges({ "moonlit-pass": { perfect: "normal" }, "moonlit-pass@long": { perfect: "heroic", trio: "normal" } }), { "moonlit-pass": { perfect: "heroic", trio: "normal" } }, "run length keys merge into the map key with the higher tier");
  assert.deepEqual(sanitizeChallenges({ a: { unrefined: "heroic" } }), { a: { unrefined: "heroic" } }, "saved Hold Position completion keeps the legacy id");
}

console.log("tower defense challenge tests passed");
