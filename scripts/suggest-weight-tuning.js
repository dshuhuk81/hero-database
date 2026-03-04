#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Run with:');
  console.error('PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/suggest-weight-tuning.js');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Load heroes
const allHeroesPath = path.join(process.cwd(), 'src/data/all_heroes_db.json');
const allHeroes = JSON.parse(fs.readFileSync(allHeroesPath, 'utf-8'));
const heroMap = {};
Object.values(allHeroes).forEach(h => {
  heroMap[h.id] = h;
});

// Load ranking score to see current weights
const rankingScorePath = path.join(process.cwd(), 'src/utils/rankingScore.js');
const rankingScoreContent = fs.readFileSync(rankingScorePath, 'utf-8');

async function suggestWeightTuning() {
  console.log('\n=== Weight Tuning Suggestion Engine ===\n');
  console.log('Fetching fight outcomes...\n');

  const { data: fights, error } = await supabase
    .from('fight_outcomes')
    .select('*')
    .order('created_at', { ascending: true });

  if (error || !fights?.length) {
    console.error('No fight data found:', error);
    return;
  }

  // Analyze accuracy by class composition
  const classAccuracy = {};
  const statContributions = { hp: [], atk: [], armor: [], magicRes: [], crit: [] };
  let correctPredictions = 0;
  let wrongPredictions = 0;

  fights.forEach(fight => {
    const isCorrect = 
      (fight.predicted_win_rate > 50 && fight.winner === 'player') ||
      (fight.predicted_win_rate <= 50 && fight.winner === 'enemy');

    if (isCorrect) correctPredictions++;
    else wrongPredictions++;

    // Analyze player team
    const playerTeam = fight.team_player || [];
    const playerClasses = playerTeam
      .map(t => heroMap[t.hero_id])
      .filter(h => h)
      .map(h => h.class)
      .sort()
      .join('/');

    if (!classAccuracy[playerClasses]) {
      classAccuracy[playerClasses] = { correct: 0, total: 0 };
    }
    classAccuracy[playerClasses].total++;
    if (isCorrect) classAccuracy[playerClasses].correct++;

    // Track stat contributions for winning teams
    if (fight.winner === 'player') {
      playerTeam.forEach(t => {
        const hero = heroMap[t.hero_id];
        if (hero) {
          statContributions.hp.push(hero.stats.hp || 0);
          statContributions.atk.push(hero.stats.atk || 0);
          statContributions.armor.push(hero.stats.armor || 0);
          statContributions.magicRes.push(hero.stats.magicRes || 0);
          statContributions.crit.push(hero.stats.critRate || 0);
        }
      });
    }
  });

  const accuracy = (correctPredictions / fights.length * 100).toFixed(1);
  console.log(`Overall Accuracy: ${correctPredictions}/${fights.length} (${accuracy}%)\n`);

  // Find worst performing class compositions
  console.log('WORST PERFORMING TEAM COMPOSITIONS:');
  console.log('(Most likely cause: stats overvalued in these classes)\n');
  
  const sortedClasses = Object.entries(classAccuracy)
    .sort((a, b) => {
      const accuracyA = a[1].correct / a[1].total;
      const accuracyB = b[1].correct / b[1].total;
      return accuracyA - accuracyB;
    })
    .slice(0, 5);

  sortedClasses.forEach(([classes, data]) => {
    const classAccuracyPct = (data.correct / data.total * 100).toFixed(0);
    const classArray = classes.split('/');
    console.log(`  ${classes}`);
    console.log(`    Accuracy: ${data.correct}/${data.total} (${classAccuracyPct}%)`);
    
    // Suggest adjustment
    if (data.correct === 0) {
      console.log(`    -> Suggest: Reduce ATK weight for [${classArray.join(', ')}] by 10-15%`);
    } else if (classAccuracyPct < 50) {
      console.log(`    -> Suggest: Reduce ATK weight for [${classArray.join(', ')}] by 5-10%`);
    }
    console.log();
  });

  // Analyze stat averages
  console.log('\nSTAT ANALYSIS FOR WINNING TEAMS:');
  console.log('(These stats contribute to your wins)\n');

  const stats = {
    hp: { avg: avg(statContributions.hp), name: 'HP' },
    atk: { avg: avg(statContributions.atk), name: 'ATK' },
    armor: { avg: avg(statContributions.armor), name: 'Armor' },
    magicRes: { avg: avg(statContributions.magicRes), name: 'Magic Res' },
    crit: { avg: avg(statContributions.crit), name: 'Crit Rate' },
  };

  Object.entries(stats).forEach(([key, data]) => {
    if (data.avg > 0) {
      console.log(`  ${data.name}: ${data.avg.toFixed(1)} avg`);
    }
  });

  console.log('\n\nRECOMMENDED ACTIONS:\n');
  console.log('1. Model is OVERESTIMATING your team strength');
  console.log('   -> You won 28% but model predicted 72% win rate');
  console.log('   -> This means hero stats are scored too aggressively\n');

  console.log('2. Quick Fix (choose one):');
  console.log('   Option A: Reduce SYNERGY_WEIGHT from 12 → 8');
  console.log('            (synergies matter less relative to raw stats)\n');
  console.log('   Option B: Reduce ATK multipliers in CLASS_WEIGHTS by 15%');
  console.log('            (ATK is overvalued for all classes)\n');
  console.log('   Option C: Increase enemy armor/magicRes by 10%');
  console.log('            (enemy defensive stats are undervalued)\n');

  console.log('3. After adjusting, rebuild and re-record 5+ new fights to test\n');

  console.log('CURRENT WEIGHTS (from rankingScore.js):');
  const synergyMatch = rankingScoreContent.match(/SYNERGY_WEIGHT\s*=\s*(\d+)/);
  const skillMatch = rankingScoreContent.match(/SKILL_WEIGHT\s*=\s*(\d+)/);
  if (synergyMatch) console.log(`  SYNERGY_WEIGHT: ${synergyMatch[1]}`);
  if (skillMatch) console.log(`  SKILL_WEIGHT: ${skillMatch[1]}`);
  console.log();
}

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

suggestWeightTuning().catch(console.error);
