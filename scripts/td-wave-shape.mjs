// Wave shape prototype report (TOWER_DEFENSE_GAMEPLAY_IDEAS.md, section F step 1): compares
// today's waves with fewer, stronger enemies (tuning.waveShape). Same total health, gold,
// pressure and lives at stake; only the number of bodies changes.
// Run with: npm run td:wave-shape -- [--count=0.2] [--gap=2.5] [--hp=5] [--attack=5] [--seeds=3] [--mode=classic]
// --hp and --attack override the per-enemy multipliers (default 1 / count).
// --focus=1 also gives Mages the focus rule (classes.Mage.focus, see sim.focusShare) in the
// shaped runs; --focus-today=1 adds it to today's runs too, to see what it does there.
import baseTuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import heroes from "../src/data/gameBalance.json" with { type: "json" };
import { classMatrix, bestClass, CLASSES } from "./lib/td-class-matrix.mjs";
import { freePlayMaps, playRun, SQUADS } from "./lib/td-runner.mjs";

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, value] = arg.replace(/^--/, "").split("=");
  return [key, value ?? "1"];
}));
const count = Number(args.count || 0.2);
const gap = Number(args.gap || 2.5);
const seeds = Array.from({ length: Math.max(1, Number(args.seeds || 3)) }, (_, i) => 99 + i);
const mode = args.mode || "classic";
const extra = Object.fromEntries(["hp", "attack"].filter((k) => args[k]).map((k) => [k, Number(args[k])]));

const withFocus = (tuning) => ({ ...tuning, classes: { ...tuning.classes, Mage: { ...tuning.classes.Mage, focus: { slots: 2, share: 1 } } } });
const shaped = { ...baseTuning, waveShape: { enabled: true, count, gap, ...extra } };
const shapes = {
  today: args["focus-today"] ? withFocus(baseTuning) : baseTuning,
  shaped: args.focus ? withFocus(shaped) : shaped,
};
const classOf = Object.fromEntries(heroes.map((h) => [h.id, h.class]));
const pct = (v) => `${Math.round(v * 100)}%`;

const power = (1 / count).toFixed(2);
console.log(`Wave shape: count x${count}, health x${extra.hp ?? power}, attack x${extra.attack ?? power}, gold/leak x${power}, spawn gap x${gap}`);
if (args.focus || args["focus-today"]) console.log(`Mage focus: ${args["focus-today"] ? "today and shaped" : "shaped only"}`);
console.log(`Runs: ${mode}, Normal, seeds ${seeds.join(",")}, maps ${freePlayMaps.map((m) => m.id).join(", ")}\n`);

// 1. Class-vs-enemy matrix, today vs shaped.
console.log("1. Class-vs-enemy matrix (road: enemies stopped, platform: HP destroyed), today -> shaped");
const matrices = Object.fromEntries(Object.entries(shapes).map(([name, tuning]) => [name, classMatrix({ tuning })]));
console.log("wave".padEnd(10) + CLASSES.map((c) => c.padStart(14)).join("") + "   best road / platform");
for (const wave of Object.keys(matrices.today)) {
  const a = matrices.today[wave], b = matrices.shaped[wave];
  const cells = CLASSES.map((c) => `${pct(a[c])}->${pct(b[c])}`.padStart(14)).join("");
  console.log(wave.padEnd(10) + cells + `   ${bestClass(a, "road")}/${bestClass(a, "platform")} -> ${bestClass(b, "road")}/${bestClass(b, "platform")}`);
}

// Wins and mean lives (as a share of the start) over maps x seeds x both bot policies.
function score(ids, tuning) {
  let wins = 0, lives = 0, runs = 0, seconds = 0;
  for (const map of freePlayMaps) for (const seed of seeds) for (const policy of ["cheapest", "carry"]) {
    const run = playRun(ids, seed, map, { tuning, mode, policy });
    runs += 1; seconds += run.seconds;
    if (run.won) { wins += 1; lives += run.lives / tuning.run.lives; }
  }
  return { wins, runs, lives: wins ? lives / wins : 0, minutes: seconds / runs / 60 };
}
const line = (label, a, b) => console.log(`   ${label.padEnd(30)} ${`${a.wins}/${a.runs} won, ${pct(a.lives)} lives, ${a.minutes.toFixed(1)} min`.padEnd(34)} -> ${b.wins}/${b.runs} won, ${pct(b.lives)} lives, ${b.minutes.toFixed(1)} min`);

console.log("\n2. Bot squads (wins, mean lives kept on a win, mean run length), today -> shaped");
for (const [name, ids] of Object.entries(SQUADS)) line(name, score(ids, shapes.today), score(ids, shapes.shaped));

console.log("\n3. Balanced squad without each class, today -> shaped");
const balanced = SQUADS["balanced (S-tier core)"];
line("full squad", score(balanced, shapes.today), score(balanced, shapes.shaped));
for (const cls of CLASSES) {
  const ids = balanced.filter((id) => classOf[id] !== cls);
  if (ids.length < balanced.length) line(`without ${cls}`, score(ids, shapes.today), score(ids, shapes.shaped));
}

console.log("\n4. One-class squads, today -> shaped");
for (const cls of CLASSES) {
  const ids = heroes.filter((h) => h.class === cls && !h.id.startsWith("recruit-")).map((h) => h.id);
  line(cls, score(ids, shapes.today), score(ids, shapes.shaped));
}
