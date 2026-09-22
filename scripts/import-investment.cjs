const fs = require('node:fs');
const path = require('node:path');

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSIOOII1eRI2hyNAzpy51sRkmLX5_gO_hsHPEmJBuoR0lYu-lfhokDhPDDLjvZzS447fZvYmKUEc8b0/pub?gid=176811164&single=true&output=csv';
const ROOT = path.join(__dirname, '..');
const INVEST_PATH = path.join(ROOT, 'src/data/ratings/invest.json');
const HEROES_DIR = path.join(ROOT, 'src/data/heroes');
const REQUIRED_COLUMNS = ['id', 'Relic Min', 'Relic Recommended', 'Throne'];
const INVESTMENT_FIELDS = ['relicMin', 'relicRec', 'throne'];

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

function cleanLevel(value) {
  const cleaned = String(value ?? '').trim();
  const numericValue = cleaned.match(/^(\d+)(?:\s*[-–—]\s*\d+)?$/);
  if (!numericValue) return 0;
  const level = Number(numericValue[1]);
  return Number.isSafeInteger(level) ? level : 0;
}

function normalizedEntry(entry = {}) {
  return {
    ...entry,
    relicMin: cleanLevel(entry.relicMin),
    relicRec: cleanLevel(entry.relicRec),
    throne: cleanLevel(entry.throne),
  };
}

function changedFields(before, after) {
  return INVESTMENT_FIELDS.filter((field) => before?.[field] !== after[field]);
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

  console.log(`Fetching investment levels from Google Sheets${dryRun ? ' (dry run)' : ''}...`);
  const rows = parseCsv(await fetchSheet());
  const headerIndex = rows.findIndex((row) => {
    const cells = row.map((cell) => cell.trim());
    return REQUIRED_COLUMNS.every((column) => cells.includes(column));
  });
  if (headerIndex === -1) throw new Error('Could not find the investment header row.');

  const headers = rows[headerIndex].map((header) => header.trim());
  const missingColumns = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
  if (missingColumns.length) throw new Error(`Missing required column(s): ${missingColumns.join(', ')}.`);

  const existing = JSON.parse(fs.readFileSync(INVEST_PATH, 'utf8'));
  const investment = Object.fromEntries(
    Object.entries(existing).map(([id, entry]) => [id, normalizedEntry(entry)]),
  );
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
    if (!heroIds.has(id)) throw new Error(`${id}: hero JSON does not exist.`);
    seenIds.add(id);

    const next = {
      ...(investment[id] ?? {}),
      relicMin: cleanLevel(source['Relic Min']),
      relicRec: cleanLevel(source['Relic Recommended']),
      throne: cleanLevel(source.Throne),
    };
    const fields = changedFields(existing[id], next);
    if (fields.length) changes.push({ id, fields });
    investment[id] = next;
  }

  if (!seenIds.size) throw new Error('The investment sheet contains no hero rows.');

  const missingFromSheet = Object.keys(investment).filter((id) => !seenIds.has(id));
  const fieldChangeCount = changes.reduce((sum, change) => sum + change.fields.length, 0);
  console.log(`Validated ${seenIds.size} sheet rows.`);
  console.log(`${changes.length} heroes have ${fieldChangeCount} changed investment fields.`);
  if (changes.length) {
    for (const change of changes) console.log(`  ${change.id}: ${change.fields.join(', ')}`);
  }
  console.log(`Not present in sheet (preserved): ${missingFromSheet.join(', ') || '(none)'}`);

  if (dryRun) {
    console.log('Dry run complete. No files were written.');
    return;
  }

  fs.writeFileSync(INVEST_PATH, `${JSON.stringify(investment, null, 2)}\n`, 'utf8');
  console.log(`Updated ${path.relative(ROOT, INVEST_PATH)}.`);
}

run().catch((error) => {
  console.error(`Investment import failed: ${error.message}`);
  process.exitCode = 1;
});
