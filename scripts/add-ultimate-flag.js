// Script to add "isUltimate: true" to skill_1 in all hero JSON files
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const heroesDir = path.join(__dirname, '../src/data/heroes');

// Get all hero JSON files
const heroFiles = fs.readdirSync(heroesDir).filter(file => file.endsWith('.json'));

console.log(`Found ${heroFiles.length} hero files to process...\n`);

let updated = 0;
let skipped = 0;
let errors = 0;

heroFiles.forEach(file => {
  const filePath = path.join(heroesDir, file);
  
  try {
    // Read the hero file
    const heroData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Check if hero has skills
    if (!heroData.skills || !Array.isArray(heroData.skills) || heroData.skills.length === 0) {
      console.log(`⚠️  ${file}: No skills array found, skipping`);
      skipped++;
      return;
    }
    
    // Find skill_1
    const skill1 = heroData.skills.find(skill => skill.id === 'skill_1');
    
    if (!skill1) {
      console.log(`⚠️  ${file}: No skill_1 found, skipping`);
      skipped++;
      return;
    }
    
    // Check if isUltimate already exists
    if (skill1.hasOwnProperty('isUltimate')) {
      console.log(`✓  ${file}: Already has isUltimate field (${skill1.isUltimate}), skipping`);
      skipped++;
      return;
    }
    
    // Add isUltimate flag
    skill1.isUltimate = true;
    
    // Write back to file with proper formatting
    fs.writeFileSync(filePath, JSON.stringify(heroData, null, 2) + '\n', 'utf8');
    
    console.log(`✓  ${file}: Added isUltimate to ${skill1.name}`);
    updated++;
    
  } catch (error) {
    console.error(`❌ ${file}: Error - ${error.message}`);
    errors++;
  }
});

console.log(`\n${'='.repeat(60)}`);
console.log(`Summary:`);
console.log(`  Updated: ${updated}`);
console.log(`  Skipped: ${skipped}`);
console.log(`  Errors:  ${errors}`);
console.log(`${'='.repeat(60)}`);
