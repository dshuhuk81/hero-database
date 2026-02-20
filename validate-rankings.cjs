const fs = require('fs');
const path = require('path');

// Load heroes
const heroDir = './src/data/heroes';
const heroFiles = fs.readdirSync(heroDir).filter(f => f.endsWith('.json'));

const heroes = [];
heroFiles.forEach(file => {
  const data = JSON.parse(fs.readFileSync(path.join(heroDir, file), 'utf-8'));
  if (data.id) {
    heroes.push(data);
  }
});

// Load allHeroesDb for ratings
const allHeroesDb = JSON.parse(fs.readFileSync('src/data/all_heroes_db.json', 'utf-8'));

// Manually implement ranking calculation from rankingScore.js
const rankingScore = require('./src/utils/rankingScore.js');

// Calculate scores for all heroes
const heroScores = heroes.map(hero => {
  const score = rankingScore.calculateRankingScore(hero);
  const overallRating = allHeroesDb[hero.id]?.ratings?.overall || 'N/A';
  return {
    id: hero.id,
    name: hero.name,
    score: score,
    overallRating: overallRating,
    class: hero.class
  };
}).sort((a, b) => b.score - a.score);

// Rating value mapper
const ratingValue = {
  'SSS': 7, 'SS': 6, 'S': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1, '': 0
};

const top20 = heroScores.slice(0, 20);

console.log('\n🏆 TOP 20 RANKINGS vs OVERALL RATINGS\n');
console.log('Rank | Hero Name      | Score    | Overall Rating | Status');
console.log('-----|----------------|----------|----------------|----------');
top20.forEach((hero, idx) => {
  const ratingVal = ratingValue[hero.overallRating] || 0;
  const status = ratingVal >= 6 ? '✅' : ratingVal >= 4 ? '⚠️ ' : '❌';
  console.log(
    `${String(idx + 1).padEnd(4)} | ${hero.name.padEnd(14)} | ${String(hero.score.toFixed(1)).padStart(8)} | ${String(hero.overallRating).padStart(14)} | ${status}`
  );
});

// Analysis
console.log('\n📊 VALIDATION ANALYSIS\n');

const withRatings = heroScores.filter(h => h.overallRating !== 'N/A');

console.log('❗ Heroes with SSS/SS rating but NOT in Top 20:');
const sssMissed = withRatings
  .filter(h => ratingValue[h.overallRating] >= 6 && heroScores.indexOf(h) >= 20);
if (sssMissed.length === 0) {
  console.log('  ✅ None - All SSS/SS heroes are in Top 20!');
} else {
  sssMissed.forEach(h => {
    const pos = heroScores.indexOf(h) + 1;
    console.log(`  #${pos}: ${h.name} - ${h.overallRating} (Score: ${h.score.toFixed(1)})`);
  });
}

console.log('\n❗ Heroes in Top 20 but with A or lower rating:');
const lowRated = top20.filter(h => h.overallRating !== 'N/A' && ratingValue[h.overallRating] <= 4);
if (lowRated.length === 0) {
  console.log('  ✅ None - All Top 20 heroes have S rating or better!');
} else {
  lowRated.forEach((h, idx) => {
    const pos = top20.indexOf(h) + 1;
    console.log(`  #${pos}: ${h.name} - ${h.overallRating} (Score: ${h.score.toFixed(1)})`);
  });
}

console.log('\n✅ All SSS/SS heroes by ranking position:\n');
withRatings
  .filter(h => ratingValue[h.overallRating] >= 6)
  .sort((a, b) => heroScores.indexOf(a) - heroScores.indexOf(b))
  .slice(0, 15)
  .forEach(h => {
    const pos = heroScores.indexOf(h) + 1;
    console.log(`  #${pos}: ${h.name} (${h.overallRating})`);
  });

console.log('\n');
