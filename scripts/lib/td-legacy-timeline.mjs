// Test helpers for the timeline model. Not used by game code.
import legacyWaves from "./td-test-waves.json" with { type: "json" };

// Old wave fixtures -> one timeline: each old wave starts `gapS` seconds after the previous wave's last spawn, each
// old group becomes { startMs, kind, count: 1, repeat: count, everyMs: gapMs }.
export function legacyTimeline(waves, { gapS = 12 } = {}) {
  const timeline = [];
  let cursor = 0;
  for (const wave of waves) {
    let waveEnd = cursor;
    for (const group of wave.spawns) {
      const everyMs = Math.max(1, group.gapMs ?? 700);
      timeline.push({ startMs: cursor, kind: group.kind, count: 1, ...(group.count > 1 && { repeat: group.count, everyMs }) });
      waveEnd = Math.max(waveEnd, cursor + (group.count - 1) * everyMs);
    }
    cursor = waveEnd + gapS * 1000;
  }
  return timeline;
}

// The first old wave as a timeline: a short real fight.
export const FIRST_FIGHT = legacyTimeline(legacyWaves.slice(0, 1));
export const ALL_OLD_WAVES = legacyWaves;
// Three old waves as one timeline: long enough for blessing milestones to open.
export const LONG_FIGHT = legacyTimeline(legacyWaves.slice(0, 3));
// A stage that never spawns during a test (one enemy 10 000 s away): combat tests spawn their own enemies and the
// stage stays open, so killing them does not end the run.
export const OPEN_TIMELINE = [{ startMs: 10_000_000, kind: "grunt", count: 1 }];
