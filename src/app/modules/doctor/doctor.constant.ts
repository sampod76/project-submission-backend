export const DOCTOR_SEARCHABLE_FIELDS = [
  "name",
  "medicalRegistrationNo",
  "email",
  "phone",
  "hospital",
] as const;
export const DOCTOR_SORTABLE_FIELDS = [
  "id",
  "createdAt",
  "updatedAt",
  "name",
  "medicalRegistrationNo",
  "specialization",
  "hospital",
] as const;

export { Specialization as SPECIALIZATION } from "@prisma/client";
