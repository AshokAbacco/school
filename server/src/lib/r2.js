// server/src/lib/r2.js
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT, // https://<account>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET;

// ─────────────────────────────────────────────
// Upload
// ─────────────────────────────────────────────
export const uploadToR2 = async (key, buffer, contentType) => {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await r2.send(command);

  return key; // return ONLY key (never public URL)
};

// ─────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────
export const deleteFromR2 = async (key) => {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  await r2.send(command);
};

// ─────────────────────────────────────────────
// Signed URL Generator
// ─────────────────────────────────────────────
export const generateSignedUrl = async (key, expiresInSeconds) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return await getSignedUrl(r2, command, {
    expiresIn: expiresInSeconds,
  });
};
