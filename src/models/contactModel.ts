// models/contactModel.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IContact extends Document {
  title: string;
  detail: string;
  sub: string;
}

const contactSchema = new Schema<IContact>(
  {
    title: { type: String, required: true },
    detail: { type: String, required: true },
    sub: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model<IContact>("Contact", contactSchema);