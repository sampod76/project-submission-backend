import { z } from "zod";
import {
  createAccountZodSchema,
  profileBodySchema,
} from "../user/user.validation";
export const listMentorsZodSchema = z.object({
  query: z
    .object({
      searchTerm: z.string().trim().max(100).optional(),
      search: z.string().trim().max(100).optional(),
      page: z.coerce.number().int().positive().max(1000000).optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
      sortBy: z.enum(["id", "createdAt", "firstName", "lastName"]).optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
    })
    .strict(),
});
export type ListMentorsQuery = z.infer<typeof listMentorsZodSchema>["query"];
export const createMentorZodSchema = z.object({
  body: profileBodySchema
    .required({ firstName: true, lastName: true })
    .extend({
      ...createAccountZodSchema.omit({ role: true }).shape,
      gender: z.string().trim().min(1).max(255),
    })
    .strict(),
});
export type CreateMentorDto = z.infer<typeof createMentorZodSchema>["body"];
