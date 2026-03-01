// src/middlewares/authMiddleware.ts
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { env } from "../config/env";

export type UserRole = "admin" | "judge" | "guest";

/* ================================
   1️⃣ Token Payload Interface
================================ */
interface TokenPayload extends JwtPayload {
  id: string;
  role?: UserRole;          // Not required for reset tokens
  resetOnly?: boolean;      // 🔐 Used for forced password reset
}

/* ================================
   2️⃣ Extended Request Interface
================================ */
export interface AuthRequest extends Request {
  user?: {
    id: string;
    role?: UserRole;
    resetOnly?: boolean;
  };
}

/* ================================
   3️⃣ Protect (Normal Access Tokens Only)
================================ */
export const protect = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = (req as any).cookies?.accessToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, please login",
      });
    }

    const decoded = jwt.verify(
      token,
      env.JWT_SECRET as string
    ) as TokenPayload;

    // 🚫 Block reset-only tokens from accessing protected routes
    if (decoded.resetOnly) {
      return res.status(403).json({
        success: false,
        message: "Password reset session cannot access this resource",
      });
    }

    req.user = {
      id: decoded.id,
      role: decoded.role,
      resetOnly: decoded.resetOnly,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Session expired or invalid token",
    });
  }
};

/* ================================
   4️⃣ Protect Reset-Only Routes
================================ */
export const protectResetOnly = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Reset session required",
      });
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(
      token,
      env.JWT_SECRET as string
    ) as TokenPayload;

    if (!decoded.resetOnly) {
      return res.status(403).json({
        success: false,
        message: "Invalid reset session",
      });
    }

    req.user = {
      id: decoded.id,
      resetOnly: true,
    };

    next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Reset session expired or invalid",
    });
  }
};

/* ================================
   5️⃣ Role Authorization
================================ */
export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role (${req.user?.role}) is not authorized`,
      });
    }
    next();
  };
};