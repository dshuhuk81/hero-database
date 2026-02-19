import fs from 'fs';
import { computeScore } from './src/utils/rankingScore.js';
import { rateHeroSkills } from './src/utils/skillAnalyzer.js';
import { synergyProfileForHero, synergyPotentialForHero } from './src/utils/synergyTags.js';

const heroes = ['hladgunnr', 'isis'];

console.log('=== ANALYSE: STARKE SOLO-HELDEN ===\n');

heroes.forEach(id => {
  const data = JSON.parse(fs.readFileSync(`./src/data/heroes/${id}.json`, 'utf-8'));
  const skillPower = rateHeroSkills(data);
  const synergyPower = synergyPotentialForHero(data);
  const synergies = synergyProfileForHero(data);
  const totalScore = computeScore(data);

  console.log(`\n📊 ${data.name.toUpperCase()}`);
  console.log(`   Rating: ${data.ratings.overall} (PvE: ${data.ratings.pve}, PvP: ${data.ratings.pvp})`);
  console.log(`   Class: ${data.class} | Role: ${data.role}`);
  console.log(`\n   Skill Power: ${skillPower.toFixed(2)}`);
  console.log(`   Synergy Score: ${synergyPower}`);
  console.log(`   Total Ranking Score: ${Math.round(totalScore)}`);
  
  console.log(`\n   Synergies detected: ${synergies.tags.size}`);
  if (synergies.tags.size === 0) {
    console.log(`   ⚠️ KEINE! (Das ist das Problem!)`);
  } else {
    [...synergies.tags].forEach(tag => console.log(`   ✓ ${tag}`));
  }

  // Analyze skills
  console.log(`\n   Skills (${data.skills.length}):`);
  data.skills.forEach((skill, i) => {
    const desc = skill.description.substring(0, 60) + '...';
    console.log(`   ${i + 1}. ${skill.name}`);
  });
});

console.log('\n\n=== PROBLEM ANALYSE ===');
console.log(`
Das Ranking-System berücksichtigt:
✓ Base Stats (HP, ATK, Armor, Res)
✓ Skill Quality (AoE, Damage%, CC, Utility)
✓ Team Synergien (Energy, ATK Speed, Buffs, etc.)

Aber NICHT:
✗ Solo Power (wie stark ohne Team Support)
✗ Practical Usefulness (Matchups, Wave Clear, Boss DMG)
✗ PvE vs PvP specific strengths
✗ Survivability (Tankiness, Evasion, Healing)
✗ "Carry Potential" (kann allein Teams besiegen)

Das ist das Kernproblem mit starken Solo-Helden wie Hladgunnr!
Sie haben wenig Team-Synergien → niedriger Ranking-Score
Aber im Spiel sind sie unglaublich nützlich!
`);
