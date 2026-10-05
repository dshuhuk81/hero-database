// Class identity report (M6 done criteria): class-vs-enemy matrix, stage depth (share of the
// stage's enemies defeated) of the mixed squad without each class, and one-class squads on every map.
// Run with: npm run td:classes
import { classMatrix, classRemoval, CLASSES, monoClass, printMatrix } from "./lib/td-class-matrix.mjs";

console.log("1. Class-vs-enemy matrix (road: enemies stopped, platform: HP destroyed)");
printMatrix(classMatrix());

console.log("\n2. Mixed squad, share of the stage defeated without each class");
const removal = classRemoval();
console.log(`   full squad ${(removal.full * 100).toFixed(0) + "%"}`);
for (const [cls, depth] of Object.entries(removal)) if (cls !== "full") console.log(`   without ${cls.padEnd(9)} ${(depth * 100).toFixed(0) + "%"} (${((depth - removal.full) * 100).toFixed(0)} points)`);

console.log("\n3. One-class squads (W = won with lives left, L = lost after defeating N enemies)");
for (const cls of CLASSES) console.log(`   ${cls.padEnd(9)} ${monoClass(cls).map((r) => `${r.map} ${r.label}`).join("  ")}`);
