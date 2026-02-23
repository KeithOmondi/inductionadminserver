import mongoose, { Schema, Document, Types } from "mongoose";

/* ================= TYPES ================= */

export type EventType =
  | "DEADLINE"
  | "CEREMONY"
  | "INDUCTION"
  | "MEETING"
  | "TRAINING"
  | "OTHER";

export interface IEvent extends Document {
  title: string;
  description: string;
  location: string;
  date: Date;          // used for timeline (month/day/year extracted in FE)
  time: string;        // "10:00 AM"
  type: EventType;
  isMandatory: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/* ================= SCHEMA ================= */

const EventSchema: Schema<IEvent> = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    location: {
      type: String,
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    time: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ["DEADLINE", "CEREMONY", "INDUCTION", "MEETING", "TRAINING", "OTHER"],
      default: "OTHER",
    },

    isMandatory: {
      type: Boolean,
      default: false,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model<IEvent>("Event", EventSchema);