import { z } from "zod";
import { submissionParamsSchema } from "../submission/submission.validation";
export const createReviewZodSchema = z.object({
  params: submissionParamsSchema,
  body: z
    .object({
      status: z.enum(["APPROVED", "REJECTED"]),
      feedback: z.string().trim().max(10000).nullable().optional(),
    })
    .strict(),
});
export const listReviewsZodSchema = z.object({
  params: submissionParamsSchema,
  query: z
    .object({
      page: z.coerce.number().int().positive().max(1000000).optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
    })
    .strict(),
});
export type CreateReviewDto = z.infer<typeof createReviewZodSchema>["body"];
export type ListReviewsQuery = z.infer<typeof listReviewsZodSchema>["query"];
