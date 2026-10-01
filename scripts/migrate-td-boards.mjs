// One-time migration of every battlefield to a compact board (docs/tower-defense-board-plan.md
// step 3). Each map keeps its id, name, theme, art, music, boss and flags; its geometry is
// regenerated with board-v1 from a recipe that reproduces it alone (npm run td:board -- --check).
//   Sizes: Chapter 1 stages 8 x 4, chapter finales 10 x 5, everything else 9 x 5; a Free Play
//   map takes the size of its first campaign stage.
//   Two gates: maps that had two lanes, every finale, and stage 3 of chapters 2 and later.
//   Stages that shared a map (1-5, 1-9, 1-10) get their own map, so no two stages share a layout.
// Run: node scripts/migrate-td-boards.mjs [--dry]
import { readFileSync, writeFileSync } from "node:fs";
import { BOARD_GENERATOR_ID, BOARD_GENERATOR_RULESET, generateBoardMap, layoutConflict } from "../src/game/td/map-generator-board.js";

const mapsFile = new URL("../src/data/tdMaps.json", import.meta.url);
const campaignFile = new URL("../src/data/tdCampaign.json", import.meta.url);
const maps = JSON.parse(readFileSync(mapsFile, "utf8"));
const campaignSource = readFileSync(campaignFile, "utf8");
const campaign = JSON.parse(campaignSource);
const format = (list) => `[\n${list.map((map) => `  {\n${Object.entries(map).map(([key, value]) => `    ${JSON.stringify(key)}: ${JSON.stringify(value)}`).join(",\n")}\n  }`).join(",\n")}\n]\n`;
const GEOMETRY = ["spawn", "path", "lanes", "base", "grid", "roadSlots", "platformSlots", "rings", "recipe", "geometryHash"];

// Stage per map (first use), and the new maps for stages that shared one.
const SPLIT = {
  "1-5": { id: "moonlit-horned-gate", from: "moonlit-pass" },
  "1-9": { id: "sunscar-eve", from: "sunscar-ruins" },
  "1-10": { id: "verdant-last-crossing", from: "verdant-crossing" },
};
const stages = campaign.chapters.flatMap((chapter) => chapter.stages.map((stage, i) => ({ stage, chapter, finale: i === chapter.stages.length - 1, index: i })));
for (const { stage } of stages) if (SPLIT[stage.id]) {
  const source = maps.find((map) => map.id === SPLIT[stage.id].from);
  if (!maps.some((map) => map.id === SPLIT[stage.id].id)) {
    const copy = Object.fromEntries(Object.entries(source).filter(([key]) => !GEOMETRY.includes(key) && key !== "enemyHp"));
    maps.push({ ...copy, id: SPLIT[stage.id].id, name: stage.name, campaignOnly: true, lanes: source.lanes });
  }
  stage.mapId = SPLIT[stage.id].id;
}
const firstStage = {};
for (const entry of stages) firstStage[entry.stage.mapId] ??= entry;

const hash = (text) => [...text].reduce((h, ch) => (Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0), 2166136261);
const made = [];
const out = [];
for (const map of maps) {
  if (map.prototype) { out.push(map); made.push(map); continue; }
  const use = firstStage[map.id];
  const chapterOne = use?.chapter.id === 1;
  const size = !use ? "9x5" : use.finale ? "10x5" : chapterOne ? "8x4" : "9x5";
  const gates = map.lanes || use?.finale || (use && !chapterOne && use.index === 2) ? 2 : 1;
  const identity = Object.fromEntries(Object.entries(map).filter(([key]) => !GEOMETRY.includes(key)));
  let result = null;
  for (let seed = hash(map.id) % 50000 + 1, tries = 0; tries < 400; seed++, tries++) {
    const recipe = { generator: BOARD_GENERATOR_ID, ruleset: BOARD_GENERATOR_RULESET, seed, size, gates, entry: ["left", "top", "bottom"] };
    const r = generateBoardMap(recipe, identity);
    if (r.ok && !made.some((other) => layoutConflict(r.map, other))) { result = r; break; }
  }
  if (!result) throw new Error(`${map.id}: no unique ${size} ${gates}-gate board`);
  made.push(result.map);
  out.push(result.map);
  console.log(`${map.id.padEnd(24)} ${size.padEnd(5)} ${gates} gate(s)  seed ${result.map.recipe.seed}  stage ${use?.stage.id ?? "-"}`);
}
if (!process.argv.includes("--dry")) {
  writeFileSync(mapsFile, format(out));
  writeFileSync(campaignFile, campaignSource.replace(/"id": "(1-5|1-9|1-10)",([\s\S]*?)"mapId": "[^"]+"/g, (all, id, mid) => `"id": "${id}",${mid}"mapId": "${SPLIT[id].id}"`));
  console.log(`wrote ${out.length} maps; stages 1-5, 1-9, 1-10 point to their own maps`);
}
