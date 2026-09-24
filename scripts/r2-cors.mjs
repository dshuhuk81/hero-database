// Shows or sets the CORS policy of the R2 bucket. The tower defense canvas (WebGL)
// and its audio (fetch) load assets cross-origin from R2; without CORS headers the
// browser blocks them on the live site.
//
//   node scripts/r2-cors.mjs            # show the current policy (read-only)
//   node scripts/r2-cors.mjs --apply    # write the policy below
import { S3Client, GetBucketCorsCommand, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(join(ROOT, ".env.r2"), "utf-8")
    .split("\n")
    .filter((line) => line.includes("="))
    .map((line) => line.split("=").map((part) => part.trim())),
);

const client = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
});

const POLICY = {
  CORSRules: [
    {
      AllowedOrigins: [
        "https://motto-immortal-db.com",
        "https://www.motto-immortal-db.com",
        "http://localhost:4321",
      ],
      AllowedMethods: ["GET", "HEAD"],
      AllowedHeaders: ["*"],
      MaxAgeSeconds: 86400,
    },
  ],
};

async function show(label) {
  try {
    const current = await client.send(new GetBucketCorsCommand({ Bucket: env.R2_BUCKET }));
    console.log(`${label}:`, JSON.stringify(current.CORSRules, null, 2));
  } catch (error) {
    console.log(`${label}: none (${error.name})`);
  }
}

await show("Current CORS policy");
if (process.argv.includes("--apply")) {
  await client.send(new PutBucketCorsCommand({ Bucket: env.R2_BUCKET, CORSConfiguration: POLICY }));
  await show("New CORS policy");
} else {
  console.log("\nPolicy to apply (run again with --apply):", JSON.stringify(POLICY.CORSRules, null, 2));
}
