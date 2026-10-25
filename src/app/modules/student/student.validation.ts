import { z } from "zod";

export const listStudentsZodSchema = z.object({
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
export type ListStudentsQuery = z.infer<typeof listStudentsZodSchema>["query"];
