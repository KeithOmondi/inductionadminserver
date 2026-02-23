import mongoose from "mongoose";
import Division from "./models/divisionModel";
import FAQ from "./models/faqModel";
import Contact from "./models/contactModel";
import { env } from "./config/env";

const seed = async () => {
  try {
    await mongoose.connect(env.MONGO_URI); // DB is in URI

    console.log("✅ DB Connected");

    await Promise.all([
      Division.deleteMany(),
      FAQ.deleteMany(),
      Contact.deleteMany(),
    ]);

    const divs = await Division.insertMany([
      { name: "Civil Division" },
      { name: "Criminal Division" },
      { name: "Family Division" },
      { name: "Commercial Division" },
      { name: "Constitutional & HR Division" },
      { name: "Anti-Corruption Division" },
      { name: "Land & Environment Court" },
      { name: "Judicial Review Division" },
    ]);
    console.log("Divisions inserted:", divs.length);

    const fqs = await FAQ.insertMany([
      {
        question:
          "What is the role of the Chief Justice in relation to the High Court?",
        answer:
          "The Chief Justice provides overall administrative leadership while the Principal Judge manages day-to-day operations.",
      },
      {
        question: "What are my responsibilities as a High Court Judge?",
        answer:
          "To uphold the constitution, ensure fair trial, and deliver justice without fear or favor.",
      },
    ]);
    console.log("FAQs inserted:", fqs.length);

    const cts = await Contact.insertMany([
      {
        title: "Registry Contact",
        detail: "High Court Registry Nairobi",
        sub: "+254 20 221 1000",
      },
      {
        title: "Official Email",
        detail: "onboarding@judiciary.go.ke",
        sub: "principal.judge@judiciary.go.ke",
      },
      {
        title: "Physical Location",
        detail: "Milimani Law Courts",
        sub: "Hospital Road, Nairobi",
      },
    ]);
    console.log("Contacts inserted:", cts.length);

    // List collections
    const db = mongoose.connection.db!;
    const collections: { name: string }[] = await db.listCollections().toArray();
    console.log("Collections in DB:", collections.map((c) => c.name));

    await mongoose.connection.close();
    console.log("🔌 DB connection closed");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeder error:", err);
    await mongoose.connection.close();
    process.exit(1);
  }
};

seed();