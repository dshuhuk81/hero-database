// Campaign balance sweep (restores `npm run td:sweep`, removed from package.json in 02c9570d).
// Walks the campaign like test-td-campaign's viability check: every stage is assumed won with
// lives 1, owned heroes level up evenly, and each stage is played with sampled squads of owned heroes.
// Four columns per stage, so the effect of each Phase 3 feature is visible:
//   full      as shipped: talents (Tier I from Chapter 4, Tier II from Chapter 8, first option of each pair),
//             Elites, board events and stage rules (map theme)
//   -talents  no hero talents
//   -elites   no Elite affixes
//   -theme    map theme off (board events, environment rules, stage rules)
// Cells: win rate over the sampled squads x seeds. Run:
//   npm run td:sweep -- [--from=1] [--to=13] [--sample=6] [--seeds=1] [--ab]
// --ab  talent A/B: for each talent-eligible hero in the chapters, its Tier I / Tier II option A against
//       option B on the same squads and seeds (win rate and mean lives left of wins).
import campaign from "../src/data/tdCampaign.json" with { type: "json" };
import rawHeroes from "../src/data/gameBalance.json" with { type: "json" };
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import talentData from "../src/data/tdTalents.json" with { type: "json" };
import summonCfg from "../src/data/tdSummon.json" with { type: "json" };
import { allStages, collectionHeroes, finishCampaignStage, heroLevel, levelUp, newCampaignProgress, stageGameOptions, summonMany, talentEligible, talentPool } from "../src/game/td/campaign.js";
import { maps, playRun } from "./lib/td-runner.mjs";
import { applyHeroMultipliers } from "../src/game/td/hero-multipliers.js";

const heroes = applyHeroMultipliers(rawHeroes, tuning);
const cost = Object.fromEntries(heroes.map((hero) => [hero.id, hero.cost]));
const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, value = "true"] = arg.replace(/^--/, "").split("=");
  return [key, value];
}));
const fromChapter = Number(args.from ?? 1);
const toChapter = Number(args.to ?? 13);
const SAMPLE = Number(args.sample ?? 6);
const SEEDS = Number(args.seeds ?? 1);
const stages = allStages(campaign).filter((stage) => stage.chapter >= fromChapter && stage.chapter <= toChapter);
const mapFor = (stage) => maps.find((entry) => entry.id === stage.mapId);
const TIER_CHAPTER = { I: 4, II: 8 };

// Deterministic PRNG so every run of the sweep samples the same squads.
const rng = (seed) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
function sampleSquads(owned, size, n, seed) {
  const random = rng(seed);
  const squads = [];
  for (let i = 0; i < n; i++) {
    const pool = [...owned];
    const squad = [];
    while (squad.length < Math.min(size, owned.length)) squad.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
    squads.push(squad.sort((a, b) => cost[a] - cost[b]));
  }
  return squads;
}
// The campaign pays Divine Seals, not heroes (one reward hero in total), so the roster grows through
// summons: spend every seal on the first banner (fixed clock and seed, so every sweep run is the same).
const SWEEP_NOW = Date.parse("2026-10-09T12:00:00Z");
function summonAll(progress, seed) {
  const banner = summonCfg.banners[0];
  const count = Math.floor((progress.currencies.divineSeals || 0) / banner.cost.divineSeals);
  if (count < 1) return progress;
  const random = rng(seed);
  const result = summonMany(summonCfg, banner.id, progress, heroes.map((hero) => hero.id), count, random, SWEEP_NOW);
  return result?.progress ?? progress;
}
// Level the lowest owned hero while the currencies last (as in test-td-campaign).
function spendEvenly(progress) {
  for (;;) {
    const lowest = [...progress.owned].sort((a, b) => heroLevel(progress, a) - heroLevel(progress, b))[0];
    const next = levelUp(campaign, progress, lowest);
    if (!next) return progress;
    progress = next;
  }
}
// stageGameOptions reads a flat list as one row (capped at five), so the squad goes in as two rows.
const rowsOf = (squad) => [squad.slice(0, 5), squad.slice(5, 10)];
// Talents for the sweep: first option of each tier pair, for every owned eligible hero, once the tier's chapter is reached.
function withTalents(progress, chapter, pick = 0) {
  const talents = {};
  for (const id of progress.owned) {
    if (!talentEligible(id)) continue;
    const slots = {};
    for (const tier of ["I", "II"]) if (chapter >= TIER_CHAPTER[tier]) slots[tier] = talentPool(id, tier)[pick]?.id;
    if (Object.keys(slots).length) talents[id] = slots;
  }
  return { ...progress, talents };
}

function runStage(stage, squad, seed, progress, { talents = true, elites = true, theme = true } = {}) {
  const leveled = talents ? withTalents(progress, stage.chapter) : { ...progress, talents: {} };
  const runHeroes = collectionHeroes(campaign, leveled, heroes);
  const map = mapFor(stage);
  const game = stageGameOptions(stage, rowsOf(squad), seed, runHeroes);
  if (!elites) game.elites = [];
  return playRun(squad, seed, theme ? map : { ...map, theme: null }, { game });
}

const CONFIGS = { full: {}, "-talents": { talents: false }, "-elites": { elites: false }, "-theme": { theme: false } };
const pct = (value) => `${Math.round(value * 100)}%`.padStart(5);

if (args.ab) {
  // Talent A/B: option A (index 0) against option B on the same squads and seeds. The tested hero carries
  // the tested option, every other eligible hero carries its first option. Metric: win rate and defeated
  // enemies (the bot loses most stages from Chapter 5 on, so the defeated count carries the signal there).
  console.log("hero".padEnd(12), "tier".padEnd(5), "A win  A def".padEnd(20), "B win  B def".padEnd(20), "diff win");
  const eligible = heroes.filter((hero) => talentEligible(hero.id)).map((hero) => hero.id);
  const ownedAll = [...new Set([...campaign.starters, ...eligible])];
  const arenas = stages.filter((stage) => stage.chapter >= 4).filter((_, i, all) => i % Math.max(1, Math.floor(all.length / 4)) === 0).slice(0, 4);
  const talentsFor = (leveledStage, heroId, tier, pick) => Object.fromEntries(ownedAll.filter((id) => talentEligible(id)).map((id) => {
    const slot = {};
    if (leveledStage.chapter >= TIER_CHAPTER.I) slot.I = talentPool(id, "I")[id === heroId && tier === "I" ? pick : 0]?.id;
    if (leveledStage.chapter >= TIER_CHAPTER.II) slot.II = talentPool(id, "II")[id === heroId && tier === "II" ? pick : 0]?.id;
    return [id, slot];
  }));
  for (const heroId of eligible) {
    for (const tier of ["I", "II"]) {
      if (talentPool(heroId, tier).length < 2) continue;
      const cells = [0, 1].map((pick) => {
        let wins = 0, defeated = 0, n = 0;
        for (const stage of arenas.filter((entry) => entry.chapter >= TIER_CHAPTER[tier])) {
          const squads = sampleSquads(ownedAll, campaign.squadSize, SAMPLE, stage.chapter * 97 + 1).map((squad) => (squad.includes(heroId) ? squad : [heroId, ...squad.slice(1)]));
          for (const squad of squads) for (let seed = 1; seed <= SEEDS; seed++) {
            const runHeroes = collectionHeroes(campaign, { ...newCampaignProgress(campaign), owned: ownedAll, talents: talentsFor(stage, heroId, tier, pick) }, heroes);
            const run = playRun(squad, seed, mapFor(stage), { game: stageGameOptions(stage, rowsOf(squad), seed, runHeroes) });
            wins += run.won ? 1 : 0;
            defeated += run.defeated;
            n += 1;
          }
        }
        return { win: wins / n, defeated: defeated / n };
      });
      const [a, b] = cells;
      console.log(heroId.padEnd(12), tier.padEnd(5), `${pct(a.win)} ${a.defeated.toFixed(1).padStart(6)}`.padEnd(20), `${pct(b.win)} ${b.defeated.toFixed(1).padStart(6)}`.padEnd(20), `${((a.win - b.win) * 100).toFixed(0)} pts`);
    }
  }
  process.exit(0);
}

console.log(`chapters ${fromChapter}-${toChapter}, ${SAMPLE} squads x ${SEEDS} seed(s) per stage (seeded sampling, lives 1 per won stage)`);
console.log("stage".padEnd(8), "heroes".padStart(6), Object.keys(CONFIGS).map((name) => name.padStart(8)).join(""));
let progress = newCampaignProgress(campaign);
const totals = Object.fromEntries(Object.keys(CONFIGS).map((name) => [name, { wins: 0, n: 0 }]));
const perChapter = {};
for (const stage of allStages(campaign)) {
  const leveled = spendEvenly(progress);
  if (stage.chapter < fromChapter) {
    progress = summonAll(finishCampaignStage(campaign, progress, stage.id, { won: true, lives: 1 }).progress, Number(stage.chapter) * 7 + 3);
    continue;
  }
  if (stage.chapter > toChapter) break;
  const squads = sampleSquads(leveled.owned, campaign.squadSize, SAMPLE, Number(stage.chapter) * 1000 + Number(stage.id.split("-")[1]));
  const cells = {};
  for (const [name, options] of Object.entries(CONFIGS)) {
    let wins = 0, n = 0, defeated = 0;
    for (const squad of squads) for (let s = 1; s <= SEEDS; s++) {
      const run = runStage(stage, squad, s, leveled, options);
      if (args.debug) console.log(stage.id, squad.join(","), JSON.stringify({ ...run, insightLog: undefined, mutators: undefined, boons: undefined }));
      wins += run.won ? 1 : 0;
      defeated += run.defeated;
      n += 1;
    }
    cells[name] = wins / n;
    cells[`${name}:defeated`] = defeated / n;
    totals[name].wins += wins;
    totals[name].n += n;
    const chapter = perChapter[stage.chapter] ??= Object.fromEntries(Object.keys(CONFIGS).map((key) => [key, { wins: 0, n: 0 }]));
    chapter[name].wins += wins;
    chapter[name].n += n;
  }
  console.log(stage.id.padEnd(8), String(leveled.owned.length).padStart(6), Object.keys(CONFIGS).map((name) => pct(cells[name]).padStart(8)).join(""), "  defeated", Object.keys(CONFIGS).map((name) => cells[`${name}:defeated`].toFixed(1).padStart(7)).join(""));
  progress = summonAll(finishCampaignStage(campaign, progress, stage.id, { won: true, lives: 1 }).progress, Number(stage.chapter) * 7 + 3);
}
console.log("\nper chapter (win rate)");
for (const [chapter, row] of Object.entries(perChapter)) {
  console.log(`ch ${chapter.padEnd(4)}`, Object.keys(CONFIGS).map((name) => pct(row[name].wins / row[name].n).padStart(8)).join(""));
}
console.log("total".padEnd(8), "".padStart(6), Object.keys(CONFIGS).map((name) => pct(totals[name].wins / totals[name].n).padStart(8)).join(""));
