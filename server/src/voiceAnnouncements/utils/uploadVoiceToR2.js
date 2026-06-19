// src/voiceAnnouncements/utils/uploadVoiceToR2.js

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const s3 = new S3Client({
  region: process.env.R2_REGION,
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Mime type → file extension map (keeps R2 keys clean/predictable)
// ─────────────────────────────────────────────────────────────────────────────
const AUDIO_EXTENSION_BY_MIME = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/oga": "ogg",
  "audio/mp4": "m4a",
  "audio/x-m4a": "m4a",
  "audio/aac": "aac",
};

export const ALLOWED_AUDIO_MIME_TYPES = Object.keys(AUDIO_EXTENSION_BY_MIME);

/**
 * Uploads an audio buffer to Cloudflare R2 and returns the public URL + key.
 *
 * @param {Buffer} fileBuffer - raw audio bytes (from multer memoryStorage)
 * @param {string} mimeType   - e.g. "audio/webm"
 * @param {string} schoolId   - used to namespace the R2 key
 * @returns {Promise<{ audioUrl: string, audioKey: string }>}
 */
export const uploadVoiceToR2 = async (fileBuffer, mimeType, schoolId) => {
  if (!fileBuffer || !fileBuffer.length) {
    throw new Error("Empty audio file buffer");
  }
  if (!schoolId) {
    throw new Error("schoolId is required to namespace the upload");
  }

  const ext = AUDIO_EXTENSION_BY_MIME[mimeType] || "bin";
  const fileName = `voice-announcements/${schoolId}/${Date.now()}-${randomUUID()}.${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: fileName,
      Body: fileBuffer,
      ContentType: mimeType || "application/octet-stream",
    })
  );

  return {
    audioUrl: `${process.env.R2_PUBLIC_URL}/${fileName}`,
    audioKey: fileName,
  };
};