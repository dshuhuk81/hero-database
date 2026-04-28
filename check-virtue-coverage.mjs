import fs from 'fs';

// Read virtues.json
const virtues = JSON.parse(fs.readFileSync('src/data/virtues.json', 'utf8'));

// Read all PNG files
const assetsDir = 'public/images/virtues';
const assetFiles = fs.readdirSync(assetsDir).filter(f => /\.png$/i.test(f));

// Normalize function
function normalize(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Map rarity suffixes to JSON rarity values
const rarityMap = {
  '_elite': 'gold',
  '_rare': 'blue',
  '_epic': 'purple',
  '_legendary': 'red'
};

// Build asset map like new Astro logic
const assetMap = {};
for (const file of assetFiles) {
  const baseName = file.replace(/\.png$/i, '');
  
  // Check for rarity suffix and extract base name
  let normalized = normalize(baseName);
  let rarity = 'gold'; // default
  
  for (const [suffix, rarityValue] of Object.entries(rarityMap)) {
    if (baseName.endsWith(suffix)) {
      const baseWithoutSuffix = baseName.slice(0, -suffix.length);
      normalized = normalize(baseWithoutSuffix);
      rarity = rarityValue;
      break;
    }
  }
  
  // Create key: virtue name normalized + rarity suffix if not gold
  const key = rarity === 'gold' ? normalized : (normalized + '_' + rarity);
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
