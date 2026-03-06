import mongoose, { Schema, Document, Types, Model } from "mongoose";

/* ================= FILTER TYPE ================= */

export type EventFilter = "UPCOMING" | "PAST" | "RECENT" | "ALL";
export type EventStatus = "SCHEDULED" | "ONGOING" | "COMPLETED" | "CANCELLED";

/* ================= EVENT INTERFACE ================= */

export interface IEvent extends Document {
  title: string;
  description: string;
  location: string;
  date: Date;          // Base date (usually midnight)
  endTime?: Date;
  time: string;        // e.g., "14:30" (24hr format) or "02:30 PM"
  status: EventStatus;
  isMandatory: boolean;
  capacity?: number;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  // Virtuals
  scheduledAt: Date;   // Combined date + time for countdown
}

/* ================= MODEL INTERFACE (Statics) ================= */

interface IEventModel extends Model<IEvent> {
  getFilteredEvents(filter: EventFilter): Promise<IEvent[]>;
}

/* ================= SCHEMA ================= */

const EventSchema: Schema<IEvent> = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    location: { type: String, required: true },
    date: { type: Date, required: true, index: true },
    endTime: { type: Date },
    time: { type: String, required: true }, // Store as HH:mm
    status: {
      type: String,
      enum: ["SCHEDULED", "ONGOING", "COMPLETED", "CANCELLED"],
      default: "SCHEDULED",
    },
    isMandatory: { type: Boolean, default: false },
    capacity: { type: Number, default: null },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

/* ================= VIRTUALS FOR COUNTDOWN ================= */

/**
 * scheduledAt combines 'date' and 'time' into a single Date object.
 * This allows the frontend to simply do: new Date(event.scheduledAt) - new Date()
 */
EventSchema.virtual("scheduledAt").get(function (this: IEvent) {
  if (!this.date || !this.time) return this.date;

  const fullDate = new Date(this.date);
  
  // Basic parsing for "HH:mm" or "HH:mm AM/PM" formats
  const [timePart, modifier] = this.time.split(' ');
  let [hours, minutes] = timePart.split(':').map(Number);

  if (modifier === 'PM' && hours < 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;

  fullDate.setHours(hours, minutes, 0, 0);
  return fullDate;
});

/* ================= STATIC FILTER METHOD ================= */

EventSchema.statics.getFilteredEvents = async function (filter: EventFilter) {
  const now = new Date();

  switch (filter) {
    case "UPCOMING":
      return this.find({ 
        date: { $gte: new Date(now.setHours(0,0,0,0)) }, // Include today
        status: "SCHEDULED" 
      }).sort({ date: 1, time: 1 }); // Sort by soonest first

    case "PAST":
      return this.find({ 
        $or: [
          { date: { $lt: new Date(now.setHours(0,0,0,0)) } },
          { status: { $in: ["COMPLETED", "CANCELLED"] } }
        ]
      }).sort({ date: -1 });

    case "RECENT":
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      return this.find({
        createdAt: { $gte: sevenDaysAgo },
      }).sort({ createdAt: -1 });

    case "ALL":
    default:
      return this.find().sort({ date: -1 });
  }
};

export default mongoose.model<IEvent, IEventModel>("Event", EventSchema);