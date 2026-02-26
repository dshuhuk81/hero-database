import { heroes } from './src/data/heroes/index.js';
import { computeScore } from './src/utils/rankingScore.js';
import { rateHeroSkills } from './src/utils/skillAnalyzer.js';
import { synergyPotentialForHero } from './src/utils/synergyTags.js';

console.log('=== RANKING DEBUG: ZEUS vs LEO vs VIRGO ===\n');

const heroIds = ['zeus', 'leo', 'virgo'];
const heroData = [];

for (const id of heroIds) {
  const hero = heroes.find(h => h.id === id);
  if (!hero) {
    console.log(`${id}: NOT FOUND`);
    continue;
  }

  const skillPower = rateHeroSkills(hero);
  const synergy = await synergyPotentialForHero(hero);
  const totalScore = await computeScore(hero);
  
  const stats = hero.stats || {};
  const hp = Number(stats.hp ?? 0);
  const atk = Number(stats.atk ?? 0);
  const armor = Number(stats.armor ?? 0);
  const mres = Number(stats.magicRes ?? 0);
  
  heroData.push({
    id,
    name: hero.name,
    class: hero.class,
    rating: hero.ratings?.overall || 'N/A',
    level: hero.level,
    hp,
    atk,
    totalDef: armor + mres,
    skillPower,
    synergy: Math.round(synergy),
    totalScore: Math.round(totalScore)
  });
}

// Sort and show
heroData.sort((a, b) => b.totalScore - a.totalScore);

console.log('HERO\t\t| CLASS\t\t| RATING\t| LEVEL\t| ATK\t\t| HP\t\t| SKILL_PWR\t| SYNERGY\t| TOTAL_SCORE');
console.log('─'.repeat(130));

heroData.forEach((h, idx) => {
  console.log(
    h.name.padEnd(15) + '| ' +
    h.class.padEnd(15) + '| ' +
    (h.rating || 'N/A').padEnd(7) + '\t| ' +
    h.level.toString().padEnd(5) + '| ' +
    h.atk.toLocaleString().padEnd(15) + '| ' +
    h.hp.toLocaleString().padEnd(15) + '| ' +
    h.skillPower.toFixed(2).padEnd(15) + '| ' +
    h.synergy.toString().padEnd(15) + '| ' +
    h.totalScore.toString()
  );
});

console.log('\n=== KEY OBSERVATIONS ===');
console.log('Zeus in-game: S/SS tier (meta-defining)');
console.log('Leo in-game: B tier (not meta)');
console.log('Virgo in-game: C tier (weak)');
console.log('\nPredicted ranks based on current algorithm:');

const allHeroes = await Promise.all([...heroes].map(async h => {
  const score = await computeScore(h);
  return { id: h.id, name: h.name, score };
}));

allHeroes.sort((a, b) => b.score - a.score);
const zeusRank = allHeroes.findIndex(h => h.id === 'zeus') + 1;
const leoRank = allHeroes.findIndex(h => h.id === 'leo') + 1;
const virgoRank = allHeroes.findIndex(h => h.id === 'virgo') + 1;

console.log('Zeus rank: #' + zeusRank + ' (SHOULD BE TOP 5)');
console.log('Leo rank: #' + leoRank + ' (SHOULD BE LOWER)');
console.log('Virgo rank: #' + virgoRank + ' (SHOULD BE LOWER)');

console.log('\n=== HYPOTHESIS ===');
console.log('1. Raw stats (HP/ATK) might be weighted too high for stat-stacking heroes');
console.log('2. Skill power might be underweighting complex ultimate heroes like Zeus');
console.log('3. Level normalization might be too harsh');
console.log('4. Need to adjust SKILL_WEIGHT, SYNERGY_WEIGHT or stat multipliers');
