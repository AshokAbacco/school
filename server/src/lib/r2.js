// // server/src/lib/r2.js
// import {
//   S3Client,
//   PutObjectCommand,
//   DeleteObjectCommand,
//   GetObjectCommand,
// } from "@aws-sdk/client-s3";
// import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// const r2 = new S3Client({
//   region: "auto",
//   endpoint: process.env.R2_ENDPOINT, // https://<account>.r2.cloudflarestorage.com
//   credentials: {
//     accessKeyId:     process.env.R2_ACCESS_KEY,
//     secretAccessKey: process.env.R2_SECRET_KEY,
//   },
// });

// const BUCKET = process.env.R2_BUCKET;

// // ─────────────────────────────────────────────────────────────────────────────
// // Upload
// //   Sets Cache-Control: immutable so Cloudflare edge caches the object forever.
// //   Keys are content-addressed (timestamp + nanoid) so they never change.
// // ─────────────────────────────────────────────────────────────────────────────
// export const uploadToR2 = async (key, buffer, contentType) => {
//   const command = new PutObjectCommand({
//     Bucket:       BUCKET,
//     Key:          key,
//     Body:         buffer,
//     ContentType:  contentType,
//     CacheControl: "public, max-age=31536000, immutable", // ← NEW
//   });

//   await r2.send(command);
//   return key; // never expose public URL — always use signed URLs
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // Delete
// // ─────────────────────────────────────────────────────────────────────────────
// export const deleteFromR2 = async (key) => {
//   const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: key });
//   await r2.send(command);
// };

// // ─────────────────────────────────────────────────────────────────────────────
// // Signed URL (raw — prefer getCachedSignedUrl from urlCache.js in hot paths)
// // ─────────────────────────────────────────────────────────────────────────────
// export const generateSignedUrl = async (key, expiresInSeconds = 3600) => {
//   const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
//   return getSignedUrl(r2, command, { expiresIn: expiresInSeconds });
// };

// export const generateDownloadSignedUrl = async (key, expiresIn = 300, filename) => {
//   const command = new GetObjectCommand({
//     Bucket: process.env.R2_BUCKET_NAME,
//     Key: key,
//     ResponseContentDisposition: `attachment; filename="${filename}"`,
//     ResponseContentType: "application/octet-stream",
//   });
//   return getSignedUrl(s3Client, command, { expiresIn });
// };

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
    accessKeyId:     process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

const BUCKET = process.env.R2_BUCKET;

// ─────────────────────────────────────────────────────────────────────────────
// Upload
//   Sets Cache-Control: immutable so Cloudflare edge caches the object forever.
//   Keys are content-addressed (timestamp + nanoid) so they never change.
// ─────────────────────────────────────────────────────────────────────────────
export const uploadToR2 = async (key, buffer, contentType) => {
  const command = new PutObjectCommand({
    Bucket:       BUCKET,
    Key:          key,
    Body:         buffer,
    ContentType:  contentType,
    CacheControl: "public, max-age=31536000, immutable", // ← NEW
  });

  await r2.send(command);
  return key; // never expose public URL — always use signed URLs
};

// ─────────────────────────────────────────────────────────────────────────────
// Delete
// ─────────────────────────────────────────────────────────────────────────────
export const deleteFromR2 = async (key) => {
  const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: key });
  await r2.send(command);
};

// ─────────────────────────────────────────────────────────────────────────────
// Signed URL (raw — prefer getCachedSignedUrl from urlCache.js in hot paths)
// ─────────────────────────────────────────────────────────────────────────────
export const generateSignedUrl = async (key, expiresInSeconds = 3600) => {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(r2, command, { expiresIn: expiresInSeconds });
};

export const generateDownloadSignedUrl = async (key, expiresIn = 300, filename) => {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    ResponseContentDisposition: `attachment; filename="${filename}"`,
    ResponseContentType: "application/octet-stream",
  });
  return getSignedUrl(s3Client, command, { expiresIn });
};

// ─────────────────────────────────────────────────────────────────────────────
// Get object bytes (used by the Certificates PDF generator to inline images —
// logo/signature/seal — as base64 data URIs, the same way invoiceMailer.js
// inlines the school logo for Puppeteer-rendered PDFs).
// Returns null instead of throwing when the key is missing/unreadable, so
// callers can fall back to a placeholder.
// ─────────────────────────────────────────────────────────────────────────────
export const getObjectBuffer = async (key) => {
  if (!key) return null;
  try {
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    const response = await r2.send(command);
    const chunks = [];
    for await (const chunk of response.Body) chunks.push(chunk);
    return Buffer.concat(chunks);
  } catch (err) {
    console.error("[getObjectBuffer] failed for key:", key, err.message);
    return null;
  }
};