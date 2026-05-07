const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// T-tier to letter grade mapping (from ratings-interpreter.json)
function convertTier(tier) {
  if (!tier) return '';
  const t = tier.toString().trim().toLowerCase();
  // Handle range like T0.5-T1: take lower bound
  const rangeMatch = t.match(/^t(\d+(?:\.\d+)?)-t(\d+(?:\.\d+)?)/);
  if (rangeMatch) {
    return convertTier('T' + rangeMatch[1]);
  }
  const numMatch = t.match(/^t(\d+(?:\.\d+)?)/);
  if (!numMatch) return '';
  const num = parseFloat(numMatch[1]);
  if (num === 0) return 'S+';
  if (num === 0.5) return 'S';
  if (num === 1) return 'A+';
  if (num === 2) return 'A';
  if (num === 3) return 'B+';
  if (num >= 4 && num <= 5) return 'B';
  if (num >= 6 && num <= 8) return 'C';
  if (num >= 9 && num <= 10) return 'D';
  return '';
}

// Excel display name to hero-ratings.json key mapping
const nameToKey = {
  'Zeus': 'zeus',
  'Nezha': 'nezha',
  'Chronos': 'cronus',
  'Nuwa': 'nuwa',
  'Amunra': 'amunra',
  'Dionysus': 'dionysus',
  'Nyx': 'nyx',
  'Skadi': 'skadi',
  'Poseidon': 'poseidon',
  'Hecate': 'hecate',
  'Khepri': 'khepri',
  'Tefnut': 'tefnut',
  'Momus': 'momus',
  'Iris': 'iris',
  'Hela': 'hela',
  'Nemesis': 'nemesis',
  'Medusa': 'medusa',
  'Meret': 'meret',
  'Hercules': 'heracles',
  'Bastet': 'bastet',
  'Phoenix': 'phoenix',
  'Set': 'set',
  'Athena': 'athena',
  'Sekhmet': 'sekhmet',
  'Ares': 'ares',
  'Geb': 'geb',
  'Horus': 'horus',
  'Wen Shen': 'wenshen',
  'Nuba': 'nuba',
  'Anubis': 'anubis',
  'Pan': 'pan',
  'Jormungandr': 'jormungandr',
  'Diana': 'diana',
  'Capricorn': 'capricorn',
  'Fengyi': 'fengyi',
  'Artemis': 'artemis',
  'Demeter': 'demeter',
  'Freya': 'freya',
  'Meng Po': 'mengpo',
  'Caishen': 'caishen',
  'Yuelao': 'yuelao',
  'Cancer': 'cancer',
  'Hephaestus': 'hephaestus',
  'Jingwei': 'jingwei',
  'Hladgunnr': 'hladgunnr',
  'Yanluo': 'yanluo',
  'Prometheus': 'prometheus',
  'Isis': 'isis',
  'Ullr': 'ullr',
  'Surtr': 'surtr'
};

// Read Excel
const wb = XLSX.readFile(path.join(__dirname, '..', 'Ratings.xlsx'));
const ws = wb.Sheets['Ratings'];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

// Build updates map from Excel rows
const updates = {};
rows.forEach(row => {
  if (!row[0] || row[0].toString().trim() === 'Unit') return;
  const name = row[0].toString().trim().replace(/\r\n/g, ' ').replace(/\s+/g, ' ');
  const pve = (row[4] || '').toString().trim().replace(/\r\n/g, '').replace(/\s+/g, '');
  const pvp = (row[5] || '').toString().trim().replace(/\r\n/g, '').replace(/\s+/g, '');
  const overall = (row[6] || '').toString().trim().replace(/\r\n/g, '').replace(/\s+/g, '');

  const key = nameToKey[name];
  if (!key) {
    console.log('WARNING: No key mapping for Excel name:', name);
    return;
  }
  updates[key] = {
    overall: convertTier(overall),
    pvp: pvp === 'TBA' ? '' : pvp,
    pve: pve
  };
});

// Read hero-ratings.json
const ratingsPath = path.join(__dirname, '..', 'src', 'data', 'ratings', 'hero-ratings.json');
const ratings = JSON.parse(fs.readFileSync(ratingsPath, 'utf8'));

// Apply updates
let updated = 0;
let cleared = 0;
for (const key of Object.keys(ratings)) {
  if (updates[key]) {
    ratings[key].overall = updates[key].overall;
    ratings[key].pvp = updates[key].pvp;
    ratings[key].pve = updates[key].pve;
    updated++;
  } else {
    ratings[key].overall = '';
    ratings[key].pvp = '';
    ratings[key].pve = '';
    cleared++;
  }
}

fs.writeFileSync(ratingsPath, JSON.stringify(ratings, null, 2) + '\n');
console.log('Updated:', updated, 'heroes');
console.log('Cleared:', cleared, 'heroes');
const unmatched = Object.keys(ratings).filter(k => !updates[k]);
console.log('Unmatched in Excel (cleared):', unmatched.join(', '));
