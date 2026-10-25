import { PATIENT_SORTABLE_FIELDS } from "./patient.constant";
import { z } from "zod";
import { ENUM_GENDER } from "../../../global/enums/users";
import {
  uuidSchema,
  queryDateSchema,
} from "../../../global/schema/global.schema";
import { TREATMENT_STATUS } from "./patient.constant";

const body = z
  .object({
    name: z.string().trim().min(2).max(100),
    phone: z.string().trim().min(6).max(20),
    doctorId: uuidSchema.optional(),
    age: z.number().int().min(0).max(150),
    gender: z.nativeEnum(ENUM_GENDER),
    address: z.string().trim().max(500).optional(),
    patientComplaint: z.string().trim().min(1).max(5000),
    doctorAdvice: z.string().trim().max(5000).optional(),
    notes: z.string().trim().max(5000).optional(),
    treatmentStatus: z.nativeEnum(TREATMENT_STATUS).optional(),
    lastVisitAt: queryDateSchema.nullable().optional(),
    followUpDate: queryDateSchema.nullable().optional(),
  })
  .strict();
export const createPatientZodSchema = z.object({ body });
export const getPatientZodSchema = z.object({
  params: z.object({ id: uuidSchema }),
});
export const updatePatientZodSchema = z.object({
  params: z.object({ id: uuidSchema }),
  body: body
    .partial()
    .refine(
      value => Object.keys(value).length > 0,
      "At least one field is required",
    ),
});
export const listPatientsZodSchema = z.object({
  query: z
    .object({
      search: z.string().trim().max(100).optional(),
      searchTerm: z.string().trim().max(100).optional(),
      page: z.coerce.number().int().positive().max(1000000).optional(),
      limit: z.coerce.number().int().positive().max(100).optional(),
      sortBy: z.enum(PATIENT_SORTABLE_FIELDS).optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
      fromDate: queryDateSchema.optional(),
      toDate: queryDateSchema.optional(),
      doctorId: uuidSchema.optional(),
      gender: z.nativeEnum(ENUM_GENDER).optional(),
      treatmentStatus: z.nativeEnum(TREATMENT_STATUS).optional(),
      followUpDate: queryDateSchema.optional(),
      lastVisitAt: queryDateSchema.optional(),
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
export const patientStatisticsZodSchema = z.object({
  query: z.object({ doctorId: uuidSchema.optional() }).strict(),
});
export type CreatePatientDto = z.infer<typeof createPatientZodSchema>["body"];
export type UpdatePatientDto = z.infer<typeof updatePatientZodSchema>["body"];
export type ListPatientsQuery = z.infer<typeof listPatientsZodSchema>["query"];
