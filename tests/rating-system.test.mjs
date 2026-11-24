import test from "node:test";
import assert from "node:assert/strict";
import { calculateOverall, rankHeroesForBoss, resolveHeroRatings } from "../src/data/ratings/ratingSystem.js";

test("calculates a complete weighted Overall", () => {
  const result = calculateOverall({
    pveearly: "S",
    pvemidgame: "S",
    pveendgame: "A",
    pvpearly: "B",
    pvpmidgame: "A",
    pvpendgame: "S",
  });

  assert.equal(result.score, 4.6);
  assert.equal(result.tier, "S");
  assert.equal(result.complete, true);
});

test("normalizes weights when ratings are missing", () => {
  const result = calculateOverall({ pveearly: "S", pveendgame: "A" });

  assert.equal(result.score, 4.56);
  assert.equal(result.tier, "A");
  assert.equal(result.complete, false);
  assert.equal(result.ratedFields, 2);
});

test("applies and caps editorial adjustments to one tier", () => {
  const result = calculateOverall({
    pveearly: "A",
    overallAdjustment: 9,
    overallReason: "Exceptional account impact.",
  });

  assert.equal(result.baseTier, "A");
  assert.equal(result.adjustment, 1);
  assert.equal(result.tier, "S");
});

test("returns no Overall without contextual ratings", () => {
  assert.equal(calculateOverall({}).tier, null);
});

test("boss ratings pass through but never change Overall", () => {
  const base = { pveearly: "A", pvemidgame: "A", pveendgame: "A", pvpearly: "A", pvpmidgame: "A", pvpendgame: "A" };
  const withBoss = resolveHeroRatings({ ...base, bosses: { baphomet: "S+", lilith: "X" } });
  assert.equal(withBoss.overall, resolveHeroRatings(base).overall);
  assert.deepEqual(withBoss.bosses, { baphomet: "S+" });
  assert.deepEqual(resolveHeroRatings(base).bosses, {});
});

test("rankHeroesForBoss sorts by tier, then name, and skips unrated heroes", () => {
  const hero = (name, tier) => ({ name, ratings: { bosses: tier ? { baphomet: tier } : {} } });
  const ranked = rankHeroesForBoss([hero("Zeus", "A"), hero("Isis", "S+"), hero("Anubis", "A"), hero("Ares")], "baphomet");
  assert.deepEqual(ranked.map(({ hero: h, tier }) => `${h.name}:${tier}`), ["Isis:S+", "Anubis:A", "Zeus:A"]);
});
