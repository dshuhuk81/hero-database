import test from "node:test";
import assert from "node:assert/strict";
import { validateEvents, validateHeroReleases } from "../scripts/lib/game-data.mjs";

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
