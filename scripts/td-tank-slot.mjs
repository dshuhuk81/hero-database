// Tank question (roadmap balance decisions): would a 6th campaign squad slot make
// Tank squads viable? Measures, per stage, sampled squads at size 5 (current) and
// size 6 (experiment), split by "contains a Tank" vs not. If 6-slot Tank squads
// close the gap to non-Tank squads, the slot is the fix; if not, Tanks stay a
// 7-hero Free Play class.
// Run with: node scripts/td-tank-slot.mjs [--sample=21]
import campaign from "../src/data/tdCampaign.json" with { type: "json" };
import heroes from "../src/data/gameBalance.json" with { type: "json" };
import { allStages, campaignHeroes, finishCampaignStage, heroLevel, levelUp, newCampaignProgress, stageGameOptions } from "../src/game/td/campaign.js";
import { maps, playRun, POLICIES } from "./lib/td-runner.mjs";

const SAMPLE = Number(process.argv.find((a) => a.startsWith("--sample="))?.split("=")[1] ?? 21);
const cost = Object.fromEntries(heroes.map((h) => [h.id, h.cost]));
const classOf = Object.fromEntries(heroes.map((h) => [h.id, h.class]));
const isTank = (id) => classOf[id] === "Tank";
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

console.log(`sample per stage and size: ${SAMPLE}; cells: wins/runs for squads with a Tank vs without`);
let progress = newCampaignProgress(campaign);
const totals = { 5: { tank: [0, 0], none: [0, 0] }, 6: { tank: [0, 0], none: [0, 0] } };
for (const stage of allStages(campaign)) {
  progress = spendEvenly(progress);
  const runHeroes = campaignHeroes(campaign, progress, heroes);
  const map = maps.find((m) => m.id === stage.mapId);
  const cells = [];
  for (const size of [5, 6]) {
    if (progress.owned.length < size) { cells.push("-".padStart(21)); continue; }
    const all = combos(progress.owned, size);
    const withTank = all.filter((squad) => squad.some(isTank));
    const without = all.filter((squad) => !squad.some(isTank));
    // Half the sample from each group so both are represented even when one dominates.
    const squads = [...sample(withTank, Math.ceil(SAMPLE / 2)), ...sample(without, Math.floor(SAMPLE / 2))];
    const tally = { tank: [0, 0], none: [0, 0] };
    for (const policy of POLICIES) {
      squads.forEach((squad, i) => {
        const r = playRun([...squad].sort((a, b) => cost[a] - cost[b]), i + 1, map, { policy, game: stageGameOptions(stage, squad, i + 1, runHeroes) });
        const key = squad.some(isTank) ? "tank" : "none";
        tally[key][1] += 1;
        totals[size][key][1] += 1;
        if (r.won) { tally[key][0] += 1; totals[size][key][0] += 1; }
      });
    }
    const fmt = ([w, n]) => (n ? `${Math.round((w / n) * 100)}%` : "-");
    cells.push(`T ${fmt(tally.tank)} / no ${fmt(tally.none)}`.padStart(21));
  }
  console.log(stage.id.padEnd(6) + "size5 " + cells[0] + "  size6 " + (cells[1] ?? ""));
  progress = finishCampaignStage(campaign, progress, stage.id, { won: true, lives: 1 }).progress;
}
console.log("\ntotals over all stages and both policies:");
for (const size of [5, 6]) for (const key of ["tank", "none"]) {
  const [w, n] = totals[size][key];
  console.log(`  size ${size}, ${key === "tank" ? "with Tank   " : "without Tank"}: ${w}/${n} = ${Math.round((w / n) * 100)}%`);
}
