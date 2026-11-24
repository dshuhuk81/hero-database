// Validates src/data/bosses.json: only the fields the boss pages read, one 5-hero team per boss
// made of known hero ids, no duplicates. Run via `npm run validate:all`.
import { readFileSync, readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(readFileSync(join(root, 'src/data/bosses.json'), 'utf8'));
const heroIds = new Set(
  readdirSync(join(root, 'src/data/heroes')).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)),
);

const BOSS_KEYS = ['id', 'name', 'mode', 'battlepower', 'faction', 'class', 'image', 'summary', 'team', 'mechanics', 'skills'];
const SKILL_KEYS = ['type', 'name', 'description', 'mechanics'];
const TEAM_SIZE = 5;
// Bosses still waiting for full-body artwork (the page hides a missing image).
const NO_ARTWORK = ['nian_beast'];
const errors = [];

const isText = value => typeof value === 'string' && value.trim() !== '';
const isTextList = value => Array.isArray(value) && value.length > 0 && value.every(isText);
const unknownKeys = (obj, allowed) => Object.keys(obj).filter(key => !allowed.includes(key));

if (unknownKeys(data, ['bosses']).length) {
  errors.push(`top level: unexpected keys ${unknownKeys(data, ['bosses']).join(', ')} (only "bosses" is read).`);
}
if (!Array.isArray(data.bosses) || data.bosses.length === 0) {
  errors.push('"bosses" must be a non-empty array.');
}

const seen = new Set();
for (const boss of data.bosses ?? []) {
  const at = boss?.id ?? '(no id)';
  if (!isText(boss.id)) errors.push(`${at}: id is required.`);
  else if (seen.has(boss.id)) errors.push(`${at}: duplicate id.`);
  seen.add(boss.id);

  for (const key of unknownKeys(boss, BOSS_KEYS)) errors.push(`${at}: unexpected key "${key}" (not used by the boss pages).`);
  for (const key of ['name', 'mode', 'battlepower', 'faction', 'class', 'summary']) {
    if (!isText(boss[key])) errors.push(`${at}: ${key} is required.`);
  }
  if (!NO_ARTWORK.includes(boss.id) || boss.image) {
    if (!isText(boss.image)) errors.push(`${at}: image is required.`);
    else if (!/^https:\/\//.test(boss.image) && !/^\/bosses\/[a-z0-9_-]+\.webp$/.test(boss.image)) errors.push(`${at}: image must be an https URL or a local /bosses/*.webp path.`);
  }

  if (!Array.isArray(boss.team) || boss.team.length !== TEAM_SIZE) {
    errors.push(`${at}: team must list exactly ${TEAM_SIZE} hero ids in formation order.`);
  } else {
    if (new Set(boss.team).size !== boss.team.length) errors.push(`${at}: team has a duplicate hero.`);
    for (const id of boss.team) {
      if (!heroIds.has(id)) errors.push(`${at}: team hero "${id}" has no file in src/data/heroes.`);
    }
  }

  if (!isTextList(boss.mechanics)) errors.push(`${at}: mechanics must be a non-empty list of text lines.`);

  if (!Array.isArray(boss.skills) || boss.skills.length === 0) {
    errors.push(`${at}: skills must be a non-empty array.`);
  } else {
    boss.skills.forEach((skill, index) => {
      const where = `${at}.skills[${index}]`;
      for (const key of unknownKeys(skill, SKILL_KEYS)) errors.push(`${where}: unexpected key "${key}".`);
      for (const key of ['type', 'name', 'description']) {
        if (!isText(skill[key])) errors.push(`${where}: ${key} is required.`);
      }
      if (!isTextList(skill.mechanics)) errors.push(`${where}: mechanics must be a non-empty list of text lines.`);
    });
  }
}

if (errors.length) {
  console.error(`Boss validation failed (${errors.length}):`);
  for (const message of errors) console.error(`- ${message}`);
  process.exit(1);
}
console.log(`Boss validation passed for ${data.bosses.length} bosses.`);
