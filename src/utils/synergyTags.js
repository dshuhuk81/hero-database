// src/utils/synergyTags.js
import { fullSkillText } from "./heroTags.js";
import fs from "node:fs/promises";
import { readFileSync } from "node:fs";
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

function loadTagCategoriesSync() {
  try {
    const categoriesPath = path.join(process.cwd(), "src/data/tagCategories.json");
    const categories = JSON.parse(readFileSync(categoriesPath, "utf-8"));
    return Object.fromEntries(categories.map((category) => [category.id, category.tags || []]));
  } catch {
    return {};
  }
}

const TAG_CATEGORIES = loadTagCategoriesSync();

function getCategoryForTag(tag) {
  for (const [category, tags] of Object.entries(TAG_CATEGORIES)) {
    if (tags.includes(tag)) {
      return category;
    }
  }
  return "OTHER";
}

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

// Synergy profile by category (for UI display)
export function synergyProfileForHeroByCategory(hero) {
  const prof = synergyProfileForHero(hero);
  const categorized = Object.fromEntries(
    Object.keys(TAG_CATEGORIES).map((category) => [category, []])
  );
  categorized.OTHER = [];

  for (const tag of prof.tags) {
    const category = getCategoryForTag(tag);
    if (categorized[category]) {
      categorized[category].push(tag);
    } else {
      categorized.OTHER.push(tag);
    }
  }

  return categorized;
}


// Ein "Synergy Potential"-Score pro Hero - ONLY TEAM SUPPORT TAGS (strict scoring)
export async function synergyPotentialForHero(hero) {
  const SYNERGY_TAGS = await getSYNERGY_TAGS();
  
  const prof = synergyProfileForHero(hero);
  const has = (t) => prof.tags.has(t);

  let s = 0;

  // TEAM SUPPORT ONLY - counts toward synergy score
  if (has(SYNERGY_TAGS.TEAM_ENERGY_RESTORE)) s += 10;
  if (has(SYNERGY_TAGS.TEAM_CDR)) s += 8;
  if (has(SYNERGY_TAGS.TEAM_ATK_SPD_UP)) s += 4;
  if (has(SYNERGY_TAGS.TEAM_BUFF)) s += 4;
  if (has(SYNERGY_TAGS.TEAM_SHIELD)) s += 1;
  if (has(SYNERGY_TAGS.TEAM_HEAL)) s += 1;
  if (has(SYNERGY_TAGS.TEAM_DEBUFF_CLEANSE)) s += 1;
  if (has(SYNERGY_TAGS.TEAM_DAMAGE_REDUCTION)) s += 1;
  if (has(SYNERGY_TAGS.TEAM_CC_IMMUNITY)) s += 1;

  return Math.min(s, 100);
}
