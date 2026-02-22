// src/models/user.model.ts
import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

/* ================================
    1️⃣ Roles
================================ */
export type UserRole = "admin" | "judge" | "guest";

/* ================================
    2️⃣ Interface
================================ */
export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;

  isVerified: boolean;
  isActive: boolean;

  // 🔹 Push Notifications
  fcmTokens: string[]; 

  passwordChangedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;

  tempLoginToken?: string;
  tempLoginExpires?: Date;

  loginAttempts: number;
  lockUntil?: Date;

  createdAt: Date;
  updatedAt: Date;

  /* Instance Methods */
  comparePassword(candidatePassword: string): Promise<boolean>;
  createPasswordResetToken(): string;
  isLocked(): boolean;
  createTempLoginToken(): string;
  verifyTempLoginToken(token: string): boolean;
}

/* ================================
    3️⃣ Schema
================================ */
const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: { 
      type: String, 
      required: true, 
      minlength: 6, 
      select: false 
    },
    role: { 
      type: String, 
      enum: ["admin", "judge", "guest"], 
      default: "guest" 
    },
    isVerified: { 
      type: Boolean, 
      default: false 
    },
    isActive: { 
      type: Boolean, 
      default: true 
    },
    // 🔹 Storage for multiple device tokens
    fcmTokens: {
      type: [String],
      default: [],
      index: true,
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    tempLoginToken: String,
    tempLoginExpires: Date,
    loginAttempts: { 
      type: Number, 
      default: 0 
    },
    lockUntil: Date,
  },
  { timestamps: true }
);

/* ================================
    4️⃣ Password Hashing
================================ */
userSchema.pre<IUser>("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);

  if (!this.isNew) {
    this.passwordChangedAt = new Date();
  }
});

/* ================================
    5️⃣ Instance Methods
================================ */
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  // 'this' must be cast to IUser to access password due to 'select: false'
  return bcrypt.compare(candidatePassword, (this as any).password);
};

userSchema.methods.createPasswordResetToken = function (): string {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  return resetToken;
};

userSchema.methods.isLocked = function (): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

/* ================================
    6️⃣ Temporary One-Time Login Token
================================ */
userSchema.methods.createTempLoginToken = function (): string {
  const token = crypto.randomBytes(32).toString("hex");

  this.tempLoginToken = crypto.createHash("sha256").update(token).digest("hex");
  this.tempLoginExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  return token;
};

userSchema.methods.verifyTempLoginToken = function (token: string): boolean {
  if (!this.tempLoginToken || !this.tempLoginExpires) return false;

  const hashed = crypto.createHash("sha256").update(token).digest("hex");
  const isValid =
    hashed === this.tempLoginToken && this.tempLoginExpires > new Date();

  if (isValid) {
    this.tempLoginToken = undefined;
    this.tempLoginExpires = undefined;
  }

  return isValid;
};

/* ================================
    7️⃣ Static Methods for Lock Logic
================================ */
userSchema.statics.failedLogin = async function (email: string) {
  const user = await this.findOne({ email });
  if (!user) return;

  user.loginAttempts += 1;

  // Lock after 5 failed attempts for 30 minutes
  if (user.loginAttempts >= 5) {
    user.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
  }

  await user.save();
};

/* ================================
    8️⃣ Export
================================ */
export const User = mongoose.model<IUser>("User", userSchema);