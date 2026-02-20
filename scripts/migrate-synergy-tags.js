// scripts/migrate-synergy-tags.js
// Migrates old synergy tag names to new ones in all hero JSON files

import fs from "node:fs/promises";
import path from "node:path";

const HERO_DIR = "src/data/heroes";

// Mapping: old tag name → new tag name
const TAG_MIGRATION = {
  "ATK_SPEED_SELF_ONLY": "ATK_SPEED",
  "DAMAGE_REDUCTION_SELF": "DMG_RED",
  "HIT_AVOIDANCE_SELF": "HIT_AVOID",
  "SELF_HEAL": "HEAL",
  "SELF_SHIELD": "SHIELD",
  "STEALS_ATTRIBUTES": "REDUCES_ATTRIBUTES",
};

async function migrateTags() {
  const files = await fs.readdir(HERO_DIR);
  let totalUpdated = 0;
  
  for (const file of files) {
    if (!file.endsWith(".json") || file === "index.js") continue;
    
    const filePath = path.join(HERO_DIR, file);
    const content = await fs.readFile(filePath, "utf-8");
    let hero = JSON.parse(content);
    
    if (!Array.isArray(hero.synergies) || hero.synergies.length === 0) {
      continue;
    }
    
    // Migrate tag names
    let updated = false;
    const newSynergies = hero.synergies.map(tag => {
      if (TAG_MIGRATION[tag]) {
        console.log(`  ${hero.name}: ${tag} → ${TAG_MIGRATION[tag]}`);
        updated = true;
        return TAG_MIGRATION[tag];
      }
      return tag;
    });
    
    if (updated) {
      hero.synergies = newSynergies;
      await fs.writeFile(
        filePath,
        JSON.stringify(hero, null, 2) + "\n",
        "utf-8"
      );
      totalUpdated++;
      console.log(`✅ ${hero.name}: tags migrated`);
    }
  }
  
  console.log(`\n🎉 Migration complete! ${totalUpdated} heroes updated.`);
}

migrateTags().catch((e) => {
  console.error("❌ Migration failed:", e);
  process.exit(1);
});
