import { Response } from "express";
import { generateTokens } from "../services/token.service";
import { env } from "../config/env";
import ms, { StringValue } from "ms";

/* =========================
   Minimal user interface for tokens
   Only what is needed for response
========================= */
interface TokenUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export const sendTokens = (res: Response, user: TokenUser) => {
  // Generate access & refresh tokens
  const { accessToken, refreshToken } = generateTokens(user.id, user.role);

  const cookieOptions = {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
  };

  // Attach tokens to cookies
  res.cookie("accessToken", accessToken, {
    ...cookieOptions,
    maxAge: ms(env.JWT_ACCESS_EXPIRES_IN as StringValue),
  });

  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions,
    maxAge: ms(env.JWT_REFRESH_EXPIRES_IN as StringValue),
  });

  // Send user info without sensitive data
  res.status(200).json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
};
