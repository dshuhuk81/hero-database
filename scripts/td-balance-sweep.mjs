// Difficulty sweep: plays every balance squad on every map across a range of
// enemy HP multipliers and prints who wins, so a target difficulty can be picked.
// Run with: npm run td:sweep -- --hp=0.8,1,1.5,2 --scale=0.15 --favor=none --seeds=1
// Cells: P25 = perfect win (lives left), W12 = win with 12 lives, L7 = lost in wave 7.
// With --seeds>1 cells show wins/seeds instead.
import { favorTree, maps, playRun, SQUADS } from "./lib/td-runner.mjs";

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, value = ""] = arg.replace(/^--/, "").split("=");
  return [key, value];
}));
const list = (value, fallback) => (value ? value.split(",").map(Number).filter(Number.isFinite) : fallback);
const hpSteps = list(args.hp, [0.8, 1, 1.25, 1.5, 1.75, 2, 2.5, 3]);
const scales = list(args.scale, [0.15]);
const speed = Number(args.speed || 1);
const gold = Number(args.gold || 1);
const seeds = Math.max(1, Number(args.seeds || 1));
const favTree = args.favor === "all" ? favorTree.map((node) => node.id) : [];
const squadNames = Object.keys(SQUADS);

console.log(`Enemy speed x${speed} - kill gold x${gold} - favor: ${favTree.length ? "all nodes" : "none"} - seeds: ${seeds}`);

const candidates = [];
for (const waveHpScale of scales) {
  const perStep = new Map(hpSteps.map((hp) => [hp, { ok: true }]));
  for (const map of maps) {
    console.log(`\n${map.name} - wave HP growth ${Math.round(waveHpScale * 100)}% per wave`);
    console.log("squad".padEnd(28) + hpSteps.map((hp) => `x${hp}`.padStart(7)).join(""));
    const wins = new Map(hpSteps.map((hp) => [hp, { wins: 0, perfect: 0 }]));
    for (const name of squadNames) {
      const cells = hpSteps.map((hp) => {
        const difficulty = { enemyHp: hp, enemySpeed: speed, killGold: gold, waveHpScale };
        const runs = Array.from({ length: seeds }, (_, i) => playRun(SQUADS[name], 99 + i, map, { difficulty, favTree }));
        const won = runs.filter((run) => run.won).length;
        const tally = wins.get(hp);
        if (won * 2 > seeds) tally.wins += 1;
        if (runs.every((run) => run.perfect)) tally.perfect += 1;
        if (seeds > 1) return `${won}/${seeds}`;
        const [run] = runs;
        return run.won ? `${run.perfect ? "P" : "W"}${run.lives}` : `L${run.wave}`;
      });
      console.log(name.padEnd(28) + cells.map((cell) => cell.padStart(7)).join(""));
    }
    console.log("wins".padEnd(28) + hpSteps.map((hp) => `${wins.get(hp).wins}/${squadNames.length}`.padStart(7)).join(""));
    // Target: some squads win, some lose, and at most one wins flawlessly.
    for (const hp of hpSteps) {
      const { wins: w, perfect } = wins.get(hp);
      if (w < 1 || w >= squadNames.length || perfect > 1) perStep.get(hp).ok = false;
    }
  }
  for (const [hp, { ok }] of perStep) if (ok) candidates.push({ enemyHp: hp, waveHpScale });
}

console.log("\nCandidates (on every map: at least one squad wins, at least one loses, at most one perfect):");
if (!candidates.length) console.log("  none - widen --hp or try another --scale");
for (const candidate of candidates) console.log(`  "difficulty": ${JSON.stringify({ ...candidate, enemySpeed: speed, killGold: gold })}`);
