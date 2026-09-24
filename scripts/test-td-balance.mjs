// Balance harness: plays full ten-wave runs with representative squads using a
// simple policy (deploy affordable heroes, spend spare gold on upgrades, take the
// first virtue offered) and reports duration, spending, leaks, and win rate.
// Run with: npm run test:td-balance
import { maps, playRun, SQUADS } from "./lib/td-runner.mjs";

console.log("map".padEnd(20), "squad".padEnd(30), "result  lives  leaks  score  spent  duration");
let wins = 0;
let imperfect = 0;
for (const map of maps) {
  let mapWins = 0;
  for (const [name, ids] of Object.entries(SQUADS)) {
    const run = playRun(ids, 99, map);
    wins += run.won ? 1 : 0;
    mapWins += run.won ? 1 : 0;
    imperfect += run.won && !run.perfect ? 1 : 0;
    console.log(
      map.id.padEnd(20),
      name.padEnd(30),
      `${run.won ? (run.perfect ? "PERFECT" : "win    ") : "loss   "} ${String(run.lives).padStart(5)}  ${String(run.leaks).padStart(5)}  ${String(run.score).padStart(5)}  ${String(run.spent).padStart(5)}  ${run.seconds}s`,
    );
  }
  if (mapWins < 2) throw new Error(`Balance: expected at least 2 winning squads on ${map.id}, got ${mapWins}`);
}
if (imperfect < 1) throw new Error("Balance: every win was perfect — the run is too easy");
console.log("Tower defense balance checks passed");
