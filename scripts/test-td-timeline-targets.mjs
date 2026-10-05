import assert from "node:assert/strict";
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import { chapterTarget } from "../src/game/td/timeline-targets.js";

const first = chapterTarget(tuning, 1, 0), last = chapterTarget(tuning, 1, 1);
assert.deepEqual(first, { enemies: 9, groups: 7, lastSpawnS: 42 }, "chapter 1 starts at 0.8x");
assert.deepEqual(last, { enemies: 13, groups: 11, lastSpawnS: 64 }, "chapter 1 ends at 1.2x");
assert.deepEqual(chapterTarget(tuning, 13, 0.5), chapterTarget(tuning, 11, 0.5), "chapters above 11 reuse row 11");
assert.ok(chapterTarget(tuning, 4, 0.5).enemies === 32, "the middle of a chapter is the row itself");
console.log("Timeline target checks passed.");
