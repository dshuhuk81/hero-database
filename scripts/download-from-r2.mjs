import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const envPath = join(ROOT, ".env.r2");

if (process.argv.includes("--help")) {
  console.log(`
Usage:
  node scripts/download-from-r2.mjs [--prefix <key-prefix>] [--dest <dir>] [--skip-existing]
  node scripts/download-from-r2.mjs --heroes-only --dest public --skip-existing

Options:
  --heroes-only    Shortcut for --prefix heroes/
  --prefix         R2 key prefix to download, e.g. heroes/
  --dest           Local destination directory. Defaults to r2-download/
  --skip-existing  Do not download files that already exist locally
`);
  process.exit(0);
}

if (!existsSync(envPath)) {
  throw new Error("Missing .env.r2. Create it with R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET.");
}

const env = Object.fromEntries(
  readFileSync(envPath, "utf-8")
    .split("\n")
    .filter((line) => line.includes("="))
    .map((line) => line.split("=").map((part) => part.trim()))
);

function argValue(name, fallback = null) {
  if (!process.argv.includes(name)) return fallback;
  const value = process.argv[process.argv.indexOf(name) + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value after ${name}`);
  }
  return value;
}

function normalizePrefix(prefix) {
  return prefix.replace(/^\/+/, "");
}

const DEST = argValue("--dest", join(ROOT, "r2-download"));
const PREFIX = normalizePrefix(
  process.argv.includes("--heroes-only")
    ? "heroes/"
    : argValue("--prefix", "")
);
const SKIP_EXISTING = process.argv.includes("--skip-existing");

const client = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

const BUCKET = env.R2_BUCKET;

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

async function listAllKeys() {
  const keys = [];
  let continuationToken;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: PREFIX,
        ContinuationToken: continuationToken,
      })
    );

    for (const item of response.Contents ?? []) {
      if (item.Key) keys.push(item.Key);
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return keys;
}

async function downloadKey(key) {
  const targetPath = join(DEST, key);
  if (SKIP_EXISTING && existsSync(targetPath)) {
    return { targetPath, skipped: true };
  }

  const response = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const body = await response.Body.transformToByteArray();
  ensureDir(dirname(targetPath));
  writeFileSync(targetPath, body);
  return { targetPath, skipped: false };
}

async function main() {
  ensureDir(DEST);

  const keys = await listAllKeys();
  console.log(`Found ${keys.length} objects in ${BUCKET}${PREFIX ? ` with prefix ${PREFIX}` : ""}`);

  let downloaded = 0;
  let skipped = 0;
  for (const key of keys) {
    const result = await downloadKey(key);
    if (result.skipped) {
      skipped += 1;
      console.log(`  SKIP ${key} (exists)`);
    } else {
      downloaded += 1;
      console.log(`  DOWNLOADED ${key}`);
    }
  }

  console.log(`Done. Downloaded ${downloaded} objects to ${DEST}${skipped ? `, skipped ${skipped}` : ""}`);
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exitCode = 1;
});
