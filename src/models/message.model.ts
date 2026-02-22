import { Schema, model, Types, Document } from "mongoose";

export type SenderType = "guest" | "admin" | "judge";

export interface IMessage extends Document {
  sender: Types.ObjectId;
  receiver?: Types.ObjectId;
  group?: Types.ObjectId;
  text?: string;
  imageUrl?: string;
  senderType: SenderType;
  fcmTokens: string[]; // Added to interface
  readBy: Types.ObjectId[];
  deliveredTo: Types.ObjectId[];
  deliveryStatus: "sent" | "delivered" | "read";
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  isEdited: boolean;
}

const messageSchema = new Schema<IMessage>(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    group: {
      type: Schema.Types.ObjectId,
      ref: "Group",
      index: true,
    },
    text: {
      type: String,
      trim: true,
      maxlength: 5000,
    },
    imageUrl: {
      type: String,
    },
    fcmTokens: {
      type: [String],
      default: [],
    },
    senderType: {
      type: String,
      enum: ["guest", "admin", "judge"],
      required: true,
    },
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    deliveredTo: [{ type: Schema.Types.ObjectId, ref: "User" }],
    deliveryStatus: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    isEdited: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

/* ===============================
    VALIDATION LOGIC
================================ */

messageSchema.pre("validate", async function () {
  // Destination Check
  if (!this.receiver && !this.group) {
    throw new Error("Message must have either receiver or group.");
  }
  if (this.receiver && this.group) {
    throw new Error("Message cannot have both receiver and group.");
  }

  // Content Check
  if (!this.text && !this.imageUrl) {
    throw new Error("Message must contain either text or an image.");
  }
});

/* ===============================
    INDEXES
================================ */

// Optimized for retrieving latest conversation between two users
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, createdAt: -1 });

// Optimized for retrieving group history
messageSchema.index({ group: 1, createdAt: -1 });

// Useful for clearing old FCM tokens or debugging delivery
messageSchema.index({ deliveryStatus: 1 });

export const Message = model<IMessage>("Message", messageSchema);
