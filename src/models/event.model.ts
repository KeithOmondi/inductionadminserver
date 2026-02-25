import mongoose, { Schema, Document, Types, Model } from "mongoose";

/* ================= FILTER TYPE ================= */

export type EventFilter = "UPCOMING" | "PAST" | "RECENT" | "ALL";

/* ================= EVENT INTERFACE ================= */

export interface IEvent extends Document {
  title: string;
  description: string;
  location: string;
  date: Date;
  time: string;
  isMandatory: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/* ================= MODEL INTERFACE (Statics) ================= */

interface IEventModel extends Model<IEvent> {
  getFilteredEvents(filter: EventFilter): Promise<IEvent[]>;
}

/* ================= SCHEMA ================= */

const EventSchema: Schema<IEvent> = new Schema(
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

    location: {
      type: String,
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    time: {
      type: String,
      required: true,
    },

    isMandatory: {
      type: Boolean,
      default: false,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

/* ================= STATIC FILTER METHOD ================= */

EventSchema.statics.getFilteredEvents = async function (filter: EventFilter) {
  const now = new Date();

  switch (filter) {
    case "UPCOMING":
      return this.find({ date: { $gt: now } }).sort({ date: 1 });

    case "PAST":
      return this.find({ date: { $lt: now } }).sort({ date: -1 });

    case "RECENT":
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      return this.find({
        date: { $gte: sevenDaysAgo, $lte: now },
      }).sort({ date: -1 });

    case "ALL":
    default:
      return this.find().sort({ date: 1 });
  }
};

/* ================= EXPORT ================= */

export default mongoose.model<IEvent, IEventModel>("Event", EventSchema);