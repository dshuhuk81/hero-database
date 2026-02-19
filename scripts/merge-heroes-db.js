import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const heroesDir = path.join(__dirname, '../src/data/heroes');
const outputFile = path.join(__dirname, '../src/data/all_heroes_db.json');

async function mergeHeroesDB() {
  try {
    const files = fs.readdirSync(heroesDir).filter(file => {
      return file.endsWith('.json') && file !== 'index.json';
    });

    const allHeroes = {};

    for (const file of files) {
      const filePath = path.join(heroesDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const heroData = JSON.parse(content);
      
      if (heroData.id) {
        allHeroes[heroData.id] = heroData;
      }
    }

    fs.writeFileSync(outputFile, JSON.stringify(allHeroes, null, 2));
    console.log(`✓ Merged ${Object.keys(allHeroes).length} heroes into ${outputFile}`);
  } catch (error) {
    console.error('Error merging heroes database:', error);
    process.exit(1);
  }
}

mergeHeroesDB();
