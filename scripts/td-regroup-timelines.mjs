// Regroups the spawn timeline of every stage with more than `--min` enemies into groups of `--size`
// enemies (one every tuning.timeline.spacingMs), with `--pause` ms of quiet after each group's last spawn
// before the next group starts. Enemy kinds, their order and the total stay the same; the boss follows the
// last group after one pause (it still waits for the field to clear, sim.js). Stages up to `--min` enemies
// are left alone. Groups are split evenly (round(total / size) groups), so every group holds size-1..size+1.
// `--max-brood=N` keeps at most N Broodcallers per stage (extras become the stage's most common other kind);
// `--cap=N` thins stages so minions + boss + every Broodcaller's lifetime imps stay at N or fewer.
// With `--thin`, stages above their chapter's enemy ramp (ENEMY_RAMP, first -> last stage, boss not counted)
// first lose evenly spread enemies, so counts do not outgrow the player: chapter 1 stays at 8-12, chapter 2 at 12-16.
// Usage: node scripts/td-regroup-timelines.mjs [--size=5] [--pause=12000] [--min=10] [--thin] [--max-brood=1] [--cap=30] [--write]
//        (default: print a report only). Re-tune hpScale afterwards (scripts/td-board-tune.mjs).
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import { expandTimeline, timelineTotals, validateTimeline } from "../src/game/td/timeline.js";

const arg = (name, fallback) => Number(process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback);
const SIZE = arg("size", 5);
const PAUSE = arg("pause", 12000);
const MIN = arg("min", 10);
const MAX_BROOD = arg("max-brood", Infinity);
const CAP = arg("cap", Infinity);
const SPACING = tuning.timeline?.spacingMs ?? 700;
const IMPS = tuning.enemies.broodcaller?.summon?.total ?? 0;
// Enemies per stage (boss excluded) from the chapter's first to its last stage.
export const ENEMY_RAMP = { 1: [8, 12], 2: [12, 16], 3: [14, 18], 4: [16, 21], 5: [17, 22], 6: [18, 24], 7: [20, 26], 8: [22, 28], 9: [16, 22], 10: [18, 24], 11: [20, 26], 12: [20, 26], 13: [22, 28] };
const rampTarget = (chapter, index, count) => { const [first, last] = ENEMY_RAMP[chapter] ?? [Infinity, Infinity]; return Math.round(first + ((last - first) * index) / Math.max(1, count - 1)); };

export function regroup(timeline, { size = SIZE, pause = PAUSE, spacing = SPACING, limit = Infinity, maxBrood = Infinity, cap = Infinity } = {}) {
  const bosses = timeline.filter((group) => group.kind === "boss");
  let minions = expandTimeline(timeline.filter((group) => group.kind !== "boss"), { gates: 1, spacingMs: spacing }).map((entry) => entry.kind);
  const tally = {};
  for (const kind of minions) if (kind !== "broodcaller") tally[kind] = (tally[kind] ?? 0) + 1;
  const common = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "grunt";
  let brood = 0;
  minions = minions.map((kind) => (kind === "broodcaller" && ++brood > maxBrood ? common : kind));
  const broods = Math.min(brood, maxBrood);
  limit = Math.min(limit, cap - bosses.length - broods * IMPS);
  if (minions.length > limit) { const all = minions; minions = Array.from({ length: limit }, (_, i) => all[Math.floor(((i + 0.5) * all.length) / limit)]); }
  const start = Math.min(...timeline.filter((group) => group.kind !== "boss").map((group) => group.startMs));
  const chunks = [];
  const groups = Math.max(1, Math.round(minions.length / size));
  for (let g = 0, from = 0; g < groups; g += 1) {
    const to = Math.round(((g + 1) * minions.length) / groups);
    chunks.push(minions.slice(from, to));
    from = to;
  }
  const out = [];
  let cursor = start;
  for (const chunk of chunks) {
    let index = 0;
    while (index < chunk.length) {
      let end = index;
      while (end < chunk.length && chunk[end] === chunk[index]) end += 1;
      out.push({ startMs: cursor + index * spacing, kind: chunk[index], count: end - index });
      index = end;
    }
    cursor += (chunk.length - 1) * spacing + pause;
  }
  for (const boss of bosses) out.push({ ...boss, startMs: cursor });
  return out;
}

function main() {
  const path = new URL("../src/data/tdCampaign.json", import.meta.url);
  const campaign = JSON.parse(readFileSync(path, "utf8"));
  const rows = [["stage", "enemies", "groups", "last spawn s", "->", "enemies", "groups", "last spawn s"].join("\t")];
  for (const chapter of campaign.chapters) {
    for (const [index, stage] of chapter.stages.entries()) {
      const before = timelineTotals(stage.timeline);
      if (before.total - (before.counts.boss ?? 0) <= MIN) continue;
      const limit = process.argv.includes("--thin") ? rampTarget(chapter.id, index, chapter.stages.length) : Infinity;
      const timeline = regroup(stage.timeline, { limit, maxBrood: MAX_BROOD, cap: CAP });
      const after = timelineTotals(timeline);
      const errors = validateTimeline(timeline);
      if ((after.total !== before.total && !(after.total < before.total)) || errors.length) throw new Error(`${stage.id}: total ${before.total} -> ${after.total} ${errors}`);
      rows.push([stage.id, before.total, before.groups, Math.round(before.lastAt), "->", after.total, after.groups, Math.round(after.lastAt)].join("\t"));
      stage.timeline = timeline;
    }
  }
  console.log(rows.join("\n"));
  if (process.argv.includes("--write")) writeFileSync(path, `${JSON.stringify(campaign, null, 2)}\n`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
