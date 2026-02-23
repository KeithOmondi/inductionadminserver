// src/controllers/auth.controller.ts
import { Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { User } from "../models/user.model";
import { sendTokens } from "../utils/sendToken";
import { env } from "../config/env";
import { hashToken } from "../utils/hashToken";
import { generateTokens } from "../services/token.service";
import {
  deleteRefreshToken,
  deleteUserTokens,
  findRefreshToken,
} from "../models/refreshToken.store";

/* =====================================
   1️⃣ REGISTER (Guest by default)
===================================== */
export const register = async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  console.log("[REGISTER] Incoming request:", { name, email });

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    console.log("[REGISTER] User already exists:", email);
    return res
      .status(400)
      .json({ success: false, message: "User already exists" });
  }

  const user = await User.create({ name, email, password, role: "guest" });
  console.log("[REGISTER] New user created:", user._id);

  sendTokens(res, user);
};

/* =====================================
   2️⃣ ADMIN PROMOTES USER → SEND LOGIN LINK
===================================== */
export const sendOneTimeLoginLink = async (req: Request, res: Response) => {
  const { email } = req.body;
  const adminId = (req as any).user?.id;
  console.log("[PROMOTE] Admin ID:", adminId, "Promoting user:", email);

  const admin = await User.findById(adminId);
  if (!admin || admin.role !== "admin") {
    console.log("[PROMOTE] Not authorized");
    return res.status(403).json({ success: false, message: "Not authorized" });
  }

  const user = await User.findOne({ email });
  if (!user) {
    console.log("[PROMOTE] User not found:", email);
    return res.status(404).json({ success: false, message: "User not found" });
  }

  user.role = "judge";
  const token = user.createTempLoginToken();
  await user.save();

  const loginLink = `${env.FRONTEND_URL}/temp-login?token=${token}&email=${encodeURIComponent(user.email)}`;
  console.log("[PROMOTE] One-time login link generated:", loginLink);

  return res
    .status(200)
    .json({ success: true, message: "Login link sent to user" });
};

/* =====================================
   3️⃣ TEMPORARY LOGIN USING ONE-TIME LINK
===================================== */
export const tempLogin = async (req: Request, res: Response) => {
  const { email, token, newPassword } = req.body;
  console.log("[TEMP LOGIN] email:", email, "token:", token);

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    console.log("[TEMP LOGIN] User not found:", email);
    return res.status(404).json({ success: false, message: "User not found" });
  }

  if (!user.verifyTempLoginToken(token)) {
    console.log("[TEMP LOGIN] Invalid or expired token for user:", email);
    return res
      .status(401)
      .json({ success: false, message: "Invalid or expired login link" });
  }

  if (!newPassword || newPassword.length < 6) {
    console.log("[TEMP LOGIN] Invalid new password");
    return res
      .status(400)
      .json({ success: false, message: "New password required (min 6 chars)" });
  }

  user.password = newPassword;
  await user.save();
  console.log("[TEMP LOGIN] Password reset successful for user:", email);

  sendTokens(res, user);
};

/* =====================================
   4️⃣ LOGIN (Normal)
===================================== */
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;
  console.log("[LOGIN] Attempt for email:", email);

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    console.log("[LOGIN] Invalid credentials - user not found");
    return res
      .status(401)
      .json({ success: false, message: "Invalid credentials" });
  }

  if (user.isLocked()) {
    console.log("[LOGIN] Account locked for user:", email);
    return res
      .status(423)
      .json({ success: false, message: "Account temporarily locked" });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    user.loginAttempts += 1;
    if (user.loginAttempts >= 5)
      user.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();
    console.log("[LOGIN] Invalid password attempt for user:", email);
    return res
      .status(401)
      .json({ success: false, message: "Invalid credentials" });
  }

  user.loginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();
  console.log("[LOGIN] Successful login for user:", email);

  sendTokens(res, user);
};

/* =====================================
   5️⃣ REFRESH TOKEN (ROTATION)
===================================== */
export const refreshHandler = async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;
  console.log("[REFRESH] Refresh token received:", !!refreshToken);

  if (!refreshToken) {
    console.log("[REFRESH] No refresh token cookie found");
    return res
      .status(401)
      .json({ success: false, message: "No session found" });
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      env.JWT_REFRESH_SECRET as string,
    ) as JwtPayload;
    const tokenHash = hashToken(refreshToken);
    const storedToken = await findRefreshToken(tokenHash);

    if (!storedToken) {
      console.log("[REFRESH] Stored token not found or expired");
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      return res
        .status(403)
        .json({ success: false, message: "Session invalid" });
    }

    await deleteRefreshToken(tokenHash);
    console.log("[REFRESH] Old refresh token deleted (rotation)");

    const user = await User.findById(decoded.id);
    if (!user) {
      console.log("[REFRESH] User not found for token ID:", decoded.id);
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    console.log("[REFRESH] Sending new tokens for user:", user.email);
    sendTokens(res, user);
  } catch (error) {
    console.log("[REFRESH] Token verification failed:", error);
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    return res.status(403).json({ success: false, message: "Session expired" });
  }
};

/* =====================================
   6️⃣ LOGOUT (Single Device)
===================================== */
export const logout = async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;
  console.log("[LOGOUT] Refresh token received:", !!refreshToken);

  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    await deleteRefreshToken(tokenHash);
    console.log("[LOGOUT] Refresh token deleted");
  }

  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  console.log("[LOGOUT] Cookies cleared");

  return res
    .status(200)
    .json({ success: true, message: "Logged out successfully" });
};

/* =====================================
   7️⃣ LOGOUT ALL DEVICES
===================================== */
export const logoutAll = async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  console.log("[LOGOUT ALL] User ID:", userId);

  if (!userId) {
    console.log("[LOGOUT ALL] Unauthorized attempt");
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  await deleteUserTokens(userId);
  console.log("[LOGOUT ALL] All tokens deleted for user:", userId);

  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  console.log("[LOGOUT ALL] Cookies cleared");

  return res
    .status(200)
    .json({ success: true, message: "Logged out from all devices" });
};
