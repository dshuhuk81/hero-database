import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

const functionsDir = resolve('.vercel/output/functions');
const TARGET_RUNTIME = 'nodejs20.x';

console.log(`\n🔧 Fixing Vercel runtime configuration...`);
console.log(`📁 Functions directory: ${functionsDir}\n`);

try {
  // Find all .func directories
  const funcDirs = readdirSync(functionsDir).filter(name => {
    const fullPath = join(functionsDir, name);
    return statSync(fullPath).isDirectory() && name.endsWith('.func');
  });

  console.log(`Found ${funcDirs.length} function(s) to check\n`);
  let updatedCount = 0;
  
  for (const funcDir of funcDirs) {
    const configPath = join(functionsDir, funcDir, '.vc-config.json');
    
    try {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      
      if (config.runtime) {
        const oldRuntime = config.runtime;
        if (oldRuntime !== TARGET_RUNTIME) {
          config.runtime = TARGET_RUNTIME;
          writeFileSync(configPath, JSON.stringify(config, null, 2));
          console.log(`✅ ${funcDir}: ${oldRuntime} → ${TARGET_RUNTIME}`);
          updatedCount++;
        } else {
          console.log(`✓ ${funcDir}: Already using ${TARGET_RUNTIME}`);
        }
      } else {
        console.log(`⚠️  ${funcDir}: No runtime field found`);
      }
    } catch (err) {
      console.error(`❌ ${funcDir}: ${err.message}`);
    }
  }
  
  console.log(`\n${'='.repeat(50)}`);
  if (updatedCount > 0) {
    console.log(`✅ Fixed ${updatedCount} function(s) runtime configuration`);
  } else {
    console.log(`✅ All functions already using correct runtime`);
  }
  console.log(`${'='.repeat(50)}\n`);
} catch (error) {
  console.error(`\n❌ Failed to fix runtime: ${error.message}\n`);
  process.exit(1);
}
