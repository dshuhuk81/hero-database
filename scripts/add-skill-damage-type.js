/**
 * Batch-add "damageType": "" to every skill in all hero JSON files.
 * Non-destructive: skips skills that already have a damageType field.
 *
 * Usage: node scripts/add-skill-damage-type.js
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const HEROES_DIR = join(import.meta.dirname, '..', 'src', 'data', 'heroes');

async function main() {
  const files = (await readdir(HEROES_DIR)).filter(f => f.endsWith('.json'));
  let totalSkillsUpdated = 0;
  let totalFilesUpdated = 0;

  for (const file of files) {
    const filePath = join(HEROES_DIR, file);
    const raw = await readFile(filePath, 'utf-8');
    const hero = JSON.parse(raw);

    if (!hero.skills || !Array.isArray(hero.skills)) {
      console.log(`  SKIP ${file} (no skills array)`);
      continue;
    }

    let changed = false;
    for (const skill of hero.skills) {
      if (!('damageType' in skill)) {
        skill.damageType = '';
        totalSkillsUpdated++;
        changed = true;
      }
    }

    if (changed) {
      await writeFile(filePath, JSON.stringify(hero, null, 2) + '\n', 'utf-8');
      totalFilesUpdated++;
      console.log(`  OK  ${file} (${hero.skills.length} skills)`);
    } else {
      console.log(`  ---  ${file} (already has damageType on all skills)`);
    }
  }

  console.log(`\nDone: ${totalSkillsUpdated} skills updated across ${totalFilesUpdated} files.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
