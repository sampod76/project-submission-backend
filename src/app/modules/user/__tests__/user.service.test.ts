import { UserService } from "../user.service";
import { UserRepository } from "../user.repository";
import { prisma } from "../../../share/prisma/prisma";

jest.mock("../../../share/prisma/prisma", () => ({ prisma: {} }));

afterEach(() => jest.restoreAllMocks());

test("lists records with pagination, sorting, and a total count", async () => {
  const repository = new UserRepository();
  const data = [
    {
      id: "12345678-1234-4abc-8def-123456789abc",
      email: "user@example.com",
      role: "DOCTOR" as const,
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      createdAt: new Date(0),
      updatedAt: new Date(0),
    },
  ];
  const findMany = jest.fn().mockResolvedValue(data);
  repository.findMany = findMany;
  const count = jest.spyOn(repository, "count").mockResolvedValue(12);
  jest
    .spyOn(repository, "transaction")
    .mockImplementation(work => work(prisma));
  const service = new UserService(repository);
  const query = {
    page: 2,
    limit: 5,
    sortBy: "email",
    sortOrder: "asc",
  } as const;
  const result = await service.findAll(query);

  expect(findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { isDeleted: false },
      skip: 5,
      take: 5,
      orderBy: [{ email: "asc" }, { id: "asc" }],
    }),
    prisma,
  );
  expect(count).toHaveBeenCalledWith({ where: { isDeleted: false } }, prisma);
  expect(result).toEqual({ data, meta: { page: 2, limit: 5, total: 12 } });
});
