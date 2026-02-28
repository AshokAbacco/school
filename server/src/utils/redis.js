// server/src/utils/redis.js
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
        return Math.min(retries * 100, 3000); // exponential backoff
      },
    },
  });

  redisClient.on("error", (err) => {
    console.error("Redis Error:", err.message);
  });

  redisClient.on("connect", () => {
    console.log("Redis Connected ✅");
  });

  (async () => {
    try {
      await redisClient.connect();
    } catch (err) {
      console.error("Redis initial connection failed:", err.message);
    }
  })();
} else {
  console.warn("⚠️ REDIS_URL not set. Redis disabled.");
}

export default redisClient;
