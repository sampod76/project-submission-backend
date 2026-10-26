import type { CookieOptions } from "express";
import { env } from "../../config/env";
export const REFRESH_COOKIE_NAME = "refreshToken";
export const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/api/v1/auth",
};
