import fs from "node:fs";
import path from "node:path";

const DATA_PATH = "src/data/divine-throne.json";
const HERO_DB_PATH = "src/data/all_heroes_db.json";
const THRONE_ASSET_ROOT = "public/features/divine-throne/thrones";
const expectedLocales = ["zh", "en", "de", "es", "ru"];
const expectedLevels = [10, 20, 30, 40];

const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
const heroDb = JSON.parse(fs.readFileSync(HERO_DB_PATH, "utf8"));
const knownHeroIds = new Set(Object.keys(heroDb));
const errors = [];

function fail(message) {
  errors.push(message);
}

function checkLocalizedString(value, path) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${path} must be a localized object`);
    return;
  }

  for (const locale of expectedLocales) {
    if (!(locale in value)) {
      fail(`${path}.${locale} is missing`);
      continue;
    }

    if (typeof value[locale] !== "string") {
      fail(`${path}.${locale} must be a string`);
    }
  }
}

function checkNoEnglishFallback(value, path) {
  if (!value?.en?.trim()) return;

  for (const locale of ["de", "es", "ru"]) {
    if (value[locale]?.trim() === value.en.trim()) {
      fail(`${path}.${locale} still matches the English draft text`);
    }
  }
}

if (data.schemaVersion !== 1) fail("schemaVersion must be 1");
if (!Array.isArray(data.heroes)) fail("heroes must be an array");
if (JSON.stringify(data.locales) !== JSON.stringify(expectedLocales)) {
  fail(`locales must be ${expectedLocales.join(", ")}`);
}
if (JSON.stringify(data.milestoneLevels) !== JSON.stringify(expectedLevels)) {
  fail(`milestoneLevels must be ${expectedLevels.join(", ")}`);
}

const seenHeroIds = new Set();
const seenCaptureIds = new Set();

for (const hero of data.heroes ?? []) {
  const label = hero.heroId || `capture:${hero.captureHeroId}`;

  if (!hero.heroId) fail("hero.heroId is required");
  if (seenHeroIds.has(hero.heroId)) fail(`Duplicate heroId: ${hero.heroId}`);
  seenHeroIds.add(hero.heroId);

  if (!knownHeroIds.has(hero.heroId)) fail(`Unknown local heroId: ${hero.heroId}`);

  if (!Number.isInteger(hero.captureHeroId)) fail(`${label}.captureHeroId must be an integer`);
  if (seenCaptureIds.has(hero.captureHeroId)) fail(`Duplicate captureHeroId: ${hero.captureHeroId}`);
  seenCaptureIds.add(hero.captureHeroId);

  if (hero.heroId === "sekhmet" && hero.captureEnName === "Set") {
    // Capture source currently carries this mismatch. Keeping it here documents
    // the source value while canonical heroId fixes the local mapping.
  }

  if (!Array.isArray(hero.exSkillIds) || hero.exSkillIds.length !== 4) {
    fail(`${label}.exSkillIds must contain exactly 4 entries`);
  }

  if (typeof hero.throneAssetId !== "string" || !hero.throneAssetId.trim()) {
    fail(`${label}.throneAssetId is required`);
  } else if (!/^[a-z0-9]+$/.test(hero.throneAssetId)) {
    fail(`${label}.throneAssetId must be a lowercase asset id`);
  } else {
    const assetPath = path.join(THRONE_ASSET_ROOT, `${hero.throneAssetId}.png`);
    if (!fs.existsSync(assetPath)) {
      fail(`${label}.throneAssetId points to missing asset: ${assetPath}`);
    }
  }

  checkLocalizedString(hero.seatName, `${label}.seatName`);
  checkNoEnglishFallback(hero.seatName, `${label}.seatName`);
  checkLocalizedString(hero.subtitle, `${label}.subtitle`);
  checkNoEnglishFallback(hero.subtitle, `${label}.subtitle`);

  if (!Array.isArray(hero.milestones)) {
    fail(`${label}.milestones must be an array`);
    continue;
  }

  const levelSet = new Set(hero.milestones.map((entry) => entry.level));
  for (const level of expectedLevels) {
    if (!levelSet.has(level)) fail(`${label}.milestones missing level ${level}`);
  }

  for (const milestone of hero.milestones) {
    if (!expectedLevels.includes(milestone.level)) {
      fail(`${label}.milestones has unexpected level ${milestone.level}`);
    }
    checkLocalizedString(milestone.text, `${label}.milestones.${milestone.level}.text`);
    checkNoEnglishFallback(milestone.text, `${label}.milestones.${milestone.level}.text`);
    if (!milestone.text?.zh?.trim()) {
      fail(`${label}.milestones.${milestone.level}.text.zh must preserve source text`);
    }
    if (!milestone.text?.en?.trim()) {
      fail(`${label}.milestones.${milestone.level}.text.en must be present`);
    }
  }
}

if ((data.heroes ?? []).length !== 36) {
  fail(`Expected 36 heroes, found ${(data.heroes ?? []).length}`);
}

if (errors.length) {
  console.error("Divine Throne validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Divine Throne validation passed (${data.heroes.length} heroes).`);
