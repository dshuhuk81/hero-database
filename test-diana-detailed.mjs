import fs from 'fs';
import { computeScore, SKILL_WEIGHT, SYNERGY_WEIGHT, PERCENT_STAT_WEIGHT } from './src/utils/rankingScore.js';
import { rateHeroSkills } from './src/utils/skillAnalyzer.js';
import { synergyPotentialForHero } from './src/utils/synergyTags.js';

const diana = JSON.parse(fs.readFileSync('./src/data/heroes/diana.json', 'utf-8'));

console.log('=== DIANA SCORE COMPONENTS ===\n');
console.log('WEIGHTS:');
console.log(`  PERCENT_STAT_WEIGHT: ${PERCENT_STAT_WEIGHT}`);
console.log(`  SYNERGY_WEIGHT: ${SYNERGY_WEIGHT}`);
console.log(`  SKILL_WEIGHT: ${SKILL_WEIGHT}\n`);

const skillPower = rateHeroSkills(diana);
const synergyScore = synergyPotentialForHero(diana);

console.log('DIANA COMPONENTS:');
console.log(`  Skill Power: ${skillPower}`);
console.log(`  Skill Contribution (× ${SKILL_WEIGHT}): ${Math.round(skillPower * SKILL_WEIGHT * 100) / 100}`);
console.log(`  Synergy Score: ${synergyScore}`);
console.log(`  Synergy Contribution (× ${SYNERGY_WEIGHT}): ${Math.round(synergyScore * SYNERGY_WEIGHT * 100) / 100}`);

const totalScore = computeScore(diana);
console.log(`\nTotal Score: ${Math.round(totalScore * 100) / 100}`);

// Compare with Zeus
const zeus = JSON.parse(fs.readFileSync('./src/data/heroes/zeus.json', 'utf-8'));
const zeusSkillPower = rateHeroSkills(zeus);
const zeusScore = computeScore(zeus);
console.log(`\nZEUS for comparison:`);
console.log(`  Skill Power: ${zeusSkillPower}`);
console.log(`  Total Score: ${Math.round(zeusScore * 100) / 100}`);
