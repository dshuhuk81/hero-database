/**
 * Quick validation script to check boss DPS scoring improvements
 * Run with: node validate-boss-dps-improvements.js
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { computeScoreForScenario } from './src/utils/rankingScore.js';
import { rateHeroSkills } from './src/utils/skillAnalyzer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const allHeroesDb = JSON.parse(readFileSync(join(__dirname, './src/data/all_heroes_db.json'), 'utf-8'));

async function validateBossDpsImprovements() {
  console.log('\n=== Boss DPS Score Validation ===\n');

  const heroes = Object.values(allHeroesDb);

  // Test key heroes from the boss DPS test
  const testHeroes = ['isis', 'hladgunnr', 'yuelao', 'dionysus', 'caishen', 'tefnut', 'athena'];

  const results = [];

  for (const heroId of testHeroes) {
    const hero = allHeroesDb[heroId];
    if (!hero) {
      console.log(`⚠️  Hero not found: ${heroId}`);
      continue;
    }

    const bossScore = await computeScoreForScenario(hero, 'boss');
    const skillScore = rateHeroSkills(hero);

    results.push({
      name: hero.name,
      class: hero.class,
      bossScore: Math.round(bossScore),
      skillScore: skillScore.toFixed(2),
    });
  }

  // Sort by boss score descending
  results.sort((a, b) => b.bossScore - a.bossScore);

  console.log('Boss Scenario Rankings:\n');
  console.log('Rank | Hero          | Class      | Boss Score | Skill Score');
  console.log('-----|---------------|------------|------------|------------');
  results.forEach((r, idx) => {
    console.log(
      `${String(idx + 1).padStart(4)} | ${r.name.padEnd(13)} | ${r.class.padEnd(10)} | ${String(r.bossScore).padStart(10)} | ${r.skillScore.padStart(11)}`
    );
  });

  // Test Team Context with Isis carry
  console.log('\n\n=== Team Context Test: Isis as Carry ===\n');

  const isisHero = allHeroesDb['isis'];
  const supports = ['yuelao', 'dionysus', 'caishen', 'tefnut', 'athena'];

  const contextResults = [];

  const teamContext = {
    existingTags: [],
    mainCarry: {
      id: 'isis',
      skillText: isisHero.skills
        .map(s => `${s.description} ${Object.values(s.upgrades || {}).join(' ')}`)
        .join(' ')
        .toLowerCase(),
      needsUptime: true,
    },
  };

  for (const supportId of supports) {
    const hero = allHeroesDb[supportId];
    if (!hero) continue;

    const bossCtxScore = await computeScoreForScenario(hero, 'boss', teamContext);

    contextResults.push({
      name: hero.name,
      bossCtxScore: Math.round(bossCtxScore),
    });
  }

  contextResults.sort((a, b) => b.bossCtxScore - a.bossCtxScore);

  console.log('Support Rankings (with Isis carry):\n');
  console.log('Rank | Support       | Boss (Ctx)');
  console.log('-----|---------------|------------');
  contextResults.forEach((r, idx) => {
    console.log(`${String(idx + 1).padStart(4)} | ${r.name.padEnd(13)} | ${String(r.bossCtxScore).padStart(10)}`);
  });

  // Expected results check
  console.log('\n\n=== Validation Checks ===\n');

  const isis = results.find(r => r.name === 'Isis');
  const hladgunnr = results.find(r => r.name === 'Hladgunnr');

  if (isis && hladgunnr) {
    const isisRank = results.findIndex(r => r.name === 'Isis') + 1;
    const hladgunnrRank = results.findIndex(r => r.name === 'Hladgunnr') + 1;

    console.log(`✓ Isis boss score: ${isis.bossScore}`);
    console.log(`✓ Hladgunnr boss score: ${hladgunnr.bossScore}`);

    if (isis.bossScore > hladgunnr.bossScore) {
      console.log('✅ PASS: Isis ranks higher than Hladgunnr (expected based on test data)');
    } else {
      console.log('❌ FAIL: Hladgunnr still ranks higher than Isis (needs adjustment)');
    }
  }

  const yuelaoCtx = contextResults.find(r => r.name === 'Yuelao');
  const dionysusCtx = contextResults.find(r => r.name === 'Dionysus');
  const tefnutCtx = contextResults.find(r => r.name === 'Tefnut');

  if (yuelaoCtx && dionysusCtx && tefnutCtx) {
    const avgCoreSupportScore = (yuelaoCtx.bossCtxScore + dionysusCtx.bossCtxScore) / 2;

    console.log(`\n✓ Yuelao context score: ${yuelaoCtx.bossCtxScore}`);
    console.log(`✓ Dionysus context score: ${dionysusCtx.bossCtxScore}`);
    console.log(`✓ Tefnut context score: ${tefnutCtx.bossCtxScore}`);

    if (avgCoreSupportScore > tefnutCtx.bossCtxScore * 1.15) {
      console.log('✅ PASS: Core supports (Yuelao/Dionysus) rank significantly higher than Tefnut');
    } else {
      console.log('⚠️  WARNING: Core support advantage may be too small');
    }
  }

  console.log('\n=== End Validation ===\n');
}

validateBossDpsImprovements().catch(console.error);
