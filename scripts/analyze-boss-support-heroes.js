import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { computeScoreForScenario } from '../src/utils/rankingScore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const allHeroesDb = JSON.parse(readFileSync(join(__dirname, '../src/data/all_heroes_db.json'), 'utf-8'));

const targetHeroes = ['dionysus', 'yuelao', 'caishen'];

async function analyze() {
  console.log('='.repeat(70));
  console.log('BOSS SUPPORT HERO ANALYSIS');
  console.log('='.repeat(70));
  
  for (const id of targetHeroes) {
    const hero = allHeroesDb[id];
    if (!hero) {
      console.log(`\n❌ Hero ${id} not found`);
      continue;
    }
    
    const bossScore = await computeScoreForScenario(hero, 'boss');
    const overallScore = await computeScoreForScenario(hero, 'general');
    const campaignScore = await computeScoreForScenario(hero, 'campaign');
    const pvpScore = await computeScoreForScenario(hero, 'pvp');
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`${hero.name.toUpperCase()} (${hero.class})`);
    console.log(`${'='.repeat(70)}`);
    console.log(`Ratings: Overall=${hero.ratings?.overall}, PvE=${hero.ratings?.pve}, PvP=${hero.ratings?.pvp}`);
    console.log('\nScenario Scores:');
    console.log(`  Overall:  ${Math.round(overallScore)}`);
    console.log(`  Boss:     ${Math.round(bossScore)} ⚔️`);
    console.log(`  Campaign: ${Math.round(campaignScore)} 🌍`);
    console.log(`  PvP:      ${Math.round(pvpScore)} ⚡`);
    
    console.log(`\nSynergies (${hero.synergies?.length || 0} total):`);
    if (hero.synergies && hero.synergies.length > 0) {
      const teamSupport = hero.synergies.filter(s => s.includes('_TEAM'));
      const selfBuffs = hero.synergies.filter(s => !s.includes('_TEAM'));
      console.log(`  Team Support (${teamSupport.length}): ${teamSupport.join(', ')}`);
      console.log(`  Self/Other (${selfBuffs.length}): ${selfBuffs.join(', ')}`);
    }
    
    console.log(`\nKey Skills:`);
    if (hero.skills) {
      hero.skills.forEach((skill, idx) => {
        const desc = skill.description || '';
        const keywords = [];
        if (desc.includes('ATK SPD')) keywords.push('ATK SPD');
        if (desc.includes('Energy')) keywords.push('Energy');
        if (desc.includes('ATK +') || desc.includes('increases ATK')) keywords.push('ATK Buff');
        if (desc.includes('CRIT')) keywords.push('Crit Buff');
        if (desc.includes('DMG RED') || desc.includes('DMG by')) keywords.push('DMG Amp/Red');
        if (desc.includes('CD -') || desc.includes('cooldown')) keywords.push('CDR');
        if (keywords.length > 0) {
          console.log(`  ${idx + 1}. ${skill.name}: [${keywords.join(', ')}]`);
        }
      });
    }
    
    console.log(`\nStats:`);
    console.log(`  ATK: ${hero.stats?.atk || 0}`);
    console.log(`  HP:  ${hero.stats?.hp || 0}`);
  }
  
  console.log(`\n${'='.repeat(70)}`);
  console.log('PROBLEM ANALYSIS:');
  console.log('='.repeat(70));
  console.log('These heroes provide massive DPS multiplication for boss fights through:');
  console.log('- ATK buffs (20-25%)');
  console.log('- ATK SPD buffs (50-60%)');
  console.log('- Energy sustain (enabling more ultimates)');
  console.log('- CDR (more skill rotations)');
  console.log('- CRIT buffs (increased burst damage)');
  console.log('');
  console.log('Current Boss Scenario Config:');
  console.log('  synergies: 0.4x (heavily de-weighted)');
  console.log('  skills: 1.5x (favors direct damage)');
  console.log('');
  console.log('ISSUE: The 0.4x synergy weight treats support heroes as "weak" for boss');
  console.log('fights, but in reality they are FORCE MULTIPLIERS - a 50% ATK SPD buff on');
  console.log('your main DPS effectively doubles their damage output!');
  console.log('');
  console.log('SOLUTION: Boss scenario needs to differentiate between:');
  console.log('  1. FORCE MULTIPLIER tags (ATK_SPD_UP, ATK_UP, CRIT_RATE_UP, CDR_TEAM, ENERGY_RESTORE_TEAM)');
  console.log('  2. Generic support tags (HEAL_TEAM, SHIELD_TEAM, etc.)');
  console.log('');
  console.log('Force multiplier tags should receive HIGH weight (1.5-2.0x) in boss fights');
  console.log('because they directly amplify your carry\'s damage output.');
}

analyze().catch(console.error);
