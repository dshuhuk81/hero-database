// src/utils/synergyTags.js
import { fullSkillText } from "./heroTags.js";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load tags dynamically
let SYNERGY_TAGS_CACHE = null;
let ALL_SYNERGY_TAG_LIST_CACHE = null;

async function loadTagsOnce() {
  if (SYNERGY_TAGS_CACHE !== null) return;
  
  const tagsPath = path.join(process.cwd(), 'src/data/tags.json');
  const data = await fs.readFile(tagsPath, 'utf-8');
  const tags = JSON.parse(data);
  
  // Convert array to object for compatibility
  SYNERGY_TAGS_CACHE = {};
  for (const tag of tags) {
    SYNERGY_TAGS_CACHE[tag] = tag;
  }
  ALL_SYNERGY_TAG_LIST_CACHE = tags;
}

export async function getSYNERGY_TAGS() {
  await loadTagsOnce();
  return SYNERGY_TAGS_CACHE;
}

export async function getALL_SYNERGY_TAG_LIST() {
  await loadTagsOnce();
  return ALL_SYNERGY_TAG_LIST_CACHE;
}

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
export async function synergyPotentialForHero(hero) {
  const SYNERGY_TAGS = await getSYNERGY_TAGS();
  
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