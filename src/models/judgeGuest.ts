import mongoose, { Schema, Document, Types } from "mongoose";

// ----------------- TYPES -----------------
export type GuestType = "ADULT" | "MINOR";
export type Gender = "MALE" | "FEMALE" | "OTHER";
export type AgeGroup =
  | "UNDER_5"
  | "6_12"
  | "13_17"
  | "18_25"
  | "26_40"
  | "41_60"
  | "60_PLUS";

export type GuestListStatus = "DRAFT" | "SUBMITTED";

export interface IGuest {
  name?: string;
  type?: GuestType;
  gender?: Gender;
  ageGroup?: AgeGroup;
  idNumber?: string;
  phone?: string;
  email?: string;
}

export interface IJudgeGuest extends Document {
  user: Types.ObjectId;
  guests: IGuest[];
  status: GuestListStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ----------------- GUEST SCHEMA -----------------
const GuestSchema: Schema<IGuest> = new Schema(
  {
    name: { type: String, trim: true },
    type: {
      type: String,
      enum: ["ADULT", "MINOR"],
      default: "ADULT",
    },
    gender: {
      type: String,
      enum: ["MALE", "FEMALE", "OTHER"],
    },
    ageGroup: {
      type: String,
      enum: ["UNDER_5", "6_12", "13_17", "18_25", "26_40", "41_60", "60_PLUS"],
    },
    idNumber: { type: String },
    phone: { type: String },
    email: { type: String },
  },
  { _id: false },
);

// ----------------- MAIN SCHEMA -----------------
const JudgeGuestSchema: Schema<IJudgeGuest> = new Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
      unique: true,
    },
    guests: {
      type: [GuestSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["DRAFT", "SUBMITTED"],
      default: "DRAFT",
    },
  },
  { timestamps: true },
);

// ----------------- ASYNC VALIDATION ON SAVE -----------------
// We use a standard function (not arrow) to maintain 'this' context
JudgeGuestSchema.pre("save", async function () {
  const doc = this as IJudgeGuest;

  // Only run strict validation if the status is being set to SUBMITTED
  if (doc.status === "SUBMITTED") {
    // Ensure there is at least one guest
    if (!doc.guests || doc.guests.length === 0) {
      throw new Error("You must add at least one guest before submitting.");
    }

    for (const guest of doc.guests) {
      // 1. Core fields required for everyone
      if (!guest.name || !guest.gender || !guest.ageGroup) {
        throw new Error(
          `Guest "${guest.name || "Unknown"}" is missing required details (Name, Gender, or Age Group).`,
        );
      }

      // 2. Strict fields for Adults
      if (guest.type === "ADULT") {
        if (!guest.idNumber || !guest.phone || !guest.email) {
          throw new Error(
            `Adult guest "${guest.name}" must have an ID number, phone, and email.`,
          );
        }
      }
    }
  }
});

export default mongoose.model<IJudgeGuest>("JudgeGuest", JudgeGuestSchema);
