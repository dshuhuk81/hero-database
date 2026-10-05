// Shape comparison: our Stars / Evolution / class stats vs the Watcher of Realms (WoR) hero data.
// Reference only: curves are normalised (share of the final tier, stat relative to the all-hero
// mean); raw WoR numbers are never meant to be copied. Data: src/game/td/data-sammlung/.
// Usage: npm run td:wor-progression
import { readFileSync } from "node:fs";
import campaign from "../src/data/tdCampaign.json" with { type: "json" };
import rawHeroes from "../src/data/gameBalance.json" with { type: "json" };
import heroTuning from "../src/data/gameBalance.tuning.json" with { type: "json" };
import { applyHeroMultipliers } from "../src/game/td/hero-multipliers.js";
const heroes = applyHeroMultipliers(rawHeroes, heroTuning);

const DIR = new URL("../src/game/td/data-sammlung/", import.meta.url);
const STATS = ["hp", "atk", "def", "mres"];
// WoR profession -> our class (Tactician has no clear counterpart, shown WoR-only).
const CLASS_MAP = { Defender: "Tank", Fighter: "Warrior", Healer: "Support", Mage: "Mage", Marksman: "Archer", Tactician: "-" };

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
const load = (name) => parseCsv(readFileSync(new URL(name, DIR), "utf8"));
const mean = (v) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : NaN);
const num = (value) => (value === "" || value === undefined ? 0 : Number(value));
const pct = (value) => (Number.isFinite(value) ? `${(value * 100).toFixed(0)}%` : "-");
const fix = (value, digits = 2) => (Number.isFinite(value) ? value.toFixed(digits) : "-");

const progression = load("wor_hero_progression.csv");
const catalog = load("wor_hero_catalog.csv");
const profession = Object.fromEntries(catalog.map((r) => [r.hero_id, r.profession_name]));

// --- 1. Advancement curve (WoR Adv 1-6) vs our Stars (0-5) ---
// HeroAdvanced rows are cumulative tier totals, so each hero's tier is divided by its own last tier.
const byHero = new Map();
for (const r of progression.filter((x) => x.record_type === "advancement_delta")) {
  if (!byHero.has(r.hero_id)) byHero.set(r.hero_id, []);
  byHero.get(r.hero_id).push(r);
}
const tiers = [1, 2, 3, 4, 5, 6];
const share = (stat) => tiers.map((tier) => mean([...byHero.values()].map((rows) => {
  const last = num(rows.find((x) => Number(x.advanced_level) === 6)?.[stat]);
  const here = num(rows.find((x) => Number(x.advanced_level) === tier)?.[stat]);
  return last > 0 ? here / last : NaN;
}).filter(Number.isFinite)));
const worShare = Object.fromEntries(STATS.map((stat) => [stat, share(stat)]));
const worAvg = tiers.map((_, i) => mean(STATS.map((stat) => worShare[stat][i])));

const maxStars = campaign.heroStars.max;
const ourShare = Array.from({ length: maxStars }, (_, i) => (i + 1) / maxStars);

console.log(`1. Tier curve: share of the final tier's bonus (${byHero.size} WoR heroes)`);
console.log(["tier", ...tiers.map((t) => `Adv ${t}`)].map((c) => c.padEnd(12)).join(""));
for (const stat of STATS) console.log([`WoR ${stat}`, ...worShare[stat].map(pct)].map((c) => c.padEnd(12)).join(""));
console.log(["WoR avg", ...worAvg.map(pct)].map((c) => c.padEnd(12)).join(""));
console.log([`Ours stars`, ...ourShare.map(pct), "(linear)"].map((c) => c.padEnd(12)).join(""));
const perStar = campaign.heroStars.statPerStar;
const stepGrowth = worAvg.slice(1).map((v, i) => v / worAvg[i]);
console.log(`WoR step growth x${stepGrowth.map((g) => fix(g)).join(", x")} (ours: linear +${pct(perStar)} per star).`);
// A WoR-shaped alternative that keeps our total at 5 stars (+50%): per-star bonus = 50% * marginal share.
const total = perStar * maxStars;
const marginal = worAvg.slice(0, maxStars).map((v, i) => v - (i ? worAvg[i - 1] : 0));
const marginalSum = marginal.reduce((a, b) => a + b, 0);
const shaped = marginal.map((m) => (m / marginalSum) * total);
console.log(`WoR-shaped stars, same +${pct(total)} at 5 stars: per-star ${shaped.map((v) => pct(v)).join(" / ")}; cumulative ${shaped.map((_, i) => pct(shaped.slice(0, i + 1).reduce((a, b) => a + b, 0))).join(" / ")}`);

// --- 2. Awakening pattern (reference for Evolution I-V) ---
const awk = progression.filter((x) => x.record_type === "awakening_delta");
console.log(`\n2. Awakening: which stat each level grants (${new Set(awk.map((r) => r.hero_id)).size} heroes)`);
for (let lv = 1; lv <= 5; lv += 1) {
  const rows = awk.filter((r) => Number(r.awakening_level) === lv);
  const count = (stat) => rows.filter((r) => num(r[stat]) > 0).length;
  const skill = rows.filter((r) => num(r.skill_id) > 0 || r.enhance_skill_ids !== "[]").length;
  const other = rows.filter((r) => r.other_attributes_raw !== "{}").length;
  console.log(`  Awakening ${lv}: hp ${count("hp")}, atk ${count("atk")}, def ${count("def")}, mres ${count("mres")}, other stats ${other}, skill change ${skill} (of ${rows.length})`);
}
console.log(`  Ours: Evolution I-V = ${campaign.heroEvolution.tiers.map((t) => Object.keys(t).filter((k) => !["name", "copies", "text"].includes(k)).join("+")).join(" | ")}`);

// --- 3. Class stat ratios ---
// Final-tier (Adv 6) totals per hero, then each class relative to the all-hero mean of that stat.
const worClass = {};
for (const [id, rows] of byHero) {
  const last = rows.find((x) => Number(x.advanced_level) === 6);
  const cls = profession[id];
  if (!last || !cls) continue;
  (worClass[cls] ??= []).push(Object.fromEntries(STATS.map((stat) => [stat, num(last[stat])])));
}
const worAll = Object.values(worClass).flat();
const worMean = Object.fromEntries(STATS.map((stat) => [stat, mean(worAll.map((h) => h[stat]))]));
const ourStat = { hp: "hp", atk: "atk", def: "armor", mres: "magicRes" };
const ourClass = {};
for (const hero of heroes) (ourClass[hero.class] ??= []).push(hero);
const ourMean = Object.fromEntries(STATS.map((stat) => [stat, mean(heroes.map((h) => h[ourStat[stat]]))]));

console.log("\n3. Class stats relative to the all-hero mean (1.00 = average); WoR from Adv 1-6 totals");
console.log(["class", "n", ...STATS.map((s) => `WoR ${s}`), ...STATS.map((s) => `Ours ${s}`)].map((c) => c.padEnd(10)).join(""));
for (const [worName, ourName] of Object.entries(CLASS_MAP)) {
  const w = worClass[worName] ?? [];
  const o = ourClass[ourName] ?? [];
  const row = [`${worName}>${ourName}`, `${w.length}/${o.length}`,
    ...STATS.map((stat) => fix(mean(w.map((h) => h[stat])) / worMean[stat])),
    ...STATS.map((stat) => fix(mean(o.map((h) => h[ourStat[stat]])) / ourMean[stat]))];
  console.log(row.map((c) => String(c).padEnd(10)).join(""));
}
const unmatched = Object.keys(ourClass).filter((c) => !Object.values(CLASS_MAP).includes(c));
if (unmatched.length) {
  for (const name of unmatched) {
    const o = ourClass[name];
    console.log([`-> ${name}`, `0/${o.length}`, ...STATS.map(() => "-"), ...STATS.map((stat) => fix(mean(o.map((h) => h[ourStat[stat]])) / ourMean[stat]))].map((c) => String(c).padEnd(10)).join(""));
  }
}

// --- 4. Hero level curve: measured WoR heroes (emulator, 2026-10-05) vs our levelScale ---
// Lv 1 -> cap, without the flat green bonuses (+450 HP, +50..100 ATK). The Adv tier at the cap is
// not visible in the screenshots, so each factor includes whatever Adv bonus the cap gives.
const MEASURED = [
  { name: "Rex (Defender, 3 stars, Lv 30)", level: 30, stats: { hp: [1702, 18404], atk: [164, 1775], def: [213, 2310], mres: [50, 543] } },
  { name: "Kassandra (Fighter, 6 stars, Lv 60)", level: 60, stats: { hp: [2927, 29392], atk: [653, 6565], def: [217, 2187], mres: [46, 477] } },
];
const { levelScale, starScale } = await import("../src/game/td/campaign.js");
console.log("\n4. Stat factor Lv 1 -> cap (all four stats grow alike)");
for (const m of MEASURED) {
  const factors = Object.values(m.stats).map(([from, to]) => to / from);
  const ours = levelScale(campaign, m.level);
  console.log(`  WoR ${m.name}: x${fix(mean(factors))} (${factors.map((f) => fix(f)).join(", ")}); ours at Lv ${m.level}: x${fix(ours)} (x${fix(ours * starScale(campaign, Math.min(maxStars, m.level / 10 - 1)))} with the stars for that cap)`);
}
console.log("  Both caps land near x10 although the level cap differs: WoR seems to size the whole climb to ~10x.");
