/**
 * Virtue-set recommendation engine (read-only).
 *
 * Reads every hero JSON + src/data/virtueRules.json + src/data/virtues.json,
 * detects each hero's stat DRIVERS (class + skill text), maps drivers to the
 * virtue SETS that grant the matching stat, and writes
 * src/data/suggestionsVirtues.json. NEVER mutates hero files.
 *
 * Philosophy (see CLAUDE.md): extract, never infer. Set->stat is read straight
 * from virtues.json. Each suggested set carries the evidence (skill sentence or
 * structural note) and a confidence. No ranking. ADD-only (no remove pressure).
 *
 * Usage:
 *   node scripts/suggest-virtues.mjs            # write suggestionsVirtues.json + print
 *   node scripts/suggest-virtues.mjs --report   # print only, no write
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const HERO_DIR = path.join(ROOT, "src/data/heroes");
const RULES_FILE = path.join(ROOT, "src/data/virtueRules.json");
const VIRTUES_FILE = path.join(ROOT, "src/data/virtues.json");
const OUT_FILE = path.join(ROOT, "src/data/suggestionsVirtues.json");

export function loadRules() {
  const raw = JSON.parse(fs.readFileSync(RULES_FILE, "utf8"));
  const drivers = {};
  for (const [name, def] of Object.entries(raw.drivers)) {
    drivers[name] = {
      confidence: def.confidence,
      classes: def.classes || null,
      patterns: (def.patterns || []).map((p) => new RegExp(p, "i")),
      sets: def.sets || [],
    };
  }
  return drivers;
}

// Map each set name -> { stat, rarity, bonus2, bonus4, members:[ids] } from virtues.json.
export function loadSetMeta() {
  const virtues = JSON.parse(fs.readFileSync(VIRTUES_FILE, "utf8"));
  const meta = {};
  for (const v of virtues) {
    if (!v.set) continue;
    if (!meta[v.set]) {
      meta[v.set] = { stat: null, rarity: v.rarity, bonus2: null, bonus4: null, members: [] };
    }
    const m = meta[v.set];
    m.members.push(v.id);
    for (const s of v.stats || []) if (s.key && !m.stat) m.stat = s.key;
    if (v.setBonuses?.["2"] && !m.bonus2) m.bonus2 = v.setBonuses["2"];
    if (v.setBonuses?.["4"] && !m.bonus4) m.bonus4 = v.setBonuses["4"];
  }
  return meta;
}

function loadHeroes() {
  return fs
    .readdirSync(HERO_DIR)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_") && f !== "index.js")
    .map((f) => JSON.parse(fs.readFileSync(path.join(HERO_DIR, f), "utf8")));
}

function heroSentences(hero) {
  const parts = [];
  for (const sk of hero.skills || []) {
    if (sk?.description) parts.push(sk.description);
    if (sk?.upgrades) parts.push(...Object.values(sk.upgrades).filter(Boolean));
  }
  if (hero.relic?.description) parts.push(hero.relic.description);
  if (hero.relic?.upgrades) parts.push(...Object.values(hero.relic.upgrades).filter(Boolean));
  return parts
    .flatMap((p) => String(p).split(/(?<=[.!])\s+/))
    .map((s) => s.trim())
    .filter(Boolean);
}

// Returns { DRIVER: { confidence, evidence } } for drivers that fire.
export function detectDrivers(hero, drivers) {
  const sentences = heroSentences(hero);
  const fired = {};
  for (const [name, def] of Object.entries(drivers)) {
    const classOk = !def.classes || def.classes.includes(hero.class);
    if (!classOk) continue;

    let evidence = null;
    if (def.patterns.length) {
      for (const s of sentences) {
        if (def.patterns.some((re) => re.test(s))) {
          evidence = s;
          break;
        }
      }
      if (!evidence) continue; // pattern gate present but no hit
    } else {
      evidence = `${hero.class} class`; // structural driver
    }
    fired[name] = { confidence: def.confidence, evidence };
  }
  return fired;
}

export function recommendForHero(hero, drivers, setMeta) {
  const fired = detectDrivers(hero, drivers);
  const owned = new Set((hero.virtueSets || []).map((vs) => vs.label));
  // set -> { drivers:[], confidence, evidence }
  const bySet = {};
  for (const [driver, info] of Object.entries(fired)) {
    for (const set of drivers[driver].sets) {
      if (owned.has(set)) continue;
      if (!setMeta[set]) continue; // unknown set, skip
      if (!bySet[set]) bySet[set] = { set, drivers: [], confidence: info.confidence, evidence: info.evidence };
      bySet[set].drivers.push(driver);
      // keep strongest confidence + first evidence
      if (info.confidence === "strong") bySet[set].confidence = "strong";
    }
  }
  const suggestedAdd = Object.values(bySet).map((s) => ({
    set: s.set,
    drivers: s.drivers,
    confidence: s.confidence,
    evidence: s.evidence,
    stat: setMeta[s.set].stat,
    rarity: setMeta[s.set].rarity,
    bonus2: setMeta[s.set].bonus2,
    bonus4: setMeta[s.set].bonus4,
    members: setMeta[s.set].members,
  }));
  return { drivers: Object.keys(fired), suggestedAdd };
}

function main() {
  const reportOnly = process.argv.includes("--report");
  const drivers = loadRules();
  const setMeta = loadSetMeta();
  const heroes = loadHeroes().sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  const out = [];
  let totalAdd = 0;
  const addByConf = { strong: 0, medium: 0 };

  for (const hero of heroes) {
    const { drivers: driverList, suggestedAdd } = recommendForHero(hero, drivers, setMeta);
    totalAdd += suggestedAdd.length;
    for (const a of suggestedAdd) addByConf[a.confidence] = (addByConf[a.confidence] || 0) + 1;
    out.push({
      id: hero.id,
      name: hero.name,
      class: hero.class,
      role: hero.role,
      owned: (hero.virtueSets || []).map((vs) => vs.label),
      detectedDrivers: driverList,
      suggestedAdd,
    });
  }

  const summary = { heroes: heroes.length, suggestedAdd: totalAdd, addByConfidence: addByConf };

  if (!reportOnly) {
    fs.writeFileSync(
      OUT_FILE,
      JSON.stringify({ generatedAt: new Date().toISOString(), field: "virtueSets", summary, heroes: out }, null, 2)
    );
  }

  console.log("\n=== VIRTUE-SET SUGGESTION ENGINE ===");
  console.log(`heroes: ${summary.heroes} | suggestedAdd: ${summary.suggestedAdd}`, summary.addByConfidence);
  console.log("\n--- per hero (heroes with suggestions) ---");
  for (const h of out) {
    if (!h.suggestedAdd.length) continue;
    console.log(`\n${h.name} (${h.class}/${h.role}) drivers:[${h.detectedDrivers.join(",")}] owns:[${h.owned.join(",") || "-"}]`);
    for (const a of h.suggestedAdd) {
      console.log(`  + ${a.set} [${a.confidence}] (${a.stat}) <- ${a.drivers.join("+")}  "${a.evidence.slice(0, 70)}"`);
    }
  }
  if (!reportOnly) console.log(`\nwrote ${path.relative(ROOT, OUT_FILE)}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
