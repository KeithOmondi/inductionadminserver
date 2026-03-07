import mongoose, { Schema, Document } from "mongoose";

export interface IGallery extends Document {
  title: string;
  description?: string;
  url: string;
  publicId: string; // Cloudinary ID for deletion
  resourceType: "image" | "video";
  category: string;
  uploadedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const GallerySchema = new Schema<IGallery>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    resourceType: { type: String, enum: ["image", "video"], required: true },
    category: { 
      type: String, required: false
    },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export const Gallery = mongoose.model<IGallery>("Gallery", GallerySchema);