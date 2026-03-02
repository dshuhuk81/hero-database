import { computeScoreForScenario } from './src/utils/rankingScore.js';
import { rateHeroSkills } from './src/utils/skillAnalyzer.js';
import { synergyProfileForHero } from './src/utils/synergyTags.js';
import { getScenarioConfig } from './src/utils/scenarios.js';
import { readFileSync } from 'fs';

const allHeroesDb = JSON.parse(readFileSync('./src/data/all_heroes_db.json', 'utf-8'));
const heroes = Object.values(allHeroesDb);
const bastet = allHeroesDb['bastet'];

console.log('=== BASTET ANALYSIS ===\n');
console.log('Class:', bastet.class);
console.log('Role:', bastet.role);
console.log('Synergy Tags:', bastet.synergies.join(', '));
console.log('\n=== SKILLS ===');
bastet.skills.forEach((skill, i) => {
  console.log(`${i+1}. ${skill.name}: ${skill.description}`);
});
if (bastet.relic) {
  console.log(`Relic: ${bastet.relic.name}: ${bastet.relic.description}`);
}

console.log('\n=== SKILL ANALYZER OUTPUT ===');
const skillAnalysis = rateHeroSkills(bastet);
console.log('Score:', skillAnalysis.score?.toFixed(1) ?? 'N/A');
console.log('Boss relevance:', skillAnalysis.bossRelevance?.toFixed(2) ?? 'N/A');
console.log('PvP relevance:', skillAnalysis.pvpRelevance?.toFixed(2) ?? 'N/A');
console.log('Max HP damage:', skillAnalysis.maxHpDamage ?? 'none');
console.log('Detected tags:', skillAnalysis.detectedTags ?? []);

console.log('\n=== SYNERGY PROFILE ===');
const synergyProfile = await synergyProfileForHero(bastet);
console.log('Profile:', synergyProfile);

console.log('\n=== BOSS SCENARIO CONFIG ===');
const bossScenario = getScenarioConfig('boss');
console.log('Specific tag weights:', JSON.stringify(bossScenario.specificTagWeights, null, 2));

console.log('\n=== ALL SCENARIO SCORES ===');
const bossScore = await computeScoreForScenario(bastet, 'boss');
const campaignScore = await computeScoreForScenario(bastet, 'campaign');
const pvpScore = await computeScoreForScenario(bastet, 'pvp');
console.log('Boss Score:', bossScore.toFixed(1));
console.log('Campaign Score:', campaignScore.toFixed(1));
console.log('PvP Score:', pvpScore.toFixed(1));
console.log('Highest:', bossScore > campaignScore && bossScore > pvpScore ? 'BOSS' : 
            campaignScore > pvpScore ? 'CAMPAIGN' : 'PVP');

console.log('\n=== COMPARISON TO OTHER HEROES ===');
const allScores = await Promise.all(
  heroes.map(async h => ({
    name: h.name,
    id: h.id,
    score: await computeScoreForScenario(h, 'boss'),
    class: h.class,
    synergies: h.synergies
  }))
);
allScores.sort((a, b) => b.score - a.score);
const bastetRank = allScores.findIndex(h => h.name === 'Bastet') + 1;
console.log(`Bastet ranks #${bastetRank} out of ${allScores.length} heroes for boss scenarios`);
console.log('\nTop 10 boss heroes:');
allScores.slice(0, 10).forEach((h, i) => {
  console.log(`${i+1}. ${h.name} (${h.class}): ${h.score.toFixed(1)}`);
});

console.log('\n=== HOW PAGE WILL DISPLAY ===');
console.log('Best For Badge: ⚔️ Boss (#' + bastetRank + ' of ' + heroes.length + ')');
console.log('\nScenario Breakdown:');
const campaignScores = await Promise.all(heroes.map(async h => ({ name: h.name, score: await computeScoreForScenario(h, 'campaign') })));
const pvpScores = await Promise.all(heroes.map(async h => ({ name: h.name, score: await computeScoreForScenario(h, 'pvp') })));
campaignScores.sort((a,b) => b.score - a.score);
pvpScores.sort((a,b) => b.score - a.score);
const bastetCampaignRank = campaignScores.findIndex(h => h.name === 'Bastet') + 1;
const bastetPvpRank = pvpScores.findIndex(h => h.name === 'Bastet') + 1;
console.log('⚔️  Boss:     365 (#' + bastetRank + ')');
console.log('🌍 Campaign: 256 (#' + bastetCampaignRank + ')');
console.log('⚡ PvP:      344 (#' + bastetPvpRank + ')');
console.log('\nINTERPRETATION: Now users can see she\'s #43/62 for bosses - below average!');

console.log('\n=== BASTET\'S TAGS EVALUATED IN BOSS SCENARIO ===');
bastet.synergies.forEach(tag => {
  const weight = bossScenario.specificTagWeights[tag];
  if (weight) {
    console.log(`${tag}: ${weight} (Boss-relevant)`);
  } else {
    console.log(`${tag}: 0 (Not valued in boss scenario)`);
  }
});
