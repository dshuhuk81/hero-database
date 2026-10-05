// Regroups the spawn timeline of every stage with more than `--min` enemies into groups of `--size`
// enemies (one every tuning.timeline.spacingMs), with `--pause` ms of quiet after each group's last spawn
// before the next group starts. Enemy kinds, their order and the total stay the same; the boss follows the
// last group after one pause (it still waits for the field to clear, sim.js). Stages up to `--min` enemies
// are left alone. A leftover group smaller than 3 joins the previous one.
// Usage: node scripts/td-regroup-timelines.mjs [--size=5] [--pause=3000] [--min=10] [--write]
//        (default: print a report only). Re-tune hpScale afterwards (scripts/td-board-tune.mjs).
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import { expandTimeline, timelineTotals, validateTimeline } from "../src/game/td/timeline.js";

const arg = (name, fallback) => Number(process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback);
const SIZE = arg("size", 5);
const PAUSE = arg("pause", 3000);
const MIN = arg("min", 10);
const SPACING = tuning.timeline?.spacingMs ?? 700;

export function regroup(timeline, { size = SIZE, pause = PAUSE, spacing = SPACING } = {}) {
  const bosses = timeline.filter((group) => group.kind === "boss");
  const minions = expandTimeline(timeline.filter((group) => group.kind !== "boss"), { gates: 1, spacingMs: spacing }).map((entry) => entry.kind);
  const start = Math.min(...timeline.filter((group) => group.kind !== "boss").map((group) => group.startMs));
  const chunks = [];
  for (let i = 0; i < minions.length; i += size) chunks.push(minions.slice(i, i + size));
  if (chunks.length > 1 && chunks.at(-1).length < 3) chunks[chunks.length - 2].push(...chunks.pop());
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
  const rows = [["stage", "enemies", "groups", "last spawn s", "->", "groups", "last spawn s"].join("\t")];
  for (const chapter of campaign.chapters) {
    for (const stage of chapter.stages) {
      const before = timelineTotals(stage.timeline);
      if (before.total - (before.counts.boss ?? 0) <= MIN) continue;
      const timeline = regroup(stage.timeline);
      const after = timelineTotals(timeline);
      const errors = validateTimeline(timeline);
      if (after.total !== before.total || errors.length) throw new Error(`${stage.id}: total ${before.total} -> ${after.total} ${errors}`);
      rows.push([stage.id, before.total, before.groups, Math.round(before.lastAt), "->", after.groups, Math.round(after.lastAt)].join("\t"));
      stage.timeline = timeline;
    }
  }
  console.log(rows.join("\n"));
  if (process.argv.includes("--write")) writeFileSync(path, `${JSON.stringify(campaign, null, 2)}\n`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
