/**
 * Step 3: Convert hero portraits and skill icons from game_graphics/ to
 * public/heroes/ and public/skills/ as WebP files.
 *
 * Sources:
 *   Portrait: game_graphics/new_texture_ui_herofigure_a_ui_portrait_{name}_img/
 *   Skill icons: game_graphics/new_atlas_sa_ui_skill/A_UI_Hero_{Prefix}_Skill{01-04,06}.png
 *
 * Targets:
 *   public/heroes/{hero_id}.webp
 *   public/skills/{hero_id}_skill_{1-4}.webp
 *   public/skills/{hero_id}_relic.webp
 */

import { readFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const GRAPHICS = join(ROOT, 'leak/game_graphics');
const SKIN_LUA = join(ROOT, 'leak/game_extracted/region_754c000000/NewConfig/hero_skin.lua');
const MAPPING_PATH = join(ROOT, 'src/data/game_id_mapping.json');
const OUT_HEROES = join(ROOT, 'public/heroes');
const OUT_SKILLS = join(ROOT, 'public/skills');

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

// ---------------------------------------------------------------------------
// Parse hero_skin.lua for all hero entries (those with a `hero` field)
// Returns: Map<game_hero_id, { portrait, skill_icon_prefix, skin_id }>
// ---------------------------------------------------------------------------
function parseSkinLua(luaText) {
  const result = new Map();
  const blocks = luaText.split(/(?=^t\[\d+\] = \{)/m);
  for (const block of blocks) {
    const heroMatch = block.match(/^\s*hero\s*=\s*(\d+)/m);
    if (!heroMatch) continue;
    const heroId = parseInt(heroMatch[1]);

    const portraitMatch = block.match(/^\s*portrait\s*=\s*'([^']+)'/m);
    const skill1Match = block.match(/skill_icon_1\s*=\s*'A_UI_Hero_(.+?)_Skill\d+'/);
    const exEquipMatch = block.match(/ex_equip_skill_icon\s*=\s*'A_UI_Hero_(.+?)_Skill\d+'/);
    const skinIdMatch = block.match(/^\s*id\s*=\s*(\d+)/m);

    const entry = result.get(heroId) || { heroId };
    // Prefer the canonical skin (lowest skin_id = base skin)
    const skinId = skinIdMatch ? parseInt(skinIdMatch[1]) : Number.MAX_SAFE_INTEGER;
    const existingId = entry.skinId ?? Infinity;
    if (skinId < existingId) {
      if (portraitMatch) entry.portrait = portraitMatch[1];
      if (skill1Match) entry.skill_icon_prefix = skill1Match[1];
      else if (exEquipMatch) entry.skill_icon_prefix = exEquipMatch[1];
      entry.skinId = skinId;
    } else {
      // Still take portrait/prefix if not yet set
      if (!entry.portrait && portraitMatch) entry.portrait = portraitMatch[1];
      if (!entry.skill_icon_prefix && skill1Match) entry.skill_icon_prefix = skill1Match[1];
      if (!entry.skill_icon_prefix && exEquipMatch) entry.skill_icon_prefix = exEquipMatch[1];
    }
    result.set(heroId, entry);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Find portrait PNG path from game_graphics for a given portrait key
// e.g. 'A_UI_Portrait_Amengla_Img' -> full PNG path
// ---------------------------------------------------------------------------
const GRAPHICS_DIRS = readdirSync(GRAPHICS);

function findPortraitPng(portraitKey) {
  // Convert portrait key to lowercase folder search
  // 'A_UI_Portrait_Amengla_Img' -> 'new_texture_ui_herofigure_a_ui_portrait_amengla_img'
  const keyLower = portraitKey.toLowerCase();
  const folder = GRAPHICS_DIRS.find(d => {
    return d.startsWith('new_texture_ui_herofigure_') && d.endsWith(keyLower);
  });
  if (!folder) return null;
  const fullFolder = join(GRAPHICS, folder);
  const candidates = readdirSync(fullFolder).filter(f => f.toLowerCase().endsWith('.png'));
  return candidates.length > 0 ? join(fullFolder, candidates[0]) : null;
}

// Fallback: derive portrait folder from internal_name
// e.g. internal_name 'nvba' -> folder 'new_texture_ui_herofigure_a_ui_portrait_nvba_img'
function findPortraitByInternalName(internalName) {
  const target = `new_texture_ui_herofigure_a_ui_portrait_${internalName.toLowerCase()}_img`;
  if (!GRAPHICS_DIRS.includes(target)) return null;
  const fullFolder = join(GRAPHICS, target);
  const candidates = readdirSync(fullFolder).filter(f => f.toLowerCase().endsWith('.png'));
  return candidates.length > 0 ? join(fullFolder, candidates[0]) : null;
}

// Hardcoded skill prefix overrides for heroes whose skin entry lacks skill_icon_1
const SKILL_PREFIX_OVERRIDES = {
  nuba: 'NvBa',
};

// ---------------------------------------------------------------------------
// Skill game->project number mapping:
//   game Skill03 -> project skill_1 (ultimate)
//   game Skill01 -> project skill_2
//   game Skill02 -> project skill_3
//   game Skill04 -> project skill_4
//   game Skill06 -> project relic
// ---------------------------------------------------------------------------
const SKILL_MAP = [
  { projectNum: 'skill_1', gameSuffix: 'Skill03' },
  { projectNum: 'skill_2', gameSuffix: 'Skill01' },
  { projectNum: 'skill_3', gameSuffix: 'Skill02' },
  { projectNum: 'skill_4', gameSuffix: 'Skill04' },
  { projectNum: 'relic',   gameSuffix: 'Skill06' },
];

const SKILL_ATLAS = join(GRAPHICS, 'new_atlas_sa_ui_skill');
const SKILL_FILES = readdirSync(SKILL_ATLAS);

function findSkillPng(prefix, gameSuffix) {
  // e.g. prefix='AMengLa', gameSuffix='Skill03'
  // -> 'A_UI_Hero_AMengLa_Skill03.png'
  const target = `A_UI_Hero_${prefix}_${gameSuffix}.png`;
  const found = SKILL_FILES.find(f => f.toLowerCase() === target.toLowerCase());
  return found ? join(SKILL_ATLAS, found) : null;
}

// Fallback: use circle portrait (316x316) for heroes without a full-body herofigure
function findCirclePortraitPng(internalName) {
  const target = `new_texture_ui_headportraitcircle_a_ui_headportrait_${internalName.toLowerCase()}03_img`;
  if (!GRAPHICS_DIRS.includes(target)) return null;
  const fullFolder = join(GRAPHICS, target);
  const candidates = readdirSync(fullFolder).filter(f => f.toLowerCase().endsWith('.png'));
  return candidates.length > 0 ? join(fullFolder, candidates[0]) : null;
}
// ---------------------------------------------------------------------------
async function convertToWebp(srcPath, destPath) {
  if (!DRY_RUN) {
    await sharp(srcPath)
      .webp({ quality: 90, lossless: false })
      .toFile(destPath);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(DRY_RUN ? '[DRY RUN] No files will be written.' : '[LIVE] Writing files...');

  if (!DRY_RUN) {
    mkdirSync(OUT_HEROES, { recursive: true });
    mkdirSync(OUT_SKILLS, { recursive: true });
  }

  const mapping = JSON.parse(readFileSync(MAPPING_PATH, 'utf8'));
  const luaText = readFileSync(SKIN_LUA, 'utf8');
  const skinData = parseSkinLua(luaText);

  let portraitOk = 0, portraitMissing = 0, portraitSkipped = 0;
  let skillOk = 0, skillMissing = 0, skillSkipped = 0;

  const heroes = Object.entries(mapping).filter(([, v]) => v.status === 'ok' && v.game_hero_id);

  for (const [heroId, entry] of heroes) {
    const gameId = entry.game_hero_id;
    const skinEntry = skinData.get(gameId);

    // --- Portrait ---
    // Use the skin lua `portrait` field (e.g. 'A_UI_Portrait_Amengla_Img')
    // which maps to the herofigure folder, not portrait_normal (headshot variant)
    // Fallback 1: derive folder from internal_name
    // Fallback 2: circle portrait (316x316)
    const portraitKey = skinEntry?.portrait || null;
    const internalName = entry.assets?.internal_name || null;
    const portraitPng = portraitKey
      ? findPortraitPng(portraitKey)
      : internalName
        ? (findPortraitByInternalName(internalName) || findCirclePortraitPng(internalName))
        : null;
    const destPortrait = join(OUT_HEROES, `${heroId}.webp`);

    if (!portraitPng) {
      console.log(`[PORTRAIT MISSING] ${heroId} (key=${portraitKey ?? 'none'})`);
      portraitMissing++;
    } else if (!FORCE && existsSync(destPortrait)) {
      portraitSkipped++;
    } else {
      console.log(`[PORTRAIT] ${heroId} <- ${portraitPng.split('/').slice(-2).join('/')}`);
      if (!DRY_RUN) await convertToWebp(portraitPng, destPortrait);
      portraitOk++;
    }

    // --- Skill icons ---
    // Prefer mapping's skill_icon_prefix, fall back to skin lua, then hardcoded overrides
    const prefix = entry.assets?.skill_icon_prefix || skinEntry?.skill_icon_prefix || SKILL_PREFIX_OVERRIDES[heroId] || null;

    if (!prefix) {
      console.log(`[SKILL PREFIX MISSING] ${heroId}`);
      skillMissing += 5;
      continue;
    }

    for (const { projectNum, gameSuffix } of SKILL_MAP) {
      const srcPng = findSkillPng(prefix, gameSuffix);
      const destName = projectNum === 'relic'
        ? `${heroId}_relic.webp`
        : `${heroId}_${projectNum}.webp`;
      const destPath = join(OUT_SKILLS, destName);

      if (!srcPng) {
        console.log(`[SKILL MISSING] ${heroId} ${projectNum} (prefix=${prefix}, suffix=${gameSuffix})`);
        skillMissing++;
      } else if (!FORCE && existsSync(destPath)) {
        skillSkipped++;
      } else {
        console.log(`[SKILL] ${heroId} ${projectNum} <- ${srcPng.split('/').pop()}`);
        if (!DRY_RUN) await convertToWebp(srcPng, destPath);
        skillOk++;
      }
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Portraits: ${portraitOk} converted, ${portraitSkipped} skipped (exist), ${portraitMissing} missing`);
  console.log(`Skills:    ${skillOk} converted, ${skillSkipped} skipped (exist), ${skillMissing} missing`);
}

main().catch(e => { console.error(e); process.exit(1); });
