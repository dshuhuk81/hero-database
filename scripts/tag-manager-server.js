// scripts/tag-manager-server.js
// CMS Backend für Synergy Tag Management

import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HERO_DIR = path.join(__dirname, '../src/data/heroes');
const TAGS_FILE = path.join(__dirname, '../src/data/tags.json');

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

// Load tags from file (single source of truth)
let AVAILABLE_TAGS = [];

async function loadTags() {
  try {
    const data = await fs.readFile(TAGS_FILE, 'utf-8');
    AVAILABLE_TAGS = JSON.parse(data);
  } catch (err) {
    console.error(`\n❌ FATAL: Cannot load tags from ${TAGS_FILE}`);
    console.error(`   Error: ${err.message}`);
    console.error(`\n   This file is the single source of truth for all tags.`);
    console.error(`   Make sure it exists and is valid JSON.\n`);
    process.exit(1);
  }
}

async function saveTags() {
  try {
    await fs.writeFile(TAGS_FILE, JSON.stringify(AVAILABLE_TAGS, null, 2) + '\n', 'utf-8');
  } catch (err) {
    console.error('Error saving tags:', err);
  }
}

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

// =====================
// TAG MANAGEMENT ENDPOINTS
// =====================

// POST /api/tags - Add a new tag
app.post('/api/tags', async (req, res) => {
  try {
    const { tag } = req.body;

    if (!tag || typeof tag !== 'string') {
      return res.status(400).json({ error: 'tag must be a non-empty string' });
    }

    if (AVAILABLE_TAGS.includes(tag)) {
      return res.status(400).json({ error: `Tag "${tag}" already exists` });
    }

    AVAILABLE_TAGS.push(tag);
    await saveTags();

    res.json({
      success: true,
      message: `Tag "${tag}" created`,
      tags: AVAILABLE_TAGS,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/tags/:oldTag - Rename a tag (updates all heroes)
app.put('/api/tags/:oldTag', async (req, res) => {
  try {
    const { oldTag } = req.params;
    const { newTag } = req.body;

    if (!newTag || typeof newTag !== 'string') {
      return res.status(400).json({ error: 'newTag must be a non-empty string' });
    }

    const tagIndex = AVAILABLE_TAGS.indexOf(oldTag);
    if (tagIndex === -1) {
      return res.status(404).json({ error: `Tag "${oldTag}" not found` });
    }

    if (AVAILABLE_TAGS.includes(newTag)) {
      return res.status(400).json({ error: `Tag "${newTag}" already exists` });
    }

    // Update tag in list
    AVAILABLE_TAGS[tagIndex] = newTag;

    // Update all heroes that have this tag
    const files = await fs.readdir(HERO_DIR);
    let updatedCount = 0;

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filePath = path.join(HERO_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const hero = JSON.parse(content);

      if (hero.synergies && Array.isArray(hero.synergies)) {
        const idx = hero.synergies.indexOf(oldTag);
        if (idx !== -1) {
          hero.synergies[idx] = newTag;
          await fs.writeFile(filePath, JSON.stringify(hero, null, 2) + '\n', 'utf-8');
          updatedCount++;
        }
      }
    }

    await saveTags();

    res.json({
      success: true,
      message: `Tag "${oldTag}" renamed to "${newTag}" (${updatedCount} heroes updated)`,
      tags: AVAILABLE_TAGS,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/tags/:tag - Delete a tag (removes from all heroes)
app.delete('/api/tags/:tag', async (req, res) => {
  try {
    const { tag } = req.params;

    const tagIndex = AVAILABLE_TAGS.indexOf(tag);
    if (tagIndex === -1) {
      return res.status(404).json({ error: `Tag "${tag}" not found` });
    }

    // Remove tag from list
    AVAILABLE_TAGS.splice(tagIndex, 1);

    // Remove tag from all heroes
    const files = await fs.readdir(HERO_DIR);
    let updatedCount = 0;

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filePath = path.join(HERO_DIR, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const hero = JSON.parse(content);

      if (hero.synergies && Array.isArray(hero.synergies)) {
        const idx = hero.synergies.indexOf(tag);
        if (idx !== -1) {
          hero.synergies.splice(idx, 1);
          await fs.writeFile(filePath, JSON.stringify(hero, null, 2) + '\n', 'utf-8');
          updatedCount++;
        }
      }
    }

    await saveTags();

    res.json({
      success: true,
      message: `Tag "${tag}" deleted (${updatedCount} heroes updated)`,
      tags: AVAILABLE_TAGS,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;

// Load tags on startup, then start server
await loadTags();
app.listen(PORT, () => {
  console.log(`\n🎯 Synergy Tag Manager running on http://localhost:${PORT}`);
  console.log(`📝 Edit synergies at http://localhost:${PORT}`);
  console.log(`📊 Loaded ${AVAILABLE_TAGS.length} tags\n`);
});
