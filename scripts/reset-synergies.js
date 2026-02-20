// scripts/reset-synergies.js
// Setzt alle synergies auf leere Arrays zurück (für Migration zu neuen Tags)

import fs from "node:fs/promises";
import path from "node:path";

const HERO_DIR = "src/data/heroes";

async function resetSynergies() {
  const files = await fs.readdir(HERO_DIR);
  
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    
    const filePath = path.join(HERO_DIR, file);
    const content = await fs.readFile(filePath, "utf-8");
    let hero = JSON.parse(content);
    
    // Reset zu leeren Arrays
    hero.synergies = [];
    
    await fs.writeFile(
      filePath,
      JSON.stringify(hero, null, 2) + "\n",
      "utf-8"
    );
    
    console.log(`✅ ${hero.name}: synergies reset to []`);
  }
  
  console.log("\n✨ All heroes reset - ready for new tags!");
}

resetSynergies();
