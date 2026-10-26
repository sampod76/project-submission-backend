import { z } from "zod";
import { createAccountZodSchema } from "../user/user.validation";
import { passwordSchema } from "../../../global/schema/global.schema";

const registerZodSchema = z.object({
  body: createAccountZodSchema
    .omit({ role: true })
    .extend({
      firstName: z.string().trim().min(1).max(100),
      lastName: z.string().trim().min(1).max(100),
      phone: z.string().trim().min(1).max(20).optional(),
      gender: z.string().trim().min(1).max(255).optional(),
    })
    .strict(),
});
const loginZodSchema = z.object({
  body: z
    .object({
      email: z.string().trim().email().max(255).toLowerCase(),
      password: z.string().min(1).max(1024),
    })
    .strict(),
});
const refreshTokenZodSchema = z.object({
  body: z
    .object({ refreshToken: z.string().min(10).max(4096).optional() })
    .strict()
    .default({}),
});
const changePasswordZodSchema = z.object({
  body: z
    .object({
      currentPassword: z.string().min(1).max(1024),
      newPassword: passwordSchema,
    })
    .strict(),
});
export type LoginDto = z.infer<typeof loginZodSchema>["body"];
export type RegisterDto = z.infer<typeof registerZodSchema>["body"];
export type ChangePasswordDto = z.infer<typeof changePasswordZodSchema>["body"];
export const AuthValidation = {
  registerZodSchema,
  loginZodSchema,
  refreshTokenZodSchema,
  changePasswordZodSchema,
};
