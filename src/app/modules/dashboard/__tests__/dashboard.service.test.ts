import { DashboardService } from "../dashboard.service";
import { DashboardRepository } from "../dashboard.repository";
import { PatientRepository } from "../../patient/patient.repository";
import { DoctorRepository } from "../../doctor/doctor.repository";
import type { PrismaTransactionClient } from "../../../share/prisma/transaction";

jest.mock("../../../share/prisma/prisma", () => ({ prisma: {} }));

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

test("dashboard combines repository aggregates into six UTC months with zero-filled gaps", async () => {
  jest.useFakeTimers().setSystemTime(new Date("2026-10-17T12:00:00.000Z"));
  const repository = new DashboardRepository();
  const patientCount = jest.fn().mockResolvedValue(4);
  const tx = {
    patient: {
      count: patientCount,
      groupBy: jest
        .fn()
        .mockResolvedValue([{ treatmentStatus: "ACTIVE", _count: 7 }]),
    },
    doctor: {
      count: jest.fn().mockResolvedValue(2),
      findMany: jest.fn().mockResolvedValue([
        {
          id: "doctor-id",
          name: "Doctor",
          medicalRegistrationNo: "REG",
          _count: { patients: 7 },
        },
      ]),
    },
    $queryRaw: jest
      .fn()
      .mockResolvedValueOnce([{ month: "2026-06", count: 2 }])
      .mockResolvedValueOnce([{ month: "2026-10", count: 3 }]),
  } as unknown as PrismaTransactionClient;
  jest.spyOn(repository, "transaction").mockImplementation(work => work(tx));
  const overview = await new DashboardService(
    repository,
    new PatientRepository(),
    new DoctorRepository(),
  ).getOverview("2026-10-17");
  expect(overview).toEqual({
    totalFollowUps: 4,
    activeDoctors: 2,
    patientsOverview: [
      { month: "May", newPatients: 0, followUps: 0 },
      { month: "Jun", newPatients: 2, followUps: 0 },
      { month: "Jul", newPatients: 0, followUps: 0 },
      { month: "Aug", newPatients: 0, followUps: 0 },
      { month: "Sep", newPatients: 0, followUps: 0 },
      { month: "Oct", newPatients: 0, followUps: 3 },
    ],
    patientsPerDoctor: [
      {
        doctorId: "doctor-id",
        name: "Doctor",
        medicalRegistrationNo: "REG",
        patientsCount: 7,
      },
    ],
    treatmentStatus: [
      { name: "Active", value: 7 },
      { name: "Under observation", value: 0 },
      { name: "Recovered", value: 0 },
    ],
  });
  expect(patientCount).toHaveBeenCalledWith({
    where: {
      isDeleted: false,
      followUpDate: {
        gte: new Date("2026-10-17T00:00:00.000Z"),
        lt: new Date("2026-10-18T00:00:00.000Z"),
      },
    },
  });
});
