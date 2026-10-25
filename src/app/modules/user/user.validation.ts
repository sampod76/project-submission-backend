import { USER_SORTABLE_FIELDS } from "./user.constant";
import { z } from "zod";

import { USER_ROLE } from "../../../global/enums/users";
import {
  queryDateSchema,
  uuidSchema,
} from "../../../global/schema/global.schema";

export const createAccountZodSchema = z
  .object({
    email: z.string().trim().email().toLowerCase(),
    password: z.string().min(8).max(128),
    role: z.nativeEnum(USER_ROLE),
  })
  .strict();

export const updateUserZodSchema = z.object({
  params: z.object({ id: uuidSchema }),
  body: z.object({
    email: z.string().email().toLowerCase().optional(),
    password: z.string().min(8).max(128).optional(),
    role: z.nativeEnum(USER_ROLE).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const getUserZodSchema = z.object({
  params: z.object({ id: uuidSchema }),
});

export const listUsersZodSchema = z.object({
  query: z
    .object({
      search: z.string().trim().max(100).optional(),
      searchTerm: z.string().trim().max(100).optional(),
      page: z.coerce.number().int().positive().max(1000000).optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
      sortBy: z.enum(USER_SORTABLE_FIELDS).optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
      fromDate: queryDateSchema.optional(),
      toDate: queryDateSchema.optional(),
      role: z.nativeEnum(USER_ROLE).optional(),
      isActive: z
        .enum(["true", "false"])
        .transform(value => value === "true")
        .optional(),
      ids: z
        .string()
        .transform(value => value.split(",").map(id => id.trim()))
        .pipe(z.array(uuidSchema).min(1))
        .optional(),
    })
    .strict()
    .superRefine((data, ctx) => {
      if (data.fromDate && data.toDate && data.fromDate > data.toDate)
        ctx.addIssue({
          code: "custom",
          path: ["toDate"],
          message: "toDate must be on or after fromDate",
        });
    }),
});

export type CreateAccountDto = z.infer<typeof createAccountZodSchema>;
export type UpdateUserDto = z.infer<typeof updateUserZodSchema>["body"];
export type ListUsersQuery = z.infer<typeof listUsersZodSchema>["query"];
