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
  order: number; // For manual Up/Down reordering
  content: IDivisionContent[];
  createdAt: Date; 
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
  { _id: true } 
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
    order: { 
      type: Number, 
      default: 0 
    },
    content: [contentSchema],
  },
  { 
    timestamps: true,
    versionKey: false 
  }
);

// Added an index for the order field. 
// This is critical for performance when we sort the registry list.
divisionSchema.index({ order: 1 });

// 4. Export Model
const Division = mongoose.model<IDivision>("Division", divisionSchema);
export default Division;