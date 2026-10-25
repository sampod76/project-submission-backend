import { Prisma } from "@prisma/client";
import { DashboardRepository } from "../dashboard.repository";
import { prisma } from "../../../share/prisma/prisma";
import type { PrismaOrTx } from "../../../share/prisma/transaction";

jest.mock("../../../share/prisma/prisma", () => ({
  prisma: { $queryRaw: jest.fn() },
}));

test("passes the SQL query to Prisma and returns its rows", async () => {
  const query = Prisma.sql`SELECT count(*)::int AS count FROM patients`;
  const rows = [{ count: 3 }];
  jest.mocked(prisma.$queryRaw).mockResolvedValue(rows);

  await expect(new DashboardRepository().queryRaw(query)).resolves.toEqual(
    rows,
  );
  expect(prisma.$queryRaw).toHaveBeenCalledWith(query);
});

test("uses the supplied transaction for a SQL query", async () => {
  const query = Prisma.sql`SELECT count(*)::int AS count FROM doctors`;
  const queryRaw = jest.fn().mockResolvedValue([{ count: 1 }]);
  const tx = { $queryRaw: queryRaw } as unknown as PrismaOrTx;

  await expect(new DashboardRepository().queryRaw(query, tx)).resolves.toEqual([
    { count: 1 },
  ]);
  expect(queryRaw).toHaveBeenCalledWith(query);
  expect(prisma.$queryRaw).not.toHaveBeenCalled();
});
