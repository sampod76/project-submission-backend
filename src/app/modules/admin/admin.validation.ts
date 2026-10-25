import { ADMIN_SORTABLE_FIELDS } from "./admin.constant";
import { z } from "zod";
import {
  queryDateSchema,
  uuidSchema,
} from "../../../global/schema/global.schema";
import { createAccountZodSchema } from "../user/user.validation";

const body = z
  .object({
    name: z.string().trim().min(2).max(100),
    phone: z.string().trim().min(6).max(20),
  })
  .strict();
export const createAdminZodSchema = z.object({
  body: body.extend(createAccountZodSchema.omit({ role: true }).shape),
});
export const getAdminZodSchema = z.object({
  params: z.object({ id: uuidSchema }),
});
export const updateAdminZodSchema = z.object({
  params: z.object({ id: uuidSchema }),
  body: body
    .partial()
    .refine(
      value => Object.keys(value).length > 0,
      "At least one field is required",
    ),
});
export const listAdminsZodSchema = z.object({
  query: z
    .object({
      search: z.string().trim().max(100).optional(),
      searchTerm: z.string().trim().max(100).optional(),
      page: z.coerce.number().int().positive().max(1000000).optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
      sortBy: z.enum(ADMIN_SORTABLE_FIELDS).optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
      fromDate: queryDateSchema.optional(),
      toDate: queryDateSchema.optional(),
      userId: uuidSchema.optional(),
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

export type CreateAdminDto = z.infer<typeof createAdminZodSchema>["body"];
export type UpdateAdminDto = z.infer<typeof updateAdminZodSchema>["body"];
export type ListAdminsQuery = z.infer<typeof listAdminsZodSchema>["query"];
