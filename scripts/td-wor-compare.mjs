// Shape comparison: our Campaign stage load vs the Watcher of Realms (WoR) analysis CSV.
// Reference only: values are normalised per progress decile (enemy count, spawn pressure, load
// growth); raw WoR numbers are never meant to be copied. See TOWER_DEFENSE_ROADMAP.md
// ("Reference: Watcher of Realms").
// Usage: npm run td:wor-compare [-- --wor=<path to wor_campaign_scaling.csv>]
import { readFileSync } from "node:fs";
import campaign from "../src/data/tdCampaign.json" with { type: "json" };
import maps from "../src/data/tdMaps.json" with { type: "json" };
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import { campaignLoadRows } from "../src/game/td/campaign-load.js";

const DEFAULT_WOR = `${process.env.HOME}/Documents/Codex/2026-10-04/referenced-chatgpt-conversation-this-is-an/outputs/wor_campaign_scaling.csv`;
const BUCKETS = 10;

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i += 1;
      row.push(cell); cell = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((key, i) => [key, r[i]])));
}

const median = (values) => {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return NaN;
  const mid = v.length >> 1;
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
};

// Splits an ordered stage list into progress buckets and reduces each with `pick`.
function bucketed(stages) {
  const out = Array.from({ length: BUCKETS }, () => []);
  stages.forEach((stage, i) => out[Math.min(BUCKETS - 1, Math.floor((i / stages.length) * BUCKETS))].push(stage));
  return out;
}

function summarise(stages) {
  return bucketed(stages).map((group) => ({
    count: median(group.map((s) => s.enemyCount)),
    perSecond: median(group.map((s) => s.enemiesPerSecond)),
    load: median(group.map((s) => s.load)),
  }));
}

function loadWor(path) {
  return parseCsv(readFileSync(path, "utf8"))
    .filter((r) => /^N\d/.test(r.label) && Number(r.enemy_total) > 0)
    .sort((a, b) => Number(a.stage_id) - Number(b.stage_id))
    .map((r) => ({
      enemyCount: Number(r.enemy_total),
      enemiesPerSecond: Number(r.last_spawn_ms) > 0 && Number(r.last_spawn_ms) < 9_000_000 ? Number(r.enemy_total) / (Number(r.last_spawn_ms) / 1000) : NaN,
      load: Number(r.composite_load_vs_n1_1),
    }));
}

function main() {
  const worArg = process.argv.find((a) => a.startsWith("--wor="));
  const wor = loadWor(worArg ? worArg.slice(6) : DEFAULT_WOR);
  const ours = campaignLoadRows({ campaign, maps, tuning })
    .filter((r) => r.enemyCount > 0)
    .map((r) => ({ enemyCount: r.enemyCount, enemiesPerSecond: r.enemiesPerSecond, load: r.compositeLoad }));
  const w = summarise(wor);
  const o = summarise(ours);
  const rel = (value, base) => (Number.isFinite(value) && base > 0 ? value / base : NaN);
  const f = (value, digits = 1) => (Number.isFinite(value) ? value.toFixed(digits) : "-");
  const lines = [
    `# Campaign shape vs Watcher of Realms (normal chapters only; ours ${ours.length} stages, WoR ${wor.length})`,
    "",
    "Per progress decile (median). 'Load x' is relative to the first decile of the same game; ratios are the comparable part.",
    "",
    "| Decile | WoR enemies | Ours enemies | WoR enemies/s | Ours enemies/s | WoR load x | Ours load x |",
    "|---:|---:|---:|---:|---:|---:|---:|",
  ];
  w.forEach((row, i) => {
    lines.push(`| ${i + 1} | ${f(row.count)} | ${f(o[i].count)} | ${f(row.perSecond, 2)} | ${f(o[i].perSecond, 2)} | ${f(rel(row.load, w[0].load))} | ${f(rel(o[i].load, o[0].load))} |`);
  });
  lines.push("", `Peak median enemies: WoR ${f(Math.max(...w.map((r) => r.count)))}, ours ${f(Math.max(...o.map((r) => r.count)))}.`,
    `Peak median enemies/s: WoR ${f(Math.max(...w.map((r) => r.perSecond)), 2)}, ours ${f(Math.max(...o.map((r) => r.perSecond)), 2)}.`,
    "WoR enemies/s uses count / last spawn time (story sentinels excluded); ours is the simulator's spawn-window figure, so read both as pressure shape, not exact rates.");
  process.stdout.write(`${lines.join("\n")}\n`);
}

main();
