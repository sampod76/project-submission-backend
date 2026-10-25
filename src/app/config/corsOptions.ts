import type { CorsOptions } from "cors";
import { env } from "./env";

const normalizeOrigin = (origin: string): string =>
  origin.trim().replace(/\/+$/, "");

const allowedOrigins = new Set([
  ...env.CORS_ORIGIN.split(",").map(normalizeOrigin).filter(Boolean),

  "https://doctor-tracker-ai.iblossomlearn.org",
  "https://doctor-tracker-ai.netlify.app",
  "http://localhost:3000",
]);

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    const allowsAnyOrigin = env.CORS_ORIGIN.trim() === "*";
    if (allowsAnyOrigin) return callback(null, true);

    const isAllowedOrigin = allowedOrigins.has(origin);
    if (isAllowedOrigin) return callback(null, true);

    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },

  credentials: true,

  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
    "x-client-key",
    "x-client-token",
    "x-client-secret",
    "x-device-id",
    "x-time-zone",
  ],
};
