// Per-stage enemy count, group count and spawn window, from the WoR chapter table in tuning.timeline.
export function chapterTarget(tuning, chapter, position = 0.5) {
  const rows = tuning.timeline.chapterTargets;
  const row = rows.find((entry) => entry.chapter === chapter) ?? rows.at(-1);
  const factor = 0.8 + 0.4 * Math.min(1, Math.max(0, position));
  return { enemies: Math.round(row.enemies * factor), groups: Math.round(row.groups * factor), lastSpawnS: Math.round(row.lastSpawnS * factor) };
}
