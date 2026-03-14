// server/src/lib/urlCache.js
//
// Production-grade signed URL cache using Redis MGET + pipeline SET.
//
// Key design decisions:
//  • MGET  → 1 Redis round-trip to check all keys (vs N individual GETs)
//  • Pipeline SET → 1 Redis round-trip to write all misses (vs N individual SETs)
//  • Chunked R2 signing → misses are signed in parallel batches of 50
//    (avoids hammering R2 with 1000 concurrent signing ops)
//  • School-versioned key namespace → invalidateSchool() in cacheService
//    automatically sweeps gallery URL caches via the version bump
//  • Full Redis fallback → if Redis is down, degrades to direct R2 signing
//
// Usage:
//   import { getCachedSignedUrl, getBulkSignedUrls, invalidateCachedUrl }
//     from "../lib/urlCache.js";
//
//   // Single key (lightbox, signed URL endpoint)
//   const url = await getCachedSignedUrl(schoolId, key);
//
//   // Bulk (main use-case — gallery image grid, up to 1000 images)
//   const urlMap = await getBulkSignedUrls(schoolId, keys);
//   // → { "schools/1/gallery/abc/img-thumb.webp": "https://...", ... }
//
//   // Invalidate on image/album delete
//   await invalidateCachedUrl(schoolId, key);
//   await invalidateBulkCachedUrls(schoolId, keys);

import redisClient           from "../utils/redis.js";
import cacheService          from "../utils/cacheService.js";
import { generateSignedUrl } from "./r2.js";

// ── Constants ─────────────────────────────────────────────────────────────────
const DEFAULT_R2_EXPIRY = 3600; // signed URL lifetime in seconds
const SIGN_CHUNK_SIZE   = 50;   // max concurrent R2 signing ops per batch
const MIN_REDIS_TTL     = 60;   // floor for Redis TTL (seconds)

// ── Redis availability guard ──────────────────────────────────────────────────
const redisAvailable = () => !!redisClient;

// ── Versioned key builder ─────────────────────────────────────────────────────
// Ties every gallery URL cache entry to the school's cache version.
// When cacheService.invalidateSchool(schoolId) is called (e.g. after bulk
// operations), it bumps the version and every old r2:signed key becomes
// unreachable — no explicit DEL loop needed.
//
// Format: r2:signed:<schoolId>:v<version>:<r2ObjectKey>
//
async function buildCacheKey(schoolId, r2Key) {
  const version = await cacheService.getSchoolVersion(schoolId);
  return `r2:signed:${schoolId}:v${version}:${r2Key}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// getCachedSignedUrl — single key helper
//
// Use this for:
//   • GET /images/:imageId/url  (lightbox full-res)
//   • album cover in listAlbums
//
// @param {string} schoolId
// @param {string} key              R2 object key
// @param {number} expiresInSeconds
// @returns {Promise<string|null>}
// ─────────────────────────────────────────────────────────────────────────────
export async function getCachedSignedUrl(
  schoolId,
  key,
  expiresInSeconds = DEFAULT_R2_EXPIRY,
) {
  if (!key) return null;

  if (redisAvailable()) {
    try {
      const cacheKey = await buildCacheKey(schoolId, key);
      const cached   = await redisClient.get(cacheKey);
      if (cached) return cached;

      const url      = await generateSignedUrl(key, expiresInSeconds);
      const redisTtl = Math.max(expiresInSeconds - 60, MIN_REDIS_TTL);
      await redisClient.setEx(cacheKey, redisTtl, url);
      return url;
    } catch (err) {
      console.warn("[urlCache] Redis error on getCachedSignedUrl, falling back:", err.message);
    }
  }

  return generateSignedUrl(key, expiresInSeconds);
}

// ─────────────────────────────────────────────────────────────────────────────
// getBulkSignedUrls — production bulk helper
//
// Use this for all gallery grid endpoints (50-1000 thumbnails per page).
//
// Flow:
//   1. Build versioned cache keys for all input R2 keys
//      (getSchoolVersion is internally cached — effectively free after first call)
//   2. MGET all cache keys                    → 1 Redis round-trip
//   3. Separate hits from misses
//   4. Sign misses in parallel chunks of 50   → ceil(misses/50) R2 round-trips
//   5. Pipeline SET all new URLs              → 1 Redis round-trip
//   6. Merge and return { r2Key: signedUrl }
//
// Worst case (0% hit rate, 1000 keys): 2 Redis RTTs + 20 R2 signing batches
// Typical case (warm cache):           1 Redis RTT  + 0 R2 calls
//
// @param {string}   schoolId
// @param {string[]} keys
// @param {number}   expiresInSeconds
// @returns {Promise<Record<string, string>>}
// ─────────────────────────────────────────────────────────────────────────────
export async function getBulkSignedUrls(
  schoolId,
  keys,
  expiresInSeconds = DEFAULT_R2_EXPIRY,
) {
  if (!keys?.length) return {};

  // Deduplicate — thumbnail key may appear multiple times across images
  const uniqueKeys = [...new Set(keys.filter(Boolean))];

  // ── Redis unavailable: fall back to chunked direct signing ───────────────
  if (!redisAvailable()) {
    console.warn("[urlCache] Redis unavailable — signing directly from R2");
    return _signInChunks(uniqueKeys, expiresInSeconds);
  }

  try {
    // ── Step 1: build versioned cache keys ───────────────────────────────────
    const cacheKeys = await Promise.all(
      uniqueKeys.map((r2Key) => buildCacheKey(schoolId, r2Key))
    );

    // ── Step 2: MGET — single round-trip for ALL keys ─────────────────────────
    // Returns array aligned with cacheKeys: string (hit) | null (miss)
    const cached = await redisClient.mGet(cacheKeys);

    // ── Step 3: separate hits from misses ─────────────────────────────────────
    const result        = {}; // { r2Key: url } — final output
    const missR2Keys    = []; // r2 keys we need to sign
    const missCacheKeys = []; // their corresponding redis keys

    uniqueKeys.forEach((r2Key, i) => {
      if (cached[i]) {
        result[r2Key] = cached[i]; // ✓ cache hit
      } else {
        missR2Keys.push(r2Key);
        missCacheKeys.push(cacheKeys[i]);
      }
    });

    if (!missR2Keys.length) return result; // 100% hit rate

    // ── Step 4: sign misses in parallel chunks of SIGN_CHUNK_SIZE ────────────
    const signedMap = await _signInChunks(missR2Keys, expiresInSeconds);

    // ── Step 5: pipeline SET — single round-trip for ALL new entries ──────────
    const redisTtl = Math.max(expiresInSeconds - 60, MIN_REDIS_TTL);
    const pipeline = redisClient.multi();

    missR2Keys.forEach((r2Key, i) => {
      const url = signedMap[r2Key];
      if (url) {
        pipeline.setEx(missCacheKeys[i], redisTtl, url);
        result[r2Key] = url;
      }
    });

    await pipeline.exec();

    return result;

  } catch (err) {
    // Redis failed mid-operation — sign everything directly so the request
    // still succeeds, just without caching this time
    console.warn("[urlCache] getBulkSignedUrls Redis failure, degrading to R2:", err.message);
    return _signInChunks(uniqueKeys, expiresInSeconds);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// invalidateCachedUrl — single key invalidation
//   Call after deleting one image from R2.
//
// @param {string} schoolId
// @param {string} key
// ─────────────────────────────────────────────────────────────────────────────
export async function invalidateCachedUrl(schoolId, key) {
  if (!key || !redisAvailable()) return;
  try {
    const cacheKey = await buildCacheKey(schoolId, key);
    await redisClient.del(cacheKey);
  } catch (err) {
    console.warn("[urlCache] invalidateCachedUrl failed:", err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// invalidateBulkCachedUrls — batch key invalidation
//   Call after deleting an entire album (passes all fileKey + thumbKey values).
//   Single pipeline DEL round-trip regardless of key count.
//
// @param {string}   schoolId
// @param {string[]} keys
// ─────────────────────────────────────────────────────────────────────────────
export async function invalidateBulkCachedUrls(schoolId, keys) {
  if (!keys?.length || !redisAvailable()) return;
  try {
    const cacheKeys = await Promise.all(
      keys.filter(Boolean).map((k) => buildCacheKey(schoolId, k))
    );
    const pipeline = redisClient.multi();
    cacheKeys.forEach((ck) => pipeline.del(ck));
    await pipeline.exec();
  } catch (err) {
    console.warn("[urlCache] invalidateBulkCachedUrls failed:", err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// _signInChunks — internal
//   Signs R2 keys in parallel batches of SIGN_CHUNK_SIZE to avoid overwhelming
//   R2's signing endpoint with 1000 simultaneous requests.
//   Errors on individual keys are caught and logged; the key is omitted from
//   the result rather than crashing the entire batch.
//
// @param {string[]} keys
// @param {number}   expiresInSeconds
// @returns {Promise<Record<string, string>>}
// ─────────────────────────────────────────────────────────────────────────────
async function _signInChunks(keys, expiresInSeconds) {
  const result = {};

  for (let i = 0; i < keys.length; i += SIGN_CHUNK_SIZE) {
    const chunk = keys.slice(i, i + SIGN_CHUNK_SIZE);

    const signed = await Promise.all(
      chunk.map(async (key) => {
        try {
          return [key, await generateSignedUrl(key, expiresInSeconds)];
        } catch (err) {
          console.warn(`[urlCache] Failed to sign "${key}":`, err.message);
          return [key, null];
        }
      })
    );

    for (const [key, url] of signed) {
      if (url) result[key] = url;
    }
  }

  return result;
}