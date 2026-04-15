import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, extname, relative } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const R2_URL = "https://pub-a33abfbc3135413881a1d8eb86543559.r2.dev";

// Asset path prefixes that should be moved to R2
const ASSET_PREFIXES = [
  "/heroes/",
  "/skills/",
  "/icons/",
  "/bosses/",
  "/teaser/",
  "/img_data/",
];

// Standalone asset files (not directories)
const STANDALONE_ASSETS = [
  "/bg.jpg",
  "/bg_halle.webp",
  "/bg_neutral.webp",
  "/shrineBG.webp",
  "/towerBG.webp",
  "/frieren.jpg",
  "/spark.svg",
];

// File extensions to process
const PROCESS_EXTENSIONS = new Set([".astro", ".json", ".js", ".ts", ".cjs", ".mjs"]);

// Directories to scan
const SCAN_DIRS = [
  join(ROOT, "src"),
];

// Also scan root-level scripts and config files
const SCAN_FILES_EXTRA = [
  join(ROOT, "tag-manager-server.js"),
];

function getAllFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      // Skip node_modules and .git
      if (entry === "node_modules" || entry === ".git" || entry === ".astro") continue;
      getAllFiles(fullPath, files);
    } else if (PROCESS_EXTENSIONS.has(extname(entry).toLowerCase())) {
      files.push(fullPath);
    }
  }
  return files;
}

function replaceAssetPaths(content) {
  let updated = content;

  // Replace directory-based paths: "/heroes/" -> "R2_URL/heroes/"
  for (const prefix of ASSET_PREFIXES) {
    // Match the path in various quote contexts and as plain strings
    // Avoid replacing already-replaced URLs
    const escaped = prefix.replace(/\//g, "\\/");
    const regex = new RegExp(`(?<!${R2_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})${escaped}`, "g");
    updated = updated.replace(regex, `${R2_URL}${prefix}`);
  }

  // Replace standalone asset files
  for (const asset of STANDALONE_ASSETS) {
    // Match as a quoted string or src= value, not already prefixed
    const escaped = asset.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(?<![a-zA-Z0-9.])${escaped}(?![a-zA-Z0-9])`, "g");
    updated = updated.replace(regex, `${R2_URL}${asset}`);
  }

  return updated;
}

function processFile(filePath) {
  const original = readFileSync(filePath, "utf-8");
  const updated = replaceAssetPaths(original);

  if (updated !== original) {
    writeFileSync(filePath, updated, "utf-8");
    const rel = relative(ROOT, filePath);
    console.log(`  UPDATED ${rel}`);
    return true;
  }
  return false;
}

function main() {
  const files = [];
  for (const dir of SCAN_DIRS) {
    getAllFiles(dir, files);
  }
  for (const f of SCAN_FILES_EXTRA) {
    try { statSync(f); files.push(f); } catch {}
  }

  console.log(`Scanning ${files.length} files...`);

  let updatedCount = 0;
  for (const filePath of files) {
    if (processFile(filePath)) updatedCount++;
  }

  console.log(`\nDone: ${updatedCount} files updated`);
}

main();
