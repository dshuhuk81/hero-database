import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const envPath = join(ROOT, ".env.r2");

if (!existsSync(envPath)) {
  throw new Error("Missing .env.r2. Create it with R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET.");
}

const env = Object.fromEntries(
  readFileSync(envPath, "utf-8")
    .split("\n")
    .filter((line) => line.includes("="))
    .map((line) => line.split("=").map((part) => part.trim()))
);

const DEST = process.argv.includes("--dest")
  ? process.argv[process.argv.indexOf("--dest") + 1]
  : join(ROOT, "r2-download");
const PREFIX = process.argv.includes("--prefix")
  ? process.argv[process.argv.indexOf("--prefix") + 1]
  : "";

if (process.argv.includes("--dest") && (!DEST || DEST.startsWith("--"))) {
  throw new Error("Missing value after --dest");
}

if (process.argv.includes("--prefix") && (!PREFIX && PREFIX !== "")) {
  throw new Error("Missing value after --prefix");
}

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
  const response = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const body = await response.Body.transformToByteArray();
  const targetPath = join(DEST, key);
  ensureDir(dirname(targetPath));
  writeFileSync(targetPath, body);
  return targetPath;
}

async function main() {
  ensureDir(DEST);

  const keys = await listAllKeys();
  console.log(`Found ${keys.length} objects in ${BUCKET}${PREFIX ? ` with prefix ${PREFIX}` : ""}`);

  let downloaded = 0;
  for (const key of keys) {
    await downloadKey(key);
    downloaded += 1;
    console.log(`  DOWNLOADED ${key}`);
  }

  console.log(`Done. Downloaded ${downloaded} objects to ${DEST}`);
}

main().catch((error) => {
  console.error(error?.message ?? error);
  process.exitCode = 1;
});