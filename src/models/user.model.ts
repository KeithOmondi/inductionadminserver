import mongoose, { Document, Schema, Model } from "mongoose";
import bcrypt from "bcryptjs";
import crypto from "crypto";

/* ================================
    1️⃣ Types & Interfaces
================================ */
export type UserRole = "admin" | "judge" | "guest";

interface IWebPushSubscription {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isVerified: boolean;
  isActive: boolean;
  fcmTokens: string[];
  webPushSubscriptions: IWebPushSubscription[];
  passwordChangedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  tempLoginToken?: string;
  tempLoginExpires?: Date;
  loginAttempts: number;
  lockUntil?: Date;
  createdAt: Date;
  updatedAt: Date;

  comparePassword(candidatePassword: string): Promise<boolean>;
  createPasswordResetToken(): string;
  isLocked(): boolean;
  createTempLoginToken(): string;
  verifyTempLoginToken(token: string): boolean;
}

interface IUserModel extends Model<IUser> {
  failedLogin(email: string): Promise<void>;
}

/* ================================
    2️⃣ Schema Definition
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
    password: { type: String, required: true, minlength: 6, select: false },
    role: { type: String, enum: ["admin", "judge", "guest"], default: "guest" },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    fcmTokens: { type: [String], default: [], index: true },
    webPushSubscriptions: [
      {
        endpoint: { type: String, required: true },
        expirationTime: { type: Number, default: null },
        keys: {
          p256dh: { type: String, required: true },
          auth: { type: String, required: true },
        },
      },
    ],
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    tempLoginToken: String,
    tempLoginExpires: Date,
    loginAttempts: { type: Number, default: 0 },
    lockUntil: Date,
  },
  { timestamps: true },
);

/* ================================
    3️⃣ Middleware (Async/Await)
================================ */

// Password Hashing - Next-less implementation
userSchema.pre<IUser>("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);

  // Buffer date slightly for JWT sync issues
  if (!this.isNew) {
    this.passwordChangedAt = new Date(Date.now() - 1000);
  }
});

/* ================================
    4️⃣ Instance Methods
================================ */

userSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  // Use 'this.password' if it was selected, otherwise it will be undefined due to select: false
  // We cast to any to bypass TS complaining about accessing a 'select: false' field
  const userPassword = (this as any).password;

  if (!userPassword) {
    throw new Error(
      "Password field not selected. Use .select('+password') in your query.",
    );
  }

  return bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.createPasswordResetToken = function (): string {
  const resetToken = crypto.randomBytes(32).toString("hex");
  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
  return resetToken;
};

userSchema.methods.isLocked = function (): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

userSchema.methods.createTempLoginToken = function (): string {
  const token = crypto.randomBytes(32).toString("hex");
  this.tempLoginToken = crypto.createHash("sha256").update(token).digest("hex");
  this.tempLoginExpires = new Date(Date.now() + 15 * 60 * 1000);
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
    5️⃣ Static Methods
================================ */
userSchema.statics.failedLogin = async function (email: string) {
  const user = await this.findOne({ email });
  if (!user) return;

  user.loginAttempts += 1;
  if (user.loginAttempts >= 5) {
    user.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
  }
  await user.save();
};

export const User = mongoose.model<IUser, IUserModel>("User", userSchema);
