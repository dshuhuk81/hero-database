// Imports the game data the Android agent exports and validates it.
//   npm run import:game-data [-- --from <dir>]
// Reads hero_releases.json and events.global.json from <dir> (default: the android repo's
// out/site_data) and writes them to src/data/generated/. Exits 1 without writing on errors.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateEvents, validateHeroReleases } from "./lib/game-data.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const fromIndex = process.argv.indexOf("--from");
const FROM = resolve(fromIndex > -1 ? process.argv[fromIndex + 1] : join(ROOT, "../android/out/site_data"));
const OUT = join(ROOT, "src/data/generated");
const FILES = ["hero_releases.json", "events.global.json"];

const read = (file) => JSON.parse(readFileSync(join(FROM, file), "utf-8"));
for (const file of FILES) {
  if (!existsSync(join(FROM, file))) {
    console.error(`Missing ${join(FROM, file)}`);
    process.exit(1);
  }
}

const mapping = JSON.parse(readFileSync(join(ROOT, "src/data/game_id_mapping.json"), "utf-8"));
const knownGameIds = new Set(
  Object.values(mapping).filter((entry) => entry.game_hero_id && !entry.alias_of).map((entry) => entry.game_hero_id),
);

const heroes = read("hero_releases.json");
const events = read("events.global.json");
const heroErrors = validateHeroReleases(heroes);
const { errors: eventErrors, warnings } = validateEvents(events, knownGameIds);
const errors = [...heroErrors, ...eventErrors];

for (const warning of warnings) console.warn(`warning: ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`error: ${error}`);
  console.error(`${errors.length} error(s), nothing written.`);
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
for (const file of FILES) writeFileSync(join(OUT, file), JSON.stringify(read(file), null, 2) + "\n");
console.log(`Imported ${heroes.heroes.length} heroes and ${events.events.length} events from ${FROM}`);
