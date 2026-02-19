import fs from 'fs';
import { computeScore } from './src/utils/rankingScore.js';
import { synergyProfileForHero, synergyPotentialForHero } from './src/utils/synergyTags.js';
import { rateHeroSkills, rateSkillDebug } from './src/utils/skillAnalyzer.js';

const diana = JSON.parse(fs.readFileSync('./src/data/heroes/diana.json', 'utf-8'));

console.log('=== DIANA RANKING ANALYSIS ===\n');

// 1. Score Breakdown
const totalScore = computeScore(diana);
const skillPower = rateHeroSkills(diana);
const synergyScore = synergyPotentialForHero(diana);

const s = diana.stats ?? {};
const hp = Number(s.hp ?? 0);
const atk = Number(s.atk ?? 0);
const armor = Number(s.armor ?? 0);
const mres = Number(s.magicRes ?? 0);

console.log('📊 SCORE BREAKDOWN:');
console.log(`  Total Score: ${Math.round(totalScore * 100) / 100}`);
console.log(`  Skill Power: ${Math.round(skillPower * 100) / 100}`);
console.log(`  Synergy Potential: ${synergyScore}`);
console.log(`\n📈 BASE STATS:`);
console.log(`  HP: ${hp.toLocaleString()}`);
console.log(`  ATK: ${atk.toLocaleString()}`);
console.log(`  Armor: ${armor}`);
console.log(`  Magic Res: ${mres}`);

// 2. Skills Analysis
console.log(`\n⚔️ SKILLS (${diana.skills.length}):`);
diana.skills.forEach((skill, i) => {
  const debug = rateSkillDebug(skill, i === diana.skills.length - 1);
  console.log(`  ${i + 1}. ${debug.name}: Score=${debug.finalScore}`);
  if (debug.dmgMultiplier > 0) console.log(`     └─ Damage: ${debug.dmgMultiplier}% ATK`);
  if (debug.isAoE) console.log(`     └─ AoE damage`);
  if (debug.ccCount > 0) console.log(`     └─ CC Effects: ${debug.ccCount}`);
  if (debug.utilityCount > 0) console.log(`     └─ Utility: ${debug.utilityCount}`);
});

// 3. Synergies
const synProf = synergyProfileForHero(diana);
console.log(`\n🤝 SYNERGIES:`);
if (synProf.tags.size === 0) {
  console.log(`  None detected`);
} else {
  synProf.tags.forEach(tag => {
    console.log(`  ✓ ${tag}`);
  });
}

// 4. Ratings
console.log(`\n⭐ RATINGS:`);
console.log(`  Overall: ${diana.ratings.overall}`);
console.log(`  PVE: ${diana.ratings.pve}`);
console.log(`  PVP: ${diana.ratings.pvp}`);
