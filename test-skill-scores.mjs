import fs from 'fs';
import { computeScore, SKILL_WEIGHT } from './src/utils/rankingScore.js';
import { rateHeroSkills } from './src/utils/skillAnalyzer.js';

const heroFiles = ['zeus', 'artemis', 'pan', 'yanluo', 'poseidon'];
const heroes = {};

heroFiles.forEach(id => {
  try {
    const data = JSON.parse(fs.readFileSync(`./src/data/heroes/${id}.json`, 'utf-8'));
    const skillPower = rateHeroSkills(data);
    const totalScore = computeScore(data);
    heroes[id] = {
      name: data.name,
      skillPower,
      skillContribution: skillPower * SKILL_WEIGHT,
      totalScore: Math.round(totalScore * 100) / 100
    };
  } catch(e) {
    console.error(`Error with ${id}:`, e.message);
  }
});

console.log('Hero'.padEnd(15) + 'Skills'.padEnd(10) + 'Skill Contrib.'.padEnd(18) + 'Total Score');
console.log('-'.repeat(60));
Object.entries(heroes)
  .sort((a, b) => b[1].totalScore - a[1].totalScore)
  .forEach(([id, h]) => {
    console.log(
      h.name.padEnd(15) + 
      h.skillPower.toString().padEnd(10) + 
      h.skillContribution.toFixed(2).padEnd(18) + 
      h.totalScore
    );
  });
