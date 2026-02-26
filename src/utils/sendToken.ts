import { Response } from "express";
import { generateTokens } from "../services/token.service";
import { env } from "../config/env";
import ms, { StringValue } from "ms";

interface TokenUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export const sendTokens = (res: Response, user: TokenUser) => {
  const { accessToken, refreshToken } = generateTokens(user.id, user.role);

  const isProduction = env.NODE_ENV === "production";

 const cookieOptions = {
  httpOnly: true,
  secure: isProduction || env.NODE_ENV === "development", // See note below
  sameSite: isProduction,
};

  res.cookie("accessToken", accessToken, {
    ...cookieOptions,
    maxAge: ms(env.JWT_ACCESS_EXPIRES_IN as StringValue),
  });

  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions,
    maxAge: ms(env.JWT_REFRESH_EXPIRES_IN as StringValue),
  });

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