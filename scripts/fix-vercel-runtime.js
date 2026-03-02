import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

const functionsDir = resolve('.vercel/output/functions');

try {
  // Find all .func directories
  const funcDirs = readdirSync(functionsDir).filter(name => {
    const fullPath = join(functionsDir, name);
    return statSync(fullPath).isDirectory() && name.endsWith('.func');
  });

  let updatedCount = 0;
  
  for (const funcDir of funcDirs) {
    const configPath = join(functionsDir, funcDir, '.vc-config.json');
    
    try {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      
      if (config.runtime && config.runtime !== 'nodejs20.x') {
        config.runtime = 'nodejs20.x';
        writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log(`✓ Updated ${funcDir} runtime to nodejs20.x`);
        updatedCount++;
      }
    } catch (err) {
      console.warn(`⚠ Could not update ${funcDir}:`, err.message);
    }
  }
  
  if (updatedCount > 0) {
    console.log(`✓ Fixed ${updatedCount} function(s) runtime configuration`);
  } else {
    console.log('✓ All functions already using correct runtime');
  }
} catch (error) {
  console.error('Failed to fix runtime:', error.message);
  process.exit(1);
}
