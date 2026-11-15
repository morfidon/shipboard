// Creates the bucket for attachments and lets our site upload to it
// straight from the browser (a CORS rule). Safe to run twice.
//
//   pnpm storage:setup   (reads the S3_ settings from .env)
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketCorsCommand,
  S3Client,
} from "@aws-sdk/client-s3";

function setting(name: string) {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is missing. See .env.example.`);
    process.exit(1);
  }
  return value;
}

const s3 = new S3Client({
  endpoint: setting("S3_ENDPOINT"),
  region: setting("S3_REGION"),
  forcePathStyle: true,
  credentials: {
    accessKeyId: setting("S3_ACCESS_KEY_ID"),
    secretAccessKey: setting("S3_SECRET_ACCESS_KEY"),
  },
});
const Bucket = setting("S3_BUCKET");
const site = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

try {
  await s3.send(new HeadBucketCommand({ Bucket }));
  console.log(`Bucket ${Bucket}: already there`);
} catch (error) {
  if (!(error instanceof Error) || error.name !== "NotFound") {
    throw error;
  }
  await s3.send(new CreateBucketCommand({ Bucket }));
  console.log(`Bucket ${Bucket}: created`);
}

// The browser asks storage first: may this site send you a file? This rule
// says yes, for our site only, and only for uploads and downloads.
await s3.send(
  new PutBucketCorsCommand({
    Bucket,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: [site],
          AllowedMethods: ["PUT", "GET"],
          AllowedHeaders: ["content-type"],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  }),
);
console.log(`Uploads allowed from ${site}`);
