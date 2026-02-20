// src/utils/synergyTags.js
import { fullSkillText } from "./heroTags.js";

// -----------------------------
// Synergy tags (STRICT + EVIDENCE)
// (aus generator.js übernommen) 
// -----------------------------
export const SYNERGY_TAGS = {
  // A) TEAM SUPPORT (9 Tags) - alphabetically sorted
  ATK_SPD_UP: "ATK_SPD_UP",
  BUFF_TEAM: "BUFF_TEAM",
  CC_IMMUNITY_TEAM: "CC_IMMUNITY_TEAM",
  CDR_TEAM: "CDR_TEAM",
  DAMAGE_REDUCTION_TEAM: "DAMAGE_REDUCTION_TEAM",
  DEBUFF_CLEANSE_TEAM: "DEBUFF_CLEANSE_TEAM",
  ENERGY_RESTORE_TEAM: "ENERGY_RESTORE_TEAM",
  HEAL_TEAM: "HEAL_TEAM",
  SHIELD_TEAM: "SHIELD_TEAM",

  // B) ENEMY DEBUFF (9 Tags) - alphabetically sorted
  ATK_DOWN: "ATK_DOWN",
  ATK_SPD_DOWN: "ATK_SPD_DOWN",
  BUFF_DISPEL: "BUFF_DISPEL",
  CROWD_CONTROL: "CROWD_CONTROL",
  ENEMY_VULNERABILITY: "ENEMY_VULNERABILITY",
  ENERGY_DRAIN: "ENERGY_DRAIN",
  REDUCES_ATTRIBUTES: "REDUCES_ATTRIBUTES",
  REMOVES_ARMOR: "REMOVES_ARMOR",
  TAUNT: "TAUNT",

  // C) PLAYSTYLE (2 Tags) - alphabetically sorted
  AREA_DAMAGE_DEALER: "AREA_DAMAGE_DEALER",
  BASIC_ATTACK_SCALER: "BASIC_ATTACK_SCALER",

  // D) SELF BUFFS (13 Tags) - alphabetically sorted
  ATK_SPEED: "ATK_SPEED",
  ATK_UP: "ATK_UP",
  CC_RESISTANCE: "CC_RESISTANCE",
  DMG_RED: "DMG_RED",
  DODGE_BUFF: "DODGE_BUFF",
  ENERGY_RESTORE: "ENERGY_RESTORE",
  GAIN_ARMOR: "GAIN_ARMOR",
  HEAL: "HEAL",
  HEAL_EFFECT_UP: "HEAL_EFFECT_UP",
  HIT_AVOID: "HIT_AVOID",
  HP_UP: "HP_UP",
  LIFE_STEAL_UP: "LIFE_STEAL_UP",
  SHIELD: "SHIELD",
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

// Evidence patterns - removed (using manual tags instead)

// Synergy profile - reads from hero.synergies array (manual assignment)
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
  if (has(SYNERGY_TAGS.BUFF_TEAM)) s += 4;

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
  if (has(SYNERGY_TAGS.REMOVES_ARMOR)) s += 2;
  if (has(SYNERGY_TAGS.REDUCES_ATTRIBUTES)) s += 3;

  // Receivers (profitiert von Team)
  if (has(SYNERGY_TAGS.AREA_DAMAGE_DEALER)) s += 8;
  if (has(SYNERGY_TAGS.BASIC_ATTACK_SCALER)) s += 6;

  // Self-only/Self-buff bonuses
  if (has(SYNERGY_TAGS.ATK_UP)) s += 4;
  if (has(SYNERGY_TAGS.HEAL_EFFECT_UP)) s += 3;
  if (has(SYNERGY_TAGS.HP_UP)) s += 3;
  if (has(SYNERGY_TAGS.ATK_SPEED)) s += 3;

  return Math.min(s, 100);
}