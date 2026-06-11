/**
 * Synergy-tag suggestion engine (read-only).
 *
 * Reads every hero JSON + src/data/tagRules.json, runs deterministic,
 * evidence-backed tag detection over skill/relic text, and writes
 * src/data/suggestions.json. NEVER mutates hero files.
 *
 * Philosophy (see CLAUDE.md): extract, never infer. Every suggested tag
 * carries the exact sentence it was matched from + a confidence grade.
 * No scoring, no ranking. Output is a review queue for a human gate.
 *
 * Usage:
 *   node scripts/suggest-synergy-tags.mjs            # write suggestions.json + print diff
 *   node scripts/suggest-synergy-tags.mjs --report   # print diff only, no write
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const HERO_DIR = path.join(ROOT, "src/data/heroes");
const RULES_FILE = path.join(ROOT, "src/data/tagRules.json");
const OUT_FILE = path.join(ROOT, "scripts/output/suggestions.json");

const ALLY_RE = /\b(all(?:y|ies)|teammates?|friendly|team|party)\b/i;
const ENEMY_RE = /\b(enem(?:y|ies)|target|foe|opponent)\b/i;
const SELF_RE = /\b(himself|herself|itself|self)\b/i;
const ANTIHEAL_RE = /(cannot be healed|healing (?:is )?reduced|healing reduction|healing effects? reduced|reduce\w* healing|cannot receive (?:shields? or )?healing|prevents? healing)/i;
const NONORMALS_RE = /no longer performs normal attacks/i;
const SHIELD_STAT_RE = /\bshield\b/i;
const DODGE_IGNORE_RE = /\bignore\w* Dodge Rate\b/i;
const SUPPORT_AREA_RE = /\ballies?\b/i;
const VISUAL_SUMMON_RE = /\bsummon\w*\s+(?:a |an |the |two |2 |three |3 )?(?:vortex|flames?|butterfl(?:y|ies)|scale|whale|wave|waves|blizzard|ice spike|sword|phoenix)\b/i;
// Detects sentences where "ally" is a trigger condition or scaling factor rather than
// the recipient of the buff. Sentences matching this pattern are excluded from
// team-scope detection: the effect goes to the hero (self), not to allies.
// Covers: "when[ever] an ally falls", "until any ally falls/dies",
//         "per [surviving] ally", "for each/every [surviving] ally",
//         "when gaining a buff from an ally", "ultimates cast by allies".
const ALLY_TRIGGER_RE = /(?:\bwhen(?:ever)?\s+(?:an?\s+|any\s+)?ally\b[^,;.]*\b(?:fall|die|los|kill|elim)\w*|\buntil\s+(?:any\s+)?ally\b|\bper\s+(?:surviving\s+)?ally\b|\bfor\s+(?:each|every)\s+(?:surviving\s+|nearby\s+)?ally\b|\bfrom an ally\b|\bcast by allies\b|\bby allies\b)/i;

export function loadRules() {
  const raw = JSON.parse(fs.readFileSync(RULES_FILE, "utf8"));
  const compiled = {};
  for (const [tag, def] of Object.entries(raw.rules)) {
    compiled[tag] = {
      scope: def.scope,
      confidence: def.confidence,
      patterns: def.patterns.map((p) => new RegExp(p, "i")),
    };
  }
  return compiled;
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
  if (hero.passive?.description) parts.push(hero.passive.description);
  if (hero.passive?.upgrades) parts.push(...Object.values(hero.passive.upgrades).filter(Boolean));
  // Split at sentence boundaries AND at colon/semicolon clause boundaries.
  // Colon/semicolon splits keep each clause independently scoreable so that a
  // self-scaling suffix ("she gains X for each ally") cannot suppress detection
  // of a prior team-buff clause in the same sentence.
  return parts
    .flatMap((p) => String(p).split(/(?<=[.!])\s+|(?<=[;:])\s+/))
    .map((s) => s.trim())
    .filter(Boolean);
}

function scopeOk(scope, s, heroNameRe) {
  const ally = ALLY_RE.test(s);
  const enemy = ENEMY_RE.test(s);
  const self = SELF_RE.test(s) || (heroNameRe && heroNameRe.test(s));
  switch (scope) {
    case "team": return ally && !ALLY_TRIGGER_RE.test(s);
    case "enemy": return enemy;
    case "self": return self || (!ally && !enemy);
    case "any": return true;
    default: return false;
  }
}

export function detectForHero(hero, rules) {
  const sentences = heroSentences(hero);
  const fullText = sentences.join(" ");
  const noNormals = NONORMALS_RE.test(fullText);
  const heroNameRe = hero.name
    ? new RegExp("\\b" + hero.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i")
    : null;

  // tag -> { confidence, evidence }
  const hits = {};
  for (const s of sentences) {
    const antiHeal = ANTIHEAL_RE.test(s);
    for (const [tag, def] of Object.entries(rules)) {
      if (hits[tag]) continue; // first evidence sentence wins
      if (tag === "PLAYSTYLE_BASIC_ATTACK_SCALER" && noNormals) continue;
      if ((tag === "SELF_HEAL" || tag === "TEAM_HEAL") && antiHeal) continue;
      if ((tag === "TEAM_BUFF" || tag === "SELF_ATK_UP" || tag === "SELF_HP_UP") && SHIELD_STAT_RE.test(s)) continue;
      if (tag === "SELF_DODGE" && DODGE_IGNORE_RE.test(s)) continue;
      if (tag === "PLAYSTYLE_AREA_DAMAGE" && SUPPORT_AREA_RE.test(s) && !/\benem(?:y|ies)\b/i.test(s)) continue;
      if (tag === "SUMMON" && VISUAL_SUMMON_RE.test(s)) continue;
      if (!def.patterns.some((re) => re.test(s))) continue;
      if (!scopeOk(def.scope, s, heroNameRe)) continue;
      hits[tag] = { confidence: def.confidence, evidence: s };
    }
  }
  return hits;
}

function main() {
  const reportOnly = process.argv.includes("--report");
  const rules = loadRules();
  const heroes = loadHeroes().sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  const out = [];
  let totalAdd = 0;
  let totalFlagRemove = 0;
  let agree = 0;
  let matchedTotal = 0;
  let manualTotal = 0;
  const addByConf = { strong: 0, medium: 0, weak: 0 };

  for (const hero of heroes) {
    const hits = detectForHero(hero, rules);
    const matched = Object.keys(hits);
    const current = Array.isArray(hero.synergies) ? hero.synergies : [];
    const curSet = new Set(current);
    const matchedSet = new Set(matched);

    const suggestedAdd = matched
      .filter((t) => !curSet.has(t))
      .map((t) => ({ tag: t, confidence: hits[t].confidence, evidence: hits[t].evidence }));
    // flagRemove: only STRONG-detectability tags the engine could not find any text for.
    // These are trustworthy review candidates (genuine over-tag OR a rule vocab gap).
    // Medium/weak unmatched tags are excluded - the engine is too unreliable there to
    // suggest removal, which would pressure the user to delete correct manual judgment.
    const flagRemove = current
      .filter((t) => !matchedSet.has(t) && rules[t] && rules[t].confidence === "strong")
      .map((t) => ({ tag: t, confidence: "strong" }));
    const confirmed = current.filter((t) => matchedSet.has(t));

    totalAdd += suggestedAdd.length;
    totalFlagRemove += flagRemove.length;
    agree += confirmed.length;
    matchedTotal += matched.length;
    manualTotal += current.length;
    for (const a of suggestedAdd) addByConf[a.confidence] = (addByConf[a.confidence] || 0) + 1;

    out.push({
      id: hero.id,
      name: hero.name,
      current,
      confirmed,
      suggestedAdd,
      flagRemove,
    });
  }

  const summary = {
    heroes: heroes.length,
    manualTags: manualTotal,
    engineMatched: matchedTotal,
    confirmed: agree,
    suggestedAdd: totalAdd,
    flagRemove: totalFlagRemove,
    addByConfidence: addByConf,
    precisionVsManual: matchedTotal ? +(agree / matchedTotal).toFixed(3) : 0,
    recallVsManual: manualTotal ? +(agree / manualTotal).toFixed(3) : 0,
  };

  if (!reportOnly) {
    fs.writeFileSync(
      OUT_FILE,
      JSON.stringify({ generatedAt: new Date().toISOString(), field: "synergies", summary, heroes: out }, null, 2)
    );
  }

  // ---- console diff report ----
  console.log("\n=== SYNERGY TAG SUGGESTION ENGINE ===");
  console.log(`heroes: ${summary.heroes}`);
  console.log(`manual tags: ${summary.manualTags} | engine matched: ${summary.engineMatched} | confirmed (overlap): ${summary.confirmed}`);
  console.log(`precision vs manual: ${(summary.precisionVsManual * 100).toFixed(1)}%  (matched tags that are already manual)`);
  console.log(`recall vs manual:    ${(summary.recallVsManual * 100).toFixed(1)}%  (manual tags the engine also found)`);
  console.log(`suggestedAdd: ${summary.suggestedAdd}  by confidence:`, summary.addByConfidence);
  console.log(`flagRemove (manual, no text evidence): ${summary.flagRemove}`);

  console.log("\n--- per hero (only rows with disagreement) ---");
  for (const h of out) {
    if (!h.suggestedAdd.length && !h.flagRemove.length) continue;
    console.log(`\n${h.name} (${h.id})`);
    if (h.suggestedAdd.length) {
      for (const a of h.suggestedAdd) {
        console.log(`  + ${a.tag} [${a.confidence}]  <- "${a.evidence.slice(0, 90)}"`);
      }
    }
    if (h.flagRemove.length) {
      console.log(`  ? no-evidence (manual keeps?): ${h.flagRemove.map((r) => r.tag).join(", ")}`);
    }
  }
  if (!reportOnly) console.log(`\nwrote ${path.relative(ROOT, OUT_FILE)}`);
}

// Only run when invoked directly, not when imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
