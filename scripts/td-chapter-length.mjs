// Chapter 1 length variants (roadmap step 3, proposal e). Replays the td:pacing campaign
// measurement against in-memory wave trims — no data files touched. Also re-checks the
// 1-9 / 1-10 win floor with slightly lower hpScale (proposal d).
// Run with: node scripts/td-chapter-length.mjs [--seeds=3] [--sample=35]
import baseCampaign from "../src/data/tdCampaign.json" with { type: "json" };
import heroes from "../src/data/gameBalance.json" with { type: "json" };
import { allStages, collectionHeroes, finishCampaignStage, heroLevel, levelUp, newCampaignProgress, stageGameOptions } from "../src/game/td/campaign.js";
import { maps, playRun, POLICIES } from "./lib/td-runner.mjs";

const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
const SAMPLE = Number(arg("sample", 35));
const cost = Object.fromEntries(heroes.map((h) => [h.id, h.cost]));
const mean = (list) => (list.length ? list.reduce((s, x) => s + x, 0) / list.length : 0);
const pct = (x) => `${Math.round(x * 100)}%`;

// Keep the first and last wave; sample the middle down to `target` waves.
const trim = (waves, target) => {
  if (waves.length <= target) return waves;
  const middle = waves.slice(1, -1);
  const keep = Array.from({ length: target - 2 }, (_, i) => middle[Math.floor((i * middle.length) / (target - 2))]);
  return [waves[0], ...keep, waves[waves.length - 1]];
};

const variants = [
  ["current", (stage) => stage],
  ["waves x0.7", (stage) => ({ ...stage, waves: trim(stage.waves, Math.max(4, Math.ceil(stage.waves.length * 0.7))) })],
  ["waves x0.7 + late hp relief", (stage) => ({ ...stage, waves: trim(stage.waves, Math.max(4, Math.ceil(stage.waves.length * 0.7))), hpScale: stage.id === "1-9" ? 0.5 : stage.id === "1-10" ? 0.6 : stage.hpScale })],
  ["late hp relief only", (stage) => ({ ...stage, hpScale: stage.id === "1-9" ? 0.5 : stage.id === "1-10" ? 0.6 : stage.hpScale })],
  // Chapter 1 re-tightening at squad size 6 (owner playtest September 29, 2026: too easy,
  // leaks only on 1-5/1-6). Bump early and finale stages, keep the mid-chapter pinch.
  ["ch1 re-tighten", (stage) => ({ ...stage, hpScale: { "1-1": 1.0, "1-2": 1.1, "1-3": 1.05, "1-4": 1.1, "1-9": 0.6, "1-10": 0.7 }[stage.id] ?? stage.hpScale })],
  ["ch1 re-tighten harder", (stage) => ({ ...stage, hpScale: { "1-1": 1.1, "1-2": 1.2, "1-3": 1.15, "1-4": 1.2, "1-9": 0.65, "1-10": 0.75 }[stage.id] ?? stage.hpScale })],
  ["ch1 re-tighten, soft 1-4", (stage) => ({ ...stage, hpScale: { "1-1": 1.0, "1-2": 1.1, "1-3": 1.05, "1-4": 1.05, "1-9": 0.6, "1-10": 0.7 }[stage.id] ?? stage.hpScale })],
].filter((_, i) => arg("variant", "0,1,2,3").split(",").map(Number).includes(i));

const combos = (list, k) => (k === 0 ? [[]] : list.flatMap((x, i) => combos(list.slice(i + 1), k - 1).map((c) => [x, ...c])));
const sample = (list, n) => (list.length <= n ? list : Array.from({ length: n }, (_, i) => list[Math.floor((i * list.length) / n)]));
const spendEvenly = (campaign, progress) => {
  for (;;) {
    const lowest = [...progress.owned].sort((a, b) => heroLevel(progress, a) - heroLevel(progress, b))[0];
    const next = levelUp(campaign, progress, lowest);
    if (!next) return progress;
    progress = next;
  }
};

for (const [label, vary] of variants) {
  const campaign = { ...baseCampaign, chapters: baseCampaign.chapters.map((ch) => ({ ...ch, stages: ch.stages.map(vary) })) };
  const stages = allStages(campaign);
  const waves = stages.reduce((s, stage) => s + stage.waves.length, 0);
  console.log(`\n${label}: ${waves} waves total`);
  console.log("stage".padEnd(7) + POLICIES.map((p) => `${p} win`.padEnd(13) + "exp.min".padStart(8)).join(""));
  const totals = Object.fromEntries(POLICIES.map((p) => [p, { first: 0, expected: 0 }]));
  let progress = newCampaignProgress(campaign);
  for (const stage of stages) {
    const leveled = spendEvenly(campaign, progress);
    const runHeroes = collectionHeroes(campaign, leveled, heroes);
    const map = maps.find((m) => m.id === stage.mapId);
    const squads = sample(combos(leveled.owned, campaign.squadSize), SAMPLE);
    const cells = [];
    for (const policy of POLICIES) {
      const runs = squads.map((squad, i) => playRun([...squad].sort((a, b) => cost[a] - cost[b]), i + 1, map, { policy, game: stageGameOptions(stage, squad, i + 1, runHeroes) }));
      const won = runs.filter((r) => r.won);
      const rate = won.length / runs.length;
      const minutes = mean(won.map((r) => r.seconds)) / 60;
      const lossMinutes = mean(runs.filter((r) => !r.won).map((r) => r.seconds)) / 60;
      const expected = rate ? minutes + ((1 - rate) / rate) * lossMinutes : Infinity;
      totals[policy].first += minutes;
      totals[policy].expected += expected;
      cells.push(`${won.length}/${runs.length} ${pct(rate)}`.padEnd(13) + String(expected.toFixed(1)).padStart(8));
    }
    console.log(stage.id.padEnd(7) + cells.join(""));
    progress = finishCampaignStage(campaign, progress, stage.id, { won: true, lives: 1 }).progress;
  }
  for (const policy of POLICIES) console.log(`   ${policy}: winning runs ${totals[policy].first.toFixed(0)} min, expected with retries ${totals[policy].expected.toFixed(0)} min`);
}
