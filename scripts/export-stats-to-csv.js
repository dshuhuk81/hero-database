#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HEROES_DIR = path.join(__dirname, '../src/data/heroes');
const OUTPUT_CSV = path.join(__dirname, '../src/data/stats/hero-stats.csv');

const STAT_FIELDS = [
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

function getAllHeroes() {
  const files = fs.readdirSync(HEROES_DIR)
    .filter(f => f.endsWith('.json'))
    .sort();
  
  const heroes = [];
  
  for (const file of files) {
    try {
      const filepath = path.join(HEROES_DIR, file);
      const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
      
      if (!data.id) continue;
      
      heroes.push({
        id: data.id,
        name: data.name || data.id,
        class: data.class || '',
        rarity: data.rarity || '',
        stats: data.stats || {}
      });
    } catch (err) {
      console.warn(`⚠️  Fehler beim Lesen von ${file}:`, err.message);
    }
  }
  
  return heroes;
}

function generateCSV(heroes) {
  // Header: id, name, class, rarity, dann alle Stats
  const headers = ['id', 'name', 'class', 'rarity', ...STAT_FIELDS];
  
  const rows = [headers];
  
  for (const hero of heroes) {
    const row = [
      hero.id,
      hero.name,
      hero.class,
      hero.rarity,
      ...STAT_FIELDS.map(field => {
        const value = hero.stats[field];
        return value !== undefined && value !== null ? value : 0;
      })
    ];
    rows.push(row);
  }
  
  return rows.map(row => row.join(',')).join('\n');
}

function main() {
  console.log('📊 Exportiere Hero-Stats zu CSV...\n');
  
  const heroes = getAllHeroes();
  console.log(`✓ ${heroes.length} Helden geladen`);
  
  const csv = generateCSV(heroes);
  
  // Stelle sicher, dass das Verzeichnis existiert
  const outputDir = path.dirname(OUTPUT_CSV);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  fs.writeFileSync(OUTPUT_CSV, csv, 'utf-8');
  
  console.log(`✓ CSV gespeichert: ${OUTPUT_CSV}`);
  console.log(`✓ ${STAT_FIELDS.length} Stat-Felder exportiert`);
  console.log('\n📝 Du kannst die CSV jetzt in Excel/Google Sheets/VS Code bearbeiten.');
  console.log('💡 Tipp: Installiere "Rainbow CSV" Extension in VS Code für bessere Lesbarkeit.\n');
}

main();
