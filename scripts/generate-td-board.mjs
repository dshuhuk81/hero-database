// Board map generator CLI (board-v1, src/game/td/map-generator-board.js;
// docs/tower-defense-board-plan.md step 2).
//   node scripts/generate-td-board.mjs --size=9x5 --gates=2 --theme=jungle --count=24 [--seed=1] [--entry=left,top,bottom]
//        writes a candidate atlas to public/td-local/board-atlas-<theme>-<size>-<gates>g.html
//        (gitignored). Every candidate is unique against every board map in tdMaps.json and
//        against the other candidates (layoutConflict: identical or mirrored cells, or more
//        than 70% of the road shared).
//   node scripts/generate-td-board.mjs --check
//        every board-v1 map regenerates from its recipe, and no two board maps share a layout.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { BOARD_GENERATOR_ID, BOARD_GENERATOR_RULESET, BOARD_SIZES, boardGeometryHash, generateBoardMap, layoutConflict } from "../src/game/td/map-generator-board.js";
import { mapSceneFor } from "../src/game/td/map-scene.js";

const maps = JSON.parse(readFileSync(new URL("../src/data/tdMaps.json", import.meta.url), "utf8"));
const boards = maps.filter((map) => map.grid?.board);
const arg = (name, fallback) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=") ?? fallback;
const flag = (name) => process.argv.includes(`--${name}`);

if (flag("check")) {
  let failed = 0;
  for (const map of boards.filter((entry) => entry.recipe?.generator === BOARD_GENERATOR_ID)) {
    const identity = Object.fromEntries(["id", "name", "theme", "art", "music", "boss"].map((k) => [k, map[k]]));
    const result = generateBoardMap(map.recipe, identity, { avoid: boards.filter((other) => other.id !== map.id && other.id < map.id) });
    const same = result.ok && result.map.geometryHash === map.geometryHash && boardGeometryHash(map) === map.geometryHash;
    if (!same) { console.log(`${map.id}: DIFFERS from its recipe`); failed++; }
  }
  for (let i = 0; i < boards.length; i++) for (let j = i + 1; j < boards.length; j++) {
    const why = layoutConflict(boards[i], boards[j]);
    if (why) { console.log(`${boards[i].id} and ${boards[j].id} share a layout (${why})`); failed++; }
  }
  console.log(failed ? `${failed} problem(s)` : `${boards.length} board map(s): recipes regenerate, every layout unique`);
  process.exit(failed ? 1 : 0);
}

const size = arg("size", "9x5");
if (!BOARD_SIZES[size]) throw new Error(`unknown size ${size}; one of ${Object.keys(BOARD_SIZES).join(", ")}`);
const gates = Number(arg("gates", "1"));
const theme = arg("theme", "jungle");
const sample = maps.find((map) => map.theme === theme);
if (!sample) throw new Error(`no map with theme ${theme} to borrow art from`);
const identity = { theme, art: sample.art, music: sample.music, boss: sample.boss };
const count = Number(arg("count", "24"));
const entry = arg("entry", "left,top,bottom").split(",");
const terrain = mapSceneFor(sample)?.assets?.terrain ?? "";

const made = [];
let seed = Number(arg("seed", "1"));
const lastSeed = seed + count * 20;
for (; made.length < count && seed < lastSeed; seed++) {
  const recipe = { generator: BOARD_GENERATOR_ID, ruleset: BOARD_GENERATOR_RULESET, seed, size, gates, entry };
  const result = generateBoardMap(recipe, { ...identity, id: `candidate-${seed}`, name: `Candidate ${seed}` }, { avoid: [...boards, ...made] });
  if (result.ok) made.push(result.map);
}

// One card per candidate: theme terrain under the board cells (road, platforms, special
// tiles), gates and base, the lanes as lines.
const RING_COLOR = { highground: "#ffd166", cursed: "#ef476f", shrine: "#4cc9f0" };
const card = (map) => {
  const b = map.grid.board;
  const rect = ([c, r], fill, stroke = "none") => `<rect x="${b.origin[0] + c * b.cell + 3}" y="${b.origin[1] + r * b.cell + 3}" width="${b.cell - 6}" height="${b.cell - 6}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="4"/>`;
  const lanes = map.lanes ?? [{ spawn: map.spawn, path: map.path }];
  const lines = lanes.map((lane) => `<polyline points="${lane.path.map((p) => p.join(",")).join(" ")}" fill="none" stroke="#f4d58d" stroke-width="10" stroke-linejoin="round" stroke-linecap="round" opacity="0.9"/>`).join("");
  const rings = (b.rings ?? []).map(({ cell, kind }) => rect(cell, "none", RING_COLOR[kind]));
  const gatesSvg = lanes.map((lane) => `<circle cx="${lane.spawn.x}" cy="${lane.spawn.y}" r="20" fill="#d64545" stroke="#14121c" stroke-width="4"/>`).join("");
  const length = Math.round(lanes[0].path.slice(1).reduce((sum, p, i) => sum + Math.abs(p[0] - lanes[0].path[i][0]) + Math.abs(p[1] - lanes[0].path[i][1]), 0) / b.cell);
  return `<figure><svg viewBox="0 0 960 540"><image href="${terrain}" width="960" height="540" preserveAspectRatio="none" opacity="0.55"/>
    ${b.road.map((cell) => rect(cell, "rgba(199,163,84,0.55)")).join("")}${b.platforms.map((cell) => rect(cell, "rgba(116,208,160,0.6)")).join("")}
    ${rings.join("")}${lines}${gatesSvg}<rect x="${map.base.x - 26}" y="${map.base.y - 26}" width="52" height="52" rx="10" fill="#ffd98a" stroke="#14121c" stroke-width="4"/></svg>
    <figcaption>seed ${map.recipe.seed} · ${lanes.length} gate${lanes.length > 1 ? "s" : ""} · lane ${length} cells · road tiles ${map.roadSlots.length} · platform tiles ${map.platformSlots.length}</figcaption></figure>`;
};

mkdirSync(new URL("../public/td-local/", import.meta.url), { recursive: true });
const out = new URL(`../public/td-local/board-atlas-${theme}-${size}-${gates}g.html`, import.meta.url);
writeFileSync(out, `<!doctype html><meta charset="utf-8"><title>Board candidates</title><style>
  body { background: #14121c; color: #e6e1f2; font: 14px system-ui; margin: 16px; }
  main { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
  figure { margin: 0; background: #1f1c2b; border-radius: 12px; overflow: hidden; }
  svg { display: block; width: 100%; } figcaption { padding: 8px 12px; }
  .key span { display: inline-block; margin-right: 14px; }
</style><h1>${theme} · ${size} · ${gates} gate${gates > 1 ? "s" : ""} · ${made.length} unique candidates</h1>
<p class="key"><span>gold: road tiles</span><span>green: platform tiles</span><span>yellow rim: high ground</span><span>red rim: cursed</span><span>blue rim: shrine</span><span>red dot: gate</span></p>
<main>${made.map(card).join("")}</main>`);
console.log(`wrote ${made.length} unique candidates (seeds up to ${seed - 1}) to ${out.pathname}`);
