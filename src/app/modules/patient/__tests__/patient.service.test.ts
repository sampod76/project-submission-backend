import { PatientService } from "../patient.service";
import { PatientRepository } from "../patient.repository";
import { DoctorRepository } from "../../doctor/doctor.repository";
import { USER_ROLE } from "../../../../global/enums/users";
import { prisma } from "../../../share/prisma/prisma";
import type { Prisma } from "@prisma/client";
import type { PrismaTransactionClient } from "../../../share/prisma/transaction";

jest.mock("../../../share/prisma/prisma", () => ({ prisma: {} }));

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test("patient statistics preserve ownership filters and fill absent status totals", async () => {
  const repository = new PatientRepository();
  const doctors = new DoctorRepository();
  const userId = "11111111-1111-4111-8111-111111111111";
  const doctorId = "22222222-2222-4222-8222-222222222222";
  const requestedDoctorId = "33333333-3333-4333-8333-333333333333";
  jest.spyOn(doctors, "findFirst").mockResolvedValue({
    id: doctorId,
    userId,
    createdBy: userId,
    name: "Doctor",
    medicalRegistrationNo: "REG",
    email: "doctor@example.com",
    specialization: "OTHER",
    hospital: "Hospital",
    phone: "01234567890",
    isActive: true,
    isDeleted: false,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const groupBy = jest.fn(async (args: Prisma.PatientGroupByArgs) =>
    args.by.includes("gender")
      ? [{ gender: "FEMALE", _count: 3 }]
      : [
          { treatmentStatus: "ACTIVE", _count: 2 },
          { treatmentStatus: "RECOVERED", _count: 1 },
        ],
  );
  const tx = {
    patient: { groupBy, count: jest.fn().mockResolvedValue(1) },
  } as unknown as PrismaTransactionClient;
  jest.spyOn(repository, "transaction").mockImplementation(work => work(tx));
  const statistics = await new PatientService(repository, doctors).statistics(
    requestedDoctorId,
    {
      userId,
      email: "doctor@example.com",
      role: USER_ROLE.DOCTOR,
    },
  );
  expect(statistics).toEqual({
    total: 3,
    active: 2,
    recovered: 1,
    underObservation: 0,
    upcomingFollowUps: 1,
    byGender: [{ gender: "FEMALE", _count: 3 }],
    byTreatmentStatus: [
      { treatmentStatus: "ACTIVE", _count: 2 },
      { treatmentStatus: "RECOVERED", _count: 1 },
    ],
  });
  expect(
    groupBy.mock.calls.every(([args]) => {
      const where = args.where;
      return (
        where?.isDeleted === false &&
        where.doctorId === requestedDoctorId &&
        typeof where.AND === "object" &&
        !Array.isArray(where.AND) &&
        where.AND?.doctorId === doctorId
      );
    }),
  ).toBe(true);
});

test("lists records with pagination, sorting, and a total count", async () => {
  const repository = new PatientRepository();
  const data = [
    {
      id: "12345678-1234-4abc-8def-123456789abc",
      name: "Patient",
      phone: "01234567890",
      doctorId: "12345678-1234-4abc-8def-123456789abc",
      age: 30,
      gender: "FEMALE" as const,
      treatmentStatus: "ACTIVE" as const,
      lastVisitAt: null,
      followUpDate: null,
      createdAt: new Date(0),
      doctor: {
        name: "Doctor",
        medicalRegistrationNo: "REG-123",
        email: "doctor@example.com",
        specialization: "OTHER" as const,
      },
    },
  ];
  const findMany = jest.fn().mockResolvedValue(data);
  repository.findMany = findMany;
  const count = jest.spyOn(repository, "count").mockResolvedValue(12);
  jest
    .spyOn(repository, "transaction")
    .mockImplementation(work => work(prisma));
  const service = new PatientService(repository);
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
      where: { AND: [{ isDeleted: false }, {}] },
      skip: 5,
      take: 5,
      orderBy: [{ name: "asc" }, { id: "asc" }],
    }),
    prisma,
  );
  expect(count).toHaveBeenCalledWith(
    { where: { AND: [{ isDeleted: false }, {}] } },
    prisma,
  );
  expect(result).toEqual({ data, meta: { page: 2, limit: 5, total: 12 } });
});
