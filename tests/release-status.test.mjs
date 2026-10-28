import test from "node:test";
import assert from "node:assert/strict";
import { releaseStatus, effectiveRelease } from "../src/data/releaseStatus.js";

test("the release day itself counts as released", () => {
  assert.equal(releaseStatus("2026-10-28", "2026-10-28"), "released");
});

test("a later date is upcoming and an earlier one is released", () => {
  assert.equal(releaseStatus("2026-11-02", "2026-10-28"), "upcoming");
  assert.equal(releaseStatus("2026-07-08", "2026-10-28"), "released");
});

test("no date means unscheduled", () => {
  assert.equal(releaseStatus(null, "2026-10-28"), "unscheduled");
});

test("without a client date the earliest event start is used", () => {
  assert.deepEqual(effectiveRelease(null, ["2026-12-18", "2026-12-07"]), { date: "2026-12-07", source: "event" });
});

test("a client date wins over event starts", () => {
  assert.deepEqual(effectiveRelease("2026-11-13", ["2026-12-07"]), { date: "2026-11-13", source: "client" });
});

test("no client date and no events gives none", () => {
  assert.deepEqual(effectiveRelease(null, []), { date: null, source: "none" });
});
