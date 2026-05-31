import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, '..');
const skillsDir = path.join(projectRoot, 'public', 'cn_full_skills');
const mappingPath = path.join(projectRoot, 'src', 'data', 'game_id_mapping.json');
const apply = process.argv.includes('--apply');

const mappings = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
const normalize = (value) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
const slugify = (value) => String(value).replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

const prefixToHero = new Map();
for (const [heroId, mapping] of Object.entries(mappings)) {
  for (const value of [
    mapping.assets?.skill_icon_prefix,
    mapping.assets?.internal_name,
    mapping.assets?.spine_name,
  ]) {
    if (value) prefixToHero.set(normalize(value), heroId);
  }
}

// Some atlas prefixes use abbreviated spellings that differ from the config names.
for (const [prefix, heroId] of Object.entries({
  BaiYang: 'aries',
  ChuNv: 'virgo',
  GaiBu: 'geb',
  JuXie: 'cancer',
  ShuangYuZuo: 'pisces',
})) {
  prefixToHero.set(normalize(prefix), heroId);
}

const resolveHeroId = (prefix) =>
  prefixToHero.get(normalize(prefix)) ??
  prefixToHero.get(normalize(prefix.replace(/01$/, '')));

const canonicalPrefix = (heroId) => normalize(mappings[heroId]?.assets?.skill_icon_prefix);
const priority = ({ heroId, prefix }) => {
  if (normalize(prefix) === canonicalPrefix(heroId)) return 0;
  if (!prefix.endsWith('01')) return 1;
  return 2;
};

const parsedFiles = [];
const unresolved = [];
for (const fileName of fs.readdirSync(skillsDir).sort()) {
  if (!fileName.endsWith('.png')) continue;

  const match = fileName.match(/^A_UI_Hero_(.+)_Skill(\d+)\.png$/);
  if (!match) continue;

  const [, prefix, rawSkillNumber] = match;
  const heroId = resolveHeroId(prefix);
  if (!heroId) {
    unresolved.push(fileName);
    continue;
  }

  parsedFiles.push({
    fileName,
    heroId,
    prefix,
    skillNumber: Number(rawSkillNumber),
  });
}

const byCandidate = new Map();
for (const file of parsedFiles) {
  const candidate = `${file.heroId}_skill_${file.skillNumber}.png`;
  if (!byCandidate.has(candidate)) byCandidate.set(candidate, []);
  byCandidate.get(candidate).push(file);
}

const renames = [];
for (const [candidate, files] of byCandidate) {
  files.sort((left, right) => priority(left) - priority(right) || left.prefix.localeCompare(right.prefix));
  for (const [index, file] of files.entries()) {
    const targetName =
      index === 0
        ? candidate
        : `${file.heroId}_alt_${slugify(file.prefix)}_skill_${file.skillNumber}.png`;
    renames.push({ sourceName: file.fileName, targetName });
  }
}

renames.sort((left, right) => left.sourceName.localeCompare(right.sourceName));

const duplicateTargets = renames
  .map(({ targetName }) => targetName)
  .filter((targetName, index, all) => all.indexOf(targetName) !== index);
if (duplicateTargets.length > 0) {
  throw new Error(`Duplicate rename targets: ${[...new Set(duplicateTargets)].join(', ')}`);
}

for (const { sourceName, targetName } of renames) {
  const sourcePath = path.join(skillsDir, sourceName);
  const targetPath = path.join(skillsDir, targetName);
  if (fs.existsSync(targetPath)) {
    throw new Error(`Refusing to overwrite existing file: ${targetName}`);
  }
  if (apply) fs.renameSync(sourcePath, targetPath);
}

console.log(`${apply ? 'Renamed' : 'Would rename'} ${renames.length} skill files.`);
console.log(`Left ${unresolved.length} unresolved skill files unchanged.`);
if (!apply) console.log('Run with --apply to perform the rename.');

if (unresolved.length > 0) {
  console.log('\nUnresolved files:');
  for (const fileName of unresolved) console.log(`- ${fileName}`);
}
