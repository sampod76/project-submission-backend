import { z } from "zod";
export const uuidSchema = z.string().uuid("Invalid UUID");
export const isValidId = (value: string): boolean =>
  uuidSchema.safeParse(value).success;
export const queryDateSchema = z
  .string()
  .date()
  .transform(value => new Date(`${value}T00:00:00.000Z`));

export const passwordSchema = z
  .string()
  .min(8)
  .max(72)
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[0-9]/, "Password must include a number")
  .refine(
    value => Buffer.byteLength(value, "utf8") <= 72,
    "Password must be at most 72 UTF-8 bytes",
  );
