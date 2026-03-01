import fs from 'fs';
import { computeScore, computeScoreForScenario } from './src/utils/rankingScore.js';

// Load heroes from all_heroes_db.json (it's an object, convert to array)
const heroesData = JSON.parse(fs.readFileSync('./src/data/all_heroes_db.json', 'utf-8'));
const heroes = Object.values(heroesData);

// Tier to numeric mapping for comparison
const TIER_VALUES = {
  'F': 0,
  'D': 1,
  'C': 2,
  'B': 3,
  'A': 4,
  'S': 5,
  'SS': 6,
  'SSS': 7,
};

async function validatePvPRatings() {
  console.log('🔍 Validating PvP Scenario Ratings vs PvP Tiers...\n');
  
  const results = [];
  
  for (const hero of heroes) {
    const pvpTier = hero.ratings?.pvp || 'N/A';
    const pvpTierValue = TIER_VALUES[pvpTier] ?? -1;
    
    const overallScore = await computeScore(hero);
    const pvpScore = await computeScoreForScenario(hero, 'pvp');
    const bossScore = await computeScoreForScenario(hero, 'boss');
    const campaignScore = await computeScoreForScenario(hero, 'campaign');
    
    results.push({
      name: hero.name,
      class: hero.class,
      role: hero.role,
      pvpTier,
      pvpTierValue,
      overallScore,
      pvpScore,
      bossScore,
      campaignScore,
      scoreDelta: pvpScore - overallScore,
    });
  }
  
  // Sort by PvP score descending
  results.sort((a, b) => b.pvpScore - a.pvpScore);
  
  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('📊 TOP 20 PVP SCENARIO RANKINGS vs TIER LIST');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');
  
  results.slice(0, 20).forEach((r, idx) => {
    const tierIcon = getTierIcon(r.pvpTier);
    const match = r.pvpTierValue >= 5 ? '✅' : r.pvpTierValue >= 4 ? '⚠️' : '❌';
    
    console.log(`${(idx + 1).toString().padStart(2)}. ${r.name.padEnd(15)} | PvP: ${Math.round(r.pvpScore).toString().padStart(3)} | Tier: ${tierIcon.padEnd(4)} ${match}`);
    console.log(`    Boss: ${Math.round(r.bossScore).toString().padStart(3)} | Campaign: ${Math.round(r.campaignScore).toString().padStart(3)} | Overall: ${Math.round(r.overallScore).toString().padStart(3)}`);
    console.log(`    Class: ${r.class.padEnd(9)} | Role: ${r.role}`);
    console.log('');
  });
  
  console.log('\n═══════════════════════════════════════════════════════════════════════════════');
  console.log('🔴 POTENTIAL OUTLIERS (High Score but Low Tier or Vice Versa)');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');
  
  // Find outliers: top 20 PvP scores that have tier B or below
  const topScoresLowTier = results
    .filter(r => r.pvpTierValue <= 3 && r.pvpTierValue >= 0) // B, C, D, F
    .slice(0, 15);
  
  topScoresLowTier.forEach((r, idx) => {
    const rank = results.findIndex(h => h.name === r.name) + 1;
    console.log(`❗ ${r.name.padEnd(15)} - PvP Score: ${Math.round(r.pvpScore)} (Rank #${rank})`);
    console.log(`   Current Tier: ${r.pvpTier} | Class: ${r.class} | Role: ${r.role}`);
    console.log(`   Boss: ${Math.round(r.bossScore)} | Campaign: ${Math.round(r.campaignScore)} | Overall: ${Math.round(r.overallScore)}`);
    console.log('');
  });
  
  console.log('\n═══════════════════════════════════════════════════════════════════════════════');
  console.log('🔵 HIGH-TIER HEROES WITH LOW PVP SCORES');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');
  
  // Find SSS/SS tier heroes ranking poorly in PvP score
  const highTierLowScore = results
    .filter(r => r.pvpTierValue >= 6) // SS, SSS
    .sort((a, b) => a.pvpScore - b.pvpScore)
    .slice(0, 10);
  
  highTierLowScore.forEach((r, idx) => {
    const rank = results.findIndex(h => h.name === r.name) + 1;
    console.log(`⚠️  ${r.name.padEnd(15)} - PvP Score: ${Math.round(r.pvpScore)} (Rank #${rank})`);
    console.log(`   Current Tier: ${r.pvpTier} | Class: ${r.class} | Role: ${r.role}`);
    console.log(`   Boss: ${Math.round(r.bossScore)} | Campaign: ${Math.round(r.campaignScore)} | Overall: ${Math.round(r.overallScore)}`);
    console.log('');
  });
  
  console.log('\n═══════════════════════════════════════════════════════════════════════════════');
  console.log('📈 SCENARIO SCORE DISTRIBUTION ANALYSIS');
  console.log('═══════════════════════════════════════════════════════════════════════════════\n');
  
  // Analyze correlations
  const avgOverall = results.reduce((sum, r) => sum + r.overallScore, 0) / results.length;
  const avgPvP = results.reduce((sum, r) => sum + r.pvpScore, 0) / results.length;
  const avgBoss = results.reduce((sum, r) => sum + r.bossScore, 0) / results.length;
  const avgCampaign = results.reduce((sum, r) => sum + r.campaignScore, 0) / results.length;
  
  console.log(`Average Overall Score:  ${avgOverall.toFixed(1)}`);
  console.log(`Average PvP Score:      ${avgPvP.toFixed(1)} (${((avgPvP / avgOverall - 1) * 100).toFixed(1)}% vs overall)`);
  console.log(`Average Boss Score:     ${avgBoss.toFixed(1)} (${((avgBoss / avgOverall - 1) * 100).toFixed(1)}% vs overall)`);
  console.log(`Average Campaign Score: ${avgCampaign.toFixed(1)} (${((avgCampaign / avgOverall - 1) * 100).toFixed(1)}% vs overall)`);
  
  console.log('\n✅ Validation complete!\n');
}

function getTierIcon(tier) {
  const icons = {
    'SSS': '🏆',
    'SS': '💎',
    'S': '⭐',
    'A': '🔷',
    'B': '🟦',
    'C': '🔹',
    'D': '⚪',
    'F': '❌',
  };
  return `${icons[tier] || '?'} ${tier}`;
}

validatePvPRatings().catch(console.error);
