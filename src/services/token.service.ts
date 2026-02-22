import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { hashToken } from "../utils/hashToken";
import { saveRefreshToken } from "../models/refreshToken.store";
import ms, { StringValue } from "ms";

interface Tokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generate Access & Refresh tokens with secure refresh storage
 * @param userId - User unique ID
 * @param role - User role for access token
 */
export const generateTokens = (userId: string, role: string): Tokens => {
  // 1️⃣ Access token contains role
  const accessToken = jwt.sign(
    { id: userId, role },
    env.JWT_SECRET as string,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN as any } // e.g., "15m"
  );

  // 2️⃣ Refresh token only contains ID
  const refreshToken = jwt.sign(
    { id: userId },
    env.JWT_REFRESH_SECRET as string,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN as any } // e.g., "7d"
  );

  // 3️⃣ Hash & store refresh token
  const tokenHash = hashToken(refreshToken);
  const refreshExpiry = new Date(
    Date.now() + ms(env.JWT_REFRESH_EXPIRES_IN as StringValue)
  );

  saveRefreshToken({
    userId,
    tokenHash,
    expiresAt: refreshExpiry,
  });

  // 4️⃣ Return tokens
  return { accessToken, refreshToken };
};
