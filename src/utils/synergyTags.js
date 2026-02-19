// src/utils/synergyTags.js
import { fullSkillText } from "./heroTags.js";

// -----------------------------
// Synergy tags (STRICT + EVIDENCE)
// (aus generator.js übernommen) 
// -----------------------------
export const SYNERGY_TAGS = {
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
    /\b(all allies|allies|ally)\b[\s\S]{0,180}\b(restore[sd]?|gain[sd]?|regenerate[sd]?|regen(?:eration)?)\b[\s\S]{0,60}\benergy\b/i,
    /\b(restore[sd]?|gain[sd]?|regenerate[sd]?|regen(?:eration)?)\b[\s\S]{0,60}\benergy\b[\s\S]{0,180}\b(all allies|allies|ally)\b/i,
    /\b(grant(?:s|ed)?|provide[sd]?|share[sd]?)\b[\s\S]{0,60}\benergy\b[\s\S]{0,120}\b(all allies|allies|ally)\b/i,
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
export function synergyProfileForHero(hero) {
  const raw = fullSkillText(hero) || "";
  const forbidsNormals = /\bno longer performs normal attacks\b/i.test(raw);

  const evidenceByTag = {};
  for (const tag of ALL_SYNERGY_TAG_LIST) {
    evidenceByTag[tag] = evidenceForTag(hero, tag);
  }

  const tags = new Set();

  // ATK Speed: team > self-only
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

  // Hit mechanics nur wenn Normal Attacks existieren
  if (!forbidsNormals) {
    if (evidenceByTag[SYNERGY_TAGS.BASIC_ATTACK_SCALER]) tags.add(SYNERGY_TAGS.BASIC_ATTACK_SCALER);
    if (evidenceByTag[SYNERGY_TAGS.ON_HIT_SCALER]) tags.add(SYNERGY_TAGS.ON_HIT_SCALER);
    if (evidenceByTag[SYNERGY_TAGS.FAST_STACKING_WITH_HITS]) tags.add(SYNERGY_TAGS.FAST_STACKING_WITH_HITS);
  }

  if (evidenceByTag[SYNERGY_TAGS.ULT_DEPENDENT]) tags.add(SYNERGY_TAGS.ULT_DEPENDENT);
  if (evidenceByTag[SYNERGY_TAGS.AOE_DAMAGE_PROFILE]) tags.add(SYNERGY_TAGS.AOE_DAMAGE_PROFILE);

  return { tags, evidenceByTag, forbidsNormals };
}

// Ein “Synergy Potential”-Score pro Hero (solo, strict + erklärbar)
export function synergyPotentialForHero(hero) {
  const prof = synergyProfileForHero(hero);
  const has = (t) => prof.tags.has(t);

  let s = 0;

  // Providers (Team-Value)
  if (has(SYNERGY_TAGS.ENERGY_TEAM_PROVIDER)) s += 26;
  if (has(SYNERGY_TAGS.CDR_TEAM_PROVIDER)) s += 18;
  if (has(SYNERGY_TAGS.DEF_DOWN_OR_AMP)) s += 16;
  if (has(SYNERGY_TAGS.ATK_SPEED_TEAM_PROVIDER)) s += 14;

  if (has(SYNERGY_TAGS.SHIELD_TEAM_PROVIDER)) s += 1;
  if (has(SYNERGY_TAGS.ALLY_HEAL_PROVIDER)) s += 1;
  if (has(SYNERGY_TAGS.CLEANSE_TEAM_PROVIDER)) s += 1;
  if (has(SYNERGY_TAGS.DAMAGE_REDUCTION_TEAM_PROVIDER)) s += 1;
  if (has(SYNERGY_TAGS.CC_IMMUNITY_TEAM_PROVIDER)) s += 1;

  if (has(SYNERGY_TAGS.DISPEL_ENEMY_BUFFS)) s += 1;
  if (has(SYNERGY_TAGS.CONTROL_PROVIDER)) s += 1;
  if (has(SYNERGY_TAGS.TAUNT_OR_PROVOKE)) s += 1;
  if (has(SYNERGY_TAGS.ENERGY_DRAIN_ENEMY)) s += 1;

  // Receivers (profitiert von Team)
  if (has(SYNERGY_TAGS.ULT_DEPENDENT)) s += 10;
  if (has(SYNERGY_TAGS.AOE_DAMAGE_PROFILE)) s += 8;
  if (has(SYNERGY_TAGS.BASIC_ATTACK_SCALER)) s += 6;
  if (has(SYNERGY_TAGS.ON_HIT_SCALER)) s += 6;
  if (has(SYNERGY_TAGS.FAST_STACKING_WITH_HITS)) s += 6;

  // Self-only ATK speed ist nicht “Team synergy”, aber etwas wert
  if (has(SYNERGY_TAGS.ATK_SPEED_SELF_ONLY)) s += 3;

  return Math.min(s, 100);
}