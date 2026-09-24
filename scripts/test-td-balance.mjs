// Balance harness: plays full ten-wave runs with representative squads using a
// simple policy (deploy affordable heroes, spend spare gold on upgrades, take the
// first virtue offered) and reports duration, spending, leaks, and win rate.
// Run with: npm run test:td-balance
import { TowerDefenseGame } from "../src/game/td/sim.js";
import heroes from "../src/data/gameBalance.json" with { type: "json" };
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import maps from "../src/data/tdMaps.json" with { type: "json" };
import waves from "../src/data/tdWaves.json" with { type: "json" };

const SQUADS = {
  "balanced (S-tier core)": ["nuwa", "poseidon", "zeus", "diana", "caishen"],
  "budget (D-tier)": ["demeter", "horus", "fengyi", "artemis", "freya"],
  "road wall": ["prometheus", "amunra", "momus", "jormungandr", "yuelao"],
  "all platform (no blockers)": ["zeus", "phoenix", "diana", "artemis", "caishen"],
  "glass cannon": ["nyx", "bastet", "phoenix", "zeus", "yuelao"],
};

function playRun(ids, seed, map) {
  const g = new TowerDefenseGame({ heroes, tuning, map, waves, seed });
  if (!g.setTeam(ids)) throw new Error(`Invalid squad: ${ids}`);
  let spent = 0;
  const slotCount = { road: map.roadSlots.length, platform: map.platformSlots.length };
  while (!g.complete) {
    if (!g.running) {
      // deploy every affordable, not-yet-deployed squad member
      for (const id of ids) {
        if (g.heroes.some((h) => h.id === id)) continue;
        const base = g.heroesById.get(id);
        if (g.gold < base.cost) continue;
        for (let i = 0; i < slotCount[base.slot]; i += 1) {
          const before = g.gold;
          if (g.place(id, base.slot, i)) { spent += before - g.gold; break; }
        }
      }
      // spend spare gold on the cheapest available upgrade
      for (let guard = 0; guard < 20; guard += 1) {
        const options = g.heroes.map((h) => g.upgradeInfo(h.entityId)).filter((i) => i.ok);
        if (!options.length) break;
        options.sort((a, b) => a.cost - b.cost);
        const before = g.gold;
        g.upgrade(options[0].hero.entityId);
        spent += before - g.gold;
      }
      if (g.virtueOffer) g.chooseVirtue(g.virtueOffer[0]);
      if (!g.startWave()) break;
    }
    for (let i = 0; i < 60 * 120 && g.running && !g.complete; i += 1) g.step(1 / 60);
  }
  return { won: g.won, lives: g.lives, leaks: g.totalLeaks, score: g.score, spent, seconds: Math.round(g.time), perfect: g.perfect };
}

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
