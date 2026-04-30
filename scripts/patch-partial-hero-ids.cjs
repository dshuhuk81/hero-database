const fs = require('fs');
const path = require('path');

const mappingPath = path.join(__dirname, '../src/data/game_id_mapping.json');
const data = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

// Results from hero_skin.lua lookup
const updates = {
  anubis:      { game_hero_id: 3001 },
  ares:        { game_hero_id: 2002 },
  athena:      { game_hero_id: 2006 },
  bastet:      { game_hero_id: 2005 },
  cronus:      { game_hero_id: 5007 },
  demeter:     { game_hero_id: 3003 },
  geb:         { game_hero_id: 2004 },
  gemini:      { game_hero_id: 301  },
  heracles:    { game_hero_id: 2009 },
  hladgunnr:   { game_hero_id: 4009 },
  khepri:      { game_hero_id: 1007 },
  mengpo:      { game_hero_id: 4010 },
  meret:       { game_hero_id: 2010 },
  momus:       { game_hero_id: 1008 },
  nuba:        { game_hero_id: 3010 },
  phoenix:     { game_hero_id: 2008 },
  prometheus:  { game_hero_id: 4006 },
  sagittarius: { game_hero_id: 203  },
  taurus:      { game_hero_id: 402  },
  tefnut:      { game_hero_id: 1009 },
  ullr:        { game_hero_id: 4008 },
};

let updated = 0;
let skipped = 0;

for (const [heroKey, patch] of Object.entries(updates)) {
  const entry = data[heroKey];
  if (!entry) {
    console.warn('MISSING hero key in mapping:', heroKey);
    skipped++;
    continue;
  }
  if (entry.status !== 'internal_name_known') {
    console.warn('Skipping ' + heroKey + ' - unexpected status: ' + entry.status);
    skipped++;
    continue;
  }
  entry.game_hero_id = patch.game_hero_id;
  entry.match_confidence = 'high';
  entry.match_method = 'hero_skin_lua';
  entry.status = 'ok';
  entry.notes = null;
  console.log('Updated: ' + heroKey + ' -> ' + patch.game_hero_id);
  updated++;
}

fs.writeFileSync(mappingPath, JSON.stringify(data, null, 2) + '\n');
console.log('\nDone: ' + updated + ' updated, ' + skipped + ' skipped.');
