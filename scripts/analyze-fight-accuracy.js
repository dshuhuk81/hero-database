import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Load all heroes
const allHeroesPath = path.join(process.cwd(), 'src/data/all_heroes_db.json');
const allHeroes = JSON.parse(fs.readFileSync(allHeroesPath, 'utf-8'));
const heroMap = {};
Object.values(allHeroes).forEach(h => {
  heroMap[h.id] = h;
});

async function analyzeFightAccuracy() {
  console.log('Fetching fight outcomes from Supabase...');

  const { data: fights, error } = await supabase
    .from('fight_outcomes')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching fights:', error);
    process.exit(1);
  }

  if (!fights || fights.length === 0) {
    console.log('No fight outcomes recorded yet.');
    return;
  }

  console.log(`\nAnalyzing ${fights.length} fights...\n`);

  // Accuracy metrics
  let correct = 0;
  let total = 0;
  const byClass = {};
  const byFaction = {};
  const byBpRatio = {};

  fights.forEach(fight => {
    if (fight.predicted_win_rate === null) {
      console.log(`  Skipping fight ${fight.id}: no prediction`);
      return;
    }

    total++;
    const predicted = fight.predicted_win_rate;
    const isWin = fight.winner === 'player' ? 1 : 0;
    const isCorrect = (predicted > 50 && isWin) || (predicted <= 50 && !isWin);

    if (isCorrect) correct++;

    const predictedClass = predicted > 50 ? 'win' : predicted < 50 ? 'lose' : 'neutral';
    const outcomeString = isWin ? 'Won' : 'Lost';
    const accuracyString = isCorrect ? 'CORRECT' : 'WRONG';

    console.log(
      `Fight ${fight.id}: Predicted ${predicted.toFixed(1)}% (${predictedClass}) -> ${outcomeString} [${accuracyString}]`
    );

    // Analyze team composition
    const playerHeroes = (fight.team_player || []).map(h => heroMap[h.hero_id]).filter(Boolean);
    if (playerHeroes.length > 0) {
      const classCombo = playerHeroes.map(h => h.class).sort().join('/');
      byClass[classCombo] = byClass[classCombo] || { correct: 0, total: 0 };
      byClass[classCombo].total++;
      if (isCorrect) byClass[classCombo].correct++;

      const factionCombo = playerHeroes.map(h => h.faction).sort().join('/');
      byFaction[factionCombo] = byFaction[factionCombo] || { correct: 0, total: 0 };
      byFaction[factionCombo].total++;
      if (isCorrect) byFaction[factionCombo].correct++;
    }

    // Analyze BP ratio
    const bpRatio = fight.bp_player > 0 && fight.bp_enemy > 0
      ? (fight.bp_player / fight.bp_enemy).toFixed(2)
      : 'unknown';

    if (bpRatio !== 'unknown') {
      byBpRatio[bpRatio] = byBpRatio[bpRatio] || { correct: 0, total: 0 };
      byBpRatio[bpRatio].total++;
      if (isCorrect) byBpRatio[bpRatio].correct++;
    }
  });

  if (total === 0) {
    console.log('No fights with predictions to analyze.');
    return;
  }

  const accuracy = ((correct / total) * 100).toFixed(1);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`OVERALL ACCURACY: ${correct}/${total} (${accuracy}%)`);
  console.log(`${'='.repeat(60)}\n`);

  if (Object.keys(byClass).length > 0) {
    console.log('By Class Composition:');
    Object.entries(byClass)
      .sort((a, b) => b[1].total - a[1].total)
      .forEach(([combo, stats]) => {
        const acc = ((stats.correct / stats.total) * 100).toFixed(1);
        console.log(`  ${combo}: ${stats.correct}/${stats.total} (${acc}%)`);
      });
    console.log();
  }

  if (Object.keys(byFaction).length > 0) {
    console.log('By Faction Combination:');
    Object.entries(byFaction)
      .sort((a, b) => b[1].total - a[1].total)
      .forEach(([combo, stats]) => {
        const acc = ((stats.correct / stats.total) * 100).toFixed(1);
        console.log(`  ${combo}: ${stats.correct}/${stats.total} (${acc}%)`);
      });
    console.log();
  }

  if (Object.keys(byBpRatio).length > 0) {
    console.log('By Battle Power Ratio (Your BP / Enemy BP):');
    Object.entries(byBpRatio)
      .sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]))
      .forEach(([ratio, stats]) => {
        const acc = ((stats.correct / stats.total) * 100).toFixed(1);
        console.log(
          `  ${ratio}x: ${stats.correct}/${stats.total} (${acc}%) ${
            ratio < 0.9 ? '(underpowered)' : ratio > 1.1 ? '(overpowered)' : '(balanced)'
          }`
        );
      });
  }
}

analyzeFightAccuracy().catch(console.error);
