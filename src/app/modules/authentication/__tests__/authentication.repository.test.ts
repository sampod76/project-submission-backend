import { AuthenticationRepository } from "../authentication.repository";
import { prisma } from "../../../share/prisma/prisma";
import type { PrismaOrTx } from "../../../share/prisma/transaction";

jest.mock("../../../share/prisma/prisma", () => ({
  prisma: { user: { findFirst: jest.fn() } },
}));

const findFirst = prisma.user.findFirst as jest.Mock;
const repository = new AuthenticationRepository();
const id = "12345678-1234-4abc-8def-123456789abc";

test("passes the lookup and selected fields to Prisma and returns its result", async () => {
  const args = {
    where: { id, isDeleted: false },
    select: { id: true },
  } as const;
  const row = { id };
  findFirst.mockResolvedValue(row);

  await expect(repository.findFirst(args)).resolves.toEqual(row);
  expect(findFirst).toHaveBeenCalledTimes(1);
  expect(findFirst).toHaveBeenCalledWith(args);
});

test("uses the supplied transaction instead of the default Prisma client", async () => {
  const txFindFirst = jest.fn().mockResolvedValue(null);
  const tx = { user: { findFirst: txFindFirst } } as unknown as PrismaOrTx;
  const args = { where: { id } };

  await expect(repository.findFirst(args, tx)).resolves.toBeNull();
  expect(txFindFirst).toHaveBeenCalledWith(args);
  expect(findFirst).not.toHaveBeenCalled();
});
