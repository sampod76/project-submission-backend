import { Prisma } from "@prisma/client";
import { AdminQueryBuilder } from "../builders/AdminQueryBuilder";
import {
  ADMIN_SEARCHABLE_FIELDS,
  ADMIN_SORTABLE_FIELDS,
} from "../admin.constant";

const id = "12345678-1234-4abc-8def-123456789abc";

test("applies supported filters and preserves soft deletion", () => {
  const filters = { userId: id };
  const where = new AdminQueryBuilder()
    .addFilters(Object.assign({}, filters, { isDeleted: true }))
    .build();
  expect(where).toEqual({ isDeleted: false, userId: id });
});

test("combines text search with inclusive UTC date bounds", () => {
  const where = new AdminQueryBuilder()
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
  const columns: readonly string[] = Object.values(Prisma.AdminScalarFieldEnum);
  for (const field of [...ADMIN_SEARCHABLE_FIELDS, ...ADMIN_SORTABLE_FIELDS])
    expect(columns).toContain(field);
});
