import fs from 'fs';
import { detectSynergyTags } from './src/utils/synergyTags.js';

const yanluo = JSON.parse(fs.readFileSync('./src/data/heroes/yanluo.json', 'utf-8'));

console.log('=== YANLUO Synergy Analysis ===\n');
console.log('Skills:');
yanluo.skills.forEach((skill, i) => {
  console.log(`  ${i + 1}. ${skill.name}: "${skill.description.substring(0, 70)}..."`);
});

console.log('\nRelic:');
console.log(`  ${yanluo.relic.name}: "${yanluo.relic.description}"`);

console.log('\n\nDetected Synergy Tags:');
const tags = detectSynergyTags(yanluo);
tags.forEach(tag => console.log(`  - ${tag}`));
