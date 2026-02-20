// scripts/tag-manager-server.js
// CMS Backend für Synergy Tag Management

import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HERO_DIR = path.join(__dirname, '../src/data/heroes');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../tag-manager-frontend')));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

// Alle verfügbaren Synergy Tags
const AVAILABLE_TAGS = [
  // A) TEAM SUPPORT / BUFF PROVIDER (9 Tags) - alphabetically sorted
  'ATK_SPD_UP',
  'BUFF_TEAM',
  'CC_IMMUNITY_TEAM',
  'CDR_TEAM',
  'DAMAGE_REDUCTION_TEAM',
  'DEBUFF_CLEANSE_TEAM',
  'ENERGY_RESTORE_TEAM',
  'HEAL_TEAM',
  'SHIELD_TEAM',
  
  // B) ENEMY DEBUFF / CROWD CONTROL (9 Tags) - alphabetically sorted
  'ATK_DOWN',
  'ATK_SPD_DOWN',
  'BUFF_DISPEL',
  'CROWD_CONTROL',
  'ENEMY_VULNERABILITY',
  'ENERGY_DRAIN',
  'REDUCES_ATTRIBUTES',
  'REMOVES_ARMOR',
  'TAUNT',
  
  // C) PLAYSTYLE / GAMEPLAY MECHANICS (2 Tags) - alphabetically sorted
  'AREA_DAMAGE_DEALER',
  'BASIC_ATTACK_SCALER',
  
  // D) SELF BUFFS / DEFENSIVES (13 Tags) - alphabetically sorted
  'ATK_SPEED',
  'ATK_UP',
  'CC_RESISTANCE',
  'DMG_RED',
  'DODGE_BUFF',
  'ENERGY_RESTORE',
  'GAIN_ARMOR',
  'HEAL',
  'HEAL_EFFECT_UP',
  'HIT_AVOID',
  'HP_UP',
  'LIFE_STEAL_UP',
  'SHIELD',
];

// GET /api/tags - returns all available tags
app.get('/api/tags', (req, res) => {
  res.json(AVAILABLE_TAGS);
});

// GET /api/heroes - returns all heroes with their synergies
app.get('/api/heroes', async (req, res) => {
  try {
    const files = await fs.readdir(HERO_DIR);
    const heroes = [];

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filePath = path.join(HERO_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const hero = JSON.parse(content);

      if (hero.id) {
        heroes.push({
          id: hero.id,
          name: hero.name,
          class: hero.class,
          synergies: hero.synergies || [],
        });
      }
    }

    heroes.sort((a, b) => a.name.localeCompare(b.name));
    res.json(heroes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/heroes/:id/synergies - save synergies for a hero
app.post('/api/heroes/:id/synergies', async (req, res) => {
  try {
    const { id } = req.params;
    const { synergies } = req.body;

    if (!Array.isArray(synergies)) {
      return res.status(400).json({ error: 'synergies must be an array' });
    }

    // Validate all tags
    for (const tag of synergies) {
      if (!AVAILABLE_TAGS.includes(tag)) {
        return res.status(400).json({ error: `Invalid tag: ${tag}` });
      }
    }

    const filePath = path.join(HERO_DIR, `${id}.json`);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: `Hero not found: ${id}` });
    }

    // Read, update, write
    const content = await fs.readFile(filePath, 'utf-8');
    const hero = JSON.parse(content);

    hero.synergies = synergies;

    await fs.writeFile(filePath, JSON.stringify(hero, null, 2) + '\n', 'utf-8');

    res.json({
      success: true,
      message: `Synergies updated for ${hero.name}`,
      hero: {
        id: hero.id,
        name: hero.name,
        synergies: hero.synergies,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🎯 Synergy Tag Manager running on http://localhost:${PORT}`);
  console.log(`📝 Edit synergies at http://localhost:${PORT}\n`);
});
