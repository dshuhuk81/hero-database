const fs = require('fs');
const path = require('path');
const synergyUtils = require('./src/utils/synergyTags.js');

// Alle Hero-Files laden
const heroDir = './src/data/heroes';
const heroes = fs.readdirSync(heroDir)
  .filter(f => f.endsWith('.json') && f !== 'index.js')
  .map(f => {
    try {
      return require(path.resolve(heroDir, f));
    } catch (e) {
      return null;
    }
  })
  .filter(Boolean);

const problematic = [];

console.log('Scanning all heroes for suspicious patterns...\n');

heroes.forEach(hero => {
  const prof = synergyUtils.synergyProfileForHero(hero);
  const tags = Array.from(prof.tags);

  // == CONTROL_PROVIDER: zu generisch, could be self-effects ==
  if (tags.includes('CONTROL_PROVIDER')) {
    const ev = prof.evidenceByTag['CONTROL_PROVIDER'];
    if (ev) {
      problematic.push({
        hero: hero.name,
        tag: 'CONTROL_PROVIDER',
        snippet: ev.snippet,
        match: ev.match,
        reason: 'Very broad pattern - could match self-control'
      });
    }
  }

  // == CLEANSE_TEAM_PROVIDER: "remove" is too generic ==
  if (tags.includes('CLEANSE_TEAM_PROVIDER')) {
    const ev = prof.evidenceByTag['CLEANSE_TEAM_PROVIDER'];
    if (ev) {
      problematic.push({
        hero: hero.name,
        tag: 'CLEANSE_TEAM_PROVIDER',
        snippet: ev.snippet,
        match: ev.match,
        reason: 'Pattern uses "remove" which is very generic'
      });
    }
  }

  // == ENERGY_DRAIN_ENEMY: lacks context (drain vs provide) ==
  if (tags.includes('ENERGY_DRAIN_ENEMY')) {
    const ev = prof.evidenceByTag['ENERGY_DRAIN_ENEMY'];
    if (ev) {
      problematic.push({
        hero: hero.name,
        tag: 'ENERGY_DRAIN_ENEMY',
        snippet: ev.snippet,
        match: ev.match,
        reason: 'Pattern only checks "drain/steal energy" - missing context'
      });
    }
  }

  // == CC_IMMUNITY_TEAM_PROVIDER: could be self-immunity ==
  if (tags.includes('CC_IMMUNITY_TEAM_PROVIDER')) {
    const ev = prof.evidenceByTag['CC_IMMUNITY_TEAM_PROVIDER'];
    if (ev) {
      // Check if it actually mentiones "ally" or "team"
      if (!ev.snippet.toLowerCase().includes('ally') && !ev.snippet.toLowerCase().includes('team')) {
        problematic.push({
          hero: hero.name,
          tag: 'CC_IMMUNITY_TEAM_PROVIDER',
          snippet: ev.snippet,
          match: ev.match,
          reason: 'No explicit ally/team context - could be self-buff'
        });
      }
    }
  }

  // == DAMAGE_REDUCTION_TEAM_PROVIDER: check for self-only ==
  if (tags.includes('DAMAGE_REDUCTION_TEAM_PROVIDER')) {
    const ev = prof.evidenceByTag['DAMAGE_REDUCTION_TEAM_PROVIDER'];
    if (ev) {
      const snip = ev.snippet.toLowerCase();
      if (!snip.includes('ally') && !snip.includes('team') && snip.includes('self') || snip.includes('herself') || snip.includes('himself')) {
        problematic.push({
          hero: hero.name,
          tag: 'DAMAGE_REDUCTION_TEAM_PROVIDER',
          snippet: ev.snippet,
          match: ev.match,
          reason: 'Could be self-damage reduction'
        });
      }
    }
  }
});

console.log(`Found ${problematic.length} potentially problematic patterns:\n`);

if (problematic.length === 0) {
  console.log('✓ No obvious false positives detected!');
} else {
  problematic.forEach((p, idx) => {
    console.log(`${idx + 1}. ${p.hero.toUpperCase()} [${p.tag}]`);
    console.log(`   Reason: ${p.reason}`);
    console.log(`   Match: "${p.match}"`);
    console.log(`   Context: ${p.snippet.substring(0, 120)}...`);
    console.log();
  });
}
