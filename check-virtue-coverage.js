const fs = require('fs');
const path = require('path');

// Read virtues.json
const virtues = JSON.parse(fs.readFileSync('src/data/virtues.json', 'utf8'));

// Read all PNG files
const assetsDir = 'public/images/virtues';
const assetFiles = fs.readdirSync(assetsDir).filter(f => /\.png$/i.test(f));

// Normalize function
function normalize(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Build asset map like Astro does
const assetMap = {};
for (const file of assetFiles) {
  const base = file.replace(/\.png$/i, '');
  const normalized = normalize(base);
  const isRare = / 2$/.test(base);
  const key = isRare ? (normalized + '_rare') : normalized;
  assetMap[key] = file;
}

// Count coverage for each rarity and type
const covered = {};
const uncovered = {};

for (const v of virtues) {
  const key = normalize(v.name) + (v.rarity === 'purple' ? '_rare' : '');
  const status = assetMap[key] ? 'covered' : 'uncovered';
  const group = v.type + '/' + v.rarity;
  
  if (status === 'covered') {
    covered[group] = (covered[group] || 0) + 1;
  } else {
    if (!uncovered[group]) uncovered[group] = [];
    uncovered[group].push(v.name);
  }
}

console.log('COVERED:');
Object.entries(covered).sort().forEach(([k, v]) => console.log('  ' + k + ': ' + v));
console.log('\nUNCOVERED:');
Object.entries(uncovered).sort().forEach(([k, v]) => console.log('  ' + k + ': ' + v.length + ' virtues'));

console.log('\n--- Detailed Coverage ---');
console.log('Total Virtues:', virtues.length);
console.log('Total Assets:', Object.keys(assetMap).length);
console.log('Covered Virtues:', Object.values(covered).reduce((a, b) => a + b, 0));
console.log('Uncovered Virtues:', Object.values(uncovered).reduce((a, b) => a + b.length, 0));
