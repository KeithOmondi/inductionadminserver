// models/File.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IFile extends Document {
  url: string; // Cloudinary secure URL
  publicId: string; // Required for deleting from Cloudinary
  originalName: string;
  mimetype: string;
  size: number;
  uploadedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const FileSchema = new Schema<IFile>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    originalName: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

export default mongoose.model<IFile>("File", FileSchema);
