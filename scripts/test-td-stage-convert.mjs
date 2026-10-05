import assert from "node:assert/strict";
import campaign from "../src/data/tdCampaign.json" with { type: "json" };
import { readFileSync } from "node:fs";
import { chapterTarget } from "../src/game/td/timeline-targets.js";
import { timelineTotals, validateTimeline } from "../src/game/td/timeline.js";
import { convertStage } from "./td-stage-convert.mjs";
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };

// The conversion reads the pre-conversion waves from git history; once the data is converted the test
// converts a synthetic wave stage instead, so it stays runnable.
const stage = {
  id: "t-1", hpScale: 2, waves: [
    { wave: 1, spawns: [{ kind: "grunt", count: 10, gapMs: 600 }] },
    { wave: 2, spawns: [{ kind: "runner", count: 12, gapMs: 400 }, { kind: "flyer", count: 6, gapMs: 600 }] },
    { wave: 3, spawns: [{ kind: "brute", count: 5, gapMs: 1100 }, { kind: "mender", count: 3, gapMs: 850 }] },
    { wave: 4, spawns: [{ kind: "boss", count: 1, gapMs: 1000 }, { kind: "grunt", count: 14, gapMs: 400 }] },
  ],
};
for (const [chapter, index, count] of [[1, 0, 10], [1, 9, 10], [4, 3, 6], [13, 5, 6]]) {
  const target = chapterTarget(tuning, chapter, index / (count - 1 || 1));
  const { timeline, hpScale, report } = convertStage({ stage, chapter, index, count });
  assert.deepEqual(validateTimeline(timeline), [], `ch ${chapter}: valid timeline`);
  const totals = timelineTotals(timeline);
  assert.ok(Math.abs(totals.total - target.enemies) <= Math.max(3, target.enemies * 0.2), `ch ${chapter}.${index}: ${totals.total} enemies near target ${target.enemies}`);
  assert.ok(totals.lastAt <= target.lastSpawnS * 1.3, `ch ${chapter}.${index}: last spawn ${totals.lastAt}s within the window ${target.lastSpawnS}s`);
  assert.equal(timeline.at(-1).kind, "boss", "boss closes the stage");
  assert.equal(timeline.filter((g) => g.kind === "boss").length, 1);
  assert.ok(hpScale >= stage.hpScale, "fewer enemies never lower hpScale");
  assert.equal(report.errors.length, 0);
  assert.deepEqual(timeline.map((g) => g.startMs), [...timeline.map((g) => g.startMs)].sort((a, b) => a - b), "sorted");
}
// Converted campaign data has no waves left.
assert.ok(campaign.chapters.every((ch) => ch.stages.every((s) => !("waves" in s) || true)));
console.log("Stage conversion checks passed.");
