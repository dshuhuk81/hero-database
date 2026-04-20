import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { computeScoreForScenario } from '../src/utils/rankingScore.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const allHeroesDb = JSON.parse(readFileSync(join(__dirname, '../src/data/all_heroes_db.json'), 'utf-8'));

async function analyzeTeamComposition() {
  console.log('\n' + '='.repeat(90));
  console.log('BOSS TEAM COMPOSITION ANALYSIS - Real Data vs Ratings');
  console.log('='.repeat(90));
  
  const coreTeam = ['isis', 'caishen', 'dionysus', 'tefnut'];
  const flexOptions = ['athena', 'yuelao', 'diana'];
  
  // Real damage results
  const results = {
    athena: 750,
    yuelao: 1250,
    diana: 558
  };
  
  console.log('\n📊 REAL BOSS FIGHT RESULTS:\n');
  console.log('Core Team: Isis + Caishen + Dionysus + Tefnut + X\n');
  console.log('Hero (X)     | Damage Output | vs Athena');
  console.log('-------------|---------------|----------');
  console.log(`Yuelao       | 1,250M        | +67% 🔥🔥🔥`);
  console.log(`Athena       |   750M        | baseline`);
  console.log(`Diana        |   558M        | -26%`);

  const existingTags = new Set();
  coreTeam.forEach((id) => {
    const hero = allHeroesDb[id];
    (hero?.synergies || []).forEach((tag) => existingTags.add(tag));
  });

  const carry = allHeroesDb.isis;
  const carrySkillText = (carry?.skills || [])
    .map((s) => `${s.description || ''} ${Object.values(s.upgrades || {}).join(' ')}`)
    .join(' ')
    .toLowerCase();

  const teamContext = {
    existingTags: Array.from(existingTags),
    mainCarry: {
      id: carry?.id,
      skillText: carrySkillText,
      needsUptime: true,
    },
  };

  const contextScores = {};
  for (const id of flexOptions) {
    contextScores[id] = await computeScoreForScenario(allHeroesDb[id], 'boss', teamContext);
  }

  console.log('\n🧠 CONTEXT-AWARE MODEL OUTPUT (All 1-4 applied):\n');
  console.log('Hero (X)     | Boss Context Score | Model Rank');
  console.log('-------------|--------------------|-----------');
  const sortedCtx = [...flexOptions].sort((a, b) => contextScores[b] - contextScores[a]);
  sortedCtx.forEach((id, idx) => {
    console.log(`${allHeroesDb[id].name.padEnd(12)} | ${String(Math.round(contextScores[id])).padStart(18)} | #${idx + 1}`);
  });
  
  console.log('\n' + '='.repeat(90));
  console.log('CORE TEAM ANALYSIS:');
  console.log('='.repeat(90));
  
  coreTeam.forEach(id => {
    const hero = allHeroesDb[id];
    if (!hero) return;
    
    console.log(`\n${hero.name.toUpperCase()} (${hero.class}):`);
    console.log(`  Role: ${hero.role}`);
    console.log(`  Synergies: ${hero.synergies?.join(', ') || 'none'}`);
    
    if (id === 'isis') {
      console.log(`  🎯 MAIN DPS: 12% max HP damage, 270%+ ATK SPD stacking`);
    }
    if (id === 'dionysus') {
      console.log(`  🔥 KEY: ATK_SPD_UP (50-60%), CDR_TEAM (30%), ENERGY_RESTORE_TEAM`);
      console.log(`  ⚠️  CRITICAL: Dionysus ALREADY provides ATK SPD to entire team!`);
    }
  });
  
  console.log('\n' + '='.repeat(90));
  console.log('FLEX HERO COMPARISON:');
  console.log('='.repeat(90));
  
  flexOptions.forEach(id => {
    const hero = allHeroesDb[id];
    if (!hero) return;
    
    console.log(`\n${hero.name.toUpperCase()}:`);
    console.log(`  Damage Result: ${results[id]}M`);
    console.log(`  Synergies: ${hero.synergies?.join(', ') || 'none'}`);
    
    if (id === 'athena') {
      console.log(`\n  Analysis:`);
      console.log(`    • Provides: ATK_SPD_UP, HEAL_TEAM, SHIELD_TEAM, DAMAGE_REDUCTION_TEAM`);
      console.log(`    ❌ PROBLEM: ATK SPD UP is REDUNDANT with Dionysus (50-60% already)`);
      console.log(`    ❌ ATK SPD has diminishing returns - 60% → 100% is NOT 2x damage`);
      console.log(`    ✓ Survival is good but not needed with this comp`);
      console.log(`    📉 Effective contribution: Mostly survival, minimal DPS boost`);
    }
    
    if (id === 'yuelao') {
      console.log(`\n  Analysis:`);
      console.log(`    • Provides: ATK_UP (25%), ENERGY_RESTORE_TEAM, Links (stat sharing)`);
      console.log(`    ✅ ATK_UP: 25% ATK to Isis = HUGE for % max HP damage!`);
      console.log(`       → Isis's 12% max HP cap is 400% ATK`);
      console.log(`       → 25% more ATK = 25% more % HP damage per hit!`);
      console.log(`    ✅ ENERGY_RESTORE: More ultimates = more Omniscient state uptime`);
      console.log(`    ✅ CRIT buffs: +20% CRIT Rate to healed targets`);
      console.log(`    ✅ Stat sharing: Links Isis (high ATK) with tank (high HP)`);
      console.log(`    📈 Direct DPS multiplication: ~25-30% damage increase`);
    }
    
    if (id === 'diana') {
      console.log(`\n  Analysis:`);
      console.log(`    • Provides: ATK_SPD_UP, ENERGY_RESTORE_TEAM, REMOVES_ARMOR`);
      console.log(`    ❌ ATK SPD UP: Also redundant with Dionysus`);
      console.log(`    ✓ Armor shred: Helps but Isis has armor pen already`);
      console.log(`    ❌ Diana is DPS, competes with Isis for damage rather than multiplying`);
    }
  });
  
  console.log('\n' + '='.repeat(90));
  console.log('KEY INSIGHTS - WHY YUELAO WINS:');
  console.log('='.repeat(90));
  
  console.log(`
1. BUFF STACKING & DIMINISHING RETURNS:
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   • Dionysus already provides 60% ATK SPD to entire team
   • Adding Athena's ATK SPD creates OVERLAP, not multiplication
   • 60% ATK SPD → 100% ATK SPD ≠ 2x damage (diminishing returns)
   • Yuelao's 25% ATK buff is UNIQUE in this comp = no overlap

2. ISIS-SPECIFIC SYNERGY:
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   • Isis's main damage: 12% of boss max HP (capped at 400% ATK)
   • Isis ATK: 234k base
   • With 25% ATK buff: 234k → 292k (+58k)
   • This raises the % HP cap from 936k to 1,170k (+234k per hit!)
   • With 270% ATK SPD, this is MASSIVE sustained DPS increase
   
3. ENERGY ECONOMICS:
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   • Yuelao: 180 energy restore to highest ATK (Isis)
   • Caishen: Area energy sustain (35/sec)
   • Dionysus: 30% Energy Regen buff
   • Result: Isis constantly in Omniscient state (2.5x DPS mode)
   • Athena provides survival but NOT energy = less ultimate uptime

4. RATING SYSTEM BLIND SPOT:
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Current system rates heroes in ISOLATION:
   ✓ Athena gets 25 points for ATK_SPD_UP
   ✓ Yuelao gets 23 points for ENERGY_RESTORE_TEAM
   ❌ System DOESN'T consider:
      - Is ATK SPD already covered? (YES by Dionysus!)
      - Does this hero amplify the CARRY specifically? (Yuelao → Isis)
      - Diminishing returns on duplicate buffs
      - Team composition context

5. THE MATH:
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   With Athena:
   • Isis damage: Base × 1.6 (ATK SPD overlap) × 1.0 (no ATK buff) = 1.6x
   • Team survives better but DPS limited
   • Total: 750M
   
   With Yuelao:
   • Isis damage: Base × 1.6 (Dionysus ATK SPD) × 1.25 (ATK buff) × 1.15 (more energy) = 2.3x
   • Isis % HP cap increases by 25% = direct damage boost
   • Total: 1,250M (+67% over Athena!)
  `);
  
  console.log('\n' + '='.repeat(90));
  console.log('CONCLUSION - CRITICAL FLAW IN RATING SYSTEM:');
  console.log('='.repeat(90));
  console.log(`
The current boss rating system evaluates heroes in ISOLATION, giving Athena
high marks for ATK_SPD_UP without considering:

❌ Team composition context (is ATK SPD already covered?)
❌ Buff overlap and diminishing returns
❌ Carry-specific synergies (ATK buffs amplify % HP damage heroes)
❌ Energy economy for ultimate uptime

Athena is rated #1 (567) but produces 750M damage.
Yuelao is rated #44 (364) but produces 1,250M damage (+67%!)

WHY YUELAO ACTUALLY WINS:
• Unique buff (ATK) in a comp already saturated with ATK SPD (Dionysus)
• ATK buff directly amplifies Isis's % max HP damage cap
• Energy restore enables more Omniscient state uptime
• No redundant buffs = maximum efficiency

RECOMMENDATION:
Rating system should consider:
1. Buff diversity score (penalty for redundant buff types)
2. Carry amplification score (does this hero boost the main DPS?)
3. Team composition context (what buffs are already present?)
4. Ultimate uptime contribution (energy vs just survivability)
  `);
  
  console.log('='.repeat(90) + '\n');
}

analyzeTeamComposition();
