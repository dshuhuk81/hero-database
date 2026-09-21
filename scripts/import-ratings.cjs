const fs = require('node:fs');
const path = require('node:path');

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQhEoBsd7thoXZOjsykAV_oDiHB-e1x2c6t3LiKSSRKritGxq39kS0xU_LgGBew7StjZR4LY94CMYt2/pub?gid=212086981&single=true&output=csv';
const ROOT = path.join(__dirname, '..');
const RATINGS_PATH = path.join(ROOT, 'src/data/ratings/hero-ratings.json');
const HEROES_DIR = path.join(ROOT, 'src/data/heroes');

const RATING_FIELDS = [
  'pveearly',
  'pvemidgame',
  'pveendgame',
  'pvpearly',
  'pvpmidgame',
  'pvpendgame',
];
const REQUIRED_COLUMNS = ['id', 'name', ...RATING_FIELDS, 'overallAdjustment', 'overallReason'];
const VALID_TIERS = new Set(['D', 'C', 'B', 'A', 'S', 'S+']);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (character !== '\r') {
      field += character;
    }
  }

  if (quoted) throw new Error('CSV ended inside a quoted field.');
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function cleanTier(value, context) {
  const tier = String(value ?? '').replace(/\s+/g, '').toUpperCase();
  if (!tier) return '';
  if (!VALID_TIERS.has(tier)) throw new Error(`${context}: invalid rating "${value}".`);
  return tier;
}

function cleanAdjustment(value, context) {
  const cleaned = String(value ?? '').trim();
  if (!cleaned) return 0;
  const adjustment = Number(cleaned);
  if (!Number.isInteger(adjustment) || Math.abs(adjustment) > 1) {
    throw new Error(`${context}: overallAdjustment must be -1, 0, or 1.`);
  }
  return adjustment;
}

function changedFields(before, after) {
  return [...RATING_FIELDS, 'overallAdjustment', 'overallReason']
    .filter((field) => before[field] !== after[field]);
}

async function fetchSheet() {
  const response = await fetch(SHEET_URL, { redirect: 'follow' });
  if (!response.ok) throw new Error(`Google Sheets returned HTTP ${response.status}.`);
  const csv = await response.text();
  if (!csv.trim() || /^\s*</.test(csv)) throw new Error('Google Sheets did not return CSV data.');
  return csv;
}

async function run() {
  const dryRun = process.argv.includes('--dry-run');
  const unknownArguments = process.argv.slice(2).filter((argument) => argument !== '--dry-run');
  if (unknownArguments.length) {
    throw new Error(`Unknown argument(s): ${unknownArguments.join(', ')}`);
  }

  console.log(`Fetching ratings from Google Sheets${dryRun ? ' (dry run)' : ''}...`);
  const rows = parseCsv(await fetchSheet());
  const headerIndex = rows.findIndex((row) => {
    const cells = row.map((cell) => cell.trim());
    return cells.includes('id') && cells.includes('pveearly') && cells.includes('pvpendgame');
  });
  if (headerIndex === -1) throw new Error('Could not find the ratings header row.');

  const headers = rows[headerIndex].map((header) => header.trim());
  const missingColumns = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
  if (missingColumns.length) throw new Error(`Missing required column(s): ${missingColumns.join(', ')}.`);

  const ratings = JSON.parse(fs.readFileSync(RATINGS_PATH, 'utf8'));
  const heroIds = new Set(
    fs.readdirSync(HEROES_DIR)
      .filter((file) => file.endsWith('.json'))
      .map((file) => JSON.parse(fs.readFileSync(path.join(HEROES_DIR, file), 'utf8')).id),
  );
  const seenIds = new Set();
  const changes = [];

  for (const cells of rows.slice(headerIndex + 1)) {
    const source = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']));
    const id = String(source.id).trim().toLowerCase();
    if (!id) continue;
    if (!/^[a-z0-9]+$/.test(id)) throw new Error(`Invalid hero id "${source.id}".`);
    if (seenIds.has(id)) throw new Error(`Duplicate hero id "${id}" in Google Sheets.`);
    seenIds.add(id);
    if (!heroIds.has(id)) throw new Error(`${id}: hero JSON does not exist.`);
    if (!ratings[id]) throw new Error(`${id}: hero-ratings.json entry does not exist.`);

    const next = { ...ratings[id] };
    for (const field of RATING_FIELDS) {
      next[field] = cleanTier(source[field], `${id}.${field}`);
    }
    next.overallAdjustment = cleanAdjustment(source.overallAdjustment, id);
    next.overallReason = String(source.overallReason ?? '').trim();
    if (next.overallAdjustment !== 0 && !next.overallReason) {
      throw new Error(`${id}: an Overall adjustment requires overallReason.`);
    }

    const fields = changedFields(ratings[id], next);
    if (fields.length) changes.push({ id, fields });
    ratings[id] = next;
  }

  if (!seenIds.size) throw new Error('The ratings sheet contains no hero rows.');

  const missingFromSheet = Object.keys(ratings).filter((id) => !seenIds.has(id));
  const fieldChangeCount = changes.reduce((sum, change) => sum + change.fields.length, 0);
  console.log(`Validated ${seenIds.size} sheet rows.`);
  console.log(`${changes.length} heroes have ${fieldChangeCount} changed rating fields.`);
  if (changes.length) {
    for (const change of changes) console.log(`  ${change.id}: ${change.fields.join(', ')}`);
  }
  console.log(`Not present in sheet (preserved): ${missingFromSheet.join(', ') || '(none)'}`);
  console.log('The sheet role column is intentionally ignored; tierClass remains manually curated.');

  if (dryRun) {
    console.log('Dry run complete. No files were written.');
    return;
  }

  fs.writeFileSync(RATINGS_PATH, `${JSON.stringify(ratings, null, 2)}\n`, 'utf8');
  console.log(`Updated ${path.relative(ROOT, RATINGS_PATH)}.`);
}

run().catch((error) => {
  console.error(`Rating import failed: ${error.message}`);
  process.exitCode = 1;
});
