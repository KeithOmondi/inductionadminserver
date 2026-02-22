import mongoose from "mongoose";
import { env } from "./env";

export const connectDB = async () => {
  try {
    if (!env.MONGO_URI || !env.DB_NAME) {
      throw new Error(
        "MONGO_URI or DB_NAME is not defined in environment variables",
      );
    }

    const uri = `${env.MONGO_URI}/${env.DB_NAME}?retryWrites=true&w=majority`;

    await mongoose.connect(uri, {
      autoIndex: true, // optional
    });

    console.log(
      `✅ MongoDB connected successfully to database: ${env.DB_NAME}`,
    );
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
};
