// scripts/generator.js
import fs from "node:fs/promises";
import path from "node:path";
import { keywordTagsForHero, fullSkillText } from "../src/utils/heroTags.js";

const HERO_DIR = "src/data/heroes";
const OUT_FILE = "src/data/derived/teamCompsByHeroId.json";

const CFG = {
  seed: 1337,
  attemptsPerHero: 800,
  keepTop: 3, // exactly 3 comps per mode (meta / bonus35 OR bestBonus / mixed)
  candidatePoolSize: 30,

  // ✅ NEW
  synergyStrict: true,   // only emit synergy statements if evidence for BOTH sides exists
  synergyDebug: true,    // export debug bundle per comp for UI inspection
};

// -----------------------------
// Helpers
// -----------------------------
function escapeRegExp(str) {
  return String(str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function makeRng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17; s >>>= 0;
    s ^= s << 5;  s >>>= 0;
    return (s >>> 0) / 4294967296;
  };
}

async function loadHeroes() {
  const files = await fs.readdir(HERO_DIR);
  const heroes = [];
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    const raw = await fs.readFile(path.join(HERO_DIR, f), "utf-8");
    const h = JSON.parse(raw);
    if (!h?.id) continue;
    heroes.push(h);
  }
  return heroes;
}

// -----------------------------
// Team keys / dedup
// -----------------------------
function uniqueTeamKey(ids) {
  return [...ids].sort().join("|");
}

// -----------------------------
// Ratings (overall/pve/pvp) mapping
// -----------------------------
const OVERALL_RATING_VALUE = { SSS: 10, SS: 9, S: 8, A: 6, B: 4, C: 2, D: 1 };

function overallRatingValue(h) {
  const raw = (h?.ratings?.overall ?? h?.rating ?? "C");
  const key = String(raw).toUpperCase();
  return OVERALL_RATING_VALUE[key] ?? 2;
}

function modeRatingValue(h, mode = "general") {
  const raw =
    mode === "pve"
      ? (h?.ratings?.pve ?? h?.ratings?.overall ?? h?.rating ?? "C")
      : mode === "pvp"
      ? (h?.ratings?.pvp ?? h?.ratings?.overall ?? h?.rating ?? "C")
      : (h?.ratings?.overall ?? h?.rating ?? "C");

  const key = String(raw).toUpperCase();
  return OVERALL_RATING_VALUE[key] ?? 2;
}

function teamModeAvg(team, mode = "general") {
  const vals = team.map(h => modeRatingValue(h, mode));
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

// -----------------------------
// Faction bonus (Starglint joker)
// -----------------------------
function factionBonus(team) {
  const counts = {};
  let starglint = 0;

  for (const h of team) {
    const f = h.faction;
    if (String(f).toLowerCase() === "starglint") {
      starglint++;
      continue;
    }
    counts[f] = (counts[f] || 0) + 1;
  }

  if (starglint === 5) return { pct: 35, effectiveFaction: "Starglint" };

  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const dominantFaction = entries[0]?.[0] ?? "";
  const dominantBase = entries[0]?.[1] ?? 0;
  const second = entries[1]?.[1] ?? 0;

  const dominant = dominantBase + starglint;

  let pct = 0;
  if (dominant === 5) pct = 35;
  else if (dominant === 4) pct = 30;
  else if (dominant === 3 && second === 2) pct = 25;
  else if (dominant === 3) pct = 15;

  return { pct, effectiveFaction: dominantFaction || "Mixed" };
}

// -----------------------------
// Formation (frontline preference)
// -----------------------------
function durabilityScore(h) {
  const s = h.stats || {};
  const hp = Number(s.hp || 0);
  const armor = Number(s.armor || 0);
  const mres = Number(s.magicRes || 0);
  return hp * 1.0 + armor * 20 + mres * 20;
}

function prefersBackline(h) {
  const cls = String(h.class || "").toLowerCase();
  return ["archer", "mage", "support"].includes(cls);
}

function buildFormation(team) {
  const frontCandidates = team.filter(h => !prefersBackline(h));
  const pool = frontCandidates.length >= 2 ? frontCandidates : team;

  const sorted = [...pool].sort((a, b) => durabilityScore(b) - durabilityScore(a));
  const front = sorted.slice(0, 2).map(h => h.id);
  const back = team.filter(h => !front.includes(h.id)).map(h => h.id);
  return { front, back };
}
// -----------------------------
// Synergy tags/score + explanation (STRICT + EVIDENCE + DEBUG EXPORT)
// -----------------------------
const SYNERGY_TAGS = {
  ATK_SPEED_TEAM_PROVIDER: "ATK_SPEED_TEAM_PROVIDER",
  ATK_SPEED_SELF_ONLY: "ATK_SPEED_SELF_ONLY",

  ENERGY_TEAM_PROVIDER: "ENERGY_TEAM_PROVIDER",
  CDR_TEAM_PROVIDER: "CDR_TEAM_PROVIDER",

  DEF_DOWN_OR_AMP: "DEF_DOWN_OR_AMP",

  SHIELD_TEAM_PROVIDER: "SHIELD_TEAM_PROVIDER",
  ALLY_HEAL_PROVIDER: "ALLY_HEAL_PROVIDER",
  CLEANSE_TEAM_PROVIDER: "CLEANSE_TEAM_PROVIDER",
  DAMAGE_REDUCTION_TEAM_PROVIDER: "DAMAGE_REDUCTION_TEAM_PROVIDER",
  CC_IMMUNITY_TEAM_PROVIDER: "CC_IMMUNITY_TEAM_PROVIDER",

  DISPEL_ENEMY_BUFFS: "DISPEL_ENEMY_BUFFS",
  CONTROL_PROVIDER: "CONTROL_PROVIDER",
  TAUNT_OR_PROVOKE: "TAUNT_OR_PROVOKE",
  ENERGY_DRAIN_ENEMY: "ENERGY_DRAIN_ENEMY",

  BASIC_ATTACK_SCALER: "BASIC_ATTACK_SCALER",
  ON_HIT_SCALER: "ON_HIT_SCALER",
  FAST_STACKING_WITH_HITS: "FAST_STACKING_WITH_HITS",

  ULT_DEPENDENT: "ULT_DEPENDENT",
  AOE_DAMAGE_PROFILE: "AOE_DAMAGE_PROFILE",
};

const ALL_SYNERGY_TAG_LIST = Object.values(SYNERGY_TAGS);

// STRICT MODE: nur Synergy-Aussagen, wenn BEIDE Seiten Evidence haben
const SYNERGY_STRICT_MODE = Boolean(CFG.synergyStrict);

// Optional: Debug-Export in JSON (für UI)
const SYNERGY_DEBUG_EXPORT = Boolean(CFG.synergyDebug);

// --- Snippet helper: kurzer Auszug um das Match herum ---
function snippetAround(text, matchIndex, maxLen = 180) {
  const raw = String(text || "");
  const idx = Math.max(0, Number(matchIndex || 0));
  const start = Math.max(0, idx - Math.floor(maxLen / 2));
  const end = Math.min(raw.length, start + maxLen);
  const s = raw.slice(start, end).replace(/\s+/g, " ").trim();
  return (start > 0 ? "…" : "") + s + (end < raw.length ? "…" : "");
}

const TAG_EVIDENCE_PATTERNS = {
  [SYNERGY_TAGS.ATK_SPEED_TEAM_PROVIDER]: [
    // allies + atk speed/haste (both orders)
    /\b(all allies|allied units|allies|team|party|teammates)\b[\s\S]{0,140}\b(atk\s*spd|attack\s*speed|attack\s*spd|haste)\b/i,
    /\b(atk\s*spd|attack\s*speed|attack\s*spd|haste)\b[\s\S]{0,140}\b(all allies|allied units|allies|team|party|teammates)\b/i,

    // "increase allies' Attack Speed by X%"
    /\b(increase[sd]?|grant(?:s|ed)?|provide[sd]?|boost(?:s|ed)?)\b[\s\S]{0,60}\b(all allies|allied units|allies|team|party|teammates)\b[\s\S]{0,80}\b(atk\s*spd|attack\s*speed|attack\s*spd|haste)\b/i,
  ],

  [SYNERGY_TAGS.ATK_SPEED_SELF_ONLY]: [
    // self-ish phrasing; explicitly exclude ally words nearby
    /\b(gains?|gain|increases?|increased|grant(?:s|ed)?|bonus)\b[\s\S]{0,50}\b(atk\s*spd|attack\s*speed|attack\s*spd|haste)\b(?![\s\S]{0,120}\b(all allies|allied units|allies|team|party|teammates)\b)/i,
    /\b(self|himself|herself)\b[\s\S]{0,40}\b(atk\s*spd|attack\s*speed|attack\s*spd|haste)\b/i,
  ],

  [SYNERGY_TAGS.ENERGY_TEAM_PROVIDER]: [
    // allies + energy gain/restore/regen (both orders)
    /\b(all allies|allies|ally)\b[\s\S]{0,180}\b(restore[sd]?|gain[sd]?|regenerate[sd]?|regen(?:eration)?)\b[\s\S]{0,60}\benergy\b/i,
    /\b(restore[sd]?|gain[sd]?|regenerate[sd]?|regen(?:eration)?)\b[\s\S]{0,60}\benergy\b[\s\S]{0,180}\b(all allies|allies|ally)\b/i,

    // "grants/provides Energy to allies"
    /\b(grant(?:s|ed)?|provide[sd]?|share[sd]?)\b[\s\S]{0,60}\benergy\b[\s\S]{0,120}\b(all allies|allies|ally)\b/i,
  ],

  [SYNERGY_TAGS.CDR_TEAM_PROVIDER]: [
    // allies + reduce cooldown (both orders)
    /\b(all allies|allies|ally)\b[\s\S]{0,180}\b(reduc\w*|decreas\w*|lower\w*|shorten\w*)\b[\s\S]{0,60}\b(cooldown|cool\s*down|skill\s*cd|cd)\b/i,
    /\b(reduc\w*|decreas\w*|lower\w*|shorten\w*)\b[\s\S]{0,60}\b(cooldown|cool\s*down|skill\s*cd|cd)\b[\s\S]{0,180}\b(all allies|allies|ally)\b/i,

    // "Skill CD -30%" / "Cooldown -30%" style
    /\b(all allies|allies|ally)\b[\s\S]{0,160}\b(skill\s*cd|cool\s*down|cooldown|cd)\b\s*[-–—]\s*\d{1,3}%\b/i,
    /\b(all allies|allies|ally)\b[\s\S]{0,160}\b(skill\s*cd|cool\s*down|cooldown|cd)\b[\s\S]{0,40}\b(cooldown\s*reduction|cdr)\b/i,
  ],

  [SYNERGY_TAGS.DEF_DOWN_OR_AMP]: [
    // explicit defense/armor/resistance reduction on enemies/targets
    /\b(reduce[sd]?|lower[sd]?|decrease[sd]?|shred(?:s|ded)?)\b[\s\S]{0,60}\b(enemy|enemies|target|their)\b[\s\S]{0,80}\b(defense|armou?r|magic\s*res|physical\s*res|m-?res|p-?res|resistance)\b/i,
    /\b(enemy|enemies|target|their)\b[\s\S]{0,80}\b(defense|armou?r|magic\s*res|physical\s*res|m-?res|p-?res|resistance)\b[\s\S]{0,40}\b(reduce[sd]?|lower[sd]?|decrease[sd]?|down)\b/i,

    // "Defense Down" style
    /\b(defense\s*down|armou?r\s*down)\b/i,

    // penetration / ignore defense
    /\b(armou?r|defense)\b[\s\S]{0,20}\b(pen(?:etration)?|ignore)\b/i,

    // damage taken increased (amp)
    /\b(enemy|enemies|target)\b[\s\S]{0,80}\b(takes?|take)\b[\s\S]{0,40}\b(increased|more)\b[\s\S]{0,20}\b(damage|dmg)\b/i,
    /\b(increase[sd]?|amplif(?:y|ies|ied))\b[\s\S]{0,40}\b(damage|dmg)\b[\s\S]{0,60}\b(taken)\b[\s\S]{0,60}\b(enemy|enemies|target)\b/i,

    // "M-RES -20%" / "Magic RES -20%" with enemy/target context (dash/percent styles)
    /\b(enemy|enemies|target|their)\b[\s\S]{0,80}\b(m-?res|p-?res|magic\s*res|physical\s*res|resistance)\b[\s\S]{0,20}\b[-–—]\s*\d{1,3}%\b/i,
    /\b(m-?res|p-?res|magic\s*res|physical\s*res|resistance)\b[\s\S]{0,20}\b[-–—]\s*\d{1,3}%\b[\s\S]{0,120}\b(enemy|enemies|target|their)\b/i,
  ],

  [SYNERGY_TAGS.SHIELD_TEAM_PROVIDER]: [
    /\bshield\b[\s\S]{0,120}\b(all allies|allies|ally|team|party|teammates|most vulnerable ally|lowest hp ally|other allies)\b/i,
    /\b(all allies|allies|ally|team|party|teammates|most vulnerable ally|lowest hp ally|other allies)\b[\s\S]{0,120}\bshield\b/i,
  ],

  [SYNERGY_TAGS.ALLY_HEAL_PROVIDER]: [
    /\b(heal|heals|healed)\b[\s\S]{0,120}\b(all allies|allies|ally|team|party|teammates|most vulnerable ally|lowest hp ally|other allies)\b/i,
    /\b(all allies|allies|ally|team|party|teammates|most vulnerable ally|lowest hp ally|other allies)\b[\s\S]{0,120}\b(heal|heals|healed)\b/i,
    /\brestore[sd]?\b[\s\S]{0,40}\bhp\b[\s\S]{0,80}\b(all allies|allies|ally|team|party|teammates|most vulnerable ally|lowest hp ally|other allies)\b/i,
    /\b(all allies|allies|ally|team|party|teammates|most vulnerable ally|lowest hp ally|other allies)\b[\s\S]{0,80}\brestore[sd]?\b[\s\S]{0,40}\bhp\b/i,
  ],

  [SYNERGY_TAGS.CLEANSE_TEAM_PROVIDER]: [
    /\b(removes?|remove|cleanse[sd]?)\b[\s\S]{0,120}\b(debuffs?|negative effects?)\b[\s\S]{0,60}\b(all allies|allies|ally|team|party|teammates|most vulnerable ally|lowest hp ally|other allies)\b/i,
    /\b(all allies|allies|ally|team|party|teammates|most vulnerable ally|lowest hp ally|other allies)\b[\s\S]{0,80}\b(cleanse[sd]?|remove[sd]?)\b/i,
  ],

  [SYNERGY_TAGS.DAMAGE_REDUCTION_TEAM_PROVIDER]: [
    /\b(all allies|allies|ally|team|party|teammates|most vulnerable ally|lowest hp ally|other allies)\b[\s\S]{0,80}\b(take|takes)\b[\s\S]{0,40}\b(less|reduced)\b[\s\S]{0,40}\b(damage|dmg)\b/i,
    /\b(reduce[sd]?|lower[sd]?)\b[\s\S]{0,80}\b(damage|dmg)\b[\s\S]{0,60}\b(all allies|allies|ally|team|party|teammates|most vulnerable ally|lowest hp ally|other allies)\b/i,
    /\bdmg\s*red\b[\s\S]{0,80}\b(all allies|allies|ally|team|party|teammates|most vulnerable ally|lowest hp ally|other allies)\b/i,
  ],

  [SYNERGY_TAGS.CC_IMMUNITY_TEAM_PROVIDER]: [
    /\b(all allies|allies|ally|team|party|teammates|most vulnerable ally|lowest hp ally|other allies)\b[\s\S]{0,100}\b(immune|immunity)\b[\s\S]{0,40}\b(cc|control|crowd control|debuffs?)\b/i,
    /\b(immune|immunity)\b[\s\S]{0,60}\b(cc|control|crowd control|debuffs?)\b[\s\S]{0,100}\b(all allies|allies|ally|team|party|teammates|most vulnerable ally|lowest hp ally|other allies)\b/i,
  ],

  [SYNERGY_TAGS.DISPEL_ENEMY_BUFFS]: [
    /\b(dispel|purge)\b[\s\S]{0,60}\b(buffs?|positive effects?)\b/i,
    /\b(removes?|remove)\b[\s\S]{0,60}\b(buffs?|positive effects?)\b/i,
  ],

  [SYNERGY_TAGS.CONTROL_PROVIDER]: [
    /\b(stun|silence|freeze|root|sleep|charm|knock)\w*\b/i,
  ],

  [SYNERGY_TAGS.TAUNT_OR_PROVOKE]: [
    /\b(taunt|taunts|provoke|provokes|forced to attack|force\s+.*attack)\b/i,
  ],

  [SYNERGY_TAGS.ENERGY_DRAIN_ENEMY]: [
    // Match "drain/steal energy" but exclude negations like "does not drain Energy"
    /(?<!does\s+not\s)(?<!will\s+not\s)(?<!no\s+)\b(drains?|steals?)\b[\s\S]{0,40}\benergy\b/i,
  ],

  [SYNERGY_TAGS.BASIC_ATTACK_SCALER]: [
    // "After every two attacks" / "every 3 normal attacks" / numeric or word numbers
    /\b(?:after\s+every|every)\s+(?:\d+|one|two|three|four|five|six)\s+(?:normal\s+|basic\s+)?attacks?\b/i,
  ],

  [SYNERGY_TAGS.ON_HIT_SCALER]: [
    /\b(on hit|each hit|per hit|per attack)\b/i,
    /\b(each time)\b[\s\S]{0,40}\b(hit|hits)\b/i,
    /\b(when|upon|after)\b[\s\S]{0,30}\b(?:basic|normal)?\s*attacks?\b[\s\S]{0,20}\bhit\b/i,
  ],

  [SYNERGY_TAGS.FAST_STACKING_WITH_HITS]: [
    /\b(stacks?|stacking)\b[\s\S]{0,160}\b(on hit|each hit|per hit|each time|per attack|normal attacks?|basic attacks?)\b/i,
    /\b(gains?|grant(?:s|ed)?)\b[\s\S]{0,40}\b(stacks?)\b[\s\S]{0,80}\b(on hit|each hit|per hit|per attack|basic attacks?|normal attacks?)\b/i,
  ],

  [SYNERGY_TAGS.ULT_DEPENDENT]: [
    // make it explicit (avoid broad "ultimate ... when/per")
    /\b(upon|when|after)\b[\s\S]{0,40}\b(casting|cast)\b[\s\S]{0,40}\b(their|his|her)?\s*(ultimate|ult)\b/i,
    /\b(ultimate|ult)\b[\s\S]{0,40}\bis\s+cast\b/i,
  ],

  [SYNERGY_TAGS.AOE_DAMAGE_PROFILE]: [
    // area/all enemies + dmg (both orders)
    /\b(aoe|all enemies|nearby enemies|in a (?:small|large) area|in an area)\b[\s\S]{0,160}\b(dmg|damage)\b/i,
    /\b(dmg|damage)\b[\s\S]{0,160}\b(to|against)\b[\s\S]{0,40}\b(all enemies|nearby enemies)\b/i,
    /\b(hits?|strike[sd]?)\b[\s\S]{0,60}\b(all enemies|nearby enemies)\b[\s\S]{0,120}\b(dmg|damage)\b/i,
  ],
};

// Liefert Evidence-Objekt oder null
function evidenceForTag(hero, tag) {
  const raw = fullSkillText(hero) || "";
  const patterns = TAG_EVIDENCE_PATTERNS[tag] || [];

  for (const re of patterns) {
    const m = raw.match(re);
    if (m && m.index != null) {
      return {
        heroId: hero.id,
        heroName: hero.name,
        tag,
        snippet: snippetAround(raw, m.index),
        // optional: hilfreich beim Debuggen (nicht im UI nötig, aber ok)
        match: String(m[0] || ""),
      };
    }
  }
  return null;
}

// Baut Profil: tags + evidenceByTag (strict: Tag nur wenn Evidence vorhanden)
function synergyProfileForHero(hero) {
  const raw = fullSkillText(hero) || "";
  const t = raw.toLowerCase();
  const forbidsNormals = /\bno longer performs normal attacks\b/i.test(raw);

  // 1) Evidence zuerst ermitteln (pro Tag)
  const evidenceByTag = {};
  for (const tag of ALL_SYNERGY_TAG_LIST) {
    evidenceByTag[tag] = evidenceForTag(hero, tag);
  }

  // 2) Tags setzen – NUR wenn Evidence da ist (strict foundation)
  const tags = new Set();

  // ATK SPEED: team beats self-only (wenn team evidence vorhanden, self-only nicht setzen)
  if (evidenceByTag[SYNERGY_TAGS.ATK_SPEED_TEAM_PROVIDER]) {
    tags.add(SYNERGY_TAGS.ATK_SPEED_TEAM_PROVIDER);
  } else if (evidenceByTag[SYNERGY_TAGS.ATK_SPEED_SELF_ONLY]) {
    tags.add(SYNERGY_TAGS.ATK_SPEED_SELF_ONLY);
  }

  if (evidenceByTag[SYNERGY_TAGS.ENERGY_TEAM_PROVIDER]) tags.add(SYNERGY_TAGS.ENERGY_TEAM_PROVIDER);
  if (evidenceByTag[SYNERGY_TAGS.CDR_TEAM_PROVIDER]) tags.add(SYNERGY_TAGS.CDR_TEAM_PROVIDER);
  if (evidenceByTag[SYNERGY_TAGS.DEF_DOWN_OR_AMP]) tags.add(SYNERGY_TAGS.DEF_DOWN_OR_AMP);

  if (evidenceByTag[SYNERGY_TAGS.SHIELD_TEAM_PROVIDER]) tags.add(SYNERGY_TAGS.SHIELD_TEAM_PROVIDER);
  if (evidenceByTag[SYNERGY_TAGS.ALLY_HEAL_PROVIDER]) tags.add(SYNERGY_TAGS.ALLY_HEAL_PROVIDER);
  if (evidenceByTag[SYNERGY_TAGS.CLEANSE_TEAM_PROVIDER]) tags.add(SYNERGY_TAGS.CLEANSE_TEAM_PROVIDER);
  if (evidenceByTag[SYNERGY_TAGS.DAMAGE_REDUCTION_TEAM_PROVIDER]) tags.add(SYNERGY_TAGS.DAMAGE_REDUCTION_TEAM_PROVIDER);
  if (evidenceByTag[SYNERGY_TAGS.CC_IMMUNITY_TEAM_PROVIDER]) tags.add(SYNERGY_TAGS.CC_IMMUNITY_TEAM_PROVIDER);

  if (evidenceByTag[SYNERGY_TAGS.DISPEL_ENEMY_BUFFS]) tags.add(SYNERGY_TAGS.DISPEL_ENEMY_BUFFS);
  if (evidenceByTag[SYNERGY_TAGS.CONTROL_PROVIDER]) tags.add(SYNERGY_TAGS.CONTROL_PROVIDER);
  if (evidenceByTag[SYNERGY_TAGS.TAUNT_OR_PROVOKE]) tags.add(SYNERGY_TAGS.TAUNT_OR_PROVOKE);
  if (evidenceByTag[SYNERGY_TAGS.ENERGY_DRAIN_ENEMY]) tags.add(SYNERGY_TAGS.ENERGY_DRAIN_ENEMY);

  // Receiver/Hit-Mechanics – wenn Hero keine Normal Attacks macht: diese Tags NICHT setzen
  if (!forbidsNormals) {
    if (evidenceByTag[SYNERGY_TAGS.BASIC_ATTACK_SCALER]) tags.add(SYNERGY_TAGS.BASIC_ATTACK_SCALER);
    if (evidenceByTag[SYNERGY_TAGS.ON_HIT_SCALER]) tags.add(SYNERGY_TAGS.ON_HIT_SCALER);
    if (evidenceByTag[SYNERGY_TAGS.FAST_STACKING_WITH_HITS]) tags.add(SYNERGY_TAGS.FAST_STACKING_WITH_HITS);
  }

  if (evidenceByTag[SYNERGY_TAGS.ULT_DEPENDENT]) tags.add(SYNERGY_TAGS.ULT_DEPENDENT);
  if (evidenceByTag[SYNERGY_TAGS.AOE_DAMAGE_PROFILE]) tags.add(SYNERGY_TAGS.AOE_DAMAGE_PROFILE);

  return { tags, evidenceByTag, forbidsNormals };
}

// TagMap pro Team (einheitlich)
function buildSynergyMap(team) {
  const map = new Map();
  for (const h of team) map.set(h.id, synergyProfileForHero(h));
  return map;
}

function synergyScore(team) {
  const prof = buildSynergyMap(team);
  const has = (tag) => team.some(h => prof.get(h.id)?.tags?.has(tag));

  let s = 0;

  // ATK Speed TEAM provider + hit scalers
  const atkSpeedProviders = team.filter(h => prof.get(h.id)?.tags?.has(SYNERGY_TAGS.ATK_SPEED_TEAM_PROVIDER));
  const hitScalers = team.filter(h => {
    const tg = prof.get(h.id)?.tags;
    return tg?.has(SYNERGY_TAGS.BASIC_ATTACK_SCALER) || tg?.has(SYNERGY_TAGS.ON_HIT_SCALER) || tg?.has(SYNERGY_TAGS.FAST_STACKING_WITH_HITS);
  });

  if (atkSpeedProviders.length && hitScalers.length) {
    const cross = atkSpeedProviders.some(p => hitScalers.some(r => r.id !== p.id));
    s += cross ? 35 : 18;
  }

  // Energy TEAM provider + ult dependent
  if (has(SYNERGY_TAGS.ENERGY_TEAM_PROVIDER) && has(SYNERGY_TAGS.ULT_DEPENDENT)) s += 25;

  // DEF down + AoE profile
  if (has(SYNERGY_TAGS.DEF_DOWN_OR_AMP) && has(SYNERGY_TAGS.AOE_DAMAGE_PROFILE)) s += 18;

  return Math.min(s, 90);
}

// Pair synergies (strict + evidence on both sides)
function detectPairSynergies(team) {
  const prof = buildSynergyMap(team);
  const results = [];

  for (const a of team) {
    for (const b of team) {
      if (a.id === b.id) continue;

      const aP = prof.get(a.id);
      const bP = prof.get(b.id);
      const aTags = aP.tags;
      const bTags = bP.tags;

      // 1) ATK SPEED TEAM → HIT SCALER
      if (
        aTags.has(SYNERGY_TAGS.ATK_SPEED_TEAM_PROVIDER) &&
        (bTags.has(SYNERGY_TAGS.BASIC_ATTACK_SCALER) || bTags.has(SYNERGY_TAGS.ON_HIT_SCALER) || bTags.has(SYNERGY_TAGS.FAST_STACKING_WITH_HITS))
      ) {
        const evA = aP.evidenceByTag[SYNERGY_TAGS.ATK_SPEED_TEAM_PROVIDER];
        const evB =
          bP.evidenceByTag[SYNERGY_TAGS.BASIC_ATTACK_SCALER] ||
          bP.evidenceByTag[SYNERGY_TAGS.ON_HIT_SCALER] ||
          bP.evidenceByTag[SYNERGY_TAGS.FAST_STACKING_WITH_HITS];

        if (!SYNERGY_STRICT_MODE || (evA && evB)) {
          results.push({
            type: "pair",
            kind: "ATK_SPEED_TEAM__HIT_SCALER",
            from: a.name,
            to: b.name,
            text: `${a.name} increases allies' Attack Speed, which benefits ${b.name}'s hit/normal-attack based effects.`,
            evidence: (evA && evB) ? [evA, evB] : [],
          });
        }
      }

      // 2) ENERGY TEAM → ULT DEPENDENT
      if (aTags.has(SYNERGY_TAGS.ENERGY_TEAM_PROVIDER) && bTags.has(SYNERGY_TAGS.ULT_DEPENDENT)) {
        const evA = aP.evidenceByTag[SYNERGY_TAGS.ENERGY_TEAM_PROVIDER];
        const evB = bP.evidenceByTag[SYNERGY_TAGS.ULT_DEPENDENT];

        if (!SYNERGY_STRICT_MODE || (evA && evB)) {
          results.push({
            type: "pair",
            kind: "ENERGY_TEAM__ULT_DEPENDENT",
            from: a.name,
            to: b.name,
            text: `${a.name} provides Energy to allies, accelerating ${b.name}'s ultimate usage.`,
            evidence: (evA && evB) ? [evA, evB] : [],
          });
        }
      }

      // 3) DEF DOWN → AOE DAMAGE
      if (aTags.has(SYNERGY_TAGS.DEF_DOWN_OR_AMP) && bTags.has(SYNERGY_TAGS.AOE_DAMAGE_PROFILE)) {
        const evA = aP.evidenceByTag[SYNERGY_TAGS.DEF_DOWN_OR_AMP];
        const evB = bP.evidenceByTag[SYNERGY_TAGS.AOE_DAMAGE_PROFILE];

        if (!SYNERGY_STRICT_MODE || (evA && evB)) {
          results.push({
            type: "pair",
            kind: "DEF_DOWN__AOE_DAMAGE",
            from: a.name,
            to: b.name,
            text: `${a.name} reduces enemy defenses, amplifying ${b.name}'s AoE damage windows.`,
            evidence: (evA && evB) ? [evA, evB] : [],
          });
        }
      }
    }
  }

  // Dedupe
  const seen = new Set();
  return results.filter(x => {
    const k = `${x.kind}|${x.from}|${x.to}|${x.text}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// Team synergies (strict + evidence: pick one provider + one receiver)
function detectTeamSynergies(team) {
  const prof = buildSynergyMap(team);
  const tags = new Set();
  for (const h of team) for (const t of prof.get(h.id).tags) tags.add(t);

  const results = [];

  if (tags.has(SYNERGY_TAGS.ENERGY_TEAM_PROVIDER) && tags.has(SYNERGY_TAGS.ULT_DEPENDENT)) {
    const provider = team.find(h => prof.get(h.id).tags.has(SYNERGY_TAGS.ENERGY_TEAM_PROVIDER));
    const receiver = team.find(h => prof.get(h.id).tags.has(SYNERGY_TAGS.ULT_DEPENDENT));
    const evA = provider ? prof.get(provider.id).evidenceByTag[SYNERGY_TAGS.ENERGY_TEAM_PROVIDER] : null;
    const evB = receiver ? prof.get(receiver.id).evidenceByTag[SYNERGY_TAGS.ULT_DEPENDENT] : null;

    if (!SYNERGY_STRICT_MODE || (evA && evB)) {
      results.push({
        type: "team",
        kind: "ENERGY_TEAM__ULT_DEPENDENT",
        text: "Energy support in the team accelerates ultimate-based damage cycles.",
        evidence: (evA && evB) ? [evA, evB] : [],
      });
    }
  }

  if (tags.has(SYNERGY_TAGS.DEF_DOWN_OR_AMP) && tags.has(SYNERGY_TAGS.AOE_DAMAGE_PROFILE)) {
    const shredder = team.find(h => prof.get(h.id).tags.has(SYNERGY_TAGS.DEF_DOWN_OR_AMP));
    const aoe = team.find(h => prof.get(h.id).tags.has(SYNERGY_TAGS.AOE_DAMAGE_PROFILE));
    const evA = shredder ? prof.get(shredder.id).evidenceByTag[SYNERGY_TAGS.DEF_DOWN_OR_AMP] : null;
    const evB = aoe ? prof.get(aoe.id).evidenceByTag[SYNERGY_TAGS.AOE_DAMAGE_PROFILE] : null;

    if (!SYNERGY_STRICT_MODE || (evA && evB)) {
      results.push({
        type: "team",
        kind: "DEF_DOWN__AOE_DAMAGE",
        text: "Defense reduction in the team enhances AoE burst windows.",
        evidence: (evA && evB) ? [evA, evB] : [],
      });
    }
  }

  if (tags.has(SYNERGY_TAGS.ATK_SPEED_TEAM_PROVIDER) && tags.has(SYNERGY_TAGS.FAST_STACKING_WITH_HITS)) {
    const provider = team.find(h => prof.get(h.id).tags.has(SYNERGY_TAGS.ATK_SPEED_TEAM_PROVIDER));
    const stacker = team.find(h => prof.get(h.id).tags.has(SYNERGY_TAGS.FAST_STACKING_WITH_HITS));
    const evA = provider ? prof.get(provider.id).evidenceByTag[SYNERGY_TAGS.ATK_SPEED_TEAM_PROVIDER] : null;
    const evB = stacker ? prof.get(stacker.id).evidenceByTag[SYNERGY_TAGS.FAST_STACKING_WITH_HITS] : null;

    if (!SYNERGY_STRICT_MODE || (evA && evB)) {
      results.push({
        type: "team",
        kind: "ATK_SPEED_TEAM__FAST_STACKING",
        text: "Attack Speed buffs help hit-stacking mechanics ramp faster.",
        evidence: (evA && evB) ? [evA, evB] : [],
      });
    }
  }

  const teamTagProviders = [
    {
      tag: SYNERGY_TAGS.SHIELD_TEAM_PROVIDER,
      text: (name) => `${name} provides shields to allies.`,
    },
    {
      tag: SYNERGY_TAGS.ALLY_HEAL_PROVIDER,
      text: (name) => `${name} heals allies over time or on trigger.`,
    },
    {
      tag: SYNERGY_TAGS.CLEANSE_TEAM_PROVIDER,
      text: (name) => `${name} cleanses debuffs from allies.`,
    },
    {
      tag: SYNERGY_TAGS.DAMAGE_REDUCTION_TEAM_PROVIDER,
      text: (name) => `${name} reduces damage taken for allies.`,
    },
    {
      tag: SYNERGY_TAGS.CC_IMMUNITY_TEAM_PROVIDER,
      text: (name) => `${name} grants Crowd Control immunity to allies.`,
    },
    {
      tag: SYNERGY_TAGS.DISPEL_ENEMY_BUFFS,
      text: (name) => `${name} dispels or removes buffs from enemies.`,
    },
    {
      tag: SYNERGY_TAGS.CONTROL_PROVIDER,
      text: (name) => `${name} applies crowd control to enemies.`,
    },
    {
      tag: SYNERGY_TAGS.TAUNT_OR_PROVOKE,
      text: (name) => `${name} forces enemies to target them (taunt/provoke).`,
    },
    {
      tag: SYNERGY_TAGS.ENERGY_DRAIN_ENEMY,
      text: (name) => `${name} drains Energy from enemies.`,
    },
  ];

  for (const cfg of teamTagProviders) {
    const providers = team.filter(h => prof.get(h.id).tags.has(cfg.tag));
    for (const p of providers) {
      const ev = prof.get(p.id).evidenceByTag[cfg.tag];
      if (!SYNERGY_STRICT_MODE || ev) {
        results.push({
          type: "team",
          kind: cfg.tag,
          text: cfg.text(p.name),
          evidence: ev ? [ev] : [],
        });
      }
    }
  }

  // Dedupe
  const seen = new Set();
  return results.filter(x => {
    const k = `${x.kind}|${x.text}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function synergyExplanation(team) {
  const pair = detectPairSynergies(team);
  const teamLevel = detectTeamSynergies(team);

  // Deduplicate by kind/from/to/text
  const seen = new Set();
  const combined = [];
  for (const x of [...pair, ...teamLevel]) {
    const key = `${x.type}|${x.kind || ""}|${x.from || ""}|${x.to || ""}|${x.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    combined.push(x);
  }

  // STRICT: wenn evidence fehlt, rausfiltern (zusätzliche Sicherung)
  const filtered = SYNERGY_STRICT_MODE
    ? combined.filter(x => {
        if (x.type === "team") return Array.isArray(x.evidence) && x.evidence.length >= 1;
        return Array.isArray(x.evidence) && x.evidence.length >= 2;
      })
    : combined;

  return filtered.slice(0, 5);
}

// Debug export: pro Hero, pro Tag: evidence oder null
function buildSynergyDebug(team) {
  const prof = buildSynergyMap(team);

  const heroes = team.map(h => {
    const p = prof.get(h.id);
    const tagRows = ALL_SYNERGY_TAG_LIST.map(tag => {
      const ev = p.evidenceByTag[tag] || null;
      return {
        tag,
        hasEvidence: Boolean(ev),
        snippet: ev?.snippet ?? null,
        match: ev?.match ?? null,
      };
    });

    return {
      heroId: h.id,
      heroName: h.name,
      forbidsNormals: Boolean(p.forbidsNormals),
      detectedTags: Array.from(p.tags),
      tags: tagRows,
    };
  });

  return {
    strictMode: SYNERGY_STRICT_MODE,
    heroes,
  };
}

/*
  WICHTIG: In mkComp(...) bitte ergänzen:

  const synergy = synergyExplanation(team);
  const synergyDebug = SYNERGY_DEBUG_EXPORT ? buildSynergyDebug(team) : null;

  return {
    ...
    synergy,
    synergyDebug,
  };
*/


// -----------------------------
// Facts (optional, mostly unchanged)
// -----------------------------
function isAssassinClass(h) {
  return String(h.class || "").toLowerCase() === "assassin";
}

function hasBacklineTargetText(h) {
  const t = fullSkillText(h).toLowerCase();
  return (
    t.includes("farthest enemy") ||
    t.includes("back row") ||
    t.includes("rear row") ||
    t.includes("behind") ||
    t.includes("teleport") ||
    t.includes("blink")
  );
}

function shortQuote(text, maxWords = 12) {
  const words = String(text || "").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  return words.length <= maxWords ? words.join(" ") : words.slice(0, maxWords).join(" ") + "…";
}

function extractSkillQuotes(hero, maxPerHero = 1) {
  const buckets = [
    { title: "Healing keyword", re: /\b(heal|restor)\w*\b/i },
    { title: "Shield keyword", re: /\bshield\b/i },
    { title: "Control keyword", re: /\b(stun|silence|freeze|root|sleep|charm|taunt|knock)\w*\b/i },
    { title: "AoE keyword", re: /\b(all enemies|nearby enemies|in a large area|aoe)\b/i },
    { title: "Cooldown keyword", re: /\b(cooldown|cd)\b/i },
    { title: "Energy keyword", re: /\benergy\b/i },
    { title: "Backline target keyword", re: /\b(farthest enemy|back row|rear row|behind|teleport|blink)\b/i },
  ];

  const out = [];
  const skills = hero.skills || [];
  for (let i = 0; i < skills.length; i++) {
    const sk = skills[i];
    const desc = sk?.description || "";
    if (!desc) continue;

    for (const b of buckets) {
      const m = desc.match(b.re);
      if (!m) continue;
      out.push({
        type: "skill_quote",
        heroId: hero.id,
        heroName: hero.name,
        title: `${b.title}: ${m[0]}`,
        value: `Skill “${sk.name ?? `#${i + 1}`}”: “${shortQuote(desc)}”`,
        source: { heroId: hero.id, field: `skills[${i}].description` },
      });
      break;
    }

    if (out.length >= maxPerHero) break;
  }
  return out;
}

function buildFacts(team) {
  const facts = [];

  const fb = factionBonus(team);
  facts.push({
    type: "faction_bonus",
    title: "Faction bonus",
    value: fb.pct === 0 ? "0% (no 3+ faction set)" : `${fb.pct}% ATK & HP (computed from factions; Starglint counts as a joker)`,
    source: { type: "computed", fields: ["hero.faction"] },
  });

  const assassins = team.filter(isAssassinClass);
  if (assassins.length) {
    facts.push({
      type: "rule",
      title: "Backline targeting (class rule)",
      value: `${assassins.map(a => a.name).join(", ")}: class = Assassin`,
      source: { type: "hero_field", fields: assassins.map(a => `${a.id}.class`) },
    });
  } else {
    const backliners = team.filter(hasBacklineTargetText);
    if (backliners.length) {
      facts.push({
        type: "rule",
        title: "Backline targeting (skill text)",
        value: `${backliners.map(b => b.name).join(", ")}: skill/relic text contains “behind/back row/farthest/teleport/blink”`,
        source: { type: "hero_field", fields: backliners.map(b => `${b.id}.skills[].description`) },
      });
    }
  }

  for (const h of team) {
    facts.push({
      type: "hero_identity",
      heroId: h.id,
      title: "Role / Class / Faction",
      value: `${h.name}: role=${h.role ?? "?"}, class=${h.class ?? "?"}, faction=${h.faction ?? "?"}`,
      source: { heroId: h.id, field: "role/class/faction" },
    });

    const s = h.stats || {};
    facts.push({
      type: "hero_stats",
      heroId: h.id,
      title: "Core stats",
      value: `${h.name}: HP=${s.hp ?? "?"}, ATK=${s.atk ?? "?"}, Armor=${s.armor ?? "?"}, M-RES=${s.magicRes ?? "?"}, Crit=${s.critRate ?? "?"}%`,
      source: { heroId: h.id, field: "stats" },
    });

    facts.push(...extractSkillQuotes(h, 1));
  }

  return facts;
}

// -----------------------------
// Heuristic score (mode-aware)
// -----------------------------
function heuristicScore(team, mode = "general") {
  let score = 0;

  const fb = factionBonus(team).pct;
  const fbNorm = fb / 35;
  score += Math.sqrt(fbNorm) * 220;

  // mode rating: overall/pve/pvp
  score += teamModeAvg(team, mode) * 25;

  for (const h of team) {
    const s = h.stats || {};
    score += Number(s.atk || 0) * 0.01;
    score += durabilityScore(h) * 0.00002;
  }

  const allText = team.map(h => fullSkillText(h).toLowerCase()).join(" ");

  const heal = /\b(heal|heals|healing|restore|restores|recover|recovers)\w*\b/.test(allText) ? 1 : 0;
  const shield = /\bshield\b/.test(allText) ? 1 : 0;
  const controlHits = (allText.match(/\b(stun|silence|freeze|root|sleep|charm|taunt|knock)\w*\b/g) || []).length;
  const aoeHits = (allText.match(/\b(all enemies|nearby enemies|in a large area|aoe)\b/g) || []).length;
  const backlineHits = (allText.match(/\b(farthest enemy|back row|rear row|teleport|blink)\b/g) || []).length;

  // base bonuses
  score += heal * 40;
  score += shield * 25;
  score += Math.min(6, controlHits) * 8;

  const topDur = Math.max(...team.map(durabilityScore));
  score += topDur * 0.00002;

  score += synergyScore(team);

  // Mode weights
  if (mode === "pvp") {
    score += Math.min(8, controlHits) * 6;
    score += Math.min(4, backlineHits) * 12;
    score += Math.min(6, aoeHits) * 4;
  }

  if (mode === "pve") {
    score += heal * 25;
    score += shield * 15;
    score += Math.min(6, aoeHits) * 3;
    score += topDur * 0.00002;
  }

  return score;
}

// -----------------------------
// Candidate pool (performance)
// -----------------------------
function pickCandidatePool(heroes) {
  const ranked = heroes
    .map(h => {
      const s = h.stats || {};
      const hp = Number(s.hp || 0);
      const atk = Number(s.atk || 0);
      const armor = Number(s.armor || 0);
      const mres = Number(s.magicRes || 0);
      const rating = overallRatingValue(h);
      const key = hp * 0.000003 + atk * 0.00008 + (armor + mres) * 0.002 + rating * 0.6;
      return { id: h.id, key };
    })
    .sort((a, b) => b.key - a.key);

  return ranked.slice(0, CFG.candidatePoolSize).map(x => x.id);
}

// -----------------------------
// Main
// -----------------------------
async function main() {
  const heroes = await loadHeroes();
  const heroById = Object.fromEntries(heroes.map(h => [h.id, h]));
  const rng = makeRng(CFG.seed);

  const out = {};
  const globalPool = pickCandidatePool(heroes);

  for (const anchor of heroes) {
    const poolIds = globalPool.filter(id => id !== anchor.id);

    function buildCompsForMode(mode) {
      const best = [];

      for (let i = 0; i < CFG.attemptsPerHero; i++) {
        const used = new Set([anchor.id]);
        const teamIds = [anchor.id];

        while (teamIds.length < 5) {
          const pick = poolIds[Math.floor(rng() * poolIds.length)];
          if (used.has(pick)) continue;
          used.add(pick);
          teamIds.push(pick);
        }

        const team = teamIds.map(id => heroById[id]);
        const score = heuristicScore(team, mode);
        best.push({ teamIds, score });
      }

      best.sort((a, b) => b.score - a.score);

      // de-duplicate by team set
      const uniq = [];
      const seen = new Set();
      for (const cand of best) {
        const key = uniqueTeamKey(cand.teamIds);
        if (seen.has(key)) continue;
        seen.add(key);
        uniq.push(cand);
      }

      const mkComp = (cand, label) => {
        const team = cand.teamIds.map(id => heroById[id]);
        const synergy = synergyExplanation(team);
        const formation = buildFormation(team);
        const facts = buildFacts(team);
        const fb = factionBonus(team);

        const summary = {
          mode,
          label,
          factionBonusPct: fb.pct,
          effectiveFactionForBonus: fb.effectiveFaction,
          heroes: team.map(h => ({
            id: h.id,
            tags: keywordTagsForHero(h),
            class: h.class,
            faction: h.faction,
            role: h.role,
            overall: h?.ratings?.overall ?? null,
            pve: h?.ratings?.pve ?? null,
            pvp: h?.ratings?.pvp ?? null,
          })),
          formation,
        };

        const synergyDebug = CFG.synergyDebug ? buildSynergyDebug(team) : undefined;

        return {
          mode,
          label,
          team: cand.teamIds,
          formation,
          rankingScore: Math.round(cand.score * 10) / 10,
          summary,
          facts,
          synergy,
         synergyDebug,
        };
      };

      // 1) Meta
      const meta = uniq[0];
      const metaKey = meta ? uniqueTeamKey(meta.teamIds) : null;

      // 2) 35% bonus team (anchor must benefit)
      const bonus35 = uniq.find(c => {
        const team = c.teamIds.map(id => heroById[id]);
        const fb = factionBonus(team);

        if (fb.pct !== 35) return false;
        if (uniqueTeamKey(c.teamIds) === metaKey) return false;

        if (String(anchor.faction).toLowerCase() === "starglint") return true;
        return fb.effectiveFaction === anchor.faction;
      });

      const usedKeys = new Set([metaKey, bonus35 ? uniqueTeamKey(bonus35.teamIds) : null].filter(Boolean));

      const comps = [];
      if (meta) comps.push(mkComp(meta, "meta"));
      if (bonus35) comps.push(mkComp(bonus35, "bonus35"));

      // bestBonus fallback (>=15% and anchor benefits)
      if (!bonus35) {
        const bestBonus = uniq.find(c => {
          const key = uniqueTeamKey(c.teamIds);
          if (key === metaKey) return false;

          const team = c.teamIds.map(id => heroById[id]);
          const fb = factionBonus(team);
          if (fb.pct < 15) return false;

          if (String(anchor.faction).toLowerCase() === "starglint") return true;
          return fb.effectiveFaction === anchor.faction;
        });

        if (bestBonus) {
          comps.push(mkComp(bestBonus, "bestBonus"));
          usedKeys.add(uniqueTeamKey(bestBonus.teamIds));
        }
      }

      // Mixed: remaining (anchor benefits OR 0%)
      const mixed = uniq.find(c => {
        const key = uniqueTeamKey(c.teamIds);
        if (usedKeys.has(key)) return false;

        const team = c.teamIds.map(id => heroById[id]);
        const fb = factionBonus(team);

        if (String(anchor.faction).toLowerCase() === "starglint") return true;
        return fb.effectiveFaction === anchor.faction || fb.pct === 0;
      });

      if (mixed) comps.push(mkComp(mixed, "mixed"));

      return comps.slice(0, CFG.keepTop);
    }

    out[anchor.id] = {
      general: buildCompsForMode("general"),
      pve: buildCompsForMode("pve"),
      pvp: buildCompsForMode("pvp"),
    };
  }

  await fs.mkdir(path.dirname(OUT_FILE), { recursive: true });
  await fs.writeFile(OUT_FILE, JSON.stringify(out, null, 2), "utf-8");
  console.log(`Wrote ${OUT_FILE}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});