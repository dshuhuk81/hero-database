// scripts/tag-manager-server.js
// CMS Backend für Synergy Tag Management

import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');
const HERO_DIR = path.join(__dirname, '../src/data/heroes');
const TAGS_FILE = path.join(__dirname, '../src/data/tags.json');
const TAG_CATEGORIES_FILE = path.join(__dirname, '../src/data/tagCategories.json');
const HERO_RATINGS_FILE = path.join(__dirname, '../src/data/ratings/hero-ratings.json');
const INVEST_FILE = path.join(__dirname, '../src/data/ratings/invest.json');
const SUGGESTIONS_FILE = path.join(__dirname, '../src/data/suggestions.json');
const SUGGESTIONS_DISMISSED_FILE = path.join(__dirname, '../src/data/suggestionsDismissed.json');
const SUGGEST_SCRIPT = path.join(__dirname, 'suggest-synergy-tags.mjs');
const execFileAsync = promisify(execFile);

const VALIDATION_CHECKS = {
  tags: {
    label: 'Synergy tags',
    command: 'npm',
    args: ['run', 'validate:tags'],
  },
  heroDetailStats: {
    label: 'Hero detail stats',
    command: 'npm',
    args: ['run', 'validate:hero-detail-stats'],
  },
};
const ADMIN_CAPABILITIES = {
  apiVersion: 2,
  features: ['strengthsWeaknesses', 'investmentSingleSource'],
};

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '../tag-manager-frontend')));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
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

function assertHeroId(id) {
  if (!id || !/^[a-z0-9-]+$/i.test(id)) {
    const err = new Error('Invalid hero id');
    err.statusCode = 400;
    throw err;
  }
}

async function readJson(filePath) {
  const content = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function relativePath(filePath) {
  return path.relative(PROJECT_ROOT, filePath);
}

async function readHeroById(id) {
  assertHeroId(id);
  const filePath = path.join(HERO_DIR, `${id}.json`);

  try {
    const hero = await readJson(filePath);
    return { filePath, hero };
  } catch (err) {
    if (err.code === 'ENOENT') {
      const notFound = new Error(`Hero not found: ${id}`);
      notFound.statusCode = 404;
      throw notFound;
    }
    throw err;
  }
}

function normalizeString(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalizeBool(value) {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return Boolean(value);
}

function sanitizeRating(value) {
  const rating = normalizeString(value);
  const allowed = new Set(['', 'S+', 'S', 'A+', 'A', 'B+', 'B', 'C', 'D']);
  if (!allowed.has(rating)) {
    const err = new Error(`Invalid rating value: ${rating}`);
    err.statusCode = 400;
    throw err;
  }
  return rating;
}

function normalizeCoreMechanic(value) {
  if (!value) {
    return { summary: '', depthRating: '', commonlyMisunderstood: false };
  }

  if (typeof value === 'string') {
    return {
      summary: value === '[object Object]' ? '' : normalizeString(value),
      depthRating: '',
      commonlyMisunderstood: false,
    };
  }

  const depthRating = normalizeString(value.depthRating);
  const allowedDepth = new Set(['', 'low', 'mid', 'high']);
  if (!allowedDepth.has(depthRating)) {
    const err = new Error(`Invalid core mechanic depthRating: ${depthRating}`);
    err.statusCode = 400;
    throw err;
  }

  return {
    summary: normalizeString(value.summary),
    depthRating,
    commonlyMisunderstood: normalizeBool(value.commonlyMisunderstood),
  };
}

function normalizeTextList(value, field) {
  if (!Array.isArray(value)) {
    const err = new Error(`${field} must be an array`);
    err.statusCode = 400;
    throw err;
  }

  return value
    .map((entry) => {
      if (typeof entry !== 'string') {
        const err = new Error(`${field} entries must be strings`);
        err.statusCode = 400;
        throw err;
      }

      const text = normalizeString(entry);
      if (/<[^>]+>/.test(text)) {
        const err = new Error(`${field} entries must be plain text without HTML`);
        err.statusCode = 400;
        throw err;
      }
      return text;
    })
    .filter(Boolean);
}

function sendError(res, err) {
  const status = err.statusCode || 500;
  if (status >= 500) console.error(err);
  return res.status(status).json({ error: err.message });
}

function trimCommandOutput(output) {
  const text = normalizeString(output);
  if (!text) return '';
  const lines = text.split(/\r?\n/).filter(Boolean);
  return lines.slice(-30).join('\n');
}

async function runValidationCheck(id) {
  const check = VALIDATION_CHECKS[id];
  const startedAt = Date.now();

  try {
    const { stdout, stderr } = await execFileAsync(check.command, check.args, {
      cwd: PROJECT_ROOT,
      timeout: 120000,
      maxBuffer: 1024 * 1024,
    });

    return {
      id,
      label: check.label,
      ok: true,
      durationMs: Date.now() - startedAt,
      output: trimCommandOutput(`${stdout}\n${stderr}`),
    };
  } catch (err) {
    return {
      id,
      label: check.label,
      ok: false,
      durationMs: Date.now() - startedAt,
      exitCode: err.code ?? null,
      output: trimCommandOutput(`${err.stdout || ''}\n${err.stderr || ''}\n${err.message || ''}`),
    };
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

// =====================
// LOCAL CONTENT ADMIN ENDPOINTS
// =====================

// GET /api/admin/capabilities - allows the dashboard to reject stale server processes
app.get('/api/admin/capabilities', (req, res) => {
  res.json(ADMIN_CAPABILITIES);
});

// GET /api/admin/heroes/:id - full editable payload for a hero
app.get('/api/admin/heroes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { hero } = await readHeroById(id);
    const ratings = await readJson(HERO_RATINGS_FILE);
    const invest = await readJson(INVEST_FILE);

    res.json({
      hero,
      ratings: ratings[id] || {
        name: hero.name,
        overall: '',
        pvp: '',
        pve: '',
        pveEarly: '',
        pveLate: '',
      },
      investment: invest[id] || {
        relicRecommendation: '',
        usedIn: '',
        explanation: '',
        f2pInvestment: '',
      },
    });
  } catch (err) {
    sendError(res, err);
  }
});

// PATCH /api/admin/heroes/:id - update safe hero-level fields
app.patch('/api/admin/heroes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { filePath, hero } = await readHeroById(id);
    const allowedFields = [
      'release',
      'newHero',
      'description',
      'coreMechanic',
      'strengths',
      'weaknesses',
    ];
    const unsupportedFields = Object.keys(req.body || {}).filter((field) => !allowedFields.includes(field));
    if (unsupportedFields.length > 0) {
      const err = new Error(`Unsupported hero fields: ${unsupportedFields.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }

    for (const field of allowedFields) {
      if (!Object.prototype.hasOwnProperty.call(req.body, field)) continue;

      if (field === 'release' || field === 'newHero') {
        hero[field] = normalizeBool(req.body[field]);
      } else if (field === 'coreMechanic') {
        hero[field] = normalizeCoreMechanic(req.body[field]);
      } else if (field === 'strengths' || field === 'weaknesses') {
        hero[field] = normalizeTextList(req.body[field], field);
      } else {
        hero[field] = normalizeString(req.body[field]);
      }
    }

    await writeJson(filePath, hero);
    res.json({ success: true, hero, changedFiles: [relativePath(filePath)] });
  } catch (err) {
    sendError(res, err);
  }
});

// PATCH /api/admin/ratings/:id - update rating tiers
app.patch('/api/admin/ratings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { hero } = await readHeroById(id);
    const ratings = await readJson(HERO_RATINGS_FILE);
    const hasExistingRating = Boolean(ratings[id]);
    const current = ratings[id] || { name: hero.name };
    const next = {
      name: hero.name,
      overall: sanitizeRating(req.body.overall ?? current.overall ?? ''),
      pvp: sanitizeRating(req.body.pvp ?? current.pvp ?? ''),
      pve: sanitizeRating(req.body.pve ?? current.pve ?? ''),
      pveEarly: sanitizeRating(req.body.pveEarly ?? current.pveEarly ?? ''),
      pveLate: sanitizeRating(req.body.pveLate ?? current.pveLate ?? ''),
    };

    if (!hasExistingRating && !next.overall && !next.pvp && !next.pve && !next.pveEarly && !next.pveLate) {
      return res.json({ success: true, skipped: true, ratings: next, changedFiles: [] });
    }

    ratings[id] = next;
    await writeJson(HERO_RATINGS_FILE, ratings);
    res.json({ success: true, ratings: ratings[id], changedFiles: [relativePath(HERO_RATINGS_FILE)] });
  } catch (err) {
    sendError(res, err);
  }
});

// PATCH /api/admin/invest/:id - update investment guidance
app.patch('/api/admin/invest/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await readHeroById(id);
    const invest = await readJson(INVEST_FILE);
    const hasExistingInvestment = Boolean(invest[id]);
    const current = invest[id] || {};

    const next = {
      relicRecommendation: normalizeString(req.body.relicRecommendation ?? current.relicRecommendation),
      usedIn: normalizeString(req.body.usedIn ?? current.usedIn),
      explanation: normalizeString(req.body.explanation ?? current.explanation),
      f2pInvestment: normalizeString(req.body.f2pInvestment ?? current.f2pInvestment),
    };

    if (!hasExistingInvestment && !next.relicRecommendation && !next.usedIn && !next.explanation && !next.f2pInvestment) {
      return res.json({ success: true, skipped: true, investment: next, changedFiles: [] });
    }

    invest[id] = next;
    await writeJson(INVEST_FILE, invest);
    res.json({ success: true, investment: invest[id], changedFiles: [relativePath(INVEST_FILE)] });
  } catch (err) {
    sendError(res, err);
  }
});

// POST /api/admin/validate - run local validation checks after editing
app.post('/api/admin/validate', async (req, res) => {
  try {
    const requestedChecks = Array.isArray(req.body?.checks) && req.body.checks.length > 0
      ? req.body.checks
      : ['tags'];
    const checks = requestedChecks.filter((id) => VALIDATION_CHECKS[id]);

    if (checks.length === 0) {
      return res.status(400).json({ error: 'No valid validation checks requested' });
    }

    const results = [];
    for (const id of checks) {
      results.push(await runValidationCheck(id));
    }

    res.json({
      ok: results.every((result) => result.ok),
      results,
    });
  } catch (err) {
    sendError(res, err);
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
      changedFiles: [relativePath(filePath)],
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
// SYNERGY SUGGESTION ENGINE ENDPOINTS
// Read-only detection output -> human gate. Accepts reuse the synergies POST.
// =====================

async function readDismissed() {
  try {
    return await readJson(SUGGESTIONS_DISMISSED_FILE);
  } catch {
    return {};
  }
}

function isDismissed(dismissed, heroId, kind, tag) {
  const entry = dismissed[heroId];
  return Boolean(entry && Array.isArray(entry[kind]) && entry[kind].includes(tag));
}

async function buildSuggestionsPayload() {
  let data;
  try {
    data = await readJson(SUGGESTIONS_FILE);
  } catch {
    return { generatedAt: null, missing: true, summary: null, heroes: [] };
  }
  const dismissed = await readDismissed();
  const heroes = (data.heroes || [])
    .map((h) => ({
      ...h,
      suggestedAdd: (h.suggestedAdd || []).filter((a) => !isDismissed(dismissed, h.id, 'add', a.tag)),
      flagRemove: (h.flagRemove || []).filter((r) => !isDismissed(dismissed, h.id, 'remove', r.tag)),
    }))
    .filter((h) => h.suggestedAdd.length || h.flagRemove.length);
  return { generatedAt: data.generatedAt, summary: data.summary, heroes };
}

// GET /api/suggestions - pending tag suggestions (dismissed entries filtered out)
app.get('/api/suggestions', async (req, res) => {
  try {
    res.json(await buildSuggestionsPayload());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/suggestions/regenerate - re-run the detection engine, return fresh queue
app.post('/api/suggestions/regenerate', async (req, res) => {
  try {
    await execFileAsync('node', [SUGGEST_SCRIPT], { cwd: PROJECT_ROOT });
    res.json(await buildSuggestionsPayload());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message, stderr: err.stderr });
  }
});

// POST /api/suggestions/dismiss - { heroId, kind: 'add'|'remove', tag } persist a reject
app.post('/api/suggestions/dismiss', async (req, res) => {
  try {
    const { heroId, kind, tag } = req.body || {};
    if (!heroId || !['add', 'remove'].includes(kind) || !tag) {
      return res.status(400).json({ error: 'heroId, kind (add|remove) and tag are required' });
    }
    assertHeroId(heroId);
    const dismissed = await readDismissed();
    dismissed[heroId] = dismissed[heroId] || {};
    dismissed[heroId][kind] = dismissed[heroId][kind] || [];
    if (!dismissed[heroId][kind].includes(tag)) {
      dismissed[heroId][kind].push(tag);
    }
    await writeJson(SUGGESTIONS_DISMISSED_FILE, dismissed);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(err.statusCode || 500).json({ error: err.message });
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
