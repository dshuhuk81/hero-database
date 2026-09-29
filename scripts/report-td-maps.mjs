// Geometry baseline for authored and generated tower-defense maps.
// Run: npm run td:maps
import maps from "../src/data/tdMaps.json" with { type: "json" };
import { analyzeMap } from "../src/game/td/map-analysis.js";

const reports = maps.map((map) => analyzeMap(map));
const pad = (value, width) => String(value).padStart(width);
const pct = (value) => `${Math.round(value * 100)}%`;

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(reports, null, 2));
  process.exit(0);
}

console.log("Tower defense map geometry baseline");
console.log(
  "map".padEnd(20)
  + pad("lanes", 7)
  + pad("length", 9)
  + pad("turns", 8)
  + pad("road", 7)
  + pad("platform", 10)
  + pad("cov90", 8)
  + pad("cov160", 9)
  + pad("cov210", 9)
  + "  landmark",
);
for (const report of reports) {
  console.log(
    report.id.padEnd(20)
    + pad(report.lanes.count, 7)
    + pad(report.route.length, 9)
    + pad(report.route.turns, 8)
    + pad(report.slots.road, 7)
    + pad(report.slots.platform, 10)
    + pad(pct(report.coverage[90].total), 8)
    + pad(pct(report.coverage[160].total), 9)
    + pad(pct(report.coverage[210].total), 9)
    + `  ${report.landmark}`,
  );
}

console.log("\nCoverage is the share of lane travel within range of at least one platform slot.");
console.log("Use --json for early/middle/late coverage, dominant-slot share, support distances and shared-tail metrics.");

