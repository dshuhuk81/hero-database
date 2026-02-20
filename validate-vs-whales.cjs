const fs = require('fs');
const path = require('path');

// Load allHeroesDb for ratings
const allHeroesDb = JSON.parse(fs.readFileSync('src/data/all_heroes_db.json', 'utf-8'));

// Top 20 from check-rankings.cjs
const top20Names = [
  'Geb', 'Prometheus', 'Set', 'Hladgunnr', 'Momus', 
  'Nyx', 'Anubis', 'Khepri', 'Jormungandr', 'Athena',
  'Nuwa', 'Demeter', 'Nezha', 'Dionysus', 'Freya',
  'Yanluo', 'Ullr', 'Pisces', 'Fengyi', 'Pan'
];

const ratingValue = {
  'SSS': 7, 'SS': 6, 'S': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1, '': 0
};

console.log('\n🏆 TOP 20 RANKINGS vs OVERALL RATINGS (Whale Player Ratings)\n');
console.log('Rank | Hero           | Overall Rating | Status | Note');
console.log('-----|----------------|----------------|--------|----------');

const validations = [];
top20Names.forEach((name, idx) => {
  const heroData = Object.values(allHeroesDb).find(h => h.name === name);
  if (!heroData) {
    console.log(`${String(idx + 1).padEnd(4)} | ${name.padEnd(14)} | ${'N/A'.padStart(14)} | ❌ | Hero not found`);
    return;
  }
  
  const rating = heroData.ratings?.overall || 'N/A';
  const ratingVal = ratingValue[rating] || 0;
  const status = ratingVal >= 6 ? '✅ SS+' : ratingVal >= 5 ? '✅ S' : ratingVal >= 4 ? '⚠️  A' : '❌ B-';
  
  console.log(
    `${String(idx + 1).padEnd(4)} | ${name.padEnd(14)} | ${String(rating).padStart(14)} | ${status}`
  );
  
  validations.push({
    rank: idx + 1,
    name,
    rating,
    ratingVal,
    isTopTier: ratingVal >= 6
  });
});

console.log('\n📊 VALIDATION SUMMARY\n');

const topTierInRanking = validations.filter(v => v.isTopTier).length;
const totalTopTierHeroes = Object.values(allHeroesDb).filter(h => ratingValue[h.ratings?.overall] >= 6).length;
const topTierNotInTop20 = Object.entries(allHeroesDb)
  .filter(([_, h]) => ratingValue[h.ratings?.overall] >= 6)
  .filter(([id, h]) => !validations.find(v => v.name === h.name))
  .map(([_, h]) => h.name);

console.log(`✅ Top Tier (SSS/SS) heroes in Top 20: ${topTierInRanking} / ${totalTopTierHeroes}`);
if (topTierNotInTop20.length > 0) {
  console.log(`❌ Missing from Top 20: ${topTierNotInTop20.join(', ')}`);
} else {
  console.log(`✅ All top tier heroes included in Top 20!`);
}

const notTopTierInRanking = validations.filter(v => !v.isTopTier).length;
if (notTopTierInRanking > 0) {
  console.log(`\n⚠️  Heroes ranked high but rated lower by whales: ${notTopTierInRanking}`);
  validations.filter(v => !v.isTopTier).forEach(v => {
    console.log(`   #${v.rank}: ${v.name} (${v.rating})`);
  });
}

console.log('\n');
