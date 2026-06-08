const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const XLSX_FILE = 'InfoChartUpdated.xlsx';
const SUIT_SHEETS = ['Hearts', 'Clubs', 'Diamond', 'Spade', 'Celestials'];

// Column indices within each suit sheet (row 0 = header)
const COL = {
  unit: 0,
  relic: 1,
  usedIn: 2,
  explanation: 3,
  pveEarly: 4,
  pveLate: 5,
  pvp: 6,
  overall: 7,
  f2p: 8,
};

// Overall T-tier -> letter grade (from ratings-interpreter.json)
function convertTier(tier) {
  if (!tier) return '';
  const t = tier.toString().trim().toLowerCase();
  // Range like T0.5-T1 -> take lower bound
  const rangeMatch = t.match(/^t(\d+(?:\.\d+)?)-t(\d+(?:\.\d+)?)/);
  if (rangeMatch) return convertTier('T' + rangeMatch[1]);
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

// PvE Early / PvE Late / PvP cells are already letter grades. Pass through.
function cleanGrade(v) {
  if (v === null || v === undefined) return '';
  const s = v.toString().replace(/\r\n|\r|\n/g, '').replace(/\s+/g, '').trim();
  if (!s || s.toUpperCase() === 'TBA') return '';
  return s;
}

// Line-list fields (relic / used-in / f2p): newline -> " / "
function cleanList(v) {
  if (v === null || v === undefined) return '';
  let s = v.toString()
    .replace(/\r\n|\r|\n/g, ' / ')
    .replace(/—|–/g, '-')
    .replace(/--+/g, '-')
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s+,/g, ',')
    .replace(/\s+\./g, '.')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
  s = s.replace(/^(\s*\/\s*)+/, '').replace(/(\s*\/\s*)+$/, '').trim();
  return s;
}

// Prose field (explanation): newline -> sentence break unless already terminated
function cleanProse(v) {
  if (v === null || v === undefined) return '';
  return v.toString()
    .replace(/\s*(?:\r\n|\r|\n)+\s*/g, (m, off, str) => {
      const prev = str.slice(0, off).replace(/\s+$/, '').slice(-1);
      return /[.!?:]/.test(prev) || prev === '' ? ' ' : '. ';
    })
    .replace(/—|–/g, '-')
    .replace(/--+/g, '-')
    .replace(/\s+,/g, ',')
    .replace(/\s+\./g, '.')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

// Excel display name -> hero-ratings.json / invest.json key
const nameToKey = {
  // Hearts
  'Meng Po': 'mengpo',
  'Caishen': 'caishen',
  'Yuelao': 'yuelao',
  'Cancer': 'cancer',
  'Hephaestus': 'hephaestus',
  'Jingwei': 'jingwei',
  'Yanluo': 'yanluo',
  'Hladgunnr': 'hladgunnr',
  'Prometheus': 'prometheus',
  'Isis': 'isis',
  'Ullr': 'ullr',
  'Surtr': 'surtr',
  // Clubs
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
  'Eris': 'eris',
  // Diamond
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
  'Serket': 'serket',
  // Spade
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
  // Celestials
  'Zeus': 'zeus',
  'Nezha': 'nezha',
  'Chronos': 'cronus',
  'Amun': 'amunra',
  'Nuwa': 'nuwa',
  'Dionysus': 'dionysus',
  'Nyx': 'nyx',
  'Hera': 'hera',
};

const root = path.join(__dirname, '..');
const wb = XLSX.readFile(path.join(root, XLSX_FILE));

const ratingUpdates = {};
const investUpdates = {};
const warnings = [];

for (const sheetName of SUIT_SHEETS) {
  const ws = wb.Sheets[sheetName];
  if (!ws) { warnings.push(`Missing sheet: ${sheetName}`); continue; }
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row[COL.unit] === null || row[COL.unit] === undefined) continue;
    const rawName = row[COL.unit].toString();
    const name = rawName.replace(/\r\n|\r|\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (!name || name === 'Unit') continue;

    const key = nameToKey[name];
    if (!key) { warnings.push(`No key mapping for "${name}" (sheet ${sheetName})`); continue; }

    const pveEarly = cleanGrade(row[COL.pveEarly]);
    const pveLate = cleanGrade(row[COL.pveLate]);
    const pvp = cleanGrade(row[COL.pvp]);
    const overall = convertTier((row[COL.overall] || '').toString());

    ratingUpdates[key] = {
      overall,
      pvp,
      pveEarly,
      pveLate,
      pve: pveLate, // backward compat: endgame value
    };

    investUpdates[key] = {
      relicRecommendation: cleanList(row[COL.relic]),
      usedIn: cleanList(row[COL.usedIn]),
      explanation: cleanProse(row[COL.explanation]),
      f2pInvestment: cleanList(row[COL.f2p]),
    };
  }
}

// --- hero-ratings.json ---
const ratingsPath = path.join(root, 'src', 'data', 'ratings', 'hero-ratings.json');
const ratings = JSON.parse(fs.readFileSync(ratingsPath, 'utf8'));

let rUpdated = 0;
let rCleared = 0;
for (const key of Object.keys(ratings)) {
  const u = ratingUpdates[key];
  if (u) {
    ratings[key].overall = u.overall;
    ratings[key].pvp = u.pvp;
    ratings[key].pveEarly = u.pveEarly;
    ratings[key].pveLate = u.pveLate;
    ratings[key].pve = u.pve;
    rUpdated++;
  } else {
    ratings[key].overall = '';
    ratings[key].pvp = '';
    ratings[key].pveEarly = '';
    ratings[key].pveLate = '';
    ratings[key].pve = '';
    rCleared++;
  }
}
fs.writeFileSync(ratingsPath, JSON.stringify(ratings, null, 2) + '\n');

// --- invest.json ---
const investPath = path.join(root, 'src', 'data', 'ratings', 'invest.json');
const invest = JSON.parse(fs.readFileSync(investPath, 'utf8'));

let iUpdated = 0;
let iAdded = 0;
for (const key of Object.keys(investUpdates)) {
  if (invest[key]) iUpdated++; else iAdded++;
  invest[key] = investUpdates[key];
}
// Drop invest entries no longer present in source
let iRemoved = 0;
for (const key of Object.keys(invest)) {
  if (!investUpdates[key]) { delete invest[key]; iRemoved++; }
}
fs.writeFileSync(investPath, JSON.stringify(invest, null, 2) + '\n');

console.log('hero-ratings.json  updated:', rUpdated, 'cleared:', rCleared);
console.log('invest.json        updated:', iUpdated, 'added:', iAdded, 'removed:', iRemoved);
const unmatched = Object.keys(ratings).filter(k => !ratingUpdates[k]);
console.log('Cleared (not in xlsx):', unmatched.join(', ') || '(none)');
if (warnings.length) {
  console.log('\nWARNINGS:');
  warnings.forEach(w => console.log(' -', w));
}
