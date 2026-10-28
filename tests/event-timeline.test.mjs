import test from "node:test";
import assert from "node:assert/strict";
import { assignLanes, daysUntil, runningEvents, upcomingEvents } from "../src/data/eventTimeline.js";

const ev = (id, start, end, category = "events") => ({ id, label: `e${id}`, start, end, category });
const TODAY = "2026-10-28";

test("daysUntil counts whole days between ISO dates", () => {
  assert.equal(daysUntil("2026-10-28", TODAY), 0);
  assert.equal(daysUntil("2026-10-31", TODAY), 3);
  assert.equal(daysUntil("2026-10-27", TODAY), -1);
  assert.equal(daysUntil("2026-11-02", "2026-10-31"), 2);
});

test("running covers an event ending today, starting today and spanning today", () => {
  const events = [ev(1, "2026-10-20", "2026-10-28"), ev(2, "2026-10-28", "2026-11-05"), ev(3, "2026-10-01", "2026-12-01"), ev(4, "2026-10-29", "2026-11-01"), ev(5, "2026-10-01", "2026-10-27")];
  assert.deepEqual(runningEvents(events, TODAY).map((e) => e.id), [1, 2, 3]);
});

test("running events are ordered by end date, banners first on a tie", () => {
  const events = [ev(1, "2026-10-20", "2026-11-10"), ev(2, "2026-10-20", "2026-11-03", "offers"), ev(3, "2026-10-20", "2026-11-03", "banners")];
  assert.deepEqual(runningEvents(events, TODAY).map((e) => e.id), [3, 2, 1]);
});

test("upcoming excludes running events, sorts by start and honours the limit", () => {
  const events = [ev(1, "2026-11-05", "2026-11-06"), ev(2, "2026-10-28", "2026-10-30"), ev(3, "2026-10-29", "2026-11-01"), ev(4, "2026-11-20", "2026-11-22")];
  assert.deepEqual(upcomingEvents(events, TODAY, 2).map((e) => e.id), [3, 1]);
});

test("lanes: non-overlapping events share lane 0, overlapping ones stack", () => {
  const lanes = assignLanes([ev(1, "2026-11-01", "2026-11-05"), ev(2, "2026-11-03", "2026-11-08"), ev(3, "2026-11-06", "2026-11-09")]);
  assert.deepEqual(lanes.map((e) => [e.id, e.lane]), [[1, 0], [2, 1], [3, 0]]);
});

test("lanes: an event starting the day another ends needs its own lane", () => {
  const lanes = assignLanes([ev(1, "2026-11-01", "2026-11-05"), ev(2, "2026-11-05", "2026-11-07")]);
  assert.deepEqual(lanes.map((e) => e.lane), [0, 1]);
});
