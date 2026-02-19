import fs from 'fs';
import { computeScore } from './src/utils/rankingScore.js';
import { rateHeroSkills } from './src/utils/skillAnalyzer.js';
import { synergyPotentialForHero } from './src/utils/synergyTags.js';

const heroes = ['zeus', 'diana', 'artemis', 'pan', 'yanluo', 'poseidon', 'demeter'];
const results = [];

heroes.forEach(id => {
  try {
    const data = JSON.parse(fs.readFileSync(`./src/data/heroes/${id}.json`, 'utf-8'));
    const skillPower = rateHeroSkills(data);
    const synergyPower = synergyPotentialForHero(data);
    const totalScore = computeScore(data);
    
    results.push({
      name: data.name,
      class: data.class,
      skills: skillPower,
      synergy: synergyPower,
      total: totalScore
    });
  } catch(e) {}
});

// Sort by total score
results.sort((a,b) => b.total - a.total);

console.log('\nHERO RANKING WITH NEW WEIGHTS:\n');
console.log('Rank | Name'.padEnd(20) + '| Class'.padEnd(15) + '| Skills | Synergy | Total');
console.log('-'.repeat(80));

results.forEach((h, i) => {
  console.log(
    `${String(i+1).padEnd(5)}| ${h.name.padEnd(19)}| ${h.class.padEnd(14)}| ${h.skills.toFixed(2).padEnd(7)} | ${String(h.synergy).padEnd(7)} | ${Math.round(h.total)}`
  );
});
