// src/controllers/auth.controller.ts
import { Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { User } from "../models/user.model";
import { sendTokens } from "../utils/sendToken";
import { env } from "../config/env";
import { hashToken } from "../utils/hashToken";
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

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res
      .status(400)
      .json({ success: false, message: "User already exists" });
  }

  const user = await User.create({
    name,
    email,
    password,
    role: "guest",
    needsPasswordReset: false,
  });

  sendTokens(res, user);
};

/* =====================================
   2️⃣ LOGIN (With Reset-Token Support)
===================================== */
export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return res
      .status(401)
      .json({ success: false, message: "Invalid credentials" });
  }

  if (user.isLocked()) {
    return res
      .status(423)
      .json({ success: false, message: "Account temporarily locked" });
  }

  const isMatch = await user.comparePassword(password);

  if (!isMatch) {
    user.loginAttempts += 1;

    if (user.loginAttempts >= 5) {
      user.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
    }

    await user.save();

    return res
      .status(401)
      .json({ success: false, message: "Invalid credentials" });
  }

  // ✅ Clear failed attempts on successful password match
  user.loginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  /* 🔐 FORCE RESET LOGIC (Option B) */
  if (user.needsPasswordReset) {
    const resetToken = jwt.sign(
      {
        id: user._id,
        resetOnly: true,
      },
      env.JWT_SECRET as string,
      { expiresIn: "10m" }
    );

    return res.status(403).json({
      success: false,
      message: "Password reset required",
      needsPasswordReset: true,
      resetToken,
    });
  }

  // Normal login
  sendTokens(res, user);
};

/* =====================================
   3️⃣ FORCE PASSWORD RESET (Reset Token Required)
===================================== */
export const forcePasswordReset = async (req: Request, res: Response) => {
  const { newPassword } = req.body;

  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Reset session invalid",
    });
  }

  const user = await User.findById(userId).select("+password");
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "User not found",
    });
  }

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      message: "New password must be at least 6 characters",
    });
  }

  user.password = newPassword;
  user.needsPasswordReset = false;
  user.loginAttempts = 0;
  user.lockUntil = undefined;

  await user.save();

  // After successful reset → issue real tokens
  sendTokens(res, user);
};

/* =====================================
   4️⃣ REFRESH TOKEN (Rotation)
===================================== */
export const refreshHandler = async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) return res.sendStatus(401);

  try {
    const decoded = jwt.verify(
      refreshToken,
      env.JWT_REFRESH_SECRET as string
    ) as JwtPayload;

    const tokenHash = hashToken(refreshToken);
    const storedToken = await findRefreshToken(tokenHash);

    if (!storedToken) {
      res.clearCookie("accessToken");
      res.clearCookie("refreshToken");
      return res.sendStatus(403);
    }

    await deleteRefreshToken(tokenHash);

    const user = await User.findById(decoded.id);

    if (!user) return res.sendStatus(404);

    if (user.needsPasswordReset) {
      return res.status(403).json({
        success: false,
        message: "Password reset required",
      });
    }

    sendTokens(res, user);

  } catch {
    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");
    return res.sendStatus(403);
  }
};


/* =====================================
   5️⃣ LOGOUT
===================================== */
export const logout = async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    await deleteRefreshToken(hashToken(refreshToken));
  }

  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");

  return res.status(200).json({
    success: true,
    message: "Logged out",
  });
};

/* =====================================
   6️⃣ LOGOUT ALL
===================================== */
export const logoutAll = async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  await deleteUserTokens(userId);

  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");

  return res.status(200).json({
    success: true,
    message: "Logged out from all devices",
  });
};