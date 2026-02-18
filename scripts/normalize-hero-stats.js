#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const REQUIRED_STATS = [
  'might',
  'hp',
  'atk',
  'armor',
  'magicRes',
  'dodgeRate',
  'hitBonus',
  'critRate',
  'critRes',
  'critDmgBonus',
  'critDmgRed',
  'energy',
  'cooldownHaste',
  'atkSpdBonus',
  'pDmgBonus',
  'pDmgRed',
  'mDmgBonus',
  'mDmgRed',
  'healEff',
  'rechargeEff',
  'lifestealEff',
  'reflectEff',
  'effectRes',
  'effectHit',
  'controlRes',
  'controlBonus',
  'normalSkillPWR',
  'ultimatePWR'
];

// Field name mappings to normalize different naming conventions
const FIELD_NAME_MAPPING = {
  'magicRes': ['mres', 'magic_res'],
  'dodgeRate': ['dodge', 'dodgeRate'],
  'hitBonus': ['hit', 'hit_bonus'],
  'critRate': ['crit_rate', 'critRate'],
  'critRes': ['crit_res', 'critRes'],
  'critDmgBonus': ['crit_dmg', 'critDmg'],
  'critDmgRed': ['crit_dmg_red', 'critDmgReduction'],
  'cooldownHaste': ['cooldown_haste', 'cooldownHaste'],
  'atkSpdBonus': ['atk_spd', 'atkSpdBonus'],
  'pDmgBonus': ['p_dmg', 'pDmgBonus'],
  'pDmgRed': ['p_dmg_red', 'pDmgRed'],
  'mDmgBonus': ['m_dmg', 'mDmgBonus'],
  'mDmgRed': ['m_dmg_red', 'mDmgRed'],
  'healEff': ['heal_eff', 'healEff'],
  'rechargeEff': ['recharge_eff', 'rechargeEff'],
  'lifestealEff': ['lifesteal_eff', 'lifestealEff'],
  'reflectEff': ['reflect_eff', 'reflectEff'],
  'effectRes': ['effect_res', 'effectRes'],
  'effectHit': ['effect_hit', 'effectHit'],
  'controlRes': ['control_res', 'controlRes'],
  'controlBonus': ['control_bonus', 'controlBonus'],
  'normalSkillPWR': ['normal_skill_pwr', 'normalSkillPWR'],
  'ultimatePWR': ['ultimate_pwr', 'ultimatePWR']
};

const heroesDir = path.join(__dirname, '../src/data/heroes');
const files = fs.readdirSync(heroesDir).filter(f => f.endsWith('.json'));

let totalModified = 0;
let totalFiles = 0;

files.forEach(file => {
  const filePath = path.join(heroesDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  let hero = JSON.parse(content);

  if (!hero.stats) {
    hero.stats = {};
  }

  let wasModified = false;
  const missingStats = [];

  // Normalize existing field names and collect missing stats
  const normalizedStats = {};
  
  // First, normalize the existing stats
  Object.keys(hero.stats).forEach(key => {
    let found = false;
    
    // Check if this key is already in the required format
    if (REQUIRED_STATS.includes(key)) {
      normalizedStats[key] = hero.stats[key];
      found = true;
    } else {
      // Try to find a mapping for this key
      for (const [standardKey, aliases] of Object.entries(FIELD_NAME_MAPPING)) {
        if (aliases.includes(key)) {
          normalizedStats[standardKey] = hero.stats[key];
          found = true;
          if (key !== standardKey) {
            wasModified = true;
          }
          break;
        }
      }
    }
    
    if (!found) {
      // Keep unknown fields but flag as modified
      normalizedStats[key] = hero.stats[key];
      wasModified = true;
    }
  });

  // Add missing stats with default value 0
  REQUIRED_STATS.forEach(stat => {
    if (!(stat in normalizedStats)) {
      normalizedStats[stat] = 0;
      missingStats.push(stat);
      wasModified = true;
    }
  });

  if (wasModified) {
    totalModified++;
    
    // Reorder stats to match the required order
    const orderedStats = {};
    REQUIRED_STATS.forEach(stat => {
      if (stat in normalizedStats) {
        orderedStats[stat] = normalizedStats[stat];
      }
    });

    hero.stats = orderedStats;

    // Write back to file
    fs.writeFileSync(filePath, JSON.stringify(hero, null, 2) + '\n');
    
    console.log(`✓ ${file}`);
    if (missingStats.length > 0) {
      console.log(`  Added: ${missingStats.join(', ')}`);
    }
  }

  totalFiles++;
});

console.log(`\n✅ Done! Modified ${totalModified}/${totalFiles} files.`);
