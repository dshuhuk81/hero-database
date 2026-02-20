// src/utils/synergyTags.js
import { fullSkillText } from "./heroTags.js";

// -----------------------------
// Synergy tags (STRICT + EVIDENCE)
// (aus generator.js übernommen) 
// -----------------------------
export const SYNERGY_TAGS = {
  // A) TEAM SUPPORT (8 Tags)
  SHIELD_TEAM: "SHIELD_TEAM",
  HEAL_TEAM: "HEAL_TEAM",
  ENERGY_RESTORE_TEAM: "ENERGY_RESTORE_TEAM",
  CDR_TEAM: "CDR_TEAM",
  ATK_SPD_UP: "ATK_SPD_UP",
  DAMAGE_REDUCTION_TEAM: "DAMAGE_REDUCTION_TEAM",
  CC_IMMUNITY_TEAM: "CC_IMMUNITY_TEAM",
  DEBUFF_CLEANSE_TEAM: "DEBUFF_CLEANSE_TEAM",

  // B) ENEMY DEBUFF (7 Tags)
  CROWD_CONTROL: "CROWD_CONTROL",
  TAUNT: "TAUNT",
  ENEMY_VULNERABILITY: "ENEMY_VULNERABILITY",
  BUFF_DISPEL: "BUFF_DISPEL",
  ENERGY_DRAIN: "ENERGY_DRAIN",
  ATK_DOWN: "ATK_DOWN",
  ATK_SPD_DOWN: "ATK_SPD_DOWN",

  // C) PLAYSTYLE (2 Tags)
  BASIC_ATTACK_SCALER: "BASIC_ATTACK_SCALER",
  AREA_DAMAGE_DEALER: "AREA_DAMAGE_DEALER",

  // D) SELF BUFFS (10 Tags)
  SELF_SHIELD: "SELF_SHIELD",
  SELF_HEAL: "SELF_HEAL",
  ENERGY_RESTORE: "ENERGY_RESTORE",
  DODGE_BUFF: "DODGE_BUFF",
  CC_RESISTANCE: "CC_RESISTANCE",
  GAIN_ARMOR: "GAIN_ARMOR",
  DAMAGE_REDUCTION_SELF: "DAMAGE_REDUCTION_SELF",
  STAT_STEAL_AMPLIFY: "STAT_STEAL_AMPLIFY",
  HIT_AVOIDANCE_SELF: "HIT_AVOIDANCE_SELF",
  ATK_SPEED_SELF_ONLY: "ATK_SPEED_SELF_ONLY",
};

const ALL_SYNERGY_TAG_LIST = Object.values(SYNERGY_TAGS);

// --- Snippet helper ---
function snippetAround(text, matchIndex, maxLen = 180) {
  const raw = String(text || "");
  const idx = Math.max(0, Number(matchIndex || 0));
  const start = Math.max(0, idx - Math.floor(maxLen / 2));
  const end = Math.min(raw.length, start + maxLen);
  const s = raw.slice(start, end).replace(/\s+/g, " ").trim();
  return (start > 0 ? "…" : "") + s + (end < raw.length ? "…" : "");
}

// Evidence patterns (strict) – aus generator.js  [oai_citation:0‡generator.js](sediment://file_0000000079f071fdb9711537de0b7170)
const TAG_EVIDENCE_PATTERNS = {
  [SYNERGY_TAGS.ATK_SPEED_TEAM_PROVIDER]: [
    /\b(all allies|allied units|allies|team|party|teammates)\b[\s\S]{0,140}\b(atk\s*spd|attack\s*speed|attack\s*spd|haste)\b/i,
    /\b(atk\s*spd|attack\s*speed|attack\s*spd|haste)\b[\s\S]{0,140}\b(all allies|allied units|allies|team|party|teammates)\b/i,
    /\b(increase[sd]?|grant(?:s|ed)?|provide[sd]?|boost(?:s|ed)?)\b[\s\S]{0,60}\b(all allies|allied units|allies|team|party|teammates)\b[\s\S]{0,80}\b(atk\s*spd|attack\s*speed|attack\s*spd|haste)\b/i,
  ],

  [SYNERGY_TAGS.ATK_SPEED_SELF_ONLY]: [
    /\b(gains?|gain|increases?|increased|grant(?:s|ed)?|bonus)\b[\s\S]{0,50}\b(atk\s*spd|attack\s*speed|attack\s*spd|haste)\b(?![\s\S]{0,120}\b(all allies|allied units|allies|team|party|teammates)\b)/i,
    /\b(self|himself|herself)\b[\s\S]{0,40}\b(atk\s*spd|attack\s*speed|attack\s*spd|haste)\b/i,
  ],

  [SYNERGY_TAGS.ENERGY_TEAM_PROVIDER]: [
    // Very explicit: only match "X to allies" pattern
    // Avoids false positives like "all allies X, Hero gains energy"
    /\b(restore[sd]?|grant(?:s|ed)?|provide[sd]?|share[sd]?)\b[\s\S]{0,80}\benergy\b[\s\S]{0,80}\b(to\s+)?(all\s+)?(allies?|team|party|teammates)\b/i,
  ],

  [SYNERGY_TAGS.CDR_TEAM_PROVIDER]: [
    /\b(all allies|allies|ally)\b[\s\S]{0,180}\b(cooldown|cd)\b[\s\S]{0,80}\b(reduc|shorten|decreas|faster|haste)\w*\b/i,
    /\b(reduc|shorten|decreas|faster|haste)\w*\b[\s\S]{0,80}\b(cooldown|cd)\b[\s\S]{0,180}\b(all allies|allies|ally)\b/i,
  ],

  [SYNERGY_TAGS.DEF_DOWN_OR_AMP]: [
    /\b(reduc|decreas|lower)\w*\b[\s\S]{0,80}\b(armor|m-?res|magic res|defense|def)\b/i,
    /\b(increase[sd]?|amplif(?:y|ies|ied))\b[\s\S]{0,80}\b(dmg|damage)\b[\s\S]{0,120}\b(to|against)\b[\s\S]{0,60}\b(enemies?)\b/i,
    /\b(enemies?)\b[\s\S]{0,120}\b(take|receive)\b[\s\S]{0,60}\b(increase[sd]?|amplif(?:y|ies|ied))\b[\s\S]{0,60}\b(dmg|damage)\b/i,
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
    /\b(basic attacks?|normal attacks?)\b[\s\S]{0,120}\b(increase[sd]?|boost(?:s|ed)?|extra|additional)\b/i,
    /\b(increase[sd]?|boost(?:s|ed)?|extra|additional)\b[\s\S]{0,120}\b(basic attacks?|normal attacks?)\b/i,
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
    /\b(upon|when|after)\b[\s\S]{0,40}\b(casting|cast)\b[\s\S]{0,40}\b(their|his|her)?\s*(ultimate|ult)\b/i,
    /\b(ultimate|ult)\b[\s\S]{0,40}\bis\s+cast\b/i,
  ],

  [SYNERGY_TAGS.AOE_DAMAGE_PROFILE]: [
    /\b(aoe|all enemies|nearby enemies|in a (?:small|large) area|in an area)\b[\s\S]{0,160}\b(dmg|damage)\b/i,
    /\b(dmg|damage)\b[\s\S]{0,160}\b(to|against)\b[\s\S]{0,40}\b(all enemies|nearby enemies)\b/i,
    /\b(hits?|strike[sd]?)\b[\s\S]{0,60}\b(all enemies|nearby enemies)\b[\s\S]{0,120}\b(dmg|damage)\b/i,
  ],
};

// Evidence finder
function evidenceForTag(hero, tag) {
  const raw = fullSkillText(hero) || "";
  const patterns = TAG_EVIDENCE_PATTERNS[tag] || [];

  for (const re of patterns) {
    const m = raw.match(re);
    if (m && m.index != null) {
      return {
        tag,
        snippet: snippetAround(raw, m.index),
        match: String(m[0] || ""),
      };
    }
  }
  return null;
}

// STRICT profile (Tags nur wenn Evidence vorhanden)  [oai_citation:1‡generator.js](sediment://file_0000000079f071fdb9711537de0b7170)
// 🆕 NEW: Read synergies from manual hero.synergies field
export function synergyProfileForHero(hero) {
  const raw = fullSkillText(hero) || "";
  const forbidsNormals = /\bno longer performs normal attacks\b/i.test(raw);

  // Read manual synergies from hero object
  const manualTags = Array.isArray(hero.synergies) ? hero.synergies : [];
  const tags = new Set(manualTags);

  // Evidence for debug
  const evidenceByTag = {};
  for (const tag of manualTags) {
    evidenceByTag[tag] = {
      heroId: hero.id,
      heroName: hero.name,
      tag,
      snippet: "(manually assigned)",
      match: "(from synergies field)",
    };
  }

  return { tags, evidenceByTag, forbidsNormals };
}

// Ein “Synergy Potential”-Score pro Hero (solo, strict + erklärbar)
export function synergyPotentialForHero(hero) {
  const prof = synergyProfileForHero(hero);
  const has = (t) => prof.tags.has(t);

  let s = 0;

  // Providers (Team-Value)
  if (has(SYNERGY_TAGS.ENERGY_RESTORE_TEAM)) s += 10;
  if (has(SYNERGY_TAGS.CDR_TEAM)) s += 8;
  if (has(SYNERGY_TAGS.ENEMY_VULNERABILITY)) s += 6;
  if (has(SYNERGY_TAGS.ATK_SPD_UP)) s += 4;

  if (has(SYNERGY_TAGS.SHIELD_TEAM)) s += 1;
  if (has(SYNERGY_TAGS.HEAL_TEAM)) s += 1;
  if (has(SYNERGY_TAGS.DEBUFF_CLEANSE_TEAM)) s += 1;
  if (has(SYNERGY_TAGS.DAMAGE_REDUCTION_TEAM)) s += 1;
  if (has(SYNERGY_TAGS.CC_IMMUNITY_TEAM)) s += 1;

  if (has(SYNERGY_TAGS.BUFF_DISPEL)) s += 1;
  if (has(SYNERGY_TAGS.CROWD_CONTROL)) s += 1;
  if (has(SYNERGY_TAGS.TAUNT)) s += 1;
  if (has(SYNERGY_TAGS.ENERGY_DRAIN)) s += 1;
  if (has(SYNERGY_TAGS.ATK_DOWN)) s += 2;
  if (has(SYNERGY_TAGS.ATK_SPD_DOWN)) s += 2;

  // Receivers (profitiert von Team)
  if (has(SYNERGY_TAGS.AREA_DAMAGE_DEALER)) s += 8;
  if (has(SYNERGY_TAGS.BASIC_ATTACK_SCALER)) s += 6;

  // Self-only ATK speed ist nicht “Team synergy”, aber etwas wert
  if (has(SYNERGY_TAGS.ATK_SPEED_SELF_ONLY)) s += 3;

  return Math.min(s, 100);
}