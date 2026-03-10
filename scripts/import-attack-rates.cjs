const fs = require('fs');
const path = require('path');
const https = require('https');

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vROn2ebP-9DjI7vH4-0111y9AGPYDDm8Si9CfpXTgD_vB6COnoJTPXAqdlb5pYf7yPOO52GAboBbMPO/pub?gid=2002681135&single=true&output=csv';
const HEROES_DIR = path.join(__dirname, '../src/data/heroes');

function fetchSheet() {
  return new Promise((resolve, reject) => {
    https.get(SHEET_URL, (res) => {
      // Follow redirect
      if (res.statusCode === 302 || res.statusCode === 307) {
        https.get(res.headers.location, (redirRes) => {
          let data = '';
          redirRes.on('data', (chunk) => data += chunk);
          redirRes.on('end', () => resolve(data));
        }).on('error', reject);
        return;
      }
      
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function extractNumber(str) {
  if (!str) return 0;
  // Remove dots and convert to number (e.g. "50.664.000" -> 50664000)
  return Number(str.replace(/\./g, ''));
}

async function run() {
  console.log('Fetching Google Sheet as CSV...');
  const csvText = await fetchSheet();
  
  const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  // Find header row (the one containing 'Name')
  const headerIdx = lines.findIndex(l => l.includes('Name') && l.includes('ATK'));
  if (headerIdx === -1) {
    console.error('Could not find header row');
    return;
  }
  
  const headers = lines[headerIdx].split(',').map(h => h.trim());
  const nameIdx = headers.findIndex(h => h === 'Name');
  const atkIdx = headers.findIndex(h => h === 'ATK');
  // Handle exact or partial matches since spreadsheet names might slightly vary based on export
  const dmgIdx = headers.findIndex(h => h.includes('Damage (No skill Ultimate used)') || h.includes('Damage (No skills)'));
  const durationIdx = headers.findIndex(h => h.includes('Duration'));
  const ultimatesIdx = headers.findIndex(h => h === 'Ultimate used' || h === 'Ultimates used');
  
  if (nameIdx === -1 || atkIdx === -1 || dmgIdx === -1) {
    console.error('Missing required columns in CSV (Name, ATK, or Damage without Ult)');
    return;
  }
  
  let updatedCount = 0;
  
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    if (cols.length <= dmgIdx) continue;
    
    const heroName = cols[nameIdx];
    if (!heroName) continue;
    
    const atkStr = cols[atkIdx];
    const dmgStr = cols[dmgIdx];
    const durationStr = cols[durationIdx] || '90s';
    const ultimatesStr = ultimatesIdx !== -1 ? cols[ultimatesIdx] : '';
    
    if (!atkStr || !dmgStr) continue;
    
    const atk = extractNumber(atkStr);
    const dmg = extractNumber(dmgStr);
    const durationMatch = durationStr.match(/(\d+)/);
    const duration = durationMatch ? Number(durationMatch[1]) : 90;
    const ultimatesPer90s = ultimatesStr ? Number(ultimatesStr) : null;
    
    if (atk > 0 && dmg > 0) {
      const baseAttackRate = Number(((dmg / atk) / duration).toFixed(3));
      console.log(`Calculated ${heroName}: ATK ${atk}, Dmg ${dmg} in ${duration}s = ${baseAttackRate} attacks/sec${ultimatesPer90s !== null ? ` | Ults: ${ultimatesPer90s}` : ''}`);
      
      const formattedHeroId = heroName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const heroFilePath = path.join(HEROES_DIR, `${formattedHeroId}.json`);
      
      if (fs.existsSync(heroFilePath)) {
        const heroData = JSON.parse(fs.readFileSync(heroFilePath, 'utf8'));
        heroData.baseAttackRate = baseAttackRate;
        if (ultimatesPer90s !== null) {
          heroData.bossUltimatesPer90s = ultimatesPer90s;
        }
        fs.writeFileSync(heroFilePath, JSON.stringify(heroData, null, 2) + '\n', 'utf8');
        updatedCount++;
        console.log(`  -> Updated ${formattedHeroId}.json`);
      }
    }
  }
  
  console.log(`\nSuccess! Updated ${updatedCount} heroes with accurate baseAttackRate.`);
}

run().catch(console.error);
