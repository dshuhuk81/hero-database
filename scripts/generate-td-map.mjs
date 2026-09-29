// Map generator CLI (orthogonal-v1, src/game/td/map-generator.js).
//   node scripts/generate-td-map.mjs --seed=3 --skin=sunscar              report one candidate
//   node scripts/generate-td-map.mjs --seed=3 --skin=sunscar --id=sunscar-basin --name="Sunscar Basin" --publish
//   node scripts/generate-td-map.mjs --check                              regenerate every published
//                                                                         generated map from its recipe
// Publishing writes an ordinary record into tdMaps.json (same format as build-td-grid.mjs).
import { readFileSync, writeFileSync } from "node:fs";
import { generateMap, geometryHash, GENERATOR_ID, GENERATOR_RULESET } from "../src/game/td/map-generator.js";
import { analyzeMap } from "../src/game/td/map-analysis.js";

const file = new URL("../src/data/tdMaps.json", import.meta.url);
const source = readFileSync(file, "utf8");
const maps = JSON.parse(source);
const format = (list) => `[\n${list.map((map) => `  {\n${Object.entries(map).map(([key, value]) => `    ${JSON.stringify(key)}: ${JSON.stringify(value)}`).join(",\n")}\n  }`).join(",\n")}\n]\n`;

// Skins the generator may use: identity defaults plus safe regions (painted edge props).
const SKINS = {
  sunscar: { theme: "sunscar", art: "sunscar-sanctuary-v1", music: "cc0_hope_orchestral", boss: "baphomet",
    exclude: [[0, 0, 100, 90], [770, 0, 190, 215], [860, 370, 100, 170], [0, 440, 130, 100]] },
  moonlit: { theme: "moonlit", art: "moonlit-sanctuary-v1", music: "cc0_battlegrounds", boss: "baphomet", exclude: [[380, 0, 260, 80]] },
  verdant: { theme: "verdant", art: "verdant-shrine-v1", music: "cc0_knights_challenge", boss: "lilith", exclude: [[790, 0, 170, 125]] },
};

const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=") ?? fallback;
const flag = (name) => process.argv.includes(`--${name}`);
const range = (text) => text.split(",").map(Number);

if (flag("check")) {
  let failed = 0;
  for (const map of maps.filter((entry) => entry.recipe)) {
    const identity = { id: map.id, name: map.name, theme: map.theme, art: map.art, music: map.music, boss: map.boss };
    const result = generateMap(map.recipe, identity);
    // Hand edits after publishing (e.g. enemyHp) are allowed; geometry must match exactly.
    const same = result.ok && result.map.geometryHash === map.geometryHash && geometryHash(map) === map.geometryHash;
    console.log(`${map.id}: ${same ? "regenerates identically" : "DIFFERS from its recipe"} (${map.geometryHash})`);
    if (!same) failed += 1;
  }
  process.exit(failed ? 1 : 0);
}

const skinId = arg("skin", "sunscar");
const skin = SKINS[skinId];
if (!skin) throw new Error(`unknown skin ${skinId}; one of ${Object.keys(SKINS).join(", ")}`);
const recipe = {
  generator: GENERATOR_ID,
  ruleset: GENERATOR_RULESET,
  seed: Number(arg("seed", 1)),
  topology: "single-lane",
  difficultyBand: arg("band", "standard"),
  parameters: { turns: range(arg("turns", "6,8")), length: range(arg("length", "1600,2200")), coverageGap: range(arg("gap", "0.03,0.2")) },
  constraints: { exclude: skin.exclude },
};
const identity = { id: arg("id", `generated-${skinId}-${recipe.seed}`), name: arg("name", `Generated ${recipe.seed}`), theme: skin.theme, art: skin.art, music: skin.music, boss: arg("boss", skin.boss) };
const result = generateMap(recipe, identity);
if (!result.ok) {
  console.error(`no map after ${result.attempts} attempts: ${JSON.stringify(result.rejections)}`);
  process.exit(1);
}
const { map } = result;
const a = analyzeMap(map);
console.log(`${map.id} after ${result.attempts} attempt(s), rejected ${JSON.stringify(result.rejections)}`);
console.log(`  path ${JSON.stringify(map.path)}`);
console.log(`  length ${a.route.length}, turns ${a.route.turns}, road ${map.roadSlots.length}, platform ${map.platformSlots.length}, coverage@90 ${a.coverage[90].total}, landmark ${a.landmark}, hash ${map.geometryHash}`);

if (flag("publish")) {
  const at = maps.findIndex((entry) => entry.id === map.id);
  if (at >= 0 && !maps[at].recipe) throw new Error(`${map.id} is an authored map; pick another id`);
  const next = at >= 0 ? maps.map((entry, i) => (i === at ? map : entry)) : [...maps, map];
  writeFileSync(file, format(next));
  console.log(`published ${map.id} into tdMaps.json`);
}
