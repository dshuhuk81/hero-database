// Stars and Evolution (M26 sprint 9) sweep: campaign stage win rates with the expected hero levels
// (as in test-td-campaign) and every owned hero at a given Stars / Evolution state, to see
// how much each upgrade path moves the campaign. Also the summon economy: what the
// campaign's Divine Seals buy in copies. Run: node scripts/td-upgrade-sweep.mjs
import campaign from "../src/data/tdCampaign.json" with { type: "json" };
import summonCfg from "../src/data/tdSummon.json" with { type: "json" };
import heroes from "../src/data/gameBalance.json" with { type: "json" };
import { allStages, collectionHeroes, finishCampaignStage, heroLevel, levelUp, newCampaignProgress, stageGameOptions, stageRewardHeroes, summonMany } from "../src/game/td/campaign.js";
import { playRun, maps } from "./lib/td-runner.mjs";

const SAMPLE = 20;
const stages = allStages(campaign);
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
const scenarios = [
  ["base", 0, 0], ["1 star", 1, 0], ["2 stars", 2, 0], ["5 stars", 5, 0],
  ["Evo II", 0, 2], ["Evo V", 0, 5], ["2 stars + Evo III", 2, 3], ["5 stars + Evo V", 5, 5],
];
const rows = [];
let progress = newCampaignProgress(campaign);
for (const stage of stages) {
  const leveled = spendEvenly(progress);
  const map = maps.find((entry) => entry.id === stage.mapId);
  const squads = sample(combos(leveled.owned, campaign.squadSize), SAMPLE);
  const row = [stage.id];
  for (const [, stars, evo] of scenarios) {
    const upgraded = { ...leveled, stars: Object.fromEntries(leveled.owned.map((id) => [id, stars])), evolution: Object.fromEntries(leveled.owned.map((id) => [id, evo])) };
    const runHeroes = collectionHeroes(campaign, upgraded, heroes);
    const wins = squads.filter((squad, i) => playRun([...squad].sort((a, b) => cost[a] - cost[b]), i + 1, map, { game: stageGameOptions(stage, squad, i + 1, runHeroes) }).won).length;
    row.push(`${Math.round((wins / squads.length) * 100)}%`);
  }
  rows.push(row);
  progress = finishCampaignStage(campaign, progress, stage.id, { won: true, lives: 1 }).progress;
}
console.log(`Win rate per stage (${SAMPLE} squads, expected levels):`);
console.log(["stage", ...scenarios.map(([name]) => name)].map((c) => c.padEnd(18)).join(""));
for (const row of rows) console.log(row.map((c) => String(c).padEnd(18)).join(""));

// Economy: all campaign seals spent at the end as x10 pulls, averaged over seeds.
const banner = summonCfg.banners[0];
const seals = stages.reduce((sum, stage) => sum + (stage.rewards ?? []).filter((r) => r.id === "divineSeals").reduce((m, r) => m + r.amount, 0), 0);
const reserved = new Set(stageRewardHeroes(campaign));
const endOwned = [...campaign.starters, ...reserved];
const pool = heroes.map((h) => h.id);
let totalNew = 0, totalCopies = 0;
const RUNS = 500;
let seed = 1;
const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
for (let r = 0; r < RUNS; r += 1) {
  const res = summonMany(summonCfg, banner.id, { ...newCampaignProgress(campaign), owned: endOwned, currencies: { divineSeals: seals } }, pool, Math.floor(seals / banner.cost.divineSeals), rng);
  totalNew += res.isNew.filter(Boolean).length;
  totalCopies += res.isNew.filter((n) => !n).length;
}
console.log(`\nEconomy: campaign pays ${seals} seals = ${Math.floor(seals / banner.cost.divineSeals)} pulls at the end -> avg ${(totalNew / RUNS).toFixed(1)} new heroes, ${(totalCopies / RUNS).toFixed(1)} copies.`);
const daily = summonCfg.sealSources.dailyGoal, exp = summonCfg.sealSources.expeditionComplete;
console.log(`Later income: Daily goal ${daily}/day (1 pull every ${Math.ceil(banner.cost.divineSeals / daily)} days), Expedition ${exp} (${(exp / banner.cost.divineSeals).toFixed(1)} pulls).`);
const starCopies = campaign.heroStars.copies.reduce((a, b) => a + b, 0);
console.log(`One hero to 5 stars: ${starCopies} copies of itself; to Evolution V: ${campaign.heroEvolution.tiers.length} more copies of itself (about ${(campaign.heroEvolution.tiers.length * pool.length + 4 * 0).toFixed(0)} pulls without the featured boost) or ${campaign.heroEvolution.tiers.length * campaign.heroEvolution.dustPrice} dust = ${Math.ceil((campaign.heroEvolution.tiers.length * campaign.heroEvolution.dustPrice) / summonCfg.dust.perCopy)} spare copies.`);
