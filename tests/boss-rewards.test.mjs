import test from "node:test";
import assert from "node:assert/strict";
import {
  chooseChests,
  formatCompact,
  mechanicCategory,
  rewardRarity,
  parseCompact,
  rewardKeys,
  rewardsUpTo,
} from "../src/utils/bossRewards.js";

test("formatCompact shortens large numbers", () => {
  assert.equal(formatCompact(200000), "200K");
  assert.equal(formatCompact(1500000000), "1.5B");
  assert.equal(formatCompact(100000000000000), "100T");
  assert.equal(formatCompact(999), "999");
  assert.equal(formatCompact(3000, 10000), "3,000");
});

test("parseCompact reads suffixes and plain numbers", () => {
  assert.equal(parseCompact("4.5B"), 4.5e9);
  assert.equal(parseCompact("300m"), 3e8);
  assert.equal(parseCompact("1,200,000"), 1.2e6);
  assert.equal(parseCompact("lots"), null);
});

const milestones = [
  { damage: 100, rewards: [[103, 1009, 1]] },
  { damage: 200, rewards: [[103, 1001, 15]] },
  { damage: 300, rewards: [[103, 1009, 2], [107, 0, 50]] },
];

test("rewardsUpTo sums rewards of reached milestones", () => {
  assert.deepEqual(rewardsUpTo(milestones, 250), [
    { key: "103/1009", reward: [103, 1009, 1] },
    { key: "103/1001", reward: [103, 1001, 15] },
  ]);
  assert.deepEqual(rewardsUpTo(milestones, 300)[0].reward, [103, 1009, 3]);
  assert.deepEqual(rewardsUpTo(milestones, 50), []);
});

test("rewardKeys and chooseChests list distinct keys", () => {
  assert.deepEqual(rewardKeys(milestones), ["103/1009", "103/1001", "107/0"]);
  const items = { "103/1009": { name: "Chest", choose: { count: 1, options: [] } }, "103/1001": { name: "Tear" } };
  assert.deepEqual(chooseChests([milestones[0].rewards, milestones[2].rewards], items).map((c) => c.key), ["103/1009"]);
});

test("mechanicCategory matches by keyword", () => {
  assert.equal(mechanicCategory({ text: "Energy drain zones (pentacle) every 3s" }), "energy");
  assert.equal(mechanicCategory({ text: "Defensive stance reduces damage heavily" }), "defense");
  assert.equal(mechanicCategory({ text: "Big hit" }), "other");
  // The lead clause decides, and stems only match at the start of a word.
  assert.equal(mechanicCategory({ text: "Knockback pulse; shielded units are immune" }), "control");
  assert.equal(mechanicCategory({ text: "Lilith is untargetable but takes all damage children take" }), "defense");
  assert.equal(mechanicCategory({ text: "A partial, added effect" }), "other");
});

test("rewardRarity bands the client quality number and keeps unknowns neutral", () => {
  assert.equal(rewardRarity(undefined), "plain");
  assert.equal(rewardRarity(3), "plain");
  assert.equal(rewardRarity(4), "rare");
  assert.equal(rewardRarity(6), "epic");
  assert.equal(rewardRarity(9), "legendary");
  assert.equal(rewardRarity(13), "mythic");
});
