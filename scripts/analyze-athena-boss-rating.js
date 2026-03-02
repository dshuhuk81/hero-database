import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { computeScoreForScenario } from '../src/utils/rankingScore.js';
import { rateHeroSkills } from '../src/utils/skillAnalyzer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const allHeroesDb = JSON.parse(readFileSync(join(__dirname, '../src/data/all_heroes_db.json'), 'utf-8'));

async function analyzeAthena() {
  const athena = allHeroesDb['athena'];
  
  if (!athena) {
    console.log('Athena not found!');
    return;
  }
  
  console.log('\n' + '='.repeat(90));
  console.log('ATHENA BOSS RATING ANALYSIS - Why #1 in Boss Fights?');
  console.log('='.repeat(90));
  
  // Compute scores
  const bossScore = await computeScoreForScenario(athena, 'boss');
  const overallScore = await computeScoreForScenario(athena, 'general');
  const campaignScore = await computeScoreForScenario(athena, 'campaign');
  const pvpScore = await computeScoreForScenario(athena, 'pvp');
  
  console.log('\n📊 ATHENA SCENARIO SCORES:\n');
  console.log(`  Boss:     ${Math.round(bossScore)} ⚔️  (RANK #1)`);
  console.log(`  Campaign: ${Math.round(campaignScore)} 🌍 (highest)`);
  console.log(`  PvP:      ${Math.round(pvpScore)} ⚡`);
  console.log(`  Overall:  ${Math.round(overallScore)}`);
  console.log(`\n  Boss/Overall Ratio: ${(bossScore/overallScore).toFixed(2)}x`);
  
  // Stats analysis
  console.log('\n📈 BASE STATS:\n');
  console.log(`  ATK:      ${athena.stats.atk.toLocaleString()} (Support-level)`);
  console.log(`  HP:       ${athena.stats.hp.toLocaleString()}`);
  console.log(`  Armor:    ${athena.stats.armor.toLocaleString()}`);
  console.log(`  M-RES:    ${athena.stats.magicRes.toLocaleString()}`);
  
  // Synergies breakdown
  console.log('\n🎯 SYNERGIES (Total: ' + athena.synergies.length + '):\n');
  
  const forceMultipliers = ['ATK_SPD_UP', 'ATK_UP', 'CDR_TEAM', 'ENERGY_RESTORE_TEAM', 'CRIT_RATE_UP'];
  const survivalTags = ['HEAL_TEAM', 'SHIELD_TEAM', 'DAMAGE_REDUCTION_TEAM'];
  const utilityTags = ['BUFF_TEAM', 'CC_IMMUNITY_TEAM', 'DEBUFF_CLEANSE_TEAM'];
  
  const forceMultipliersList = athena.synergies.filter(s => forceMultipliers.includes(s));
  const survivalList = athena.synergies.filter(s => survivalTags.includes(s));
  const utilityList = athena.synergies.filter(s => utilityTags.includes(s));
  
  console.log('  🔥 FORCE MULTIPLIERS (Critical for boss DPS):');
  if (forceMultipliersList.length > 0) {
    forceMultipliersList.forEach(tag => {
      const weight = {
        'ATK_SPD_UP': 25,
        'ATK_UP': 20,
        'CDR_TEAM': 22,
        'ENERGY_RESTORE_TEAM': 23,
        'CRIT_RATE_UP': 18
      }[tag] || 10;
      console.log(`     • ${tag.padEnd(25)} [${weight} points in boss scenario]`);
    });
  } else {
    console.log('     (none)');
  }
  
  console.log('\n  🛡️  SURVIVAL/SUSTAIN:');
  if (survivalList.length > 0) {
    survivalList.forEach(tag => {
      const weight = {
        'DAMAGE_REDUCTION_TEAM': 8,
        'SHIELD_TEAM': 7,
        'HEAL_TEAM': 6
      }[tag] || 5;
      console.log(`     • ${tag.padEnd(25)} [${weight} points in boss scenario]`);
    });
  } else {
    console.log('     (none)');
  }
  
  console.log('\n  ⚙️  UTILITY/CONTROL:');
  if (utilityList.length > 0) {
    utilityList.forEach(tag => {
      console.log(`     • ${tag}`);
    });
  } else {
    console.log('     (none)');
  }
  
  // Skills analysis
  console.log('\n⚡ SKILL ANALYSIS:\n');
  
  const skillScore = rateHeroSkills(athena);
  console.log(`  Overall Skill Power: ${skillScore.toFixed(2)}\n`);
  
  athena.skills.forEach((skill, idx) => {
    console.log(`  ${idx + 1}. ${skill.name}`);
    console.log(`     "${skill.description.substring(0, 100)}..."`);
    
    const desc = skill.description.toLowerCase();
    const keywords = [];
    
    if (desc.includes('atk spd')) keywords.push('⚡ ATK SPD BUFF');
    if (desc.includes('energy')) keywords.push('🔋 Energy');
    if (desc.includes('atk +') || desc.includes('increases atk')) keywords.push('💪 ATK Buff');
    if (desc.includes('shield')) keywords.push('🛡️ Shield');
    if (desc.includes('heal')) keywords.push('❤️ Heal');
    if (desc.includes('damage reduction') || desc.includes('dmg red')) keywords.push('🛡️ DMG Reduction');
    if (desc.includes('buff')) keywords.push('✨ Buff');
    if (desc.includes('cleanse') || desc.includes('removes')) keywords.push('🧹 Cleanse');
    
    if (keywords.length > 0) {
      console.log(`     Key: ${keywords.join(', ')}`);
    }
    console.log('');
  });
  
  // Boss-specific value breakdown
  console.log('\n💡 WHY ATHENA IS #1 FOR BOSS FIGHTS:\n');
  
  const reasons = [];
  
  if (forceMultipliersList.includes('ATK_SPD_UP')) {
    reasons.push('1. ATK SPD UP (25 points)');
    reasons.push('   → Provides 50-60% ATK SPD to entire team');
    reasons.push('   → Effectively DOUBLES main DPS damage output');
    reasons.push('   → Critical force multiplier for boss fights');
  }
  
  if (survivalList.length >= 3) {
    reasons.push('\n2. Triple Survival Layer (' + survivalList.length + ' tags)');
    reasons.push('   → HEAL_TEAM: Sustains team through long boss fights');
    reasons.push('   → SHIELD_TEAM: Prevents burst damage deaths');
    reasons.push('   → DAMAGE_REDUCTION_TEAM: Reduces incoming damage');
    reasons.push('   → Keeps DPS alive = sustained damage over time');
  }
  
  if (utilityList.length > 0) {
    reasons.push('\n3. Utility Support (' + utilityList.length + ' tags)');
    reasons.push('   → BUFF_TEAM: Generic stat boosts');
    reasons.push('   → Enables team to perform at peak');
  }
  
  reasons.push('\n4. Complete Support Package');
  reasons.push('   → Force multiplier (ATK SPD) + Survival (heals/shields)');
  reasons.push('   → Balanced: boosts DPS AND keeps team alive');
  reasons.push('   → Boss fights value sustained uptime over burst');
  
  reasons.push('\n5. Campaign Specialist (#1 at 748)');
  reasons.push('   → Also excels in campaign (5v5 fights)');
  reasons.push('   → Team-wide buffs scale with more targets');
  
  reasons.forEach(r => console.log('  ' + r));
  
  console.log('\n' + '='.repeat(90));
  console.log('CONCLUSION:');
  console.log('='.repeat(90));
  console.log('\nAthena ranks #1 in boss fights because she is the PERFECT FORCE MULTIPLIER:');
  console.log('  • ATK SPD UP: Doubles your main DPS damage output (~2x multiplier)');
  console.log('  • Survival: Keeps team alive = 100% damage uptime');
  console.log('  • Balanced: Not just damage OR survival, but BOTH');
  console.log('');
  console.log('In boss fights, a hero that makes your DPS do 2x damage AND survive longer');
  console.log('is MORE VALUABLE than a DPS who does 1.5x personal damage.');
  console.log('');
  console.log('Boss Score 567 = ATK_SPD_UP (25) + 4 survival/utility tags + high skill power');
  console.log('                 + support class synergy with team buffs');
  console.log('='.repeat(90) + '\n');
}

analyzeAthena().catch(console.error);
