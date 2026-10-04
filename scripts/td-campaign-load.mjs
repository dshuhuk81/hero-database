import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import campaign from "../src/data/tdCampaign.json" with { type: "json" };
import maps from "../src/data/tdMaps.json" with { type: "json" };
import tuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import { campaignLoadRows } from "../src/game/td/campaign-load.js";

export const CSV_COLUMNS = [
  "stageId", "stageName", "chapter", "mapId", "theme", "board", "gates", "spawnGroups",
  "enemyCount", "enemyTypes", "firstSpawnMs", "lastSpawnMs", "spawnWindowMs",
  "enemiesPerSecond", "totalHp", "totalAtk", "avgArmor", "avgMres", "maxHp", "maxAtk",
  "hpLoad", "atkLoad", "compositeLoad", "hpScale", "lives", "hasBoss", "summonedKinds",
  "diagnostics", "reviewFlags", "reviewLever", "botWinRate", "botClearSeconds",
];

const ratioBreak = (current, previous) => {
  if (current === previous) return false;
  if (current <= 0 || previous <= 0) return true;
  const ratio = current / previous;
  return ratio >= 1.5 || ratio <= 2 / 3;
};

const resistanceBreak = (current, previous) => {
  const delta = Math.abs(current - previous);
  return delta >= 50 && ratioBreak(Math.max(1, current), Math.max(1, previous));
};

export function reviewCampaignRows(rows) {
  return rows.map((row, index) => {
    const previous = rows[index - 1];
    if (!previous || String(previous.chapter) !== String(row.chapter)) return { ...row, reviewFlags: [], reviewLever: "" };
    const flags = [];
    if (ratioBreak(row.compositeLoad, previous.compositeLoad)) flags.push("composite load");
    if (ratioBreak(row.enemyCount, previous.enemyCount)) flags.push("enemy count");
    if (ratioBreak(row.enemiesPerSecond, previous.enemiesPerSecond)) flags.push("spawn pressure");
    if (resistanceBreak(row.avgArmor, previous.avgArmor) || resistanceBreak(row.avgMres, previous.avgMres)) flags.push("resistance mix");
    if (ratioBreak(row.lives, previous.lives)) flags.push("lives");

    let reviewLever = "";
    if (flags.includes("resistance mix")) reviewLever = "resistance mix";
    else if (flags.includes("spawn pressure")) reviewLever = "gapMs/group order";
    else if (flags.includes("enemy count")) reviewLever = "count";
    else if (flags.includes("composite load")) {
      const hpChange = previous.hpLoad > 0 ? Math.abs(Math.log(row.hpLoad / previous.hpLoad)) : Infinity;
      const atkChange = previous.atkLoad > 0 ? Math.abs(Math.log(row.atkLoad / previous.atkLoad)) : Infinity;
      reviewLever = hpChange > atkChange ? "hpScale" : "composition";
    } else if (flags.includes("lives")) reviewLever = "lives";
    return { ...row, reviewFlags: flags, reviewLever };
  });
}

const csvValue = (value) => {
  const text = Array.isArray(value) ? value.join("; ") : value == null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export function formatCampaignLoadCsv(rows) {
  const reviewed = reviewCampaignRows(rows);
  return [CSV_COLUMNS.join(","), ...reviewed.map((row) => CSV_COLUMNS.map((key) => csvValue(row[key])).join(","))].join("\n");
}

const BANDS = [
  { label: "Introduction", from: 1, to: 1 },
  { label: "Early progression", from: 2, to: 4 },
  { label: "Mid progression", from: 5, to: 8 },
  { label: "Endgame", from: 9, to: 13 },
];

const compact = (value) => Number.isFinite(value) ? Number(value.toFixed(3)) : 0;

export function formatCampaignLoadMarkdown(rows) {
  const reviewed = reviewCampaignRows(rows);
  const lines = ["# Campaign stage-load audit", "", `Stages: ${reviewed.length}. Review flags indicate adjacent changes, not automatic balance failures.`, "", "## Progression bands", ""];
  for (const band of BANDS) {
    const entries = reviewed.filter((row) => Number(row.chapter) >= band.from && Number(row.chapter) <= band.to);
    const flagged = entries.filter((row) => row.reviewFlags.length).length;
    lines.push(`- ${band.label} (Chapters ${band.from}${band.to === band.from ? "" : `–${band.to}`}): ${entries.length} stages, ${flagged} flagged`);
  }
  lines.push("", "## Stages", "", "| Stage | Name | Board | Gates | Enemies | Enemies/s | HP | ATK | Load | Review |", "|---|---|---:|---:|---:|---:|---:|---:|---:|---|");
  for (const row of reviewed) {
    const review = row.reviewFlags.length ? `${row.reviewFlags.join("; ")} → ${row.reviewLever}` : "—";
    lines.push(`| ${row.stageId} | ${String(row.stageName ?? "").replaceAll("|", "\\|")} | ${row.board} | ${row.gates} | ${row.enemyCount} | ${compact(row.enemiesPerSecond)} | ${compact(row.totalHp)} | ${compact(row.totalAtk)} | ${compact(row.compositeLoad)} | ${review} |`);
  }
  return lines.join("\n");
}

export function parseCampaignLoadArgs(args) {
  const out = { chapter: null, csv: null };
  for (const arg of args) {
    if (arg.startsWith("--chapter=")) {
      const value = Number(arg.slice("--chapter=".length));
      if (!Number.isInteger(value) || value < 1) throw new Error(`Invalid chapter: ${arg.split("=")[1]}`);
      out.chapter = value;
    } else if (arg.startsWith("--csv=")) {
      const value = arg.slice("--csv=".length);
      if (!value) throw new Error("Invalid CSV path: empty");
      out.csv = value;
    } else throw new Error(`Unknown option: ${arg}`);
  }
  return out;
}

function main() {
  const options = parseCampaignLoadArgs(process.argv.slice(2));
  let rows = campaignLoadRows({ campaign, maps, tuning });
  if (options.chapter !== null) {
    const selected = rows.filter((row) => Number(row.chapter) === options.chapter);
    if (!selected.length) throw new Error(`Invalid chapter: ${options.chapter}`);
    rows = selected;
  }
  process.stdout.write(`${formatCampaignLoadMarkdown(rows)}\n`);
  if (options.csv) writeFileSync(options.csv, `${formatCampaignLoadCsv(rows)}\n`, "utf8");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { main(); }
  catch (error) {
    process.stderr.write(`Campaign load report failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
