// One-off migration: stage.waves -> stage.timeline following the WoR chapter table
// (docs/superpowers/specs/2026-10-05-timeline-stages-design.md).
// Usage: node scripts/td-stage-convert.mjs [--write]   (default: print a report only)
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import { chapterTarget } from "../src/game/td/timeline-targets.js";
import { timelineTotals, validateTimeline } from "../src/game/td/timeline.js";

const SHAPE_COUNT = (kind) => (["grunt", "runner", "flyer"].includes(kind) ? 0.4 : 0.2); // the old board.waveShape counts
const HEAVY = ["brute", "broodcaller"]; // spawn one at a time
const HEALTH_KEPT = 0.6; // share of the removed enemies' total health that hpScale gives back

// Scale the authored groups so the total hits the chapter target, keep each kind's share (min 1 per group), and lay the
// groups on a WoR-like cadence: each former wave becomes a cluster, clusters are spread over the target window.
export function convertStage({ stage, chapter, index, count }) {
  const target = chapterTarget(tuning, chapter, count > 1 ? index / (count - 1) : 0);
  const spawns = stage.waves.flatMap((wave) => wave.spawns);
  const shaped = (spawn) => (spawn.kind === "boss" ? 1 : Math.max(1, Math.round(spawn.count * SHAPE_COUNT(spawn.kind))));
  const oldTotal = spawns.reduce((sum, spawn) => sum + shaped(spawn), 0);
  const bossCount = spawns.filter((spawn) => spawn.kind === "boss").length;
  const budget = Math.max(1, target.enemies - bossCount);
  const scale = budget / Math.max(1, oldTotal - bossCount);

  const clusters = stage.waves.map((wave) => wave.spawns.filter((spawn) => spawn.kind !== "boss")).filter((cluster) => cluster.length);
  // Per group totals, then trim or pad the largest groups until the sum equals the budget.
  const plan = clusters.map((cluster) => cluster.map((spawn) => ({ spawn, total: Math.max(1, Math.round(shaped(spawn) * scale)) })));
  const flat = plan.flat();
  let sum = flat.reduce((n, entry) => n + entry.total, 0);
  while (sum !== budget && flat.length) {
    const entry = sum > budget ? flat.filter((e) => e.total > 1).sort((a, b) => b.total - a.total)[0] : flat.sort((a, b) => b.total - a.total)[0];
    if (!entry) break;
    entry.total += sum > budget ? -1 : 1;
    sum += sum > budget ? -1 : 1;
  }

  const window = target.lastSpawnS * 1000;
  const lead = 3000;
  const timeline = [];
  const span = (window - lead) / Math.max(1, plan.length);
  plan.forEach((cluster, c) => {
    const clusterStart = lead + Math.round(span * c);
    cluster.forEach(({ spawn, total }, s) => {
      const perRepeat = Math.min(total, HEAVY.includes(spawn.kind) ? 1 : Math.max(1, Math.ceil(total / 3)));
      const repeat = Math.ceil(total / perRepeat);
      const everyMs = Math.max(2500, Math.round((span * 0.8) / Math.max(1, repeat)));
      // The last repeat may be short: emit a remainder group so the total is exact.
      const full = Math.floor(total / perRepeat);
      const rest = total - full * perRepeat;
      const startMs = clusterStart + Math.round((span * 0.6 * s) / cluster.length); // the kinds of a cluster follow each other
      timeline.push({ startMs, kind: spawn.kind, count: perRepeat, ...(full > 1 && { repeat: full, everyMs }) });
      if (rest) timeline.push({ startMs: startMs + full * everyMs, kind: spawn.kind, count: rest });
    });
  });
  for (const spawn of spawns.filter((entry) => entry.kind === "boss")) timeline.push({ startMs: Math.max(window, ...timeline.map((g) => g.startMs + ((g.repeat ?? 1) - 1) * (g.everyMs ?? 0))) + 2000, kind: "boss", count: 1 });
  timeline.sort((a, b) => a.startMs - b.startMs);
  const newTotal = timelineTotals(timeline).total;
  // Fewer, tougher enemies are harder at equal total health (bot measurement, October 5): keep 0.6 of the lost health (owner found the old late-chapter-1 stages too hard).
  const hpScale = Math.round((stage.hpScale ?? 1) * Math.min(2.5, Math.max(1, (oldTotal / newTotal) * HEALTH_KEPT)) * 100) / 100;
  return { timeline, hpScale, report: { old: oldTotal, now: newTotal, target: target.enemies, errors: validateTimeline(timeline) } };
}

function main() {
  const path = new URL("../src/data/tdCampaign.json", import.meta.url);
  const campaign = JSON.parse(readFileSync(path, "utf8"));
  const rows = [];
  for (const chapter of campaign.chapters) {
    chapter.stages.forEach((stage, index) => {
      if (!stage.waves) return;
      const result = convertStage({ stage, chapter: chapter.id, index, count: chapter.stages.length });
      rows.push(`${stage.id}: ${result.report.old} -> ${result.report.now} enemies (target ${result.report.target}), hpScale ${stage.hpScale} -> ${result.hpScale}${result.report.errors.length ? ` ERRORS ${result.report.errors}` : ""}`);
      stage.timeline = result.timeline;
      stage.hpScale = result.hpScale;
      delete stage.waves;
    });
  }
  console.log(rows.join("\n"));
  if (process.argv.includes("--write")) writeFileSync(path, `${JSON.stringify(campaign, null, 2)}\n`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
