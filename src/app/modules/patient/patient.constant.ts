export const PATIENT_SEARCHABLE_FIELDS = [
  "name",
  "phone",
  "patientComplaint",
] as const;
export const PATIENT_SORTABLE_FIELDS = [
  "id",
  "createdAt",
  "updatedAt",
  "name",
  "followUpDate",
  "lastVisitAt",
  "age",
] as const;

import { TreatmentStatus } from "@prisma/client";
export const TREATMENT_STATUS = {
  ACTIVE: TreatmentStatus.ACTIVE,
  UNDER_OBSERVATION: TreatmentStatus.UNDER_OBSERVATION,
  RECOVERED: TreatmentStatus.RECOVERED,
} as const;
export type TREATMENT_STATUS = TreatmentStatus;
