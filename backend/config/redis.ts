import { createClient, RedisClientType } from "redis";
import dotenv from "dotenv";

dotenv.config();

const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379");

let redisClient: RedisClientType;

const initRedis = async (): Promise<RedisClientType> => {
  redisClient = createClient({
    socket: {
      host: REDIS_HOST,
      port: REDIS_PORT,
    },
  });

  redisClient.on("error", (err) => {
    console.error("❌ Redis Client Error:", err);
  });

  redisClient.on("connect", () => {
    console.log("✅ Redis connected successfully on port", REDIS_PORT);
  });

  await redisClient.connect();
  return redisClient;
};

const getRedisClient = (): RedisClientType => {
  if (!redisClient) {
    throw new Error("Redis client not initialized. Call initRedis() first.");
  }
  return redisClient;
};

// Redis keys
const REDIS_KEYS = {
  IMAGE_CLICKS: "image:clicks", // Sorted set for tracking clicks
  TOP_IMAGES: "image:top3", // Cached top 3 images
};

export { initRedis, getRedisClient, REDIS_KEYS };
