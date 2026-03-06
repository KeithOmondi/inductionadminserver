import mongoose from "mongoose";
import { env } from "./config/env";
import { User } from "./models/user.model";

const seedUsers = async () => {
  try {
    await mongoose.connect(env.MONGO_URI as string);

    console.log("Connected to DB...");

    const seedData = [
      {
        name: "Hon. Clara Otieno Omondi",
        email: "claraotieno23@gmail.com",
        password: "123456789",
        role: "admin",
        isVerified: true,
        needsPasswordReset: true,
      },
      {
        name: "Hon. Jeffrey Sagirai",
        email: "jeffrey.sagirai@gmail.com",
        password: "123456789",
        role: "judge",
        isVerified: true,
        needsPasswordReset: true,
      },
      {
        name: "Omondi Keith",
        email: "kd.omondi1@gmail.com",
        password: "123456789",
        role: "guest",
        isVerified: true,
        needsPasswordReset: true,
      },
      {
        name: "Omondi Keith",
        email: "denniskeith62@gmail.com",
        password: "123456789",
        role: "judge",
        isVerified: true,
        needsPasswordReset: false,
      },
    ];

    for (const userData of seedData) {
      const existingUser = await User.findOne({ email: userData.email });

      if (!existingUser) {
        const newUser = await User.create(userData);
        console.log(`✅ Added → ${newUser.email}`);
      } else {
        console.log(`⚠️ Skipped (already exists) → ${existingUser.email}`);
      }
    }

    console.log("Seeding complete.");
    process.exit(0);

  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
};

seedUsers();