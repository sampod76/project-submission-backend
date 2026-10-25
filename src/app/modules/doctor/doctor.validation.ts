import { DOCTOR_SORTABLE_FIELDS } from "./doctor.constant";
import { z } from "zod";
import {
  queryDateSchema,
  uuidSchema,
} from "../../../global/schema/global.schema";
import { createAccountZodSchema } from "../user/user.validation";
import { SPECIALIZATION } from "./doctor.constant";

const body = z
  .object({
    name: z.string().trim().min(2).max(100),
    medicalRegistrationNo: z.string().trim().min(1).max(100),
    specialization: z.nativeEnum(SPECIALIZATION),
    hospital: z.string().trim().min(2).max(200),
    phone: z.string().trim().min(6).max(20),
    isActive: z.boolean().optional(),
  })
  .strict();
export const createDoctorZodSchema = z.object({
  body: body.extend(createAccountZodSchema.omit({ role: true }).shape),
});
export const getDoctorZodSchema = z.object({
  params: z.object({ id: uuidSchema }),
});
export const updateDoctorZodSchema = z.object({
  params: z.object({ id: uuidSchema }),
  body: body
    .partial()
    .refine(
      value => Object.keys(value).length > 0,
      "Minium one field is required",
    ),
});
export const listDoctorsZodSchema = z.object({
  query: z
    .object({
      search: z.string().trim().max(100).optional(),
      searchTerm: z.string().trim().max(100).optional(),
      page: z.coerce.number().int().positive().max(1000000).optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
      sortBy: z.enum(DOCTOR_SORTABLE_FIELDS).optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
      fromDate: queryDateSchema.optional(),
      toDate: queryDateSchema.optional(),
      specialization: z.nativeEnum(SPECIALIZATION).optional(),
      hospital: z.string().trim().min(1).max(200).optional(),
      medicalRegistrationNo: z.string().trim().min(1).max(100).optional(),
      isActive: z
        .enum(["true", "false"])
        .transform(value => value === "true")
        .optional(),
      userId: uuidSchema.optional(),
      createdBy: uuidSchema.optional(),
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

export type CreateDoctorDto = z.infer<typeof createDoctorZodSchema>["body"];
export type UpdateDoctorDto = z.infer<typeof updateDoctorZodSchema>["body"];
export type ListDoctorsQuery = z.infer<typeof listDoctorsZodSchema>["query"];
