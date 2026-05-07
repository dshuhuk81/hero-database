// scripts/tag-manager-server.js
// CMS Backend für Synergy Tag Management

import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HERO_DIR = path.join(__dirname, '../src/data/heroes');
const TAGS_FILE = path.join(__dirname, '../src/data/tags.json');
const TAG_CATEGORIES_FILE = path.join(__dirname, '../src/data/tagCategories.json');

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
let TAG_CATEGORIES = [];

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

async function loadTagCategories() {
  try {
    const data = await fs.readFile(TAG_CATEGORIES_FILE, 'utf-8');
    TAG_CATEGORIES = JSON.parse(data);
  } catch (err) {
    console.warn(`\n⚠️  Could not load tag categories from ${TAG_CATEGORIES_FILE}`);
    console.warn(`   Tags will still load, but uncategorized tags will appear under Custom Tags.`);
    console.warn(`   Error: ${err.message}\n`);
    TAG_CATEGORIES = [];
  }
}

async function saveTags() {
  try {
    await fs.writeFile(TAGS_FILE, JSON.stringify(AVAILABLE_TAGS, null, 2) + '\n', 'utf-8');
  } catch (err) {
    console.error('Error saving tags:', err);
  }
}

async function saveTagCategories() {
  try {
    await fs.writeFile(TAG_CATEGORIES_FILE, JSON.stringify(TAG_CATEGORIES, null, 2) + '\n', 'utf-8');
  } catch (err) {
    console.error('Error saving tag categories:', err);
  }
}

function getTagCategoryGroups() {
  const available = new Set(AVAILABLE_TAGS);
  const categorized = new Set();
  const groups = TAG_CATEGORIES
    .map((category) => {
      const tags = (category.tags || []).filter((tag) => available.has(tag));
      for (const tag of tags) categorized.add(tag);
      return {
        id: category.id,
        label: category.label,
        tags,
      };
    })
    .filter((category) => category.tags.length > 0);

  const customTags = AVAILABLE_TAGS.filter((tag) => !categorized.has(tag));
  if (customTags.length > 0) {
    groups.push({
      id: 'CUSTOM',
      label: 'Custom Tags',
      tags: customTags,
    });
  }

  return groups;
}

// GET /api/tags - returns all available tags
app.get('/api/tags', (req, res) => {
  res.json(AVAILABLE_TAGS);
});

// GET /api/tag-categories - returns shared tag categories plus uncategorized tags
app.get('/api/tag-categories', (req, res) => {
  res.json(getTagCategoryGroups());
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

    // Update tag in category metadata
    let categoriesChanged = false;
    for (const category of TAG_CATEGORIES) {
      const idx = category.tags?.indexOf(oldTag) ?? -1;
      if (idx !== -1) {
        category.tags[idx] = newTag;
        categoriesChanged = true;
      }
    }

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
    if (categoriesChanged) await saveTagCategories();

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

    // Remove tag from category metadata
    let categoriesChanged = false;
    for (const category of TAG_CATEGORIES) {
      if (!Array.isArray(category.tags)) continue;
      const nextTags = category.tags.filter((categoryTag) => categoryTag !== tag);
      if (nextTags.length !== category.tags.length) {
        category.tags = nextTags;
        categoriesChanged = true;
      }
    }

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
    if (categoriesChanged) await saveTagCategories();

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
await loadTagCategories();
app.listen(PORT, () => {
  console.log(`\n🎯 Synergy Tag Manager running on http://localhost:${PORT}`);
  console.log(`📝 Edit synergies at http://localhost:${PORT}`);
  console.log(`📊 Loaded ${AVAILABLE_TAGS.length} tags\n`);
});
