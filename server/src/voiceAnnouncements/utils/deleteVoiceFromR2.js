// src/voiceAnnouncements/utils/deleteVoiceFromR2.js

import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.R2_REGION,
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

/**
 * Deletes a single audio object from Cloudflare R2.
 * Safe to call with a falsy key (no-op) so callers don't need extra guards.
 *
 * @param {string|null|undefined} audioKey
 */
export const deleteVoiceFromR2 = async (audioKey) => {
  if (!audioKey) return;

  try {
    await s3.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET,
        Key: audioKey,
      })
    );
  } catch (error) {
    // Don't let a missing/already-deleted object silently corrupt cleanup —
    // log and rethrow so the caller (cleanup job) can decide whether to
    // continue or skip deleting the DB row for this announcement.
    console.error(`[deleteVoiceFromR2] Failed to delete key "${audioKey}":`, error.message);
    throw error;
  }
};