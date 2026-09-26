// Challenge goals per map (M20): evaluation of finished runs, Favor rewards and save handling.
// Run: node scripts/test-td-challenges.mjs
import assert from "node:assert/strict";
import { CHALLENGE_IDS, challengeReward, evaluateChallenges, HOARDER_GOLD, recordChallenges, runFacts, sanitizeChallenges, SWIFT_SECONDS, TRIO_MAX } from "../src/game/td/challenges.js";
import { emptySave, encodeSaveCode, parseSaveText, runKey, sanitizeSave } from "../src/game/td/page/save.ts";
import { TowerDefenseGame } from "../src/game/td/sim.js";
import heroes from "../src/data/gameBalance.json" with { type: "json" };
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import maps from "../src/data/tdMaps.json" with { type: "json" };
import waves from "../src/data/tdWaves.json" with { type: "json" };

const tiers = tuning.tiers;

// A won 10 wave run that clears every challenge; each case below breaks exactly one.
const base = { won: true, mode: "classic", tier: "normal", trial: false, perfect: true, fielded: ["zeus", "fengyi"], classes: ["Mage"], upgrades: 0, seconds: SWIFT_SECONDS.classic, gold: HOARDER_GOLD.classic };
assert.deepEqual(evaluateChallenges(base), CHALLENGE_IDS, "all six at the exact thresholds");

const breaks = {
  perfect: { perfect: false },
  trio: { fielded: ["zeus", "fengyi", "phoenix", "diana"] },
  oneClass: { classes: ["Mage", "Archer"] },
  unrefined: { upgrades: 1 },
  swift: { seconds: SWIFT_SECONDS.classic + 0.5 },
  hoarder: { gold: HOARDER_GOLD.classic - 1 },
};
for (const [id, change] of Object.entries(breaks)) {
  const ids = evaluateChallenges({ ...base, ...change });
  assert.ok(!ids.includes(id), `${id} fails when its condition breaks`);
  assert.equal(ids.length, CHALLENGE_IDS.length - 1, `${id}: the other challenges still count`);
}
assert.equal(TRIO_MAX, 3, "Trio allows 3 heroes");
assert.ok(evaluateChallenges({ ...base, fielded: ["zeus", "fengyi", "phoenix"] }).includes("trio"), "exactly 3 heroes is a Trio");
assert.ok(!evaluateChallenges({ ...base, fielded: [], classes: [] }).includes("trio"), "no hero deployed is no Trio");

// No challenges for losses, endless and Daily Trial runs; 20 waves use their own thresholds.
assert.deepEqual(evaluateChallenges({ ...base, won: false }), [], "loss counts nothing");
assert.deepEqual(evaluateChallenges({ ...base, mode: "endless" }), [], "endless has no challenges");
assert.deepEqual(evaluateChallenges({ ...base, trial: true }), [], "Daily Trial runs do not count");
{
  const long = { ...base, mode: "long", seconds: SWIFT_SECONDS.long, gold: HOARDER_GOLD.long };
  assert.deepEqual(evaluateChallenges(long), CHALLENGE_IDS, "20 waves at its thresholds");
  const short = evaluateChallenges({ ...long, gold: HOARDER_GOLD.classic, seconds: SWIFT_SECONDS.long + 1 });
  assert.ok(!short.includes("hoarder") && !short.includes("swift"), "10 wave thresholds are not enough on 20 waves");
}

// runFacts reads a real game: sold heroes stay counted, upgrades are counted, classes derived.
{
  const map = maps[0];
  const g = new TowerDefenseGame({ heroes, tuning, map, waves, seed: 7 });
  g.gold = 5000;
  const zeus = heroes.find((h) => h.id === "zeus");
  const fengyi = heroes.find((h) => h.id === "fengyi");
  assert.ok(g.place("zeus", zeus.slot, 0), "zeus placed");
  assert.ok(g.place("fengyi", fengyi.slot, 1), "fengyi placed");
  let facts = runFacts(g);
  assert.deepEqual(facts.fielded, ["zeus", "fengyi"], "fielded heroes");
  assert.deepEqual(facts.classes, ["Mage"], "one class");
  assert.equal(facts.upgrades, 0, "nothing bought yet");
  const unit = g.heroes.find((h) => h.id === "fengyi");
  assert.ok(g.upgrade(unit.entityId).ok, "level bought");
  g.sell(unit.entityId);
  assert.ok(g.place("diana", "platform", 1), "diana placed on the freed ring");
  facts = runFacts(g);
  assert.deepEqual(facts.fielded, ["zeus", "fengyi", "diana"], "a sold hero stays fielded");
  assert.deepEqual(facts.classes.sort(), ["Archer", "Mage"], "classes of every fielded hero");
  assert.equal(facts.upgrades, 1, "sold hero's level still counts");
  g.reset();
  assert.deepEqual(runFacts(g).fielded, [], "reset clears fielded heroes");
  assert.equal(runFacts(g).upgrades, 0, "reset clears upgrades");
  const trial = new TowerDefenseGame({ heroes, tuning, map, waves, seed: 7, allowedHeroes: ["zeus"] });
  assert.equal(runFacts(trial).trial, true, "restricted roster marks a Daily Trial run");
}

// Rewards: once per challenge, map and run length; a higher tier pays the difference.
{
  const progress = {};
  const key = runKey("moonlit-pass", "classic");
  let out = recordChallenges(progress, key, ["perfect", "trio"], "classic", "normal", tiers);
  assert.equal(out.favor, 2 * challengeReward("classic", "normal", tiers), "two first clears");
  assert.equal(challengeReward("classic", "normal", tiers), 40, "10 waves pays 40 on Normal");
  assert.ok(out.results.every((r) => r.isNew), "both new");
  out = recordChallenges(progress, key, ["perfect"], "classic", "normal", tiers);
  assert.equal(out.favor, 0, "repeat clear pays nothing");
  assert.equal(out.results[0].isNew, false, "repeat is not new");
  out = recordChallenges(progress, key, ["perfect"], "classic", "mythic", tiers);
  assert.equal(out.favor, challengeReward("classic", "mythic", tiers) - 40, "Mythic pays the difference");
  assert.equal(out.results[0].tierUp, true, "tier up flagged");
  assert.equal(progress[key].perfect, "mythic", "highest tier stored");
  out = recordChallenges(progress, key, ["perfect"], "classic", "heroic", tiers);
  assert.equal(out.favor, 0, "lower tier pays nothing");
  assert.equal(progress[key].perfect, "mythic", "lower tier keeps Mythic");
  out = recordChallenges(progress, runKey("moonlit-pass", "long"), ["perfect"], "long", "normal", tiers);
  assert.equal(out.favor, 60, "20 waves is its own record and pays 60");
  recordChallenges(progress, "empty", [], "classic", "normal", tiers);
  assert.ok(!("empty" in progress), "no empty records");
}

// Save: challenges persist across reload and save codes; junk is dropped; old saves still load.
{
  const rules = { heroIds: new Set(["zeus"]) };
  const save = { ...emptySave(), bestScore: 10 };
  recordChallenges(save.challenges, runKey("moonlit-pass", "classic"), ["swift", "hoarder"], "classic", "heroic", tiers);
  const reloaded = sanitizeSave(JSON.parse(JSON.stringify(save)), rules);
  assert.deepEqual(reloaded.challenges, { "moonlit-pass": { swift: "heroic", hoarder: "heroic" } }, "reload keeps challenges");
  assert.deepEqual(parseSaveText(encodeSaveCode(save), rules).challenges, save.challenges, "save code keeps challenges");
  const old = { ...save };
  delete old.challenges;
  assert.deepEqual(sanitizeSave(old, rules).challenges, {}, "saves from before M20 start empty");
  assert.deepEqual(sanitizeChallenges({ a: { perfect: "legendary", trio: "normal", ghost: "normal" }, b: "x", c: { perfect: "mythic" }, d: [] }), { a: { trio: "normal" }, c: { perfect: "mythic" } }, "unknown ids and tiers dropped");
  assert.deepEqual(sanitizeChallenges(null), {}, "missing challenges");
}

console.log("tower defense challenge tests passed");
