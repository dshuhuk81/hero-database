#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Run with:');
  console.error('PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/auto-tune-weights.js');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Load heroes and ranking score
const allHeroesPath = path.join(process.cwd(), 'src/data/all_heroes_db.json');
const rankingScorePath = path.join(process.cwd(), 'src/utils/rankingScore.js');

const allHeroes = JSON.parse(fs.readFileSync(allHeroesPath, 'utf-8'));
let rankingScoreContent = fs.readFileSync(rankingScorePath, 'utf-8');

const heroMap = {};
Object.values(allHeroes).forEach(h => {
  heroMap[h.id] = h;
});

async function autoTuneWeights() {
  console.log('\n=== Auto-Tune Weight Adjustment System ===\n');
  console.log('Fetching fight outcomes...\n');

  const { data: fights, error } = await supabase
    .from('fight_outcomes')
    .select('*')
    .order('created_at', { ascending: true });

  if (error || !fights?.length) {
    console.error('No fight data found:', error);
    process.exit(1);
  }

  // Analyze overall accuracy
  let correctPredictions = 0;
  let wrongPredictions = 0;
  let overestimatedCount = 0; // Predicted win but lost
  let underestimatedCount = 0; // Predicted loss but won

  fights.forEach(fight => {
    const isCorrect =
      (fight.predicted_win_rate > 50 && fight.winner === 'player') ||
      (fight.predicted_win_rate <= 50 && fight.winner === 'enemy');

    if (isCorrect) {
      correctPredictions++;
    } else {
      wrongPredictions++;
      if (fight.predicted_win_rate > 50 && fight.winner === 'enemy') {
        overestimatedCount++;
      } else if (fight.predicted_win_rate <= 50 && fight.winner === 'player') {
        underestimatedCount++;
      }
    }
  });

  const accuracy = correctPredictions / fights.length;
  console.log(`Current Accuracy: ${correctPredictions}/${fights.length} (${(accuracy * 100).toFixed(1)}%)`);
  console.log(`Overestimated (predicted win, but lost): ${overestimatedCount}`);
  console.log(`Underestimated (predicted loss, but won): ${underestimatedCount}\n`);

  // Calculate adjustment factor
  let adjustmentNeeded = false;
  let adjustmentFactor = 1.0;

  if (accuracy < 0.45) {
    // Severely overestimating - reduce weights more aggressively
    adjustmentFactor = 0.92; // Reduce by 8%
    adjustmentNeeded = true;
  } else if (accuracy < 0.50) {
    // Overestimating - reduce weights moderately
    adjustmentFactor = 0.95; // Reduce by 5%
    adjustmentNeeded = true;
  } else if (accuracy < 0.55) {
    // Slightly overestimating
    adjustmentFactor = 0.97; // Reduce by 3%
    adjustmentNeeded = true;
  } else if (accuracy > 0.75) {
    // Underestimating - increase weights
    const gap = Math.min((accuracy - 0.75) * 0.5, 0.05); // Max 5% increase
    adjustmentFactor = 1.0 + gap;
    adjustmentNeeded = true;
  }

  if (!adjustmentNeeded || adjustmentFactor === 1.0) {
    console.log('Current accuracy is good (50-75%). No adjustment needed.\n');
    process.exit(0);
  }

  console.log(`Adjustment Factor: ${(adjustmentFactor * 100).toFixed(1)}%\n`);

  // Extract current weights
  const synergyMatch = rankingScoreContent.match(/const SYNERGY_WEIGHT\s*=\s*(\d+)/);
  const skillMatch = rankingScoreContent.match(/const SKILL_WEIGHT\s*=\s*(\d+)/);

  if (!synergyMatch || !skillMatch) {
    console.error('Could not find SYNERGY_WEIGHT or SKILL_WEIGHT in rankingScore.js');
    process.exit(1);
  }

  const currentSynergyWeight = parseInt(synergyMatch[1]);
  const currentSkillWeight = parseInt(skillMatch[1]);
  const newSynergyWeight = Math.max(4, Math.round(currentSynergyWeight * adjustmentFactor));
  const newSkillWeight = Math.max(50, Math.round(currentSkillWeight * adjustmentFactor));

  console.log('PROPOSED CHANGES:\n');
  console.log(`SYNERGY_WEIGHT: ${currentSynergyWeight} → ${newSynergyWeight}`);
  console.log(`SKILL_WEIGHT: ${currentSkillWeight} → ${newSkillWeight}\n`);

  // Apply changes
  rankingScoreContent = rankingScoreContent.replace(
    /const SYNERGY_WEIGHT\s*=\s*\d+/,
    `const SYNERGY_WEIGHT = ${newSynergyWeight}`
  );

  rankingScoreContent = rankingScoreContent.replace(
    /const SKILL_WEIGHT\s*=\s*\d+/,
    `const SKILL_WEIGHT = ${newSkillWeight}`
  );

  // Write changes
  fs.writeFileSync(rankingScorePath, rankingScoreContent);

  console.log('✓ Changes applied to rankingScore.js\n');
  console.log('NEXT STEPS:');
  console.log('1. Run: npm run build');
  console.log('2. Deploy the updated code');
  console.log('3. Record 5+ new fights to validate the changes');
  console.log('4. Re-run this script to measure accuracy improvement\n');
}

autoTuneWeights().catch(console.error);
