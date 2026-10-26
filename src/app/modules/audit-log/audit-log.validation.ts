import { z } from "zod";
import {
  uuidSchema,
  queryDateSchema,
} from "../../../global/schema/global.schema";
export const listAuditLogsZodSchema = z.object({
  query: z
    .object({
      page: z.coerce.number().int().positive().max(1000000).optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
      sortBy: z.enum(["createdAt"]).optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
      action: z.string().trim().min(1).max(100).optional(),
      entityType: z.string().trim().min(1).max(100).optional(),
      entityId: uuidSchema.optional(),
      actorUserId: uuidSchema.optional(),
      fromDate: queryDateSchema.optional(),
      toDate: queryDateSchema.optional(),
    })
    .strict()
    .refine(
      value =>
        !value.fromDate || !value.toDate || value.fromDate <= value.toDate,
      "Invalid date range",
    ),
});
export const getAuditLogZodSchema = z.object({
  params: z.object({ id: uuidSchema }),
});
export type ListAuditLogsQuery = z.infer<
  typeof listAuditLogsZodSchema
>["query"];
