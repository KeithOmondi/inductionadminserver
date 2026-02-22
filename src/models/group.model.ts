import { Schema, model, Types, Document } from "mongoose";

export interface IGroup extends Document {
  name: string;
  description?: string;
  createdBy: Types.ObjectId;
  members: Types.ObjectId[];
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const groupSchema = new Schema<IGroup>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

groupSchema.index({ members: 1 });

/* ===============================
    ENSURE UNIQUE MEMBERS (Async)
================================ */
groupSchema.pre("save", async function () {
  if (this.members && this.members.length > 0) {
    const uniqueIds = Array.from(new Set(this.members.map((id) => id.toString())));
    this.members = uniqueIds.map((id) => new Types.ObjectId(id)) as any;
  }
});

export const Group = model<IGroup>("Group", groupSchema);