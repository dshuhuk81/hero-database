// Tile layout A/B (M24 authored layout trial): plays the same squads and seeds on a map's
// committed tiles (git HEAD, or --before=<tdMaps.json>) and on the working tdMaps.json.
// Layout changes only; keep enemy tuning out of the same measurement.
// Run with: npm run td:layout -- --map=moonlit-pass --seeds=4 --sample=20 --endless=40
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import campaign from "../src/data/tdCampaign.json" with { type: "json" };
import heroes from "../src/data/gameBalance.json" with { type: "json" };
import { allStages, collectionHeroes, finishCampaignStage, heroLevel, levelUp, newCampaignProgress, stageGameOptions } from "../src/game/td/campaign.js";
import { maps, playRun, POLICIES, SQUADS } from "./lib/td-runner.mjs";

const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback;
const mapId = arg("map", "moonlit-pass");
const SEEDS = Number(arg("seeds", 4));
const SAMPLE = Number(arg("sample", 20));
const ENDLESS_CAP = Number(arg("endless", 40));
const beforeFile = arg("before", "");
const beforeMaps = JSON.parse(beforeFile ? readFileSync(beforeFile, "utf8") : execSync("git show HEAD:src/data/tdMaps.json", { encoding: "utf8" }));
const layouts = { before: beforeMaps.find((m) => m.id === mapId), after: maps.find((m) => m.id === mapId) };
if (!layouts.before || !layouts.after) throw new Error(`unknown map ${mapId}`);

const mean = (list) => (list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0);
const pad = (value, width) => String(value).padStart(width);
console.log(`${mapId}: side tiles ${layouts.before.platformSlots.length} -> ${layouts.after.platformSlots.length}, road tiles ${layouts.before.roadSlots.length} -> ${layouts.after.roadSlots.length}`);

// 1. Free Play: classic wins / lives left, endless waves reached, per squad and policy.
console.log(`\n1. Free Play (${SEEDS} seeds, Normal)`);
console.log("squad".padEnd(28) + "policy".padEnd(10) + ["classic", "lives", "endless"].map((h) => pad(`${h} B`, 11) + pad("A", 7)).join(""));
const totals = { before: { wins: 0, lives: [], waves: [] }, after: { wins: 0, lives: [], waves: [] } };
for (const [name, squad] of Object.entries(SQUADS)) {
  for (const policy of POLICIES) {
    const row = {};
    for (const [key, map] of Object.entries(layouts)) {
      const classic = Array.from({ length: SEEDS }, (_, i) => playRun(squad, 99 + i, map, { policy }));
      const endless = Array.from({ length: SEEDS }, (_, i) => playRun(squad, 99 + i, map, { policy, mode: "endless", maxWave: ENDLESS_CAP }));
      const wins = classic.filter((r) => r.won).length;
      const lives = mean(classic.map((r) => (r.won ? r.lives : 0)));
      const waves = mean(endless.map((r) => r.wave));
      row[key] = { wins, lives, waves };
      totals[key].wins += wins; totals[key].lives.push(lives); totals[key].waves.push(waves);
    }
    const { before: b, after: a } = row;
    console.log(name.slice(0, 27).padEnd(28) + policy.padEnd(10)
      + pad(`${b.wins}/${SEEDS}`, 11) + pad(`${a.wins}/${SEEDS}`, 7)
      + pad(b.lives.toFixed(1), 11) + pad(a.lives.toFixed(1), 7)
      + pad(b.waves.toFixed(1), 11) + pad(a.waves.toFixed(1), 7));
  }
}
const runs = Object.keys(SQUADS).length * POLICIES.length * SEEDS;
for (const [key, t] of Object.entries(totals)) console.log(`   ${key}: classic wins ${t.wins}/${runs}, mean lives ${mean(t.lives).toFixed(1)}, endless waves ${mean(t.waves).toFixed(1)} (cap ${ENDLESS_CAP})`);

// 2. Campaign stages on this map, owned heroes levelled evenly (same as td:pacing).
const stages = allStages(campaign);
if (stages.some((stage) => stage.mapId === mapId)) {
  console.log(`\n2. Campaign stages on ${mapId} (max ${SAMPLE} sampled squads of ${campaign.squadSize}, both policies)`);
  const cost = Object.fromEntries(heroes.map((h) => [h.id, h.cost]));
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
  let progress = newCampaignProgress(campaign);
  for (const stage of stages) {
    if (stage.mapId === mapId) {
      const leveled = spendEvenly(progress);
      const runHeroes = collectionHeroes(campaign, leveled, heroes);
      const squads = sample(combos(leveled.owned, campaign.squadSize), SAMPLE);
      const cells = Object.entries(layouts).map(([key, map]) => {
        let won = 0, total = 0;
        for (const policy of POLICIES) squads.forEach((squad, i) => {
          const run = playRun([...squad].sort((a, b) => cost[a] - cost[b]), i + 1, map, { policy, game: stageGameOptions(stage, squad, i + 1, runHeroes) });
          total += 1; if (run.won) won += 1;
        });
        return `${key} ${won}/${total}`;
      });
      console.log(`   ${stage.id.padEnd(6)} ${cells.join("   ")}`);
    }
    progress = finishCampaignStage(campaign, progress, stage.id, { won: true, lives: 1 }).progress;
  }
}
