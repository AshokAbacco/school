import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL;

let redisClient = null;

if (redisUrl) {
  redisClient = createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy(retries) {
        if (retries > 10) {
          console.error("Redis reconnect failed after 10 attempts.");
          return new Error("Retry attempts exhausted");
        }
        return Math.min(retries * 100, 3000);
      },
    },
  });

  redisClient.on("error", (err) => {
    console.error("Redis Error:", err.message);
  });

  redisClient.on("connect", () => {
    console.log("✅ Redis Connected");
  });

  // 🔥 IMPORTANT: connect once
  redisClient.connect().catch((err) => {
    console.error("Redis connection failed:", err.message);
  });
}

// ✅ SAFE WRAPPER
export const safeRedis = {
  async get(key) {
    try {
      if (!redisClient || !redisClient.isOpen) return null;
      return await redisClient.get(key);
    } catch (e) {
      console.log("Redis GET failed:", e.message);
      return null;
    }
  },

  async setEx(key, ttl, value) {
    try {
      if (!redisClient || !redisClient.isOpen) return null;
      return await redisClient.setEx(key, ttl, value);
    } catch (e) {
      console.log("Redis SET failed:", e.message);
    }
  },

  async del(key) {
    try {
      if (!redisClient || !redisClient.isOpen) return null;
      return await redisClient.del(key);
    } catch (e) {
      console.log("Redis DEL failed:", e.message);
    }
  },
};

export default safeRedis;