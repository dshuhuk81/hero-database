import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const tablePath = path.join(projectRoot, 'data-mine', 'cn_en_hero_table.json');
const mappingPath = path.join(projectRoot, 'src', 'data', 'game_id_mapping.json');
const heroesDir = path.join(projectRoot, 'src', 'data', 'heroes');

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const existingTable = readJson(tablePath);
const mappings = readJson(mappingPath);
const existingRowsById = new Map(
  existingTable.rows.map((row) => [String(row.hero_id), row]),
);

const heroes = new Map();
for (const fileName of fs.readdirSync(heroesDir)) {
  if (!fileName.endsWith('.json')) continue;
  const hero = readJson(path.join(heroesDir, fileName));
  heroes.set(hero.id, hero);
}

const heroesWithoutMapping = [...heroes.keys()].filter((projectId) => !mappings[projectId]);
if (heroesWithoutMapping.length > 0) {
  throw new Error(`Missing game ID mappings for: ${heroesWithoutMapping.join(', ')}`);
}

const seenHeroIds = new Set();
const rows = [];
const unmappedProjectHeroes = [];

for (const [projectId, mapping] of Object.entries(mappings)) {
  if (mapping.game_hero_id == null) {
    unmappedProjectHeroes.push(projectId);
    continue;
  }

  const hero = heroes.get(projectId);
  if (!hero) {
    throw new Error(`Missing src/data/heroes JSON for mapping key: ${projectId}`);
  }

  const heroId = String(mapping.game_hero_id);
  if (seenHeroIds.has(heroId)) {
    throw new Error(`Duplicate primary game hero ID: ${heroId}`);
  }
  seenHeroIds.add(heroId);

  const existingRow = existingRowsById.get(heroId);
  rows.push({
    hero_id: heroId,
    internal_name: mapping.assets?.internal_name ?? '',
    project_id: projectId,
    en_name: hero.name,
    hero_name_tid: `tid#HeroName_${heroId}`,
    hero_des_tid: `tid#HeroDes_${heroId}`,
    hero_name_tid_present_in_hero_detail:
      existingRow?.hero_name_tid_present_in_hero_detail ?? false,
    hero_des_tid_present_in_hero_detail:
      existingRow?.hero_des_tid_present_in_hero_detail ?? false,
  });
}

rows.sort((left, right) => Number(left.hero_id) - Number(right.hero_id));

const output = {
  metadata: {
    total_rows: rows.length,
    scope: 'player_heroes_only',
    generated_from: 'src/data/game_id_mapping.json',
    hero_detail_source: existingTable.metadata.hero_detail_source,
    unmapped_project_heroes: unmappedProjectHeroes.sort(),
  },
  rows,
};

fs.writeFileSync(tablePath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Synced ${rows.length} player heroes to ${path.relative(projectRoot, tablePath)}`);
