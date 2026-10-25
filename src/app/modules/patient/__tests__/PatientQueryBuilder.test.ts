import { Prisma } from "@prisma/client";
import { PatientQueryBuilder } from "../builders/PatientQueryBuilder";
import {
  PATIENT_SEARCHABLE_FIELDS,
  PATIENT_SORTABLE_FIELDS,
  TREATMENT_STATUS,
} from "../patient.constant";

import { ENUM_GENDER } from "../../../../global/enums/users";
const id = "12345678-1234-4abc-8def-123456789abc";

test("applies supported filters and preserves soft deletion", () => {
  const filters = {
    doctorId: id,
    gender: ENUM_GENDER.FEMALE,
    treatmentStatus: TREATMENT_STATUS.ACTIVE,
    followUpDate: new Date("2026-03-01T00:00:00.000Z"),
  };
  const where = new PatientQueryBuilder()
    .addFilters(Object.assign({}, filters, { isDeleted: true }))
    .build();
  expect(where).toEqual({
    isDeleted: false,
    doctorId: id,
    gender: "FEMALE",
    treatmentStatus: "ACTIVE",
    followUpDate: new Date("2026-03-01T00:00:00.000Z"),
  });
  expect(new PatientQueryBuilder().addSearch().addDateRange().build()).toEqual({
    isDeleted: false,
  });
});

test("combines text search with inclusive UTC date bounds", () => {
  const where = new PatientQueryBuilder()
    .addSearch("Alex")
    .addDateRange(
      new Date("2026-01-01T00:00:00.000Z"),
      new Date("2026-01-02T00:00:00.000Z"),
    )
    .build();
  expect(where.OR).toContainEqual({
    name: { contains: "Alex", mode: "insensitive" },
  });
  expect(where.createdAt).toEqual({
    gte: new Date("2026-01-01T00:00:00.000Z"),
    lte: new Date("2026-01-02T23:59:59.999Z"),
  });
});

test("search and sort fields name actual Prisma columns", () => {
  const columns: readonly string[] = Object.values(
    Prisma.PatientScalarFieldEnum,
  );
  for (const field of [
    ...PATIENT_SEARCHABLE_FIELDS,
    ...PATIENT_SORTABLE_FIELDS,
  ])
    expect(columns).toContain(field);
});
