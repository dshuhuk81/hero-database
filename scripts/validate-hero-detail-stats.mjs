import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const HERO_DETAIL_PATH = join(ROOT, "leak/game_extracted/region_7584e4b000/client/config/hero_detail.json");
const MAPPING_PATH = join(ROOT, "src/data/game_id_mapping.json");
const HEROES_DIR = join(ROOT, "src/data/heroes");

// Raw Divine V project stats line up with hero_detail.json attr_base through a
// near-constant multiplier for absolute stats. Percent stats map directly.
const ABSOLUTE_SCALE = 1923.746;
const ABSOLUTE_TOLERANCE = 0.006;
const PERCENT_TOLERANCE = 0.05;

const ABSOLUTE_STAT_MAP = {
  atk: "901",
  hp: "902",
  armor: "941",
  magicRes: "942",
};

const PERCENT_STAT_MAP = {
  dodgeRate: "904",
  hitBonus: "905",
  critRate: "906",
  critRes: "907",
  atkSpdBonus: "915",
  critDmgBonus: "919",
  healEff: "928",
  pDmgBonus: "931",
  controlRes: "944",
  ultimatePWR: "949",
};

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function roundedPercent(value) {
  return Math.round(value * 10) / 10;
}

function percentDiff(actual, expected) {
  if (expected === 0) return Math.abs(actual);
  return Math.abs(actual - expected) / Math.abs(expected);
}

function compareAbsoluteStat(actual, rawValue) {
  const expected = rawValue * ABSOLUTE_SCALE;
  return {
    expected: Math.round(expected),
    rawExpected: expected,
    ok: percentDiff(actual, expected) <= ABSOLUTE_TOLERANCE,
  };
}

function comparePercentStat(actual, rawValue) {
  const expected = roundedPercent(rawValue * 100);
  return {
    expected,
    ok: Math.abs(actual - expected) <= PERCENT_TOLERANCE,
  };
}

function main() {
  const mapping = readJson(MAPPING_PATH);
  const heroDetail = readJson(HERO_DETAIL_PATH);
  const heroFiles = readdirSync(HEROES_DIR).filter((fileName) => fileName.endsWith(".json"));

  const missingMappings = [];
  const missingHeroDetails = [];
  const skippedNonDivine = [];
  const skippedNonMaxExtract = [];
  const mismatches = [];
  let comparedHeroes = 0;
  let comparedStats = 0;

  for (const fileName of heroFiles) {
    const hero = readJson(join(HEROES_DIR, fileName));
    const mappingEntry = mapping[hero.id];
    const gameHeroId = mappingEntry?.game_hero_id;

    if (!mappingEntry || mappingEntry.status !== "ok" || !gameHeroId) {
      missingMappings.push(hero.id);
      continue;
    }

    if (hero.evolution !== "Divine V") {
      skippedNonDivine.push(`${hero.id}:${hero.evolution}`);
      continue;
    }

    const detail = heroDetail[String(gameHeroId)];
    if (!detail) {
      missingHeroDetails.push(`${hero.id}:${gameHeroId}`);
      continue;
    }

    if ((detail.max_evo ?? 0) < 18) {
      skippedNonMaxExtract.push(`${hero.id}:${gameHeroId}:max_evo_${detail.max_evo}`);
      continue;
    }

    comparedHeroes++;
    const attrBase = detail.attr_base || {};
    const heroStats = hero.stats || {};

    for (const [statName, attrKey] of Object.entries(ABSOLUTE_STAT_MAP)) {
      if (typeof heroStats[statName] !== "number" || typeof attrBase[attrKey] !== "number") continue;
      comparedStats++;
      const comparison = compareAbsoluteStat(heroStats[statName], attrBase[attrKey]);
      if (!comparison.ok) {
        mismatches.push({
          heroId: hero.id,
          statName,
          actual: heroStats[statName],
          expected: comparison.expected,
          detailValue: attrBase[attrKey],
          gameHeroId,
        });
      }
    }

    for (const [statName, attrKey] of Object.entries(PERCENT_STAT_MAP)) {
      if (typeof heroStats[statName] !== "number" || typeof attrBase[attrKey] !== "number") continue;
      comparedStats++;
      const comparison = comparePercentStat(heroStats[statName], attrBase[attrKey]);
      if (!comparison.ok) {
        mismatches.push({
          heroId: hero.id,
          statName,
          actual: heroStats[statName],
          expected: comparison.expected,
          detailValue: attrBase[attrKey],
          gameHeroId,
        });
      }
    }
  }

  console.log(`Compared ${comparedHeroes} heroes across ${comparedStats} stat checks.`);

  if (missingMappings.length > 0) {
    console.log(`Skipped ${missingMappings.length} heroes without usable game_id mapping: ${missingMappings.join(", ")}`);
  }

  if (missingHeroDetails.length > 0) {
    console.log(`Missing hero_detail entries: ${missingHeroDetails.join(", ")}`);
  }

  if (skippedNonDivine.length > 0) {
    console.log(`Skipped ${skippedNonDivine.length} non-Divine-V heroes: ${skippedNonDivine.join(", ")}`);
  }

  if (skippedNonMaxExtract.length > 0) {
    console.log(`Skipped ${skippedNonMaxExtract.length} heroes without max-evo extract rows: ${skippedNonMaxExtract.join(", ")}`);
  }

  if (mismatches.length === 0) {
    console.log("hero_detail stat validation passed.");
    return;
  }

  console.error(`Found ${mismatches.length} stat mismatches.`);
  for (const mismatch of mismatches.slice(0, 50)) {
    console.error(
      `  ${mismatch.heroId}.${mismatch.statName}: project=${mismatch.actual} expected=${mismatch.expected} from hero_detail[${mismatch.gameHeroId}] attr=${mismatch.detailValue}`
    );
  }

  if (mismatches.length > 50) {
    console.error(`  ... ${mismatches.length - 50} more mismatches omitted`);
  }

  process.exit(1);
}

main();