// Balance harness: plays full runs (10 waves, plus 20-wave and endless checks) with representative squads using a
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
  if (mapWins < 1) throw new Error(`Balance: expected at least 1 winning squad on ${map.id}, got ${mapWins}`);
}
if (imperfect < 1) throw new Error("Balance: every win was perfect — the run is too easy");

// Run modes (M2): 20 waves must be winnable but not by every squad; endless must end
// (no runaway past the 150-wave guard) and the best squad should get past wave 20.
for (const map of maps) {
  const long = Object.values(SQUADS).map((ids) => playRun(ids, 99, map, { mode: "long" }));
  const longWins = long.filter((run) => run.won).length;
  const endless = Object.values(SQUADS).map((ids) => playRun(ids, 99, map, { mode: "endless" }));
  const deepest = Math.max(...endless.map((run) => run.wave));
  console.log(`${map.id.padEnd(20)} 20 waves: ${longWins}/${long.length} wins (lost at ${long.filter((r) => !r.won).map((r) => r.wave).join(", ") || "-"}) - endless: ${endless.map((r) => r.wave).join(", ")}`);
  if (longWins < 1 || longWins >= long.length) throw new Error(`Balance: 20-wave mode on ${map.id} should have winners and losers, got ${longWins}/${long.length}`);
  if (endless.some((run) => !run.complete)) throw new Error(`Balance: an endless run on ${map.id} hit the wave guard (runaway)`);
  if (deepest <= 20) throw new Error(`Balance: no endless run on ${map.id} got past wave 20 (best ${deepest})`);
}
console.log("Tower defense balance checks passed");
