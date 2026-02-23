// src/config/env.ts
import dotenv from "dotenv";

dotenv.config();

/**
 * Helper to ensure a variable exists in process.env
 * Now only requires the KEY name as an argument.
 */
const requiredEnv = (name: string): string => {
  const value = process.env[name]; // Look up the value here
  if (!value) {
    throw new Error(`❌ Missing required environment variable: ${name}`);
  }
  return value;
};

export const env = {
  PORT: process.env.PORT ? Number(process.env.PORT) : 8000,
  NODE_ENV: process.env.NODE_ENV || "production",

  // 1 argument passed, 1 argument expected. Error solved!
  MONGO_URI: requiredEnv("MONGO_URI"),
  DB_NAME: process.env.DB_NAME || "judgesApp",
  FRONTEND_URL: requiredEnv("FRONTEND_URL"),

  // JWT Secrets
  JWT_SECRET:
    process.env.NODE_ENV === "production"
      ? requiredEnv("JWT_SECRET")
      : process.env.JWT_SECRET || "dev_access_secret",

  JWT_REFRESH_SECRET:
    process.env.NODE_ENV === "production"
      ? requiredEnv("JWT_REFRESH_SECRET")
      : process.env.JWT_REFRESH_SECRET || "dev_refresh_secret",

  CLOUDINARY_CLOUD_NAME:
    process.env.NODE_ENV === "production"
      ? requiredEnv("CLOUDINARY_CLOUD_NAME")
      : process.env.CLOUDINARY_CLOUD_NAME || "dev_cloud_name",

  CLOUDINARY_API_KEY:
    process.env.NODE_ENV === "production"
      ? requiredEnv("CLOUDINARY_API_KEY")
      : process.env.CLOUDINARY_API_KEY || "dev_cloud_api",

  CLOUDINARY_API_SECRET:
    process.env.NODE_ENV === "production"
      ? requiredEnv("CLOUDINARY_API_SECRET")
      : process.env.CLOUDINARY_API_SECRET || "dev_cloud_api",

     //REDIS URL
      REDIS_URL:
    process.env.NODE_ENV === "production"
      ? requiredEnv("REDIS_URL")
      : process.env.REDIS_URL || "dev_redis_url", 

      VAPID_PUBLIC_KEY:
    process.env.NODE_ENV === "production"
      ? requiredEnv("VAPID_PUBLIC_KEY")
      : process.env.VAPID_PUBLIC_KEY|| "web_push",
      
      VAPID_PRIVATE_KEY:
    process.env.NODE_ENV === "production"
      ? requiredEnv("VAPID_PRIVATE_KEY")
      : process.env.VAPID_PRIVATE_KEY || "web_push",

  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
};
