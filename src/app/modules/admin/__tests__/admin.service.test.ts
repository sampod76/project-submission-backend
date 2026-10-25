import { AdminService } from "../admin.service";
import { AdminRepository } from "../admin.repository";
import { prisma } from "../../../share/prisma/prisma";
import { USER_ROLE } from "../../../../global/enums/users";
import { UserService } from "../../user/user.service";

jest.mock("../../../share/prisma/prisma", () => ({ prisma: {} }));

afterEach(() => jest.restoreAllMocks());

test("lists records with pagination, sorting, and a total count", async () => {
  const repository = new AdminRepository();
  const data = [
    {
      id: "12345678-1234-4abc-8def-123456789abc",
      userId: "12345678-1234-4abc-8def-123456789abc",
      name: "Admin",
      phone: "01234567890",
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
  const service = new AdminService(new UserService(), repository);
  const query = {
    page: 2,
    limit: 5,
    sortBy: "name",
    sortOrder: "asc",
  } as const;
  const authUser = {
    userId: "12345678-1234-4abc-8def-123456789abc",
    email: "admin@example.com",
    role: USER_ROLE.ADMIN,
  };

  const result = await service.findAll(query, authUser);

  expect(findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: { isDeleted: false },
      skip: 5,
      take: 5,
      orderBy: [{ name: "asc" }, { id: "asc" }],
    }),
    prisma,
  );
  expect(count).toHaveBeenCalledWith({ where: { isDeleted: false } }, prisma);
  expect(result).toEqual({ data, meta: { page: 2, limit: 5, total: 12 } });
});
