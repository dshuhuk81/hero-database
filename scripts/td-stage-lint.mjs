// Campaign Encounter Pacing lint (report only). Usage: npm run td:stage-lint [-- --chapter=1 --stage=1-10 --waves]
// Plan: docs/superpowers/specs/2026-10-05-campaign-encounter-pacing-design.md
import campaign from "../src/data/tdCampaign.json" with { type: "json" };
import maps from "../src/data/tdMaps.json" with { type: "json" };
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import { stageLintRows } from "../src/game/td/stage-lint.js";

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const chapter = arg("chapter"), only = arg("stage"), showWaves = process.argv.includes("--waves");
let rows = stageLintRows({ campaign, maps, tuning });
if (chapter) rows = rows.filter((r) => String(r.chapter) === chapter);
if (only) rows = rows.filter((r) => r.stageId === only);
const out = ["| Stage | Gates | Enemies | Target | Flyers | Max burst/10 s | Flags |", "|---|---:|---:|---|---:|---:|---|"];
for (const r of rows) out.push(`| ${r.stageId} ${r.name} | ${r.gates} | ${r.total} | ${r.target.min}-${r.target.max} | ${r.flyers} | ${Math.max(0, ...r.waves.map((w) => w.burst10))} | ${r.flags.join("; ") || "ok"} |`);
console.log(out.join("\n"));
if (showWaves) for (const r of rows) { console.log(`\n${r.stageId} ${r.name}`); for (const w of r.waves) console.log(`  w${w.wave}: ${w.total} (${Object.entries(w.kinds).map(([k, n]) => `${n} ${k}`).join(", ")}) last ${w.last.toFixed(0)} s, burst ${w.burst10}/10 s`); }
const flagged = rows.filter((r) => r.flags.length).length;
console.log(`\n${rows.length} stages, ${flagged} with flags.`);
