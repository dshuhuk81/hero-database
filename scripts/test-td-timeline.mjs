import assert from "node:assert/strict";
import { expandTimeline, timelineTotals, validateTimeline } from "../src/game/td/timeline.js";

const timeline = [
  { startMs: 3000, kind: "grunt", count: 2, repeat: 3, everyMs: 4000 },
  { startMs: 21000, kind: "flyer", count: 1 },
  { startMs: 40000, kind: "boss", count: 1 },
];

// Totals: 2 x 3 + 1 + 1.
assert.deepEqual(timelineTotals(timeline), { total: 8, counts: { grunt: 6, flyer: 1, boss: 1 }, lastAt: 40, groups: 3 });

// Expansion: repeats at 3 s, 7 s, 11 s; two enemies per repeat 700 ms apart; sorted by time.
const queue = expandTimeline(timeline, { gates: 1, spacingMs: 700 });
assert.equal(queue.length, 8);
assert.deepEqual(queue.slice(0, 4).map((e) => e.at), [3, 3.7, 7, 7.7]);
assert.deepEqual(queue.map((e) => e.at), [...queue.map((e) => e.at)].sort((a, b) => a - b), "sorted by time");
assert.equal(queue.at(-1).kind, "boss");

// Gates alternate across the whole timeline, so single-enemy groups use both gates.
const two = expandTimeline([{ startMs: 0, kind: "flyer", count: 1, repeat: 4, everyMs: 1000 }], { gates: 2 });
assert.deepEqual(two.map((e) => e.lane), [0, 1, 0, 1], "one enemy per repeat alternates gates");
const pair = expandTimeline([{ startMs: 0, kind: "grunt", count: 2 }, { startMs: 5000, kind: "grunt", count: 3 }], { gates: 2 });
assert.deepEqual(pair.map((e) => e.lane), [0, 1, 0, 1, 0], "the gate counter continues across groups");

// Validation.
assert.deepEqual(validateTimeline(timeline), []);
assert.ok(validateTimeline("x").length, "non-array is rejected");
assert.ok(validateTimeline([{ startMs: -1, kind: "grunt", count: 1 }]).some((m) => m.includes("startMs")), "negative start");
assert.ok(validateTimeline([{ startMs: 0, kind: "grunt", count: 0 }]).some((m) => m.includes("count")), "zero count");
assert.ok(validateTimeline([{ startMs: 0, kind: "grunt", count: 1, repeat: 2 }]).some((m) => m.includes("everyMs")), "repeat needs everyMs");
console.log("Timeline checks passed.");
