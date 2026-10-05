// A stage's enemies as one timeline of spawn groups (Watcher of Realms style) instead of waves.
// group = { startMs, kind, count, repeat = 1, everyMs = 0 }: `count` enemies at startMs (one every spacingMs),
// repeated `repeat` times every `everyMs`. Pure and deterministic. See
// docs/superpowers/specs/2026-10-05-timeline-stages-design.md.
export const DEFAULT_SPACING_MS = 700;

export function validateTimeline(timeline) {
  if (!Array.isArray(timeline)) return ["timeline must be an array"];
  const errors = [];
  timeline.forEach((group, i) => {
    const at = `group ${i + 1}`;
    if (!group || typeof group.kind !== "string") errors.push(`${at}: kind missing`);
    if (!(group?.startMs >= 0)) errors.push(`${at}: startMs must be 0 or more`);
    if (!(group?.count >= 1)) errors.push(`${at}: count must be 1 or more`);
    if ((group?.repeat ?? 1) > 1 && !(group?.everyMs > 0)) errors.push(`${at}: repeat needs everyMs`);
  });
  return errors;
}

export function timelineTotals(timeline) {
  const counts = {};
  let total = 0;
  let lastAt = 0;
  for (const group of timeline) {
    const repeat = group.repeat ?? 1;
    const n = group.count * repeat;
    counts[group.kind] = (counts[group.kind] ?? 0) + n;
    total += n;
    lastAt = Math.max(lastAt, (group.startMs + (repeat - 1) * (group.everyMs ?? 0)) / 1000);
  }
  return { total, counts, lastAt, groups: timeline.length };
}

export function expandTimeline(timeline, { gates = 1, spacingMs = DEFAULT_SPACING_MS } = {}) {
  const queue = [];
  let turn = 0; // one counter for the whole timeline: gates take turns across groups
  timeline.forEach((group, groupIndex) => {
    const repeat = group.repeat ?? 1;
    for (let r = 0; r < repeat; r += 1) {
      for (let i = 0; i < group.count; i += 1) {
        const at = (group.startMs + r * (group.everyMs ?? 0) + i * spacingMs) / 1000;
        queue.push({ at: Math.round(at * 1000) / 1000, kind: group.kind, lane: turn++ % Math.max(1, gates), group: groupIndex });
      }
    }
  });
  return queue.sort((a, b) => a.at - b.at || a.group - b.group);
}
