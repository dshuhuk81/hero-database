// Balance harness: plays full stages with representative squads using a simple policy (deploy affordable
// heroes as placement regrows) and reports duration, spending, leaks, and win rate.
// Run with: npm run test:td-balance
import { freePlayMaps, playRun, SQUADS, STARTERS } from "./lib/td-runner.mjs";
import { bestClass, classMatrix, EXPECTED, printMatrix } from "./lib/td-class-matrix.mjs";
import classicMaps from "./fixtures/td-classic-maps.json" with { type: "json" };

// Free Play rules (the map's timeline, map enemyHp) only run on Free Play battlefields; campaign-only
// boards are checked with their stage settings by test-td-campaign.mjs.
const openMaps = freePlayMaps;

console.log("map".padEnd(20), "squad".padEnd(30), "result  lives  leaks  score  spent  duration");
let wins = 0;
let imperfect = 0;
for (const map of openMaps) {
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

// Owned roster (Phase 2): a new player's Free Play deck is only the campaign starters. They
// must win at least one Free Play battlefield at Normal with either upgrade policy, so the
// mode never opens as a dead end; not every one, so new heroes still matter.
const starterRuns = freePlayMaps.map((map) => ({ map, runs: ["cheapest", "carry"].map((policy) => playRun(STARTERS, 99, map, { policy, game: { allowedHeroes: STARTERS } })) }));
for (const { map, runs } of starterRuns) console.log(`${map.id.padEnd(20)} starters only: ${runs.map((run) => (run.won ? `W${run.lives}` : `L${run.defeated}`)).join(" / ")} (cheapest / carry)`);
if (!starterRuns.some(({ runs }) => runs.some((run) => run.won))) throw new Error("Balance: the starter heroes win no Free Play battlefield");

// Class identity (M6): each group type calls for its class (design intent in EXPECTED).
// Owner-approved tolerance (September 28, 2026): with automatic aiming (M24) Warrior cleaves
// reliably and edges past Tank on shield groups; the Tank only has to stay within 3 points.
// healer/platform: Atalanta's Burning Volley clears the small healer pack on her own
// (roadmap: archers must handle swarms), which lifts the Archer mean just past Mage.
const TOLERANCE = { shield: { road: 0.09 }, healer: { platform: 0.08 }, armored: { platform: 0.05 } };
// Class kits are checked on a classic map, where range circles keep the M6 measure meaningful;
// on boards the attack patterns decide reach, so the board matrix is printed for information.
const matrix = classMatrix({ map: classicMaps[0] });
printMatrix(matrix);
console.log("Board (patterns, enemy shape), for information:");
printMatrix(classMatrix({ map: openMaps[0] }));
for (const [groupType, want] of Object.entries(EXPECTED)) {
  for (const [group, cls] of Object.entries(want)) {
    const got = bestClass(matrix[groupType], group, groupType);
    const gap = matrix[groupType][got] - matrix[groupType][cls];
    if (got !== cls && gap > (TOLERANCE[groupType]?.[group] ?? 0)) throw new Error(`Class matrix: ${groupType} should call for a ${cls} on ${group} rings, best is ${got}`);
  }
}
console.log("Tower defense balance checks passed");
