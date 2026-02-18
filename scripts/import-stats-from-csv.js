#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HEROES_DIR = path.join(__dirname, '../src/data/heroes');
const INPUT_CSV = path.join(__dirname, '../src/data/stats/hero-stats.csv');

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

function parseCSV(csvContent) {
  const lines = csvContent.trim().split('\n');
  
  if (lines.length < 2) {
    throw new Error('CSV ist leer oder hat keine Daten');
  }
  
  const headers = lines[0].split(',').map(h => h.trim());
  
  // Finde die Indizes der Stat-Felder
  const idIndex = headers.indexOf('id');
  const statIndices = {};
  
  for (const field of STAT_FIELDS) {
    const idx = headers.indexOf(field);
    if (idx !== -1) {
      statIndices[field] = idx;
    }
  }
  
  const heroStats = {};
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(',').map(v => v.trim());
    const heroId = values[idIndex];
    
    if (!heroId) continue;
    
    const stats = {};
    for (const [field, idx] of Object.entries(statIndices)) {
      const value = values[idx];
      // Konvertiere zu Number, behalte aber 0 bei
      stats[field] = value === '' || value === undefined ? 0 : Number(value);
    }
    
    heroStats[heroId] = stats;
  }
  
  return heroStats;
}

function updateHeroJSON(heroId, newStats) {
  const filepath = path.join(HEROES_DIR, `${heroId}.json`);
  
  if (!fs.existsSync(filepath)) {
    console.warn(`⚠️  Hero-Datei nicht gefunden: ${heroId}.json`);
    return false;
  }
  
  try {
    const data = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    
    // Merge neue Stats in existierende
    if (!data.stats) {
      data.stats = {};
    }
    
    Object.assign(data.stats, newStats);
    
    // Schreibe formatiert zurück (2 Spaces)
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
    
    return true;
  } catch (err) {
    console.error(`❌ Fehler beim Update von ${heroId}.json:`, err.message);
    return false;
  }
}

function main() {
  console.log('📥 Importiere Stats aus CSV...\n');
  
  if (!fs.existsSync(INPUT_CSV)) {
    console.error(`❌ CSV-Datei nicht gefunden: ${INPUT_CSV}`);
    console.log('💡 Führe zuerst "node scripts/export-stats-to-csv.js" aus.');
    process.exit(1);
  }
  
  const csvContent = fs.readFileSync(INPUT_CSV, 'utf-8');
  const heroStats = parseCSV(csvContent);
  
  console.log(`✓ ${Object.keys(heroStats).length} Helden aus CSV gelesen`);
  
  let updated = 0;
  let failed = 0;
  
  for (const [heroId, stats] of Object.entries(heroStats)) {
    if (updateHeroJSON(heroId, stats)) {
      updated++;
    } else {
      failed++;
    }
  }
  
  console.log('\n📊 Ergebnis:');
  console.log(`  ✓ ${updated} Helden aktualisiert`);
  if (failed > 0) {
    console.log(`  ⚠️  ${failed} Fehler`);
  }
  
  console.log('\n✅ Stats-Import abgeschlossen!\n');
}

main();
