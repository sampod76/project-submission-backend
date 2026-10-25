jest.mock("../../../share/prisma/prisma", () => ({ prisma: {} }));

import type { Doctor } from "@prisma/client";
import { USER_ROLE } from "../../../../global/enums/users";
import type { IUserRef } from "../../../interfaces/user.ref";
import { DoctorRepository } from "../../doctor/doctor.repository";
import { PatientRepository } from "../patient.repository";
import { PatientService } from "../patient.service";
import { prisma } from "../../../share/prisma/prisma";

const authUser: IUserRef = {
  userId: "11111111-1111-4111-8111-111111111111",
  email: "doctor@example.com",
  role: USER_ROLE.DOCTOR,
};
const doctor: Doctor = {
  id: "22222222-2222-4222-8222-222222222222",
  userId: authUser.userId,
  createdBy: "33333333-3333-4333-8333-333333333333",
  name: "Doctor",
  medicalRegistrationNo: "REG-123",
  email: authUser.email,
  specialization: "OTHER",
  hospital: "Hospital",
  phone: "01234567890",
  isActive: true,
  isDeleted: false,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

afterEach(() => jest.restoreAllMocks());
beforeEach(() => {
  jest
    .spyOn(PatientRepository.prototype, "transaction")
    .mockImplementation(work => work(prisma));
});

test("resolves the Doctor through verified userId and keeps ownership separate from requested filters", async () => {
  const repository = new PatientRepository();
  const doctors = new DoctorRepository();
  const findDoctor = jest.spyOn(doctors, "findFirst").mockResolvedValue(doctor);
  const list = jest.spyOn(repository, "findMany").mockResolvedValue([]);
  const count = jest.spyOn(repository, "count").mockResolvedValue(0);
  const service = new PatientService(repository, doctors);
  const foreignId = "44444444-4444-4444-8444-444444444444";
  await service.findAll({ doctorId: foreignId, search: "search" }, authUser);
  expect(findDoctor).toHaveBeenCalledWith({
    where: {
      userId: authUser.userId,
      isActive: true,
      isDeleted: false,
      user: { isActive: true, isDeleted: false, role: USER_ROLE.DOCTOR },
    },
    select: { id: true },
  });
  expect(list).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        AND: [
          expect.objectContaining({ doctorId: foreignId, isDeleted: false }),
          expect.objectContaining({
            doctorId: doctor.id,
            doctor: expect.objectContaining({ userId: authUser.userId }),
          }),
        ],
      },
      skip: 0,
      take: 10,
    }),
    prisma,
  );
  expect(count).toHaveBeenCalledWith(
    { where: list.mock.calls[0][0].where },
    prisma,
  );
});

test("fails closed for missing actor context and unsupported roles", async () => {
  const repository = new PatientRepository();
  const doctors = new DoctorRepository();
  const list = jest.spyOn(repository, "findMany");
  const findDoctor = jest.spyOn(doctors, "findFirst");
  const service = new PatientService(repository, doctors);
  await expect(
    Reflect.apply(service.findAll, service, [{}, undefined]),
  ).rejects.toMatchObject({ statusCode: 401 });
  const unsupported = { ...authUser };
  Reflect.set(unsupported, "role", "UNSUPPORTED");
  await expect(service.findAll({}, unsupported)).rejects.toMatchObject({
    statusCode: 403,
  });
  expect(list).not.toHaveBeenCalled();
  expect(findDoctor).not.toHaveBeenCalled();
});

test("denies a doctor without a valid profile before any patient query", async () => {
  const repository = new PatientRepository();
  const doctors = new DoctorRepository();
  jest.spyOn(doctors, "findFirst").mockResolvedValue(null);
  const detail = jest.spyOn(repository, "findFirst");
  await expect(
    new PatientService(repository, doctors).findOne(doctor.id, authUser),
  ).rejects.toMatchObject({ statusCode: 403 });
  expect(detail).not.toHaveBeenCalled();
});

test("does not restrict authorized administrators to a Doctor record", async () => {
  const repository = new PatientRepository();
  const doctors = new DoctorRepository();
  const findDoctor = jest.spyOn(doctors, "findFirst");
  const list = jest.spyOn(repository, "findMany").mockResolvedValue([]);
  jest.spyOn(repository, "count").mockResolvedValue(0);
  await new PatientService(repository, doctors).findAll(
    {},
    { ...authUser, role: USER_ROLE.ADMIN },
  );
  expect(findDoctor).not.toHaveBeenCalled();
  expect(list).toHaveBeenCalledWith(
    expect.objectContaining({ where: { AND: [{ isDeleted: false }, {}] } }),
    prisma,
  );
});
