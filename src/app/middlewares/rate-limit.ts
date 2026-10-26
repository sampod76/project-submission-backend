import rateLimit from "express-rate-limit";
import { env } from "../config/env";

const message = {
  success: false,
  statusCode: 429,
  message: "Too many requests, please try again later.",
};
export const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: env.REGISTRATION_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message,
});
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.LOGIN_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message,
});
export const submissionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.SUBMISSION_RATE_LIMIT_MAX,
  keyGenerator: req => req.user!.userId,
  standardHeaders: true,
  legacyHeaders: false,
  message,
});
