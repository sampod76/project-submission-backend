import { z } from "zod";
export const uuidSchema = z.string().uuid("Invalid UUID");
export const isValidId = (value: string): boolean =>
  uuidSchema.safeParse(value).success;
export const queryDateSchema = z
  .string()
  .date()
  .transform(value => new Date(`${value}T00:00:00.000Z`));
