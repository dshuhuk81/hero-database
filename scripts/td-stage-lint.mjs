// Campaign Encounter Pacing lint (report only). Usage: npm run td:stage-lint [-- --chapter=1 --stage=1-10]
import campaign from "../src/data/tdCampaign.json" with { type: "json" };
import maps from "../src/data/tdMaps.json" with { type: "json" };
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import { stageLintRows } from "../src/game/td/stage-lint.js";

const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const chapter = arg("chapter"), only = arg("stage");
let rows = stageLintRows({ campaign, maps, tuning });
if (chapter) rows = rows.filter((r) => String(r.chapter) === chapter);
if (only) rows = rows.filter((r) => r.stageId === only);
const out = ["| Stage | Gates | Enemies | Target | Groups | Last spawn | Enemies/s | Flags |", "|---|---:|---:|---:|---:|---:|---:|---|"];
for (const r of rows) out.push(`| ${r.stageId} ${r.name} | ${r.gates} | ${r.total} | ${r.target.enemies} | ${r.groups} | ${r.lastSpawnS} s | ${r.pressure} | ${r.flags.join("; ") || "ok"} |`);
console.log(out.join("\n"));
console.log(`\n${rows.length} stages, ${rows.filter((r) => r.flags.length).length} with flags.`);
