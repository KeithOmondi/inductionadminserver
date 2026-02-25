import { Schema, model, Types, Document } from "mongoose";

export type SenderType = "guest" | "admin" | "judge";
export type MessageStatus = "sent" | "delivered" | "read";

export interface IMessage extends Document {
  sender: Types.ObjectId;
  receiver?: Types.ObjectId;
  group?: Types.ObjectId;
  text?: string;
  imageUrl?: string;
  senderType: SenderType;
  status: MessageStatus;
  readBy: Types.ObjectId[];
  deliveredTo: Types.ObjectId[];
  isDeleted: boolean;
  isEdited: boolean;
  isBroadcast: boolean;
  createdAt: Date;
  updatedAt: Date;
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
    imageUrl: String,
    senderType: {
      type: String,
      enum: ["guest", "admin", "judge"],
      required: true,
    },
    isBroadcast: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "read"],
      default: "sent",
      index: true,
    },
    readBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    deliveredTo: [{ type: Schema.Types.ObjectId, ref: "User" }],
    isDeleted: { type: Boolean, default: false },
    isEdited: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

/* ===============================
    VALIDATION (No 'next' used)
================================ */
messageSchema.pre("validate", function (this: IMessage) {
  // If it's a broadcast, skip receiver/group checks
  if (this.isBroadcast) {
    if (!this.text && !this.imageUrl) {
      throw new Error("Broadcast must contain either text or an image.");
    }
    return; // Validation passes
  }

  // Standard Direct Message Validation
  if (!this.receiver && !this.group) {
    throw new Error("Message must have either receiver or group.");
  }
  if (this.receiver && this.group) {
    throw new Error("Message cannot have both receiver and group.");
  }
  if (!this.text && !this.imageUrl) {
    throw new Error("Message must contain either text or an image.");
  }
});

/* ===============================
    INDEXES
================================ */
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, createdAt: -1 });
messageSchema.index({ group: 1, createdAt: -1 });

export const Message = model<IMessage>("Message", messageSchema);
