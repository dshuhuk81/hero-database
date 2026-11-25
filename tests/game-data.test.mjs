import test from "node:test";
import assert from "node:assert/strict";
import { validateBosses, validateEventRewards, validateEvents, validateHeroReleases } from "../scripts/lib/game-data.mjs";

const event = (over = {}) => ({
  id: 1,
  label: "New Card Push · Charon",
  family: "Hero Banner",
  series: "new_card_push",
  start: "2026-10-28",
  end: "2026-11-12",
  category: "banners",
  ...over,
});
const known = new Set([4014]);

test("a valid event produces no errors or warnings", () => {
  assert.deepEqual(validateEvents({ events: [event({ heroGameId: 4014 })] }, known), { errors: [], warnings: [] });
});

test("an event ending before it starts is an error naming its id", () => {
  const { errors } = validateEvents({ events: [event({ id: 99, start: "2026-11-10", end: "2026-11-01" })] }, known);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /99/);
});

test("duplicate ids, bad dates and unknown categories are errors", () => {
  const { errors } = validateEvents(
    { events: [event({ id: 5 }), event({ id: 5 }), event({ id: 6, start: "11/02/2026" }), event({ id: 7, category: "misc" })] },
    known,
  );
  assert.equal(errors.length, 3);
});

test("an unmapped heroGameId is a warning, not an error", () => {
  const result = validateEvents({ events: [event({ heroGameId: 5012 })] }, known);
  assert.deepEqual(result.errors, []);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /5012/);
});

const hero = (over = {}) => ({ gameId: 4014, name: "Charon", globalRelease: "2026-10-28", cnRelease: "2026-07-10", ...over });

test("hero releases accept null dates and ISO dates", () => {
  assert.deepEqual(validateHeroReleases({ heroes: [hero(), hero({ gameId: 1001, globalRelease: null, cnRelease: null })] }), []);
});

test("placeholder dates such as 2099 and duplicate gameIds are errors", () => {
  const errors = validateHeroReleases({ heroes: [hero({ globalRelease: "2099-11-02" }), hero()] });
  assert.equal(errors.length, 2);
});

import { readFileSync } from "node:fs";
const mapping = JSON.parse(readFileSync(new URL("../src/data/game_id_mapping.json", import.meta.url), "utf-8"));

test("venus and chaos are mapped to their game ids", () => {
  assert.equal(mapping.venus?.game_hero_id, 3015);
  assert.equal(mapping.chaos?.game_hero_id, 5012);
});

test("joanneofarc is ZhenDe (4016); the Global name is not confirmed yet", () => {
  assert.equal(mapping.joanneofarc?.game_hero_id, 4016);
});

const bossItems = {
  "103/1603": { name: "Rift Chest", icon: "A", choose: { count: 1, options: [[103, 1009, 3]] } },
  "103/1009": { name: "Godcall Plume", icon: "B" },
};
const rift = { siteId: "baphomet", mode: "torment_rift", damageMilestones: [{ damage: 1, rewards: [[103, 1603, 1]] }] };

test("validateBosses accepts rewards that resolve to items", () => {
  assert.deepEqual(validateBosses({ bosses: [rift], items: bossItems }).errors, []);
});

test("validateBosses rejects unknown modes, missing items and dangling chest options", () => {
  const { errors } = validateBosses({
    bosses: [{ ...rift, mode: "arena", damageMilestones: [{ damage: 1, rewards: [[103, 9999, 1]] }] }],
    items: { "103/1603": { name: "Rift Chest", choose: { count: 1, options: [[103, 1, 1]] } } },
  });
  assert.equal(errors.length, 3);
});

test("validateBosses rejects a boss without rewards", () => {
  const { errors } = validateBosses({ bosses: [{ siteId: "x", mode: "grim_surge" }], items: bossItems });
  assert.match(errors[0], /no rewards/);
});

const rewardData = (over = {}) => ({
  events: {
    201110003: { kind: "leaderboard", rankType: 3, ranks: [{ from: 1, to: 1, rewards: [[103, 1013, 50]] }] },
  },
  items: { "103/1013": { name: "Luminous Key", icon: "A_UI_Props_Totem_Gacha" } },
  ...over,
});

test("valid event rewards produce no errors", () => {
  assert.deepEqual(validateEventRewards(rewardData(), new Set([201110003])), { errors: [], warnings: [] });
});

test("event rewards: a reward missing from items and a bad rank range are errors", () => {
  const data = rewardData({
    events: { 5: { kind: "leaderboard", ranks: [{ from: 3, to: 1, rewards: [[103, 999, 1]] }] } },
  });
  const { errors } = validateEventRewards(data);
  assert.equal(errors.length, 2);
  assert.match(errors.join("\n"), /bad rank range/);
  assert.match(errors.join("\n"), /103\/999 missing from items/);
});

test("event rewards: a wish list needs rewards that exist in items", () => {
  const ok = rewardData({ events: { 7: { kind: "wishlist", rewards: [[103, 1013, 1]] } } });
  assert.deepEqual(validateEventRewards(ok), { errors: [], warnings: [] });
  const bad = rewardData({ events: { 7: { kind: "wishlist", rewards: [] }, 8: { kind: "wishlist", rewards: [[103, 5, 1]] } } });
  assert.equal(validateEventRewards(bad).errors.length, 2);
});
