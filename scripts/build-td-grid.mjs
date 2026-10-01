// Placement tiles (M22b): regenerates roadSlots / platformSlots / rings in tdMaps.json
// from each map's route and "grid" block (src/game/td/grid.js). Run after changing a
// route or a grid block. `--check` exits non-zero when the file is out of date (tests).
import { readFileSync, writeFileSync } from "node:fs";
import { buildGrid } from "../src/game/td/grid.js";

const file = new URL("../src/data/tdMaps.json", import.meta.url);
const source = readFileSync(file, "utf8");
const maps = JSON.parse(source);

// One key per line, values compact: keeps the file diffable and hand-editable.
const format = (list) => `[\n${list.map((map) => `  {\n${Object.entries(map).map(([key, value]) => `    ${JSON.stringify(key)}: ${JSON.stringify(value)}`).join(",\n")}\n  }`).join(",\n")}\n]\n`;

const next = maps.map((map) => {
  if (!map.grid) throw new Error(`${map.id}: no grid block`);
  const { roadSlots, platformSlots, rings } = buildGrid(map);
  if (Object.keys(rings).length !== (map.grid.board?.rings ?? map.grid.rings ?? []).length) throw new Error(`${map.id}: two rings landed on one tile`);
  return { ...map, rings, roadSlots, platformSlots };
});
const output = format(next);

if (process.argv.includes("--check")) {
  if (output !== source) { console.error("tdMaps.json is out of date: run node scripts/build-td-grid.mjs"); process.exit(1); }
  console.log("tdMaps.json tiles up to date");
} else {
  writeFileSync(file, output);
  for (const map of next) console.log(`${map.id}: ${map.roadSlots.length} road tiles, ${map.platformSlots.length} side tiles, rings ${JSON.stringify(map.rings)}`);
}
