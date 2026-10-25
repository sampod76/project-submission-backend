import { DoctorService } from "../doctor.service";
import { DoctorRepository } from "../doctor.repository";
import { UserService } from "../../user/user.service";
import { USER_ROLE } from "../../../../global/enums/users";
import { prisma } from "../../../share/prisma/prisma";
import type { PrismaTransactionClient } from "../../../share/prisma/transaction";

jest.mock("../../../share/prisma/prisma", () => ({ prisma: {} }));

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test("doctor statistics combine activity groups and sort specialization totals", async () => {
  const repository = new DoctorRepository();
  const tx = {
    doctor: {
      groupBy: jest.fn().mockResolvedValue([
        { specialization: "OTHER", isActive: false, _count: 2 },
        { specialization: "CARDIOLOGY", isActive: true, _count: 3 },
        { specialization: "OTHER", isActive: true, _count: 1 },
      ]),
    },
  } as unknown as PrismaTransactionClient;
  jest.spyOn(repository, "transaction").mockImplementation(work => work(tx));
  const statistics = await new DoctorService(
    new UserService(),
    repository,
  ).statistics();
  expect(statistics).toEqual({
    total: 6,
    active: 4,
    inactive: 2,
    bySpecialization: [
      { specialization: "CARDIOLOGY", count: 3 },
      { specialization: "OTHER", count: 3 },
    ],
  });
});

test("lists records with pagination, sorting, and a total count", async () => {
  const repository = new DoctorRepository();
  const data = [
    {
      id: "12345678-1234-4abc-8def-123456789abc",
      userId: "12345678-1234-4abc-8def-123456789abc",
      createdBy: "12345678-1234-4abc-8def-123456789abc",
      name: "Doctor",
      medicalRegistrationNo: "REG-123",
      email: "doctor@example.com",
      specialization: "OTHER" as const,
      hospital: "Hospital",
      phone: "01234567890",
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      createdAt: new Date(0),
      updatedAt: new Date(0),
      _count: { patients: 0 },
    },
  ];
  const findMany = jest.fn().mockResolvedValue(data);
  repository.findMany = findMany;
  const count = jest.spyOn(repository, "count").mockResolvedValue(12);
  jest
    .spyOn(repository, "transaction")
    .mockImplementation(work => work(prisma));
  const service = new DoctorService(new UserService(), repository);
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
