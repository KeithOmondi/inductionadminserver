import mongoose from "mongoose";
import { env } from "./config/env";
import { User } from "./models/user.model";

const seedUsers = async () => {
  try {
    await mongoose.connect(env.MONGO_URI as string);

    console.log("Connected to DB...");

    // Optional: clear existing users
    await User.deleteMany({});

    const users = await User.create([
      {
        name: "Hon. Clara Otieno Omondi",
        email: "claraotieno23@gmail.com",
        password: "123456789",
        role: "judge",
        isVerified: true,
        needsPasswordReset: false,
      },
      {
        name: "Hon. Jeffrey Sagirai",
        email: "jeffrey.sagirai@gmail.com",
        password: "Admin123!",
        role: "judge",
        isVerified: true,
        needsPasswordReset: false,
      },
      {
        name: "Omondi Keith",
        email: "kd.omondi1@gmail.com",
        password: "123456789",
        role: "judge",
        isVerified: true,
        needsPasswordReset: true,
      },
    ]);

    console.log("Users seeded successfully:");
    users.forEach((u) =>
      console.log(`- ${u.role.toUpperCase()} → ${u.email}`)
    );

    process.exit(0);
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
};

seedUsers();