import fs from 'fs';

function normalize(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const rarityMap = {
  '_elite': 'gold',
  '_rare': 'blue',
  '_epic': 'purple',
  '_legendary': 'red'
};

// Get files and their rarities
const assetsByVirtue = {};
const assetsDir = 'public/images/virtues';
for (const file of fs.readdirSync(assetsDir).filter(f => /\.png$/i.test(f))) {
  const baseName = file.replace(/\.png$/i, '');
  
  let normalized = normalize(baseName);
  let fileRarity = 'gold';
  
  for (const [suffix, rarityValue] of Object.entries(rarityMap)) {
    if (baseName.endsWith(suffix)) {
      const baseWithoutSuffix = baseName.slice(0, -suffix.length);
      normalized = normalize(baseWithoutSuffix);
      fileRarity = rarityValue;
      break;
    }
  }
  
  if (!assetsByVirtue[normalized]) assetsByVirtue[normalized] = [];
  assetsByVirtue[normalized].push({ name: baseName, rarity: fileRarity });
}

// Get virtues and their JSON rarities
const virtues = JSON.parse(fs.readFileSync('src/data/virtues.json', 'utf8'));
const virtuesByNorm = {};
for (const v of virtues) {
  const norm = normalize(v.name);
  if (!virtuesByNorm[norm]) virtuesByNorm[norm] = [];
  virtuesByNorm[norm].push({ name: v.name, rarity: v.rarity });
}

console.log('=== MISMATCHES: Files vs JSON ===');
let mismatchCount = 0;
for (const [norm, files] of Object.entries(assetsByVirtue)) {
  const jsonVirtues = virtuesByNorm[norm] || [];
  
  // Check if rarities match
  const fileRarities = files.map(f => f.rarity).sort();
  const jsonRarities = jsonVirtues.map(v => v.rarity).sort();
  
  if (JSON.stringify(fileRarities) !== JSON.stringify(jsonRarities)) {
    mismatchCount++;
    console.log(`${norm}:`);
    console.log(`  Files: ${files.map(f => f.rarity + ' (' + f.name + ')').join(', ')}`);
    console.log(`  JSON:  ${jsonVirtues.map(v => v.rarity + ' (' + v.name + ')').join(', ')}`);
  }
}

console.log(`\nTotal mismatches: ${mismatchCount}`);
