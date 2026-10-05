// Enemy battle power per campaign stage, in the same unit as a squad's Might: the squad Might the stage
// was balanced for. td-board-tune.mjs sets each stage's hpScale so the bot's sampled squads (heroes owned by
// then, with campaign.expectedStars Stars, levelled evenly with the first-clear currencies) win at the
// stage's target rate; the median Might of those same squads is the recommendation. Written to
// `recommendedMight` in tdCampaign.json and shown as the enemy's battle power next to the squad's own Might.
// Run after td-board-tune: node scripts/td-stage-power.mjs [--sample=35] [--write]
import { readFileSync, writeFileSync } from "node:fs";
import campaign from "../src/data/tdCampaign.json" with { type: "json" };
import rawHeroes from "../src/data/gameBalance.json" with { type: "json" };
import heroTuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import { applyHeroMultipliers } from "../src/game/td/hero-multipliers.js";
import { allStages, finishCampaignStage, heroLevel, heroMight, levelUp, newCampaignProgress } from "../src/game/td/campaign.js";

const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
const SAMPLE = Number(arg("sample", "35"));
const heroes = applyHeroMultipliers(rawHeroes, heroTuning);
const byId = new Map(heroes.map((hero) => [hero.id, hero]));
const combos = (list, k) => (k === 0 ? [[]] : list.flatMap((x, i) => combos(list.slice(i + 1), k - 1).map((c) => [x, ...c])));
const sample = (list, n) => (list.length <= n ? list : Array.from({ length: n }, (_, i) => list[Math.floor((i * list.length) / n)]));
const median = (values) => { const v = [...values].sort((a, b) => a - b); return v[v.length >> 1]; };
const spendEvenly = (progress) => {
  for (;;) {
    const lowest = [...progress.owned].sort((a, b) => heroLevel(progress, a) - heroLevel(progress, b))[0];
    const next = levelUp(campaign, progress, lowest);
    if (!next) return progress;
    progress = next;
  }
};

const power = {};
const levels = {};
let progress = newCampaignProgress(campaign);
for (const stage of allStages(campaign)) {
  const stars = campaign.expectedStars?.[Number(stage.chapter) - 1] ?? 0;
  const leveled = spendEvenly({ ...progress, stars: Object.fromEntries(progress.owned.map((id) => [id, stars])) });
  const squads = sample(combos(leveled.owned, Math.min(campaign.squadSize, leveled.owned.length)), SAMPLE);
  power[stage.id] = Math.round(median(squads.map((squad) => squad.reduce((sum, id) => sum + heroMight(campaign, leveled, byId.get(id)), 0))) / 10) * 10;
  levels[stage.id] = `${Math.min(...leveled.owned.map((id) => heroLevel(leveled, id)))}-${Math.max(...leveled.owned.map((id) => heroLevel(leveled, id)))} (${stars}*)`;
  progress = finishCampaignStage(campaign, progress, stage.id, { won: true, lives: 1 }).progress;
}
console.log("stage  enemy power  hero levels");
console.log(Object.keys(power).map((id) => `${id.padEnd(6)} ${String(power[id]).padEnd(12)} ${levels[id]}`).join("\n"));

if (process.argv.includes("--write")) {
  const path = new URL("../src/data/tdCampaign.json", import.meta.url);
  const data = JSON.parse(readFileSync(path, "utf8"));
  for (const chapter of data.chapters) for (const stage of chapter.stages) stage.recommendedMight = power[stage.id];
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
}
