import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { computeScoreForScenario } from '../src/utils/rankingScore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const allHeroesDb = JSON.parse(readFileSync(join(__dirname, '../src/data/all_heroes_db.json'), 'utf-8'));

async function analyzeBossDPS() {
  console.log('\n' + '='.repeat(90));
  console.log('BOSS DPS HERO ANALYSIS - % Max HP Damage & Single-Target Specialists');
  console.log('='.repeat(90));
  
  const heroes = Object.values(allHeroesDb);
  
  // Analyze specific DPS heroes known for boss fights
  const bossSpecialists = ['isis', 'anubis', 'nezha', 'set', 'diana', 'horus', 'nyx', 'phoenix', 'yanluo'];
  
  for (const id of bossSpecialists) {
    const hero = allHeroesDb[id];
    if (!hero) continue;
    
    const bossScore = await computeScoreForScenario(hero, 'boss');
    const overallScore = await computeScoreForScenario(hero, 'general');
    
    // Analyze skills for boss-relevant mechanics
    const skillText = hero.skills?.map(s => s.description + ' ' + Object.values(s.upgrades || {}).join(' ')).join(' ').toLowerCase() || '';
    
    const mechanics = {
      maxHpDamage: /(\d+)%\s+(?:of\s+)?(?:the\s+)?target'?s?\s+max\s+hp/i.test(skillText),
      armorPen: /armor\s+pen|penetrat/i.test(skillText),
      singleTarget: /single.{0,20}target|focus.{0,20}target/i.test(skillText),
      atkSpdStacking: /atk\s+spd.{0,50}stack/i.test(skillText),
      critStacking: /crit.{0,50}stack/i.test(skillText),
      damageStacking: /(?:dmg|damage|atk).{0,50}stack/i.test(skillText),
      armorShred: /reduc.{0,20}armor|remov.{0,20}armor/i.test(skillText),
      vulnerability: /vulnerab|increase.{0,20}dmg.{0,20}taken|increas.{0,20}taken/i.test(skillText),
    };
    
    const relicText = hero.relic?.description + ' ' + Object.values(hero.relic?.upgrades || {}).join(' ') || '';
    const relicMechanics = {
      maxHpDamage: /(\d+)%\s+(?:of\s+)?(?:the\s+)?target'?s?\s+max\s+hp/i.test(relicText.toLowerCase()),
      armorPen: /armor\s+pen|penetrat/i.test(relicText.toLowerCase()),
      extraDamage: /additional\s+dmg|extra\s+dmg|bonus\s+dmg/i.test(relicText.toLowerCase()),
    };
    
    console.log(`\n${'='.repeat(90)}`);
    console.log(`${hero.name.toUpperCase()} (${hero.class})`);
    console.log(`${'='.repeat(90)}`);
    console.log(`Ratings: Overall=${hero.ratings?.overall}, PvE=${hero.ratings?.pve}, PvP=${hero.ratings?.pvp}`);
    console.log('\nScenario Scores:');
    console.log(`  Boss:     ${Math.round(bossScore)} ⚔️`);
    console.log(`  Overall:  ${Math.round(overallScore)}`);
    console.log(`  Ratio:    ${(bossScore / overallScore).toFixed(2)}x (${bossScore > overallScore ? 'BOSS SPECIALIST ✓' : 'generalist'})`);
    
    console.log(`\nBase Stats:`);
    console.log(`  ATK:      ${hero.stats?.atk?.toLocaleString() || 0}`);
    console.log(`  CRIT Rate: ${hero.stats?.critRate || 0}%`);
    console.log(`  CRIT DMG:  ${hero.stats?.critDmgBonus || 0}%`);
    
    console.log(`\nBoss-Relevant Mechanics Detected:`);
    const foundMechanics = [];
    if (mechanics.maxHpDamage) foundMechanics.push('✓ MAX HP DAMAGE (critical for bosses!)');
    if (mechanics.armorPen) foundMechanics.push('✓ Armor Penetration');
    if (mechanics.singleTarget) foundMechanics.push('✓ Single-Target Focus');
    if (mechanics.atkSpdStacking) foundMechanics.push('✓ ATK SPD Stacking');
    if (mechanics.critStacking) foundMechanics.push('✓ CRIT Stacking');
    if (mechanics.damageStacking) foundMechanics.push('✓ Damage Stacking');
    if (mechanics.armorShred) foundMechanics.push('✓ Armor Shred');
    if (mechanics.vulnerability) foundMechanics.push('✓ Vulnerability Debuff');
    
    if (foundMechanics.length > 0) {
      foundMechanics.forEach(m => console.log(`  ${m}`));
    } else {
      console.log('  (No special mechanics detected)');
    }
    
    if (relicMechanics.maxHpDamage || relicMechanics.armorPen || relicMechanics.extraDamage) {
      console.log('\nRelic Bonuses:');
      if (relicMechanics.maxHpDamage) console.log('  ✓ Relic adds Max HP damage');
      if (relicMechanics.armorPen) console.log('  ✓ Relic adds Armor Penetration');
      if (relicMechanics.extraDamage) console.log('  ✓ Relic adds Extra Damage');
    }
    
    console.log(`\nSynergies (${hero.synergies?.length || 0}):`);
    console.log(`  ${hero.synergies?.join(', ') || 'none'}`);
    
    // Extract key numbers from skills
    const maxHpMatch = skillText.match(/(\d+)%\s+(?:of\s+)?(?:the\s+)?target'?s?\s+max\s+hp/i);
    if (maxHpMatch) {
      console.log(`\n⚡ MAX HP DAMAGE MULTIPLIER: ${maxHpMatch[1]}% of target's max HP`);
      const capMatch = skillText.match(/up\s+to\s+(\d+)%\s+(?:of\s+(?:her|his|their|its)\s+)?atk/i);
      if (capMatch) {
        console.log(`   Capped at: ${capMatch[1]}% ATK`);
      }
    }
  }
  
  console.log('\n' + '='.repeat(90));
  console.log('PROBLEM ANALYSIS:');
  console.log('='.repeat(90));
  
  console.log('\nISIS CASE STUDY:');
  console.log('  • Has 12% max HP damage (up to 400% ATK cap)');
  console.log('  • Against a 10M HP boss, this is 1.2M damage per hit!');
  console.log('  • With 234k ATK, the 400% cap = 936k damage');
  console.log('  • So against bosses, each hit deals base DMG + 936k bonus');
  console.log('  • With massive ATK SPD stacking (270%+), this is devastating DPS');
  console.log('');
  console.log('CURRENT ISSUES:');
  console.log('  1. % Max HP damage not detected by skill analyzer');
  console.log('  2. ATK SPD stacking undervalued for boss DPS');
  console.log('  3. Single-target focus not rewarded enough');
  console.log('  4. Armor penetration weight too low');
  console.log('');
  console.log('SOLUTION OPTIONS:');
  console.log('  A) Add skill keyword detection for "max HP" damage (HIGH value for boss)');
  console.log('  B) Increase weight for ATK_SPEED self-buff in boss scenario (currently 15)');
  console.log('  C) Increase weight for REMOVES_ARMOR tag (currently 22)');
  console.log('  D) Add bonus multiplier for heroes with high base ATK (234k+)');
  console.log('  E) Detect and reward "stacking" mechanics (compound multipliers)');
  console.log('='.repeat(90) + '\n');
}

analyzeBossDPS().catch(console.error);
