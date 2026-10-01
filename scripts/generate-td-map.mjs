// Map generator CLI (orthogonal-v1, src/game/td/map-generator.js).
//   node scripts/generate-td-map.mjs --seed=3 --skin=sunscar              report one candidate
//   node scripts/generate-td-map.mjs --seed=3 --skin=sunscar --id=sunscar-basin --name="Sunscar Basin" --publish
//   node scripts/generate-td-map.mjs --gen=lattice-v2 --seed=4 --skin=sunscar [--gates=2] [--entry=left,top,bottom]
//        lattice-v2 (src/game/td/map-generator-v2.js): any entry edge, base in the right third,
//        tight meanders, optional second gate. --gallery=N writes N candidates as an HTML sheet.
//   node scripts/generate-td-map.mjs --check                              regenerate every published
//                                                                         generated map from its recipe
// Publishing writes an ordinary record into tdMaps.json (same format as build-td-grid.mjs).
import { readFileSync, writeFileSync } from "node:fs";
import { generateMap, geometryHash, GENERATOR_ID, GENERATOR_RULESET } from "../src/game/td/map-generator.js";
import { generateMapV2, geometryHashV2, GENERATOR_V2_ID, GENERATOR_V2_RULESET } from "../src/game/td/map-generator-v2.js";
import { mapLanes } from "../src/game/td/lanes.js";
import { analyzeMap } from "../src/game/td/map-analysis.js";
import { ENVIRONMENTS } from "../src/game/td/environments.js";

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
  jungle: { theme: "jungle", art: "jungle-heart-v1", music: "cc0_knights_challenge", boss: "lilith",
    exclude: [[0, 0, 110, 100], [760, 0, 200, 120], [0, 430, 145, 110], [815, 425, 145, 115]] },
};
for (const environment of Object.values(ENVIRONMENTS)) {
  SKINS[environment.id] = { theme: environment.id, art: `${environment.id}-sanctuary-v1`,
    music: "cc0_battlegrounds", boss: "baphomet", exclude: [[0, 0, 120, 90], [770, 0, 190, 90], [0, 450, 120, 90], [820, 450, 140, 90]] };
}

const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=") ?? fallback;
const flag = (name) => process.argv.includes(`--${name}`);
const range = (text) => text.split(",").map(Number);

if (flag("check")) {
  let failed = 0;
  for (const map of maps.filter((entry) => entry.recipe)) {
    const identity = { id: map.id, name: map.name, theme: map.theme, art: map.art, music: map.music, boss: map.boss };
    const v2 = map.recipe.generator === GENERATOR_V2_ID;
    const result = v2 ? generateMapV2(map.recipe, identity) : generateMap(map.recipe, identity);
    // Hand edits after publishing (e.g. enemyHp) are allowed; geometry must match exactly.
    const same = result.ok && result.map.geometryHash === map.geometryHash && (v2 ? geometryHashV2(map) : geometryHash(map)) === map.geometryHash;
    console.log(`${map.id}: ${same ? "regenerates identically" : "DIFFERS from its recipe"} (${map.geometryHash})`);
    if (!same) failed += 1;
  }
  process.exit(failed ? 1 : 0);
}

const skinId = arg("skin", "sunscar");
const skin = SKINS[skinId];
if (!skin) throw new Error(`unknown skin ${skinId}; one of ${Object.keys(SKINS).join(", ")}`);
const V2 = arg("gen", GENERATOR_ID) === GENERATOR_V2_ID;
const recipeFor = (seed) => V2 ? {
  generator: GENERATOR_V2_ID,
  ruleset: GENERATOR_V2_RULESET,
  seed,
  topology: arg("gates", "1") === "2" ? "two-gate" : "single-lane",
  difficultyBand: arg("band", "standard"),
  parameters: { turns: range(arg("turns", "4,14")), length: range(arg("length", "1300,2600")), coverageGap: range(arg("gap", "0,0.3")), entry: arg("entry", "left,top,bottom").split(",") },
  constraints: { exclude: skin.exclude },
} : null;
const recipe = recipeFor(Number(arg("seed", 1))) ?? {
  generator: GENERATOR_ID,
  ruleset: GENERATOR_RULESET,
  seed: Number(arg("seed", 1)),
  topology: "single-lane",
  difficultyBand: arg("band", "standard"),
  parameters: { turns: range(arg("turns", "6,8")), length: range(arg("length", "1600,2200")), coverageGap: range(arg("gap", "0.03,0.2")) },
  constraints: { exclude: skin.exclude },
};
const identity = { id: arg("id", `generated-${skinId}-${recipe.seed}`), name: arg("name", `Generated ${recipe.seed}`), theme: skin.theme, art: skin.art, music: skin.music, boss: arg("boss", skin.boss) };
const gen = (r, who) => (V2 ? generateMapV2(r, who) : generateMap(r, who));

// Gallery: N candidates from consecutive seeds on the skin's terrain, as one local HTML page
// (public/td-local/, gitignored) to pick from. Nothing is published.
if (arg("gallery")) {
  const { mapSceneFor } = await import("../src/game/td/map-scene.js");
  const count = Number(arg("gallery"));
  const cards = [];
  for (let seed = Number(arg("seed", 1)); cards.length < count && seed < Number(arg("seed", 1)) + count * 4; seed++) {
    const r = V2 ? recipeFor(seed) : { ...recipe, seed };
    const res = gen(r, { ...identity, id: `candidate-${seed}` });
    if (!res.ok) continue;
    const m = res.map;
    const a = analyzeMap(m);
    const terrain = mapSceneFor(m)?.assets.terrain ?? "";
    const lines = mapLanes(m).map((lane) => `<polyline points="${lane.path.map((p) => p.join(",")).join(" ")}" />`).join("");
    const gates = mapLanes(m).map((lane) => `<circle class="gate" cx="${lane.spawn.x}" cy="${lane.spawn.y}" r="22" />`).join("");
    cards.push(`<figure><svg viewBox="0 0 960 540"><image href="${terrain}" width="960" height="540" preserveAspectRatio="none" />
      <g class="edge">${lines}</g><g class="core">${lines}</g>${gates}<rect class="base" x="${m.base.x - 26}" y="${m.base.y - 26}" width="52" height="52" rx="8" /></svg>
      <figcaption>seed ${seed} · ${mapLanes(m).length} gate${mapLanes(m).length > 1 ? "s" : ""} · length ${Math.round(a.route.length)} · turns ${a.route.turns} · road ${m.roadSlots.length} · side ${m.platformSlots.length}</figcaption></figure>`);
  }
  const { mkdirSync } = await import("node:fs");
  mkdirSync(new URL("../public/td-local/", import.meta.url), { recursive: true });
  const out = new URL(`../public/td-local/map-gallery-${skinId}${V2 && recipe.topology === "two-gate" ? "-2gates" : ""}.html`, import.meta.url);
  writeFileSync(out, `<!doctype html><meta charset="utf-8"><title>Map candidates</title><style>
    body { background: #14121c; color: #e6e1f2; font: 14px system-ui; margin: 16px; }
    main { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
    figure { margin: 0; background: #1f1c2b; border-radius: 12px; overflow: hidden; }
    svg { display: block; width: 100%; } figcaption { padding: 8px 12px; }
    .edge polyline { fill: none; stroke: rgba(7,6,12,.6); stroke-width: 70; stroke-linejoin: round; stroke-linecap: round; }
    .core polyline { fill: none; stroke: rgba(232,190,72,.85); stroke-width: 50; stroke-linejoin: round; stroke-linecap: round; }
    .gate { fill: #a88be0; stroke: #14121c; stroke-width: 4; } .base { fill: #ffd98a; stroke: #14121c; stroke-width: 4; }
    </style><h1>${skinId} · ${V2 ? recipe.topology : GENERATOR_ID}</h1><main>${cards.join("")}</main>`);
  console.log(`wrote ${cards.length} candidates to ${out.pathname}`);
  process.exit(0);
}
const result = gen(recipe, identity);
if (!result.ok) {
  console.error(`no map after ${result.attempts} attempts: ${JSON.stringify(result.rejections)}`);
  process.exit(1);
}
const { map } = result;
const a = analyzeMap(map);
console.log(`${map.id} after ${result.attempts} attempt(s), rejected ${JSON.stringify(result.rejections)}`);
console.log(`  ${map.lanes ? `lanes ${JSON.stringify(map.lanes.map((lane) => lane.path))}` : `path ${JSON.stringify(map.path)}`}`);
console.log(`  length ${a.route.length}, turns ${a.route.turns}, road ${map.roadSlots.length}, platform ${map.platformSlots.length}, coverage@90 ${a.coverage[90].total}, landmark ${a.landmark}, hash ${map.geometryHash}`);

if (flag("publish")) {
  const at = maps.findIndex((entry) => entry.id === map.id);
  if (at >= 0 && !maps[at].recipe) throw new Error(`${map.id} is an authored map; pick another id`);
  const next = at >= 0 ? maps.map((entry, i) => (i === at ? map : entry)) : [...maps, map];
  writeFileSync(file, format(next));
  console.log(`published ${map.id} into tdMaps.json`);
}
