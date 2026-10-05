// Campaign difficulty on boards (docs/tower-defense-board-plan.md step 4): searches each
// stage's hpScale so the bot win rate of the campaign viability check (test-td-campaign.mjs:
// heroes owned by then, levelled with the chapter's first-clear currencies, up to 35 sampled
// squads, fixed seeds) lands near a target:
//   1-1 0.9 (first stage), other Chapter 1 stages 0.65, regular stages 0.5, finales 0.35.
// A stage's hero levels do not depend on earlier stages' difficulty, so chapters can run in
// separate processes. Prints JSON { stageId: { hpScale, rate } }.
//   node scripts/td-board-tune.mjs --chapters=1,2,3 [--sample=35] [--steps=7] > out.json
import campaign from "../src/data/tdCampaign.json" with { type: "json" };
import heroes from "../src/data/gameBalance.json" with { type: "json" };
import { allStages, collectionHeroes, finishCampaignStage, heroLevel, levelUp, newCampaignProgress, stageGameOptions } from "../src/game/td/campaign.js";
import { playRun, maps } from "./lib/td-runner.mjs";

const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
const chapters = new Set(arg("chapters", "").split(",").filter(Boolean).map(Number));
const SAMPLE = Number(arg("sample", "35"));
const STEPS = Number(arg("steps", "7"));
const MAX_HP = Number(arg("max", "4"));

const cost = Object.fromEntries(heroes.map((hero) => [hero.id, hero.cost]));
const combos = (list, k) => (k === 0 ? [[]] : list.flatMap((x, i) => combos(list.slice(i + 1), k - 1).map((c) => [x, ...c])));
const sample = (list, n) => (list.length <= n ? list : Array.from({ length: n }, (_, i) => list[Math.floor((i * list.length) / n)]));
const spendEvenly = (progress) => {
  for (;;) {
    const lowest = [...progress.owned].sort((a, b) => heroLevel(progress, a) - heroLevel(progress, b))[0];
    const next = levelUp(campaign, progress, lowest);
    if (!next) return progress;
    progress = next;
  }
};
const stages = allStages(campaign);
const lastOf = new Set(campaign.chapters.map((chapter) => chapter.stages.at(-1).id));
const target = (stage) => (stage.id === "1-1" ? 0.9 : lastOf.has(stage.id) ? 0.35 : stage.chapter === 1 ? 0.65 : 0.5);

const out = {};
let progress = newCampaignProgress(campaign);
for (const stage of stages) {
  if (!chapters.size || chapters.has(Number(stage.chapter))) {
    const leveled = spendEvenly(progress);
    const runHeroes = collectionHeroes(campaign, leveled, heroes);
    const map = maps.find((entry) => entry.id === stage.mapId);
    const squads = sample(combos(leveled.owned, Math.min(campaign.squadSize, leveled.owned.length)), SAMPLE);
    const rateAt = (hpScale) => squads.filter((squad, i) => playRun([...squad].sort((a, b) => cost[a] - cost[b]), i + 1, map, { game: { ...stageGameOptions({ ...stage, hpScale }, squad, i + 1, runHeroes) } }).won).length / squads.length;
    // Search on a log scale between 0.1x and --max (default 4x); the rate falls as health rises.
    let lo = Math.log(0.1), hi = Math.log(MAX_HP);
    let best = { hpScale: stage.hpScale, rate: rateAt(stage.hpScale) };
    const goal = target(stage);
    for (let i = 0; i < STEPS; i++) {
      const mid = (lo + hi) / 2;
      const hpScale = Math.round(Math.exp(mid) * 100) / 100;
      const rate = rateAt(hpScale);
      if (Math.abs(rate - goal) < Math.abs(best.rate - goal) || (Math.abs(rate - goal) === Math.abs(best.rate - goal) && rate >= goal)) best = { hpScale, rate };
      if (rate > goal) lo = mid; else hi = mid;
    }
    out[stage.id] = { ...best, goal, squads: squads.length };
    process.stderr.write(`${stage.id}: hpScale ${stage.hpScale} -> ${best.hpScale}, rate ${best.rate.toFixed(2)} (goal ${goal})\n`);
  }
  progress = finishCampaignStage(campaign, progress, stage.id, { won: true, lives: 1 }).progress;
}
console.log(JSON.stringify(out));
