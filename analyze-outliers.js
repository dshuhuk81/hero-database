import fs from 'fs';
import { computeScore, computeScoreForScenario } from './src/utils/rankingScore.js';
import { synergyPotentialForHero, synergyProfileForHero } from './src/utils/synergyTags.js';
import { rateHeroSkills } from './src/utils/skillAnalyzer.js';

const heroesData = JSON.parse(fs.readFileSync('./src/data/all_heroes_db.json', 'utf-8'));
const heroes = Object.values(heroesData);

async function analyzeOutlier(heroName) {
  const hero = heroes.find(h => h.name.toLowerCase() === heroName.toLowerCase());
  if (!hero) {
    console.log(`❌ Hero "${heroName}" not found`);
    return;
  }
  
  console.log('\n═══════════════════════════════════════════════════════════════════════════════');
  console.log(`🔍 DEEP DIVE: ${hero.name}`);
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');
  
  console.log(`📋 Basic Info:`);
  console.log(`   Class: ${hero.class} | Role: ${hero.role} | Rarity: ${hero.rarity}`);
  console.log(`   PvP Tier: ${hero.ratings?.pvp || 'N/A'} | PvE Tier: ${hero.ratings?.pve || 'N/A'} | Overall Tier: ${hero.ratings?.overall || 'N/A'}`);
  
  const overallScore = await computeScore(hero);
  const pvpScore = await computeScoreForScenario(hero, 'pvp');
  const bossScore = await computeScoreForScenario(hero, 'boss');
  const campaignScore = await computeScoreForScenario(hero, 'campaign');
  
  console.log(`\n📊 Scores:`);
  console.log(`   Overall:  ${overallScore.toFixed(1)}`);
  console.log(`   PvP:      ${pvpScore.toFixed(1)}`);
  console.log(`   Boss:     ${bossScore.toFixed(1)}`);
  console.log(`   Campaign: ${campaignScore.toFixed(1)}`);
  
  const synergyPotential = await synergyPotentialForHero(hero);
  const synergyProfile = await synergyProfileForHero(hero);
  const skillPower = rateHeroSkills(hero);
  
  console.log(`\n🧩 Component Scores:`);
  console.log(`   Synergy Potential: ${synergyPotential.toFixed(1)}`);
  console.log(`   Skill Power:       ${skillPower.toFixed(2)}`);
  console.log(`   Synergy Tags:      ${synergyProfile.tags.size} (${Array.from(synergyProfile.tags).join(', ')})`);
  
  console.log(`\n📈 Stats:`);
  const s = hero.stats || {};
  console.log(`   HP:       ${s.hp?.toLocaleString() || 0}`);
  console.log(`   ATK:      ${s.atk?.toLocaleString() || 0}`);
  console.log(`   Armor:    ${s.armor?.toLocaleString() || 0}`);
  console.log(`   Magic Res: ${s.magicRes?.toLocaleString() || 0}`);
  console.log(`   Crit Rate: ${s.critRate || 0}%`);
  console.log(`   Crit DMG:  ${s.critDmgBonus || 0}%`);
  console.log(`   ATK Speed: ${s.atkSpdBonus || 0}%`);
  
  console.log(`\n⚡ Skills:`);
  (hero.skills || []).forEach((skill, idx) => {
    console.log(`   ${idx + 1}. ${skill.name || 'Unnamed'}`);
    if (skill.description) {
      const desc = skill.description.substring(0, 100);
      console.log(`      ${desc}${skill.description.length > 100 ? '...' : ''}`);
    }
  });
  
  console.log('\n═══════════════════════════════════════════════════════════════════════════════\n');
}

async function compareHeroes() {
  console.log('🔍 Comparing Key Outliers\n');
  
  // Compare SS tier heroes: Anubis (high score) vs Heracles (low score)
  await analyzeOutlier('Demeter');  // B tier but ranks #3!
  await analyzeOutlier('Athena');    // S tier, ranks #1
  await analyzeOutlier('Zeus');      // SSS tier but ranks #50!
  await analyzeOutlier('Nyx');       // SSS tier, ranks #19
}

compareHeroes().catch(console.error);
