import { Prisma } from "@prisma/client";
import { UserQueryBuilder } from "../builders/UserQueryBuilder";
import { USER_SEARCHABLE_FIELDS, USER_SORTABLE_FIELDS } from "../user.constant";

import { USER_ROLE } from "../../../../global/enums/users";

const id = "12345678-1234-4abc-8def-123456789abc";

test("applies supported filters and preserves soft deletion", () => {
  const filters = { role: USER_ROLE.ADMIN, ids: [id], isActive: false };
  const where = new UserQueryBuilder()
    .addFilters(Object.assign({}, filters, { isDeleted: true }))
    .build();
  expect(where).toEqual({
    isDeleted: false,
    role: "ADMIN",
    id: { in: [id] },
    isActive: false,
  });
});

test("combines text search with inclusive UTC date bounds", () => {
  const where = new UserQueryBuilder()
    .addSearch("Alex")
    .addDateRange(
      new Date("2026-01-01T00:00:00.000Z"),
      new Date("2026-01-02T00:00:00.000Z"),
    )
    .build();
  expect(where.OR).toContainEqual({
    email: { contains: "Alex", mode: "insensitive" },
  });
  expect(where.createdAt).toEqual({
    gte: new Date("2026-01-01T00:00:00.000Z"),
    lte: new Date("2026-01-02T23:59:59.999Z"),
  });
});

test("search and sort fields name actual Prisma columns", () => {
  const columns: readonly string[] = Object.values(Prisma.UserScalarFieldEnum);
  for (const field of [...USER_SEARCHABLE_FIELDS, ...USER_SORTABLE_FIELDS])
    expect(columns).toContain(field);
});
