// Reverts wrongly-replaced href links back to internal routes.
// Only asset paths (with file extensions like .webp, .jpg, .png) should use R2.
// Navigation links like href="/heroes/zeus" must stay as internal paths.

import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, extname, relative } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const R2_URL = "https://pub-a33abfbc3135413881a1d8eb86543559.r2.dev";

const PROCESS_EXTENSIONS = new Set([".astro", ".js", ".ts"]);

function getAllFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === ".git" || entry === ".astro") continue;
      getAllFiles(fullPath, files);
    } else if (PROCESS_EXTENSIONS.has(extname(entry).toLowerCase())) {
      files.push(fullPath);
    }
  }
  return files;
}

function fixContent(content) {
  // Revert R2 URL in href attributes when the path has NO file extension
  // Matches: href="https://...r2.dev/some/path" or href={`https://...r2.dev/some/path`}
  // Only if the path does NOT end with an extension like .webp, .jpg, etc.
  const escaped = R2_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Match href="R2_URL/path" where path has no file extension
  // Also matches template literals: href={`R2_URL/path`}
  let updated = content.replace(
    new RegExp(`(href=["'\`])${escaped}(/[^"'\`?#]*)`, "g"),
    (match, prefix, path) => {
      // Keep R2 URL if path has a file extension
      if (/\.[a-zA-Z0-9]+$/.test(path)) return match;
      // Revert to internal path
      return `${prefix}${path}`;
    }
  );

  return updated;
}

function processFile(filePath) {
  const original = readFileSync(filePath, "utf-8");
  const updated = fixContent(original);
  if (updated !== original) {
    writeFileSync(filePath, updated, "utf-8");
    console.log(`  FIXED ${relative(ROOT, filePath)}`);
    return true;
  }
  return false;
}

const files = getAllFiles(join(ROOT, "src"));
console.log(`Scanning ${files.length} files...`);
let count = 0;
for (const f of files) {
  if (processFile(f)) count++;
}
console.log(`\nDone: ${count} files fixed`);
