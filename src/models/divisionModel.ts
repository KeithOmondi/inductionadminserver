import mongoose, { Schema, Document } from "mongoose";

// 1. Define Types & Interfaces
export type ContentType = "TEXT" | "IMAGE" | "VIDEO" | "FILE";

export interface IDivisionContent {
  type: ContentType;
  body?: string;
  url?: string;
  publicId?: string;
  fileName?: string;
  thumbnailUrl?: string;
  createdAt: Date;
}

export interface IDivision extends Document {
  name: string;
  title: string;
  description?: string;
  content: IDivisionContent[];
  createdAt: Date; // Added to interface to match timestamps
  updatedAt: Date;
}

// 2. Sub-Schema for Content Items
const contentSchema = new Schema<IDivisionContent>(
  {
    type: { 
      type: String, 
      enum: ["TEXT", "IMAGE", "VIDEO", "FILE"], 
      required: true 
    },
    body: { type: String, trim: true },
    url: { type: String },
    publicId: { type: String },
    fileName: { type: String },
    thumbnailUrl: { type: String },
    createdAt: { type: Date, default: Date.now }
  },
  { _id: true } // Keeps unique IDs for specific content items if needed
);

// 3. Main Division Schema
const divisionSchema = new Schema<IDivision>(
  {
    name: { 
      type: String, 
      required: [true, "Official name is required"], 
      trim: true 
    },
    title: { 
      type: String, 
      required: [true, "Official title is required (e.g., Registrar High Court)"], 
      trim: true 
    },
    description: { 
      type: String, 
      trim: true 
    },
    content: [contentSchema],
  },
  { 
    timestamps: true,
    versionKey: false // Optional: removes the __v field for cleaner JSON
  }
);

// 4. Export Model
const Division = mongoose.model<IDivision>("Division", divisionSchema);
export default Division;