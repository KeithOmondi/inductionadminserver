import mongoose, { Schema, Document, Types } from "mongoose";

// ----------------- TYPES -----------------
export type GuestType = "ADULT" | "MINOR";
export type Gender = "MALE" | "FEMALE" | "OTHER";
export type GuestListStatus = "DRAFT" | "SUBMITTED";

export interface IGuest {
  name?: string;
  type?: GuestType;
  gender?: Gender;
  idNumber?: string;          // For Adults
  birthCertNumber?: string;   // For Minors
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
    idNumber: { type: String, trim: true },
    birthCertNumber: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
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
JudgeGuestSchema.pre("save", async function () {
  const doc = this as IJudgeGuest;

  if (doc.status === "SUBMITTED") {
    if (!doc.guests || doc.guests.length === 0) {
      throw new Error("You must add at least one guest before submitting.");
    }

    for (const guest of doc.guests) {
      // 1. Core fields required for everyone
      if (!guest.name || !guest.gender) {
        throw new Error(
          `Guest "${guest.name || "Unknown"}" is missing required details (Name or Gender).`,
        );
      }

      // 2. Conditional Validation based on Guest Type
      if (guest.type === "ADULT") {
        if (!guest.idNumber || !guest.phone || !guest.email) {
          throw new Error(
            `Adult guest "${guest.name}" must have an ID number, phone, and email.`,
          );
        }
      } else if (guest.type === "MINOR") {
        if (!guest.birthCertNumber) {
          throw new Error(
            `Minor guest "${guest.name}" must have a birth certificate number.`,
          );
        }
      }
    }
  }
});

export default mongoose.model<IJudgeGuest>("JudgeGuest", JudgeGuestSchema);