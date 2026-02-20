const synergyUtils = require('./src/utils/synergyTags.js');
const amunra = require('./src/data/heroes/amunra.json');
const cashien = require('./src/data/heroes/cashien.json');
const freya = require('./src/data/heroes/freya.json');
const yanluo = require('./src/data/heroes/yanluo.json');

console.log('Testing ENERGY_TEAM_PROVIDER after refinement:\n');

const tests = [
  { name: 'AMUNRA (should be false)', hero: amunra, shouldBe: false },
  { name: 'CASHIEN (should be true)', hero: cashien, shouldBe: true },
  { name: 'FREYA (should be false)', hero: freya, shouldBe: false },
  { name: 'YANLUO (should be true)', hero: yanluo, shouldBe: true }
];

tests.forEach(t => {
  const prof = synergyUtils.synergyProfileForHero(t.hero);
  const has = prof.tags.has('ENERGY_TEAM_PROVIDER');
  const status = has === t.shouldBe ? '✓' : '✗';
  console.log(`${status} ${t.name}: ${has}`);
  if (has) {
    const ev = prof.evidenceByTag['ENERGY_TEAM_PROVIDER'];
    console.log(`    Match: "${ev.match}"`);
  }
});
