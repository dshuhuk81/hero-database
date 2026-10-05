// Campaign Encounter Pacing, phase 0 (docs/superpowers/specs/2026-10-05-campaign-encounter-pacing-design.md).
// Reads what the simulator really spawns for each wave of a stage and checks it against the pacing rules.
// Report only: nothing here edits tdCampaign.json. All thresholds are first guesses from the WoR comparison.
import { TowerDefenseGame } from "./sim.js";

// Enemies per stage (after board.waveShape; the boss counts), by chapter group. Each range ramps linearly
// from the chapter's first stage (start) to its last (end).
export const STAGE_TARGETS = [
  { from: 1, to: 1, start: [12, 18], end: [20, 30] },
  { from: 2, to: 2, start: [20, 26], end: [26, 32] },
  { from: 3, to: 4, start: [28, 34], end: [32, 38] },
  { from: 5, to: 99, start: [32, 38], end: [36, 42] },
];
export const RULES = {
  maxKindsPerWave: { early: 2, later: 3 }, // early = chapter 1, stages 1 to 5
  maxFlyersPerWave: 6,
  supportKinds: ["mender", "shieldbearer", "hexer", "broodcaller"],
  maxSupportKindsPerWave: 1,
  maxBurstPer10s: 8, // enemies spawned inside any 10 s window of one wave
  firstWaveGateWindowS: 10,
  firstWaveGateMaxPerGate: 2,
};

// position: 0 for the chapter's first stage, 1 for its last.
export function targetFor(chapter, position = 0) {
  const t = STAGE_TARGETS.find((entry) => chapter >= entry.from && chapter <= entry.to) ?? STAGE_TARGETS.at(-1);
  const at = (i) => Math.round(t.start[i] + (t.end[i] - t.start[i]) * Math.min(1, Math.max(0, position)));
  return { min: at(0), max: at(1) };
}

// Per wave: kind counts, total, last spawn time, densest 10 s window and the first-10-seconds count per gate.
export function waveBreakdown({ stage, map, tuning }) {
  const effectiveMap = stage.boss ? { ...map, boss: stage.boss } : map;
  return (stage.waves ?? []).map((_, waveIndex) => {
    const game = new TowerDefenseGame({ heroes: [], tuning, map: effectiveMap, waves: stage.waves, mode: "classic", tier: "normal", seed: 1, lives: stage.lives, hpScale: stage.hpScale ?? 1 });
    game.wave = waveIndex;
    if (!game.startWave()) return { wave: waveIndex + 1, kinds: {}, total: 0, last: 0, burst10: 0, firstWindowPerGate: 0 };
    const queue = [...game.spawnQueue].sort((a, b) => a.at - b.at);
    const kinds = {};
    for (const entry of queue) kinds[entry.kind] = (kinds[entry.kind] ?? 0) + 1;
    let burst10 = 0;
    for (const entry of queue) burst10 = Math.max(burst10, queue.filter((other) => other.at >= entry.at && other.at < entry.at + 10).length);
    const early = queue.filter((entry) => entry.at < RULES.firstWaveGateWindowS);
    const perGate = {};
    for (const entry of early) perGate[entry.lane ?? 0] = (perGate[entry.lane ?? 0] ?? 0) + 1;
    return { wave: waveIndex + 1, kinds, total: queue.length, last: queue.at(-1)?.at ?? 0, burst10, firstWindowPerGate: Math.max(0, ...Object.values(perGate)) };
  });
}

export function lintStage({ stage, map, tuning, index = 0, count = 1 }) {
  const waves = waveBreakdown({ stage, map, tuning });
  const chapter = Number(stage.chapter);
  const total = waves.reduce((sum, w) => sum + w.total, 0);
  const flyers = waves.reduce((sum, w) => sum + (w.kinds.flyer ?? 0), 0);
  const gates = Math.max(1, map?.lanes?.length ?? 1);
  const target = targetFor(chapter, count > 1 ? index / (count - 1) : 0);
  const flags = [];
  if (total > target.max) flags.push(`count ${total} > ${target.max}`);
  if (total < target.min) flags.push(`count ${total} < ${target.min}`);
  for (const w of waves) {
    const kindNames = Object.keys(w.kinds).filter((k) => k !== "boss");
    const limit = chapter === 1 && index < 5 ? RULES.maxKindsPerWave.early : RULES.maxKindsPerWave.later; // chapter 1, stages 1 to 5
    if (kindNames.length > limit) flags.push(`w${w.wave} kinds ${kindNames.length} > ${limit}`);
    if ((w.kinds.flyer ?? 0) > RULES.maxFlyersPerWave) flags.push(`w${w.wave} flyers ${w.kinds.flyer} > ${RULES.maxFlyersPerWave}`);
    if ((w.kinds.flyer ?? 0) > 0 && kindNames.filter((k) => k !== "flyer").length > 1) flags.push(`w${w.wave} flyers with ${kindNames.length - 1} other kinds`);
    const supports = kindNames.filter((k) => RULES.supportKinds.includes(k)).length;
    if (supports > RULES.maxSupportKindsPerWave) flags.push(`w${w.wave} supports ${supports} > ${RULES.maxSupportKindsPerWave}`);
    if (w.burst10 > RULES.maxBurstPer10s) flags.push(`w${w.wave} burst ${w.burst10}/10s > ${RULES.maxBurstPer10s}`);
  }
  if (gates > 1 && waves[0] && waves[0].firstWindowPerGate > RULES.firstWaveGateMaxPerGate) flags.push(`w1 ${waves[0].firstWindowPerGate} per gate in 10 s > ${RULES.firstWaveGateMaxPerGate}`);
  return { stageId: stage.id, name: stage.name, chapter, gates, total, flyers, waves, target, flags };
}

export function stageLintRows({ campaign, maps, tuning }) {
  const rows = [];
  for (const chapter of campaign.chapters) {
    chapter.stages.forEach((stage, index) => {
      const map = maps.find((entry) => entry.id === stage.mapId);
      if (!map) return;
      rows.push(lintStage({ stage: { ...stage, chapter: stage.chapter ?? chapter.id ?? chapter.number }, map, tuning, index, count: chapter.stages.length }));
    });
  }
  return rows;
}
