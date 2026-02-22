import { createClient } from "redis";
import { env } from "./env";

export const pubClient = createClient({
  url: env.REDIS_URL,
});

export const subClient = pubClient.duplicate();

export const connectRedis = async () => {
  await pubClient.connect();
  await subClient.connect();
  console.log("✅ Redis connected");
};