// server/src/lib/imageProcessor.js
//
// Processes uploaded images:
//  1. Validates using Sharp metadata (not file.mimetype)
//  2. Strips ALL EXIF data (GPS, device info, timestamps)
//  3. Converts to WebP (or PNG if transparency required)
//  4. Generates a 300×300 cover thumbnail (object-fit: cover crop)
//  5. Returns both buffers so caller can upload in parallel

import sharp from "sharp";

const ALLOWED_FORMATS = ["jpeg", "png", "webp", "gif", "heif", "avif", "tiff"];
const FULL_MAX_PX    = 1920;
const THUMB_SIZE     = 300;
const WEBP_QUALITY   = 82;
const THUMB_QUALITY  = 78;

/**
 * Validate that the buffer is a real image using Sharp.
 * Throws if the file is not a supported image type.
 * Returns Sharp metadata.
 */
export async function validateImage(buffer) {
  let meta;
  try {
    meta = await sharp(buffer).metadata();
  } catch {
    throw new Error("File is not a valid image or is corrupted.");
  }

  if (!ALLOWED_FORMATS.includes(meta.format)) {
    throw new Error(
      `Unsupported image format "${meta.format}". Allowed: ${ALLOWED_FORMATS.join(", ")}`
    );
  }

  return meta;
}

/**
 * Process one image buffer and return:
 *   { full: { buffer, mimetype, ext }, thumb: { buffer, mimetype, ext } }
 *
 * - EXIF is always stripped (.withMetadata(false))
 * - Output is WebP unless the image has an alpha channel (then PNG)
 * - Full  → max 1920×1920, fit "inside" (never upscale)
 * - Thumb → 300×300, fit "cover" (centre crop — ideal for grid cards)
 */
export async function processImage(buffer) {
  // ── Validate first (throws on bad file) ────────────────────────────────────
  const meta = await validateImage(buffer);

  // ── Decide output format ────────────────────────────────────────────────────
  // Keep PNG only when transparency is present; everything else → WebP
  const needsPng = meta.hasAlpha && meta.format === "png";

  // ── Base pipeline: auto-rotate + strip ALL metadata ────────────────────────
  const base = () =>
    sharp(buffer)
      .rotate()                  // honour EXIF orientation
      .withMetadata(false);      // ← STRIP GPS, device, timestamps, everything

  // ── Full-size image ─────────────────────────────────────────────────────────
  let fullPipeline = base().resize(FULL_MAX_PX, FULL_MAX_PX, {
    fit: "inside",
    withoutEnlargement: true,
  });

  let fullBuffer, fullMime, fullExt;

  if (needsPng) {
    fullBuffer = await fullPipeline.png({ compressionLevel: 8 }).toBuffer();
    fullMime   = "image/png";
    fullExt    = ".png";
  } else {
    fullBuffer = await fullPipeline
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toBuffer();
    fullMime = "image/webp";
    fullExt  = ".webp";
  }

  // ── Thumbnail (300×300, centre crop) ────────────────────────────────────────
  let thumbPipeline = base().resize(THUMB_SIZE, THUMB_SIZE, {
    fit: "cover",        // centre-crop, never distort
    position: "centre",
  });

  let thumbBuffer, thumbMime, thumbExt;

  if (needsPng) {
    thumbBuffer = await thumbPipeline.png({ compressionLevel: 8 }).toBuffer();
    thumbMime   = "image/png";
    thumbExt    = ".png";
  } else {
    thumbBuffer = await thumbPipeline
      .webp({ quality: THUMB_QUALITY, effort: 4 })
      .toBuffer();
    thumbMime = "image/webp";
    thumbExt  = ".webp";
  }

  return {
    full:  { buffer: fullBuffer,  mimetype: fullMime,  ext: fullExt  },
    thumb: { buffer: thumbBuffer, mimetype: thumbMime, ext: thumbExt },
  };
}