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
 *   node scripts/suggest-synergy-tags.mjs yaoji      # only process Yaoji
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { filterHeroesByQuery, getHeroQuery } from "./hero-cli-filter.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const HERO_DIR = path.join(ROOT, "src/data/heroes");
const RULES_FILE = path.join(ROOT, "src/data/tagRules.json");
const OUT_FILE = path.join(ROOT, "scripts/output/suggestions.json");

const ALLY_RE = /\b(all(?:y|ies)|teammates?|friendly|team|party)\b/i;
const ENEMY_RE = /\b(enem(?:y|ies)|target|foe|opponent)\b/i;
const SELF_RE = /\b(himself|herself|itself|self)\b/i;
const NAMED_SELF_ACTION_RE = /\b(?:takes? DMG|gains?|becomes?|enters?)\b/i;
const ANTIHEAL_RE = /(cannot be healed|healing (?:is )?reduced|healing reduction|healing effects? reduced|reduce\w* healing|cannot receive (?:shields? or )?healing|prevents? healing)/i;
const NONORMALS_RE = /no longer performs normal attacks/i;
const SHIELD_STAT_RE = /\bshield\b/i;
const DODGE_IGNORE_RE = /\bignore\w* Dodge Rate\b/i;
const DAMAGE_REDUCTION_RE = /(?:DMG RED|reduc\w* (?:the )?DMG taken|damage reduction|take\w* \d+% less DMG)/i;
const SUPPORT_AREA_RE = /\ballies?\b/i;
const VISUAL_SUMMON_RE = /\bsummon\w*\s+(?:a |an |the |two |2 |three |3 )?(?:vortex|flames?|butterfl(?:y|ies)|scale|whale|wave|waves|blizzard|ice spike|sword|phoenix)\b/i;
// Detects sentences where "ally" is a trigger condition or scaling factor rather than
// the recipient of the buff. Sentences matching this pattern are excluded from
// team-scope detection: the effect goes to the hero (self), not to allies.
// Covers: "when[ever] an ally falls", "until any ally falls/dies",
//         "per [surviving] ally", "for each/every [surviving] ally",
//         "when gaining a buff from an ally", "ultimates cast by allies".
const ALLY_TRIGGER_RE = /(?:\bwhen(?:ever)?\s+(?:an?\s+|any\s+)?ally\b[^,;.]*\b(?:fall|die|los|kill|elim)\w*|\buntil\s+(?:any\s+)?ally\b|\bper\s+(?:surviving\s+)?ally\b|\bfor\s+(?:each|every)\s+(?:surviving\s+|nearby\s+)?ally\b|\b(?:buff|effect|bonus|healing)\s+from an ally\b|\bcast by allies\b|\bby allies\b)/i;
const SELF_ACTION_RE = /\b(?:gains?|becomes?|enters?|restores?|recovers?|heals?)\b/i;

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
    .map((f) => ({
      ...JSON.parse(fs.readFileSync(path.join(HERO_DIR, f), "utf8")),
      fileName: f,
      fileBaseName: path.basename(f, ".json"),
    }));
}

function explicitScope(text, heroNameRe) {
  const team = ALLY_RE.test(text) && !ALLY_TRIGGER_RE.test(text);
  const enemy = ENEMY_RE.test(text);
  const self = SELF_RE.test(text) || (heroNameRe && heroNameRe.test(text));
  if (team && !enemy) return "team";
  if (enemy && !team) return "enemy";
  if (self && !team && !enemy) return "self";
  return null;
}

function splitContextClauses(text) {
  return String(text)
    .split(/(?<=[.!?])\s+|(?<=[;:])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function sourceUnits(hero, heroNameRe) {
  const units = [];

  function addBlock(block, kind, index = null) {
    if (!block) return;
    const baseClauses = splitContextClauses(block.description || "");
    let baseScope = null;
    let carriedScope = null;

    for (const text of baseClauses) {
      const explicit = explicitScope(text, heroNameRe);
      if (explicit) {
        carriedScope = explicit;
        baseScope = explicit;
      }
      units.push({
        text,
        scope: explicit || carriedScope,
        scopeSource: explicit ? "explicit" : carriedScope ? "carried-clause" : "unknown",
        source: `${kind}${index === null ? "" : `[${index}]`}.description`,
      });
      if (/[.!?]$/.test(text)) carriedScope = null;
    }

    for (const [level, value] of Object.entries(block.upgrades || {})) {
      let upgradeScope = baseScope;
      for (const text of splitContextClauses(value)) {
        const explicit = explicitScope(text, heroNameRe);
        if (explicit) upgradeScope = explicit;
        units.push({
          text,
          scope: explicit || upgradeScope,
          scopeSource: explicit ? "explicit" : upgradeScope ? "inherited-upgrade" : "unknown",
          source: `${kind}${index === null ? "" : `[${index}]`}.upgrades.${level}`,
        });
      }
    }
  }

  for (const [index, skill] of (hero.skills || []).entries()) addBlock(skill, "skills", index);
  addBlock(hero.relic, "relic");
  addBlock(hero.passive, "passive");
  return units;
}

function scopeOk(scope, unit, heroNameRe) {
  const explicitTeam = ALLY_RE.test(unit.text) && !ALLY_TRIGGER_RE.test(unit.text);
  const explicitEnemy = ENEMY_RE.test(unit.text);
  const selfPronoun = SELF_RE.test(unit.text);
  const namedSelf = heroNameRe && heroNameRe.test(unit.text);
  const namedSelfEffect = namedSelf && NAMED_SELF_ACTION_RE.test(unit.text);
  const explicitSelf = selfPronoun || namedSelf;
  let resolved = unit.scope;
  if (!resolved && SELF_ACTION_RE.test(unit.text)) resolved = "self";
  switch (scope) {
    case "team": return explicitTeam || resolved === "team";
    case "enemy": return explicitEnemy || resolved === "enemy";
    case "self": return selfPronoun || namedSelfEffect || (!explicitTeam && explicitSelf) || resolved === "self" || (resolved !== "team" && !explicitTeam && SELF_ACTION_RE.test(unit.text));
    case "any": return true;
    default: return false;
  }
}

export function detectForHero(hero, rules) {
  const heroNameRe = hero.name
    ? new RegExp("\\b" + hero.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i")
    : null;
  const units = sourceUnits(hero, heroNameRe);
  const fullText = units.map((unit) => unit.text).join(" ");
  const noNormals = NONORMALS_RE.test(fullText);

  // tag -> { confidence, evidence }
  const hits = {};
  for (const unit of units) {
    const s = unit.text;
    const antiHeal = ANTIHEAL_RE.test(s);
    for (const [tag, def] of Object.entries(rules)) {
      if (hits[tag]) continue; // first evidence sentence wins
      if (tag === "PLAYSTYLE_BASIC_ATTACK_SCALER" && noNormals) continue;
      if ((tag === "SELF_HEAL" || tag === "TEAM_HEAL") && antiHeal) continue;
      if ((tag === "TEAM_BUFF" || tag === "SELF_ATK_UP" || tag === "SELF_HP_UP") && SHIELD_STAT_RE.test(s)) continue;
      if (tag === "SELF_DODGE" && DODGE_IGNORE_RE.test(s)) continue;
      if (tag === "ENEMY_VULNERABILITY" && DAMAGE_REDUCTION_RE.test(s)) continue;
      if (tag === "PLAYSTYLE_AREA_DAMAGE" && SUPPORT_AREA_RE.test(s) && !/\benem(?:y|ies)\b/i.test(s)) continue;
      if (tag === "SUMMON" && VISUAL_SUMMON_RE.test(s)) continue;
      if (!def.patterns.some((re) => re.test(s))) continue;
      if (!scopeOk(def.scope, unit, heroNameRe)) continue;
      hits[tag] = {
        confidence: def.confidence,
        evidence: s,
        source: unit.source,
        scope: unit.scope,
        scopeSource: unit.scopeSource,
      };
    }
  }
  return hits;
}

function main() {
  const reportOnly = process.argv.includes("--report");
  const heroQuery = getHeroQuery();
  const rules = loadRules();
  const heroes = filterHeroesByQuery(loadHeroes(), heroQuery)
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  const out = [];
  let totalAdd = 0;
  let totalUnverified = 0;
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
      .map((t) => ({ tag: t, ...hits[t] }));
    // A failed match is not evidence that a manual tag is wrong. Positive-match
    // confidence describes precision, not detector recall, so retain every unmatched
    // manual tag as a neutral audit item and never frame it as removal advice.
    const unverifiedManual = current
      .filter((t) => !matchedSet.has(t) && rules[t])
      .map((t) => ({ tag: t, ruleConfidence: rules[t].confidence }));
    const confirmed = current.filter((t) => matchedSet.has(t));

    totalAdd += suggestedAdd.length;
    totalUnverified += unverifiedManual.length;
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
      unverifiedManual,
    });
  }

  const summary = {
    heroes: heroes.length,
    heroFilter: heroQuery || null,
    manualTags: manualTotal,
    engineMatched: matchedTotal,
    confirmed: agree,
    suggestedAdd: totalAdd,
    unverifiedManual: totalUnverified,
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
  if (heroQuery) console.log(`filter: ${heroQuery}`);
  console.log(`heroes: ${summary.heroes}`);
  console.log(`manual tags: ${summary.manualTags} | engine matched: ${summary.engineMatched} | confirmed (overlap): ${summary.confirmed}`);
  console.log(`precision vs manual: ${(summary.precisionVsManual * 100).toFixed(1)}%  (matched tags that are already manual)`);
  console.log(`recall vs manual:    ${(summary.recallVsManual * 100).toFixed(1)}%  (manual tags the engine also found)`);
  console.log(`suggestedAdd: ${summary.suggestedAdd}  by confidence:`, summary.addByConfidence);
  console.log(`unverified manual tags (audit only; never removal advice): ${summary.unverifiedManual}`);

  console.log("\n--- per hero (only rows with disagreement) ---");
  for (const h of out) {
    if (!h.suggestedAdd.length && !h.unverifiedManual.length) continue;
    console.log(`\n${h.name} (${h.id})`);
    if (h.suggestedAdd.length) {
      for (const a of h.suggestedAdd) {
        console.log(`  + ${a.tag} [${a.confidence}]  <- ${a.source} "${a.evidence.slice(0, 90)}"`);
      }
    }
    if (h.unverifiedManual.length) {
      console.log(`  ? unverified (audit only): ${h.unverifiedManual.map((r) => r.tag).join(", ")}`);
    }
  }
  if (!reportOnly) console.log(`\nwrote ${path.relative(ROOT, OUT_FILE)}`);
}

// Only run when invoked directly, not when imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
