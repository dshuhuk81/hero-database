// Class identity report (M6 done criteria): class-vs-enemy matrix, endless depth of the
// mixed squad without each class, and one-class squads on every map.
// Run with: npm run td:classes
import { classMatrix, classRemoval, CLASSES, monoClass, printMatrix } from "./lib/td-class-matrix.mjs";

console.log("1. Class-vs-enemy matrix (road: enemies stopped, platform: HP destroyed)");
printMatrix(classMatrix());

console.log("\n2. Mixed squad, endless waves reached without each class");
const removal = classRemoval();
console.log(`   full squad ${removal.full.toFixed(1)}`);
for (const [cls, depth] of Object.entries(removal)) if (cls !== "full") console.log(`   without ${cls.padEnd(9)} ${depth.toFixed(1)} (${(depth - removal.full >= 0 ? "+" : "")}${(depth - removal.full).toFixed(1)})`);

console.log("\n3. One-class squads, 10 waves (W = won with lives left, L = lost in wave)");
for (const cls of CLASSES) console.log(`   ${cls.padEnd(9)} ${monoClass(cls).map((r) => `${r.map} ${r.label}`).join("  ")}`);
