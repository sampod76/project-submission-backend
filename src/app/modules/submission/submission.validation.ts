import { z } from "zod";
import { SubmissionStatus } from "@prisma/client";
import { uuidSchema } from "../../../global/schema/global.schema";
import { normalizeGithubRepository } from "./submission.utils";
import { SUBMISSION_SORTABLE_FIELDS } from "./submission.constant";
const repoUrl = z
  .string()
  .trim()
  .max(2048)
  .url()
  .superRefine((value, ctx) => {
    try {
      normalizeGithubRepository(value);
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "Use an HTTPS GitHub owner/repository URL",
      });
    }
  });
const liveUrl = z
  .string()
  .trim()
  .max(2048)
  .url()
  .refine(value => {
    const url = new URL(value);
    return (
      ["https:", "http:"].includes(url.protocol) &&
      !url.username &&
      !url.password
    );
  }, "Use an HTTP or HTTPS URL without credentials");
const submissionBody = z
  .object({
    projectName: z.string().trim().min(1).max(200),
    repoUrl,
    liveUrl,
    description: z.string().trim().min(1).max(10000),
  })
  .strict();
export const createSubmissionZodSchema = z.object({ body: submissionBody });
export const submissionParamsSchema = z.object({ id: uuidSchema });
export const getSubmissionZodSchema = z.object({
  params: submissionParamsSchema,
});
export const updateSubmissionZodSchema = z.object({
  params: submissionParamsSchema,
  body: submissionBody
    .partial()
    .refine(
      value => Object.keys(value).length > 0,
      "At least one field is required",
    ),
});
const pagination = {
  page: z.coerce.number().int().positive().max(1000000).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
};
export const listSubmissionsZodSchema = z.object({
  query: z
    .object({
      ...pagination,
      searchTerm: z.string().trim().max(100).optional(),
      status: z.nativeEnum(SubmissionStatus).optional(),
      sortBy: z.enum(SUBMISSION_SORTABLE_FIELDS).optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
    })
    .strict(),
});
export const mySubmissionsZodSchema = z.object({
  query: z
    .object({
      ...pagination,
      status: z.nativeEnum(SubmissionStatus).optional(),
    })
    .strict(),
});
export type CreateSubmissionDto = z.infer<
  typeof createSubmissionZodSchema
>["body"];
export type UpdateSubmissionDto = z.infer<
  typeof updateSubmissionZodSchema
>["body"];
export type ListSubmissionsQuery = z.infer<
  typeof listSubmissionsZodSchema
>["query"];
export type MySubmissionsQuery = z.infer<
  typeof mySubmissionsZodSchema
>["query"];
