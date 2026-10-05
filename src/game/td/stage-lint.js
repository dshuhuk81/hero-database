// Campaign Encounter Pacing lint (docs/superpowers/specs/2026-10-05-timeline-stages-design.md): checks a stage's
// timeline against the WoR-shaped chapter table (tuning.timeline.chapterTargets) and a few readability rules.
// Report only: nothing here edits tdCampaign.json. All thresholds are first guesses.
import { expandTimeline, timelineTotals } from "./timeline.js";
import { chapterTarget } from "./timeline-targets.js";

export const RULES = {
  tolerance: 0.25, // enemies and spawn window may differ this much from the chapter target
  minGroupsShare: 0.6, // at least this share of the target group count
  windowSeconds: 20, // sliding window for the mix rules
  maxKindsPerWindow: 4,
  maxFlyersPerWindow: 6,
  openingSeconds: 10,
  openingMaxPerGate: 2,
};

// Densest `windowSeconds` window: kinds present and flyers inside it.
function windows(queue, seconds) {
  let kinds = 0;
  let flyers = 0;
  for (const entry of queue) {
    const inside = queue.filter((other) => other.at >= entry.at && other.at < entry.at + seconds && other.kind !== "boss");
    kinds = Math.max(kinds, new Set(inside.map((other) => other.kind)).size);
    flyers = Math.max(flyers, inside.filter((other) => other.kind === "flyer").length);
  }
  return { kinds, flyers };
}

export function lintTimeline({ timeline, chapter, position = 0.5, gates = 1, tuning }) {
  const target = chapterTarget(tuning, chapter, position);
  const totals = timelineTotals(timeline);
  const queue = expandTimeline(timeline, { gates, spacingMs: tuning.timeline?.spacingMs ?? 700 });
  const flags = [];
  const off = (value, goal) => Math.abs(value - goal) > goal * RULES.tolerance;
  if (off(totals.total, target.enemies)) flags.push(`enemies ${totals.total} vs target ${target.enemies}`);
  if (off(totals.lastAt, target.lastSpawnS)) flags.push(`last spawn ${Math.round(totals.lastAt)} s vs target ${target.lastSpawnS} s`);
  if (totals.groups < target.groups * RULES.minGroupsShare) flags.push(`groups ${totals.groups} vs target ${target.groups}`);
  const mix = windows(queue, RULES.windowSeconds);
  if (mix.kinds > RULES.maxKindsPerWindow) flags.push(`${mix.kinds} kinds within ${RULES.windowSeconds} s`);
  if (mix.flyers > RULES.maxFlyersPerWindow) flags.push(`${mix.flyers} flyers within ${RULES.windowSeconds} s`);
  const opening = {};
  for (const entry of queue.filter((e) => e.at < RULES.openingSeconds)) opening[entry.lane] = (opening[entry.lane] ?? 0) + 1;
  const perGate = Math.max(0, ...Object.values(opening));
  if (gates > 1 && perGate > RULES.openingMaxPerGate) flags.push(`${perGate} enemies per gate in the first ${RULES.openingSeconds} s`);
  return { total: totals.total, groups: totals.groups, lastSpawnS: Math.round(totals.lastAt), pressure: totals.lastAt ? Math.round((totals.total / totals.lastAt) * 100) / 100 : totals.total, target, flags };
}

export function stageLintRows({ campaign, maps, tuning }) {
  const rows = [];
  for (const chapter of campaign.chapters) {
    chapter.stages.forEach((stage, index) => {
      const map = maps.find((entry) => entry.id === stage.mapId);
      if (!map) return;
      const position = chapter.stages.length > 1 ? index / (chapter.stages.length - 1) : 0;
      rows.push({ stageId: stage.id, name: stage.name, chapter: chapter.id, gates: Math.max(1, map.lanes?.length ?? 1), ...lintTimeline({ timeline: stage.timeline, chapter: chapter.id, position, gates: Math.max(1, map.lanes?.length ?? 1), tuning }) });
    });
  }
  return rows;
}
