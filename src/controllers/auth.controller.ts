// src/controllers/auth.controller.ts
import { Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { User } from "../models/user.model";
import { sendTokens } from "../utils/sendToken";
import { env } from "../config/env";
import { hashToken } from "../utils/hashToken";
import { generateTokens } from "../services/token.service";
import { deleteRefreshToken, deleteUserTokens, findRefreshToken } from "../models/refreshToken.store";

/* =====================================
   1️⃣ REGISTER (Guest by default)
===================================== */
export const register = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ success: false, message: "User already exists" });
  }

  const user = await User.create({
    name,
    email,
    password,
    role: "guest", // Default role
  });

  sendTokens(res, user);
};

/* =====================================
   2️⃣ ADMIN PROMOTES USER → SEND LOGIN LINK
      (One-time login link with OTP)
===================================== */
export const sendOneTimeLoginLink = async (req: Request, res: Response) => {
  const { email } = req.body;

  // Only admins can promote
  const adminId = (req as any).user?.id;
  const admin = await User.findById(adminId);
  if (!admin || admin.role !== "admin") {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  // Find user
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  // Promote to judge
  user.role = "judge";

  // Generate temporary login token (15 mins)
  const token = user.createTempLoginToken();
  await user.save();

  // Construct login link (frontend URL should handle verification & password reset)
  const loginLink = `${env.FRONTEND_URL}/temp-login?token=${token}&email=${encodeURIComponent(user.email)}`;

  // TODO: send email here with loginLink
  console.log("One-time login link:", loginLink);

  res.status(200).json({
    success: true,
    message: "Login link sent to user",
  });
};

/* =====================================
   3️⃣ TEMPORARY LOGIN USING ONE-TIME LINK
===================================== */
export const tempLogin = async (req: Request, res: Response) => {
  const { email, token, newPassword } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  // Verify temp login token
  if (!user.verifyTempLoginToken(token)) {
    return res.status(401).json({ success: false, message: "Invalid or expired login link" });
  }

  // Immediately reset password
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ success: false, message: "New password required (min 6 chars)" });
  }

  user.password = newPassword;
  await user.save();

  // Send access & refresh tokens
  sendTokens(res, user);
};

/* =====================================
   4️⃣ LOGIN (Normal)
===================================== */
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");

  if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });

  if (user.isLocked()) return res.status(423).json({
    success: false,
    message: "Account temporarily locked due to multiple failed attempts",
  });

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    user.loginAttempts += 1;
    if (user.loginAttempts >= 5) user.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  user.loginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  sendTokens(res, user);
};

/* =====================================
   5️⃣ REFRESH TOKEN, LOGOUT, LOGOUT ALL
   (keep your existing implementations)
===================================== */


/* =====================================
   3️⃣ REFRESH TOKEN (ROTATION)
===================================== */
export const refreshHandler = async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken; // Use cookies, not req.body

  if (!refreshToken) {
    return res.status(401).json({ success: false, message: "No session found" });
  }

  try {
    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET as string) as JwtPayload;
    const tokenHash = hashToken(refreshToken);
    const storedToken = await findRefreshToken(tokenHash);

    if (!storedToken) {
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      return res.status(403).json({ success: false, message: "Session invalid" });
    }

    // Invalidate old hash and find user
    await deleteRefreshToken(tokenHash);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // 🔹 Use sendTokens to set NEW cookies and return the USER object
    return sendTokens(res, user); 
  } catch (error) {
    return res.status(403).json({ success: false, message: "Session expired" });
  }
};

/* =====================================
   4️⃣ LOGOUT (Single Device)
===================================== */
export const logout = async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    deleteRefreshToken(tokenHash);
  }

  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");

  return res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};

/* =====================================
   5️⃣ LOGOUT ALL DEVICES
===================================== */
export const logoutAll = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  deleteUserTokens(userId);

  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");

  return res.status(200).json({
    success: true,
    message: "Logged out from all devices",
  });
};
