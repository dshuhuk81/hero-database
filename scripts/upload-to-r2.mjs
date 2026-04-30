import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative, extname } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const FORCE = process.argv.includes("--force");
const DRY_RUN = process.argv.includes("--dry-run");

// Load .env.r2
const envPath = join(ROOT, ".env.r2");
const env = Object.fromEntries(
  readFileSync(envPath, "utf-8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => l.split("=").map((s) => s.trim()))
);

const client = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = env.R2_BUCKET;
const PUBLIC_DIR = join(ROOT, "public");

// Files to skip (keep on Vercel)
const SKIP_FILES = new Set([
  "favicon.ico",
  "favicon.svg",
  "robots.txt",
  ".nojekyll",
  ".DS_Store",
  ".env.local",
]);

const MIME_TYPES = {
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".json": "application/json",
  ".js": "application/javascript",
  ".css": "text/css",
  ".html": "text/html",
  ".txt": "text/plain",
};

function getAllFiles(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      getAllFiles(fullPath, files);
    } else if (!SKIP_FILES.has(entry)) {
      files.push(fullPath);
    }
  }
  return files;
}

async function fileExistsInR2(key) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function uploadFile(filePath) {
  const key = relative(PUBLIC_DIR, filePath).replace(/\\/g, "/");
  const ext = extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const body = readFileSync(filePath);

  if (DRY_RUN) {
    return key;
  }

  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  return key;
}

async function main() {
  const files = getAllFiles(PUBLIC_DIR);
  console.log(`Found ${files.length} files to upload`);
  if (DRY_RUN) {
    console.log(`[DRY RUN] ${FORCE ? "Overwrite mode enabled" : "Existing remote files will be skipped"}`);
  } else if (FORCE) {
    console.log(`[LIVE] Overwrite mode enabled`);
  }

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const filePath of files) {
    const key = relative(PUBLIC_DIR, filePath).replace(/\\/g, "/");
    try {
      const exists = FORCE ? false : await fileExistsInR2(key);
      if (exists) {
        console.log(`  SKIP ${key} (already exists)`);
        skipped++;
        continue;
      }
      await uploadFile(filePath);
      console.log(`  ${DRY_RUN ? "PLAN" : "OK  "} ${key}${FORCE ? " (overwrite)" : ""}`);
      uploaded++;
    } catch (err) {
      console.error(`  ERR  ${key}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone: ${uploaded} uploaded, ${skipped} skipped, ${failed} failed`);
}

main();
