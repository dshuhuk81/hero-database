/**
 * Synergy-partner ("heroes that boost this hero") suggestion engine (read-only).
 *
 * NOTE: this is NOT a team composition. It is a directional list of enablers -
 * heroes whose team-support / enemy-debuff output fills this hero's needs. It does
 * not guarantee a playable team (a Tank target yields support enablers, no carry).
 * It writes the `synergyPartners` field, never `detailComps` (which is a hand-made
 * 5-slot team comp and a different concept).
 *
 * Reads every hero JSON + src/data/compRules.json + src/data/tagCategories.json,
 * reuses the virtue engine's driver detection for each hero's NEEDS, matches them
 * against other heroes' CONTRIBUTION tags, and writes src/data/suggestionsComps.json.
 * NEVER mutates hero files.
 *
 * Philosophy (see CLAUDE.md): extract, never infer. A partner is suggested only
 * because it carries a human-curated tag this hero needs. Matched tags are the
 * evidence. Rank by needs filled, tie-break by overall rating. ADD-only.
 *
 * Usage:
 *   node scripts/suggest-comps.mjs            # write suggestionsComps.json + print
 *   node scripts/suggest-comps.mjs --report   # print only, no write
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadRules as loadVirtueDrivers, detectDrivers } from "./suggest-virtues.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const HERO_DIR = path.join(ROOT, "src/data/heroes");
const COMP_RULES_FILE = path.join(ROOT, "src/data/compRules.json");
const TAG_CATEGORIES_FILE = path.join(ROOT, "src/data/tagCategories.json");
const HERO_RATINGS_FILE = path.join(ROOT, "src/data/ratings/hero-ratings.json");
const OUT_FILE = path.join(ROOT, "src/data/suggestionsComps.json");

const PARTNER_COUNT = 5; // 5 enabler partners (the hero itself is not its own partner)
// Ratings live in ratings/hero-ratings.json (vocab: S+ S A+ A B+ B C D), not raw hero JSON.
const RATING_RANK = { "S+": 8, S: 7, "A+": 6, A: 5, "B+": 4, B: 3, C: 2, D: 1, "": 0 };

export function loadRatings() {
  try {
    return JSON.parse(fs.readFileSync(HERO_RATINGS_FILE, "utf8"));
  } catch {
    return {};
  }
}

export function loadCompRules() {
  const raw = JSON.parse(fs.readFileSync(COMP_RULES_FILE, "utf8"));
  const categories = JSON.parse(fs.readFileSync(TAG_CATEGORIES_FILE, "utf8"));
  const wanted = new Set(raw.contributionCategories);
  const contributionUniverse = new Set(
    categories.filter((c) => wanted.has(c.id)).flatMap((c) => c.tags || [])
  );
  return { needTags: raw.needTags, contributionUniverse };
}

function loadHeroes() {
  return fs
    .readdirSync(HERO_DIR)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_") && f !== "index.js")
    .map((f) => JSON.parse(fs.readFileSync(path.join(HERO_DIR, f), "utf8")));
}

function neededTagsFor(hero, virtueDrivers, needTags) {
  const fired = detectDrivers(hero, virtueDrivers);
  const tags = new Set();
  for (const driver of Object.keys(fired)) {
    for (const t of needTags[driver] || []) tags.add(t);
  }
  return tags;
}

// Returns ranked partner list for one target hero.
export function rankPartners(target, heroes, virtueDrivers, rules, ratings = {}) {
  const needed = neededTagsFor(target, virtueDrivers, rules.needTags);
  if (needed.size === 0) return { needed: [], partners: [] };

  const candidates = [];
  for (const s of heroes) {
    if (s.id === target.id) continue;
    if (s.release === false) continue;
    const contribution = (s.synergies || []).filter((t) => rules.contributionUniverse.has(t));
    const matched = contribution.filter((t) => needed.has(t));
    if (matched.length === 0) continue;
    candidates.push({
      id: s.id,
      name: s.name,
      rating: ratings[s.id]?.overall || "",
      matched,
      score: matched.length,
    });
  }

  candidates.sort(
    (a, b) =>
      b.score - a.score ||
      (RATING_RANK[b.rating] || 0) - (RATING_RANK[a.rating] || 0) ||
      a.name.localeCompare(b.name)
  );

  return { needed: [...needed], partners: candidates.slice(0, PARTNER_COUNT) };
}

function main() {
  const reportOnly = process.argv.includes("--report");
  const virtueDrivers = loadVirtueDrivers();
  const rules = loadCompRules();
  const ratings = loadRatings();
  const heroes = loadHeroes().sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  const out = [];
  let total = 0;
  for (const hero of heroes) {
    if (Array.isArray(hero.synergyPartners) && hero.synergyPartners.length) continue; // already curated
    const { needed, partners } = rankPartners(hero, heroes, virtueDrivers, rules, ratings);
    if (partners.length < PARTNER_COUNT) continue; // only suggest a full set
    total++;
    out.push({
      id: hero.id,
      name: hero.name,
      class: hero.class,
      role: hero.role,
      needed,
      partners,
    });
  }

  const summary = { heroes: heroes.length, suggested: total };
  if (!reportOnly) {
    fs.writeFileSync(
      OUT_FILE,
      JSON.stringify({ generatedAt: new Date().toISOString(), field: "synergyPartners", summary, heroes: out }, null, 2)
    );
  }

  console.log("\n=== SYNERGY-PARTNER (BOOSTERS) SUGGESTION ENGINE ===");
  console.log(`heroes: ${summary.heroes} | partner sets suggested: ${summary.suggested}`);
  console.log("\n--- sample ---");
  for (const h of out.slice(0, 12)) {
    console.log(`\n${h.name} (${h.class}/${h.role}) needs:[${h.needed.join(",")}]`);
    for (const p of h.partners) {
      console.log(`  ${p.name} [${p.rating}] x${p.score} <- ${p.matched.join(", ")}`);
    }
  }
  if (!reportOnly) console.log(`\nwrote ${path.relative(ROOT, OUT_FILE)}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
