// Chapter pacing check: how far does a bot get with the heroes of the moment (a) without
// spending anything and (b) after spending every reward evenly on levels (no Stars)? Prints the
// win rate of sampled squads per stage plus the wallet. Used to tune hpScale so unlevelled
// starters stall early and levelled ones carry on.
//   node scripts/td-ch1-pacing.mjs [--chapter=1] [--sample=12]
import campaign from "../src/data/tdCampaign.json" with { type: "json" };
import rawHeroes from "../src/data/gameBalance.json" with { type: "json" };
import heroTuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import { allStages, collectionHeroes, finishCampaignStage, heroLevel, levelUp, newCampaignProgress, stageGameOptions } from "../src/game/td/campaign.js";
import { playRun, maps } from "./lib/td-runner.mjs";
import { applyHeroMultipliers } from "../src/game/td/hero-multipliers.js";

const heroes = applyHeroMultipliers(rawHeroes, heroTuning);
const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
const chapter = Number(arg("chapter", "1"));
const SAMPLE = Number(arg("sample", "12"));
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
// Win rate over `RUNS` seeded runs; the owned heroes form every squad of the allowed size (one squad
// while fewer heroes than squad slots are owned), cycled across the seeds.
const RUNS = Number(arg("runs", "16"));
const rate = (progress, stage) => {
  const runHeroes = collectionHeroes(campaign, progress, heroes);
  const map = maps.find((entry) => entry.id === stage.mapId);
  const squads = sample(combos(progress.owned, Math.min(campaign.squadSize, progress.owned.length)), SAMPLE);
  let wins = 0;
  for (let i = 0; i < RUNS; i += 1) {
    const squad = squads[i % squads.length];
    if (playRun([...squad].sort((a, b) => cost[a] - cost[b]), i + 1, map, { game: { ...stageGameOptions(stage, squad, i + 1, runHeroes) } }).won) wins += 1;
  }
  return wins / RUNS;
};
// Win rate against hpScale is close to a cliff (the same squad meets the same stage), so a bisection is
// noisy. The cliff is the largest hpScale (on a x1.1 grid, from 0.3 up to 30) the account still wins half of its runs at.
const cliff = (progress, stage) => {
  let last = 0.3;
  for (let hp = 0.3; hp <= 30; hp *= 1.1) {
    if (rate(progress, { ...stage, hpScale: Math.round(hp * 100) / 100 }) < 0.5) break;
    last = Math.round(hp * 100) / 100;
  }
  return last;
};
// hpScale at which an account wins `goal` of its runs (log search, the rate falls as health rises).
const solve = (progress, stage, goal, steps = 8) => {
  let lo = Math.log(0.2), hi = Math.log(8), best = null;
  for (let i = 0; i < steps; i += 1) {
    const mid = (lo + hi) / 2, hpScale = Math.round(Math.exp(mid) * 100) / 100;
    const r = rate(progress, { ...stage, hpScale });
    if (!best || Math.abs(r - goal) < Math.abs(best.rate - goal)) best = { hpScale, rate: r };
    if (r > goal) lo = mid; else hi = mid;
  }
  return best;
};

// Pacing design (owner, October 6): unlevelled starters should stall around the middle of the
// chapter; spending the rewards earned so far (levels only, no Stars) carries a little further.
// --solve searches each stage's hpScale: `none` goals fix the unlevelled account's win rate on the
// early stages, `spent` goals fix the levelled account's on the later ones.
const GOALS = {
  none: { "1-1": 0.95, "1-2": 0.85, "1-3": 0.65, "1-4": 0.4, "1-5": 0.2 },
  spent: { "1-6": 0.5, "1-7": 0.45, "1-8": 0.4, "1-9": 0.35, "1-10": 0.3 },
};
const measure = process.argv.includes("--measure"); // bot 50% hpScale of both accounts per stage
const solveMode = process.argv.includes("--solve");
const solved = {};

let progress = newCampaignProgress(campaign);
let spent = progress; // the account that levels everything it can afford
console.log("stage  hpScale  owned  none  spent  | gold xp seals | levels");
for (const stage of allStages(campaign)) {
  if (Number(stage.chapter) > chapter) break;
  const upgraded = spendEvenly(spent);
  let run = stage;
  if (solveMode) {
    const goalNone = GOALS.none[stage.id], goalSpent = GOALS.spent[stage.id];
    const found = goalNone != null ? solve(progress, stage, goalNone) : goalSpent != null ? solve(upgraded, stage, goalSpent) : null;
    if (found) { run = { ...stage, hpScale: found.hpScale }; solved[stage.id] = found.hpScale; }
  }
  if (measure) {
    const n = { hpScale: cliff(progress, stage) }, u = { hpScale: cliff(upgraded, stage) };
    console.log(JSON.stringify({ stage: stage.id, current: stage.hpScale, h50None: n.hpScale, h50Spent: u.hpScale, owned: progress.owned.length }));
    progress = finishCampaignStage(campaign, progress, stage.id, { won: true, lives: 1 }).progress;
    spent = finishCampaignStage(campaign, upgraded, stage.id, { won: true, lives: 1 }).progress;
    continue;
  }
  const none = rate(progress, run);
  const all = rate(upgraded, run);
  const levels = upgraded.owned.map((id) => heroLevel(upgraded, id)).join("/");
  console.log(`${stage.id.padEnd(5)}  ${String(run.hpScale).padEnd(7)}  ${String(progress.owned.length).padEnd(5)}  ${none.toFixed(2)}  ${all.toFixed(2)}   | ${spent.currencies.gold} ${spent.currencies.heroXp} ${spent.currencies.divineSeals} | ${levels}`);
  progress = finishCampaignStage(campaign, progress, stage.id, { won: true, lives: 1 }).progress;
  spent = finishCampaignStage(campaign, upgraded, stage.id, { won: true, lives: 1 }).progress;
}
if (solveMode) console.log(JSON.stringify(solved));
