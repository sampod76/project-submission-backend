import { Prisma } from "@prisma/client";
import { DoctorQueryBuilder } from "../builders/DoctorQueryBuilder";
import {
  DOCTOR_SEARCHABLE_FIELDS,
  DOCTOR_SORTABLE_FIELDS,
} from "../doctor.constant";
import { listDoctorsZodSchema } from "../doctor.validation";

const id = "12345678-1234-4abc-8def-123456789abc";
test("combines literal search, exact filters, and inclusive UTC date bounds", () => {
  const query = listDoctorsZodSchema.parse({
    query: {
      search: "%_\\",
      specialization: "CARDIOLOGY",
      isActive: "false",
      userId: id,
      fromDate: "2026-01-01",
      toDate: "2026-01-02",
    },
  }).query;
  const where = new DoctorQueryBuilder()
    .addSearch(query.search)
    .addFilters(query)
    .addDateRange(query.fromDate, query.toDate)
    .build();
  expect(where).toMatchObject({
    isDeleted: false,
    specialization: "CARDIOLOGY",
    isActive: false,
    userId: id,
    createdAt: {
      gte: new Date("2026-01-01T00:00:00.000Z"),
      lte: new Date("2026-01-02T23:59:59.999Z"),
    },
  });
  expect(where.OR).toContainEqual({
    name: { contains: "\\%\\_\\\\", mode: "insensitive" },
  });
  expect(
    new DoctorQueryBuilder().addDateRange(undefined, query.toDate).build()
      .createdAt,
  ).toEqual({ lte: new Date("2026-01-02T23:59:59.999Z") });
});

test("starts with soft deletion filtering", () => {
  expect(new DoctorQueryBuilder().addSearch().addDateRange().build()).toEqual({
    isDeleted: false,
  });
});

test("search and sort fields name actual Prisma columns", () => {
  const columns: readonly string[] = Object.values(
    Prisma.DoctorScalarFieldEnum,
  );
  for (const field of [...DOCTOR_SEARCHABLE_FIELDS, ...DOCTOR_SORTABLE_FIELDS])
    expect(columns).toContain(field);
});
