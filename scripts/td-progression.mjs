// Progression sweep (roadmap M3): one bot account plays classic runs from a fresh save,
// earns Favor and Insight with the real formulas (favor.js), and after every run buys the
// cheapest blessing it can afford (trunk with Favor, branches with Insight). At each
// checkpoint it plays every map in 10 waves and in endless, so the table shows how
// progression changes difficulty. Also compares Favor per minute of classic and endless.
//
//   npm run td:progression              # 160 runs, checkpoint every 20
//   npm run td:progression -- --runs=80 --every=10
import { playRun, SQUADS, maps } from "./lib/td-runner.mjs";
import { TREE, canBuy, computeFavor, computeInsight, levelCost, nodeCurrency, spentByCurrency } from "../src/game/td/favor.js";
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };

const arg = (name, fallback) => Number(process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1] ?? fallback);
const RUNS = arg("runs", 160);
const EVERY = arg("every", 20);
const SQUAD = SQUADS["balanced (S-tier core)"];
const CHECK_SEEDS = [99, 100];
const TIERS = Object.keys(tuning.tiers ?? { normal: {} });

const trunkTotal = TREE.nodes.filter((n) => n.tree === "trunk").reduce((sum, n) => {
  for (let l = 1; l <= n.maxLevel; l += 1) sum += levelCost(n, l);
  return sum;
}, 0);

const branchTotal = TREE.nodes.filter((n) => n.tree !== "trunk").reduce((sum, n) => {
  for (let l = 1; l <= n.maxLevel; l += 1) sum += levelCost(n, l);
  return sum;
}, 0);

const account = { favor: 0, insight: {}, levels: {} };
const wallet = () => {
  const spent = spentByCurrency(account.levels);
  const out = { favor: account.favor - (spent.favor || 0) };
  for (const cls of TREE.classes) out[cls] = (account.insight[cls] || 0) - (spent[cls] || 0);
  return out;
};

// Greedy buyer: the cheapest next level the account can afford, repeated until nothing fits.
function buyAll() {
  for (let guard = 0; guard < 500; guard += 1) {
    const money = wallet();
    const options = TREE.nodes
      .filter((n) => canBuy(n.id, account.levels).ok)
      .map((n) => ({ n, cost: levelCost(n, (account.levels[n.id] || 0) + 1) }))
      .filter(({ n, cost }) => money[nodeCurrency(n)] >= cost)
      .sort((a, b) => a.cost - b.cost);
    if (!options.length) return;
    account.levels[options[0].n.id] = (account.levels[options[0].n.id] || 0) + 1;
  }
}

const favorOf = (run, tier = "normal") => Math.round(computeFavor({ waves: run.wave, perfectWaves: run.perfectWaves, bossKilled: run.won, livesLeft: run.won ? run.lives : 0 }, tuning) * (tuning.tiers?.[tier]?.favor ?? 1));

function checkpoint(runNo) {
  const spent = spentByCurrency(account.levels);
  const trunkPct = Math.round(((spent.favor || 0) / trunkTotal) * 100);
  const branchPct = Math.round((TREE.classes.reduce((s, c) => s + (spent[c] || 0), 0) / branchTotal) * 100);
  let depth = 0, endlessFavor = 0, endlessSeconds = 0, n = 0;
  const tiers = Object.fromEntries(TIERS.map((t) => [t, { wins: 0, lives: 0 }]));
  for (const map of maps) for (const seed of CHECK_SEEDS) {
    for (const tier of TIERS) {
      const classic = playRun(SQUAD, seed, map, { favLevels: account.levels, tier });
      if (classic.won) { tiers[tier].wins += 1; tiers[tier].lives += classic.lives; }
    }
    const endless = playRun(SQUAD, seed, map, { favLevels: account.levels, mode: "endless" });
    depth += endless.wave;
    endlessFavor += favorOf(endless);
    endlessSeconds += endless.seconds;
    n += 1;
  }
  console.log(
    String(runNo).padStart(4),
    `${trunkPct}%`.padStart(6), `${branchPct}%`.padStart(8),
    ...TIERS.map((t) => `${tiers[t].wins}/${n} ${tiers[t].wins ? (tiers[t].lives / tiers[t].wins).toFixed(0).padStart(2) : " -"}`.padStart(9)),
    (depth / n).toFixed(1).padStart(8),
    ((endlessFavor / endlessSeconds) * 60).toFixed(1).padStart(12),
  );
}

console.log(`runs  trunk  branches ${TIERS.map((t) => t.padStart(9)).join("")}   endless  endless F/min   (10 waves: wins/6 and lives per win)`);
let classicFavor = 0, classicSeconds = 0;
let tierIndex = 0;
const tierRuns = {};
checkpoint(0);
for (let run = 1; run <= RUNS; run += 1) {
  const map = maps[run % maps.length];
  // Plays the hardest tier it handles: up after a comfortable win, down after a loss.
  const tier = TIERS[tierIndex];
  const result = playRun(SQUAD, 1000 + run, map, { favLevels: account.levels, tier });
  if (result.won && result.lives >= 15) tierIndex = Math.min(TIERS.length - 1, tierIndex + 1);
  else if (!result.won) tierIndex = Math.max(0, tierIndex - 1);
  tierRuns[tier] = (tierRuns[tier] || 0) + 1;
  const favor = favorOf(result, tier);
  account.favor += favor;
  classicFavor += favor;
  classicSeconds += result.seconds;
  for (const [cls, points] of Object.entries(computeInsight(result.insightLog))) account.insight[cls] = (account.insight[cls] || 0) + points;
  buyAll();
  if (run % EVERY === 0) { checkpoint(run); console.log(`      runs per tier so far: ${JSON.stringify(tierRuns)}`); }
}
console.log(`classic Favor per minute (sim time): ${((classicFavor / classicSeconds) * 60).toFixed(1)}; Favor per run ${(classicFavor / RUNS).toFixed(0)}; trunk total ${trunkTotal}`);
