// Wave-shape variants: same total health, fewer enemies; per variant it searches the stage hpScale that
// gives a 50% bot win rate. Usage: node scripts/td-wave-variants.mjs [--stages=4-2,4-3] [--sample=14]
// See TOWER_DEFENSE_ROADMAP.md, "Wave-shape variants".
const R = new URL("../", import.meta.url).href;
const { default: campaign } = await import(R + "src/data/tdCampaign.json", { with: { type: "json" } });
const { default: heroes } = await import(R + "src/data/gameBalance.json", { with: { type: "json" } });
const { default: baseTuning } = await import(R + "src/data/gameBalance.tuning.json", { with: { type: "json" } });
const { default: maps } = await import(R + "src/data/tdMaps.json", { with: { type: "json" } });
const C = await import(R + "src/game/td/campaign.js");
const { campaignLoadRows } = await import(R + "src/game/td/campaign-load.js");
const { playRun, maps: runMaps } = await import(R + "scripts/lib/td-runner.mjs");

const ids = (process.argv.find((a) => a.startsWith("--stages=")) ?? "--stages=4-2,4-3,4-5").slice(9).split(",");
const SAMPLE = Number((process.argv.find((a) => a.startsWith("--sample=")) ?? "--sample=8").slice(9));
const { leanWaveTuning } = await import(R + "src/game/td/wave-variants.js");
const variant = (count, gap) => leanWaveTuning(baseTuning, count, gap);
const variants = { baseline: baseTuning, "count x0.6": variant(0.6, 1), "count x0.6, gap x1.5": variant(0.6, 1.5), "count x0.4, gap x1.5": variant(0.4, 1.5) };

const combos = (list, k) => (k === 0 ? [[]] : list.flatMap((x, i) => combos(list.slice(i + 1), k - 1).map((c) => [x, ...c])));
const sample = (list, n) => (list.length <= n ? list : Array.from({ length: n }, (_, i) => list[Math.floor((i * list.length) / n)]));
const cost = Object.fromEntries(heroes.map((h) => [h.id, h.cost]));
const spendEvenly = (p) => { for (;;) { const lo = [...p.owned].sort((a, b) => C.heroLevel(p, a) - C.heroLevel(p, b))[0]; const n = C.levelUp(campaign, p, lo); if (!n) return p; p = n; } };

let progress = C.newCampaignProgress(campaign);
const table = [];
for (const stage of C.allStages(campaign)) {
  if (ids.includes(stage.id)) {
    const leveled = spendEvenly(progress);
    const runHeroes = C.collectionHeroes(campaign, leveled, heroes);
    const map = runMaps.find((m) => m.id === stage.mapId);
    const squads = sample(combos(leveled.owned, campaign.squadSize), SAMPLE);
    for (const [name, tuning] of Object.entries(variants)) {
      const load = campaignLoadRows({ campaign: { ...campaign, chapters: campaign.chapters.map((c) => ({ ...c, stages: c.stages.filter((s) => s.id === stage.id) })) }, maps, tuning })[0];
      const wins = squads.filter((squad, i) => playRun([...squad].sort((a, b) => cost[a] - cost[b]), i + 1, map, { tuning, game: { ...C.stageGameOptions(stage, squad, i + 1, runHeroes) } }).won).length;
      const rateAt = (hpScale) => squads.filter((squad, i) => playRun([...squad].sort((x, y) => cost[x] - cost[y]), i + 1, map, { tuning, game: { ...C.stageGameOptions({ ...stage, hpScale }, squad, i + 1, runHeroes) } }).won).length / squads.length;
      let lo = Math.log(0.05), hi = Math.log(4), best = { hpScale: stage.hpScale, rate: rateAt(stage.hpScale) };
      for (let k = 0; k < 7; k++) { const mid = (lo + hi) / 2, hs = Math.round(Math.exp(mid) * 100) / 100, r = rateAt(hs); if (Math.abs(r - 0.5) < Math.abs(best.rate - 0.5)) best = { hpScale: hs, rate: r }; if (r > 0.5) lo = mid; else hi = mid; }
      table.push({ hpScaleFor50: best.hpScale, rateThere: +best.rate.toFixed(2), currentHpScale: stage.hpScale, stage: stage.id, variant: name, enemies: load.enemyCount, perSec: +load.enemiesPerSecond.toFixed(2), win: `${wins}/${squads.length}` });
    }
  }
  progress = C.finishCampaignStage(campaign, progress, stage.id, { won: true, lives: 1 }).progress;
}
console.table(table);
