import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let client: S3Client | undefined;

// Our file storage: a service that speaks S3. Locally, the RustFS container
// from compose.yaml; in production, a hosted one, like Cloudflare R2.
function s3() {
  client ??= new S3Client({
    endpoint: setting("S3_ENDPOINT"),
    region: setting("S3_REGION"),
    forcePathStyle: true,
    credentials: {
      accessKeyId: setting("S3_ACCESS_KEY_ID"),
      secretAccessKey: setting("S3_SECRET_ACCESS_KEY"),
    },
    // By default the SDK puts the checksum of an empty body into every
    // upload link, and a real file never matches it. Leave it out.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return client;
}

function setting(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is missing. See .env.example.`);
  }
  return value;
}

// A signed delivery note for one upload: this key, this type, this size,
// valid for ten minutes. The browser sends the file straight to storage.
export function uploadUrl(key: string, contentType: string, size: number) {
  return getSignedUrl(
    s3(),
    new PutObjectCommand({
      Bucket: setting("S3_BUCKET"),
      Key: key,
      ContentType: contentType,
      ContentLength: size,
    }),
    {
      expiresIn: 600,
      // The type and the size are signed too: a different file fails.
      signableHeaders: new Set(["content-type", "content-length"]),
    },
  );
}

// A short-lived link that downloads one file under its own name.
export function downloadUrl(key: string, fileName: string) {
  return getSignedUrl(
    s3(),
    new GetObjectCommand({
      Bucket: setting("S3_BUCKET"),
      Key: key,
      ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    }),
    { expiresIn: 60 },
  );
}

// The stored file's size and type, or null if nothing arrived under this key.
export async function storedFile(
  key: string,
): Promise<{ size: number; contentType: string | undefined } | null> {
  try {
    const head = await s3().send(
      new HeadObjectCommand({ Bucket: setting("S3_BUCKET"), Key: key }),
    );
    return { size: head.ContentLength ?? 0, contentType: head.ContentType };
  } catch (error) {
    if (error instanceof Error && error.name === "NotFound") {
      return null;
    }
    throw error;
  }
}

// Removes a stored file.
export async function deleteFile(key: string) {
  await s3().send(
    new DeleteObjectCommand({ Bucket: setting("S3_BUCKET"), Key: key }),
  );
}
