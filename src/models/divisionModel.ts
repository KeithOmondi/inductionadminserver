// models/divisionModel.ts
import mongoose, { Schema, Document } from "mongoose";

export interface IDivision extends Document {
  name: string;
}

const divisionSchema = new Schema<IDivision>(
  {
    name: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export default mongoose.model<IDivision>("Division", divisionSchema);