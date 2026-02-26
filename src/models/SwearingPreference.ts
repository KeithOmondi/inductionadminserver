import mongoose, { Schema, Document } from "mongoose";

export interface ISwearingPreference extends Document {
  user: mongoose.Types.ObjectId;
  ceremonyChoice: "oath" | "affirmation";
  religiousText?: "Bhagavad Gita" | "Bible" | "Catholic Bible" | "Qur'an";
  createdAt: Date;
  updatedAt: Date;
}

const SwearingPreferenceSchema = new Schema<ISwearingPreference>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // one submission per user
    },
    ceremonyChoice: {
      type: String,
      enum: ["oath", "affirmation"],
      required: true,
    },
    religiousText: {
      type: String,
      enum: ["Bhagavad Gita", "Bible", "Catholic Bible", "Qur'an"],
      required: function (this: ISwearingPreference) {
        return this.ceremonyChoice === "oath";
      },
    },
  },
  { timestamps: true },
);

export default mongoose.model<ISwearingPreference>(
  "SwearingPreference",
  SwearingPreferenceSchema,
);
