// scripts/add-synergies-field.js
// Fügt leeres "synergies" Array zu jeder hero/*.json hinzu (wenn nicht vorhanden)

import fs from "node:fs/promises";
import path from "node:path";

const HERO_DIR = "src/data/heroes";

async function addSynergiesField() {
  const files = await fs.readdir(HERO_DIR);
  
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    
    const filePath = path.join(HERO_DIR, file);
    const content = await fs.readFile(filePath, "utf-8");
    let hero = JSON.parse(content);
    
    // Wenn synergies nicht vorhanden → hinzufügen
    if (!hero.synergies) {
      hero.synergies = [];
      
      await fs.writeFile(
        filePath,
        JSON.stringify(hero, null, 2) + "\n",
        "utf-8"
      );
      
      console.log(`✅ ${hero.name}: synergies field added`);
    } else {
      console.log(`⏭️  ${hero.name}: synergies field already exists`);
    }
  }
  
  console.log("\n✨ Done!");
}

addSynergiesField();
