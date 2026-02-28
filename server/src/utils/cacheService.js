//server\src\utils\cacheService.js
import redisClient from "./redis.js";

const CACHE_TTL = 60 * 5; // 5 minutes

// ─────────────────────────────────────────
// Version Handling
// ─────────────────────────────────────────

async function getSchoolVersion(schoolId) {
  if (!redisClient) return "1";

  const key = `school:${schoolId}:cache-version`;

  try {
    let version = await redisClient.get(key);

    if (!version) {
      version = "1";
      await redisClient.set(key, version);
    }

    return version.toString();
  } catch (err) {
    console.error("Redis version read failed:", err.message);
    return "1";
  }
}

async function invalidateSchool(schoolId) {
  if (!redisClient) return;

  const key = `school:${schoolId}:cache-version`;

  try {
    await redisClient.incr(key);
  } catch (err) {
    console.error("Redis version bump failed:", err.message);
  }
}

// ─────────────────────────────────────────
// Cache Helpers
// ─────────────────────────────────────────

async function get(key) {
  if (!redisClient) return null;

  try {
    return await redisClient.get(key);
  } catch (err) {
    console.error(`[Redis] GET ${key} failed:`, err.message);
    return null;
  }
}

async function set(key, value) {
  if (!redisClient) return;

  try {
    await redisClient.setEx(key, CACHE_TTL, JSON.stringify(value));
  } catch (err) {
    console.error(`[Redis] SET ${key} failed:`, err.message);
  }
}

// ─────────────────────────────────────────
// Versioned Key Builder
// ─────────────────────────────────────────

async function buildKey(schoolId, namespace) {
  const version = await getSchoolVersion(schoolId);
  return `${namespace}:v${version}`;
}

export default {
  getSchoolVersion,
  invalidateSchool,
  get,
  set,
  buildKey,
};
