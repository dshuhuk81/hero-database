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


// Debug Faith/Hope/Love singles
console.log('=== ASSET MAP ===');
Object.entries(assetMap)
  .filter(([k]) => ['faith', 'hope', 'love'].some(v => k.includes(v)))
  .sort()
  .forEach(([k, v]) => console.log(k, '->', v));

console.log('\n=== VIRTUES ===');
virtues
  .filter(v => ['faith', 'hope', 'love'].some(name => v.name.toLowerCase().includes(name)))
  .forEach(v => {
    const key = normalize(v.name) + (v.rarity === 'purple' ? '_rare' : '');
    const asset = assetMap[key];
    console.log(`${v.name} (${v.rarity}) -> key: "${key}" -> asset: ${asset || 'NOT FOUND'}`);
  });

