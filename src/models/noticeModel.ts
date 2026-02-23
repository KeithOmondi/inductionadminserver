import mongoose, { Schema, Document } from "mongoose";

// ----------------- TYPES -----------------
export type NoticeType = "CIRCULAR" | "EVENTS" | "NOTICE" | "URGENT";

export interface INotice extends Document {
  title: string;
  description: string;
  fileUrl: string;      // stored file (Cloudinary / local / S3)
  fileName: string;     // original file name
  fileSize: string;     // e.g. "2.4 MB"
  type: NoticeType;
  isUrgent: boolean;
  views: number;
  downloads: number;
  publishDate: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ----------------- SCHEMA -----------------
const NoticeSchema: Schema<INotice> = new Schema(
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

    fileUrl: {
      type: String,
      required: true,
    },

    fileName: {
      type: String,
    },

    fileSize: {
      type: String,
    },

    type: {
      type: String,
      enum: ["CIRCULAR", "EVENTS", "NOTICE", "URGENT"],
      default: "NOTICE",
    },

    isUrgent: {
      type: Boolean,
      default: false,
    },

    views: {
      type: Number,
      default: 0,
    },

    downloads: {
      type: Number,
      default: 0,
    },

    publishDate: {
      type: Date,
      default: Date.now,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model<INotice>("Notice", NoticeSchema);