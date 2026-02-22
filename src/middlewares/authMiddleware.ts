// src/middlewares/authMiddleware.ts
import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { env } from "../config/env";

type UserRole = "admin" | "judge" | "guest";

interface TokenPayload extends JwtPayload {
  id: string;
  role: UserRole;
}

// FIX: Extend Request without re-defining existing properties manually
export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: UserRole;
  };
}

export const protect = (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    // Access cookies via bracket notation or any-casting to bypass the strict check 
    // if @types/cookie-parser isn't playing nice with the global Request object.
    const token = (req as any).cookies?.accessToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized, please login",
      });
    }

    const decoded = jwt.verify(token, env.JWT_SECRET as string) as TokenPayload;

    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Session expired or invalid token",
    });
  }
};