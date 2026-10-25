import fs from "node:fs";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { ENUM_GENDER, USER_ROLE } from "../../global/enums/users";
import { connectDatabase, disconnectDatabase } from "../config/database";
import { ApiError } from "../errors/ApiError";
import httpStatus from "http-status";
import { SPECIALIZATION } from "../modules/doctor/doctor.constant";
import { TREATMENT_STATUS } from "../modules/patient/patient.constant";
import { createAccountZodSchema } from "../modules/user/user.validation";
import { UserService } from "../modules/user/user.service";
import { userRepository } from "../modules/user/user.repository";
import { adminRepository } from "../modules/admin/admin.repository";
import { doctorRepository } from "../modules/doctor/doctor.repository";
import { patientRepository } from "../modules/patient/patient.repository";
import type { PrismaTransactionClient } from "../share/prisma/transaction";
const defaultAdmin = {
  name: "Samantha Reed",
  email: "admin@doctortracker.com",
  password: "Admin@12345",
  phone: "01711000000",
};

const SEED_DATA_PATH = path.resolve(
  process.cwd(),
  "scripts/doctor-patient-seed.json",
);

const SEED_BATCH_SIZE = 10;
const SEED_BATCH_DELAY_MS = 500;
const SEED_MAX_RETRIES = 3;

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

function normalizeSpecialization(specialization: string): SPECIALIZATION {
  if (
    specialization === "PULMONOLOGY" ||
    specialization === "ENDOCRINOLOGY" ||
    specialization === "GASTROENTEROLOGY"
  )
    return SPECIALIZATION.OTHER;

  return z.nativeEnum(SPECIALIZATION).parse(specialization);
}

function normalizeTreatmentStatus(status: string): TREATMENT_STATUS {
  if (status === "COMPLETED") return TREATMENT_STATUS.RECOVERED;

  if (status === "ON_HOLD") return TREATMENT_STATUS.UNDER_OBSERVATION;

  return z.nativeEnum(TREATMENT_STATUS).parse(status);
}

const seedDataSchema = z.array(
  z.object({
    doctor: z.object({
      name: z.string().trim().min(2).max(100),
      email: z.string().trim().email().toLowerCase(),
      password: createAccountZodSchema.shape.password,
      phone: z.string().trim().min(6).max(20),
      hospital: z.string().trim().min(2).max(200),
      specialization: z.string().transform(normalizeSpecialization),
    }),
    patients: z.array(
      z.object({
        name: z.string().trim().min(2).max(100),
        phone: z.string().trim().min(6).max(20),
        age: z.number().int().min(0).max(150),
        gender: z.nativeEnum(ENUM_GENDER),
        address: z.string().trim().max(500),
        patientComplaint: z.string().trim().min(1).max(5000),
        doctorAdvice: z.string().trim().max(5000),
        notes: z.string().trim().max(5000).optional(),
        treatmentStatus: z.string().transform(normalizeTreatmentStatus),
        lastVisitAt: z.string().datetime({ offset: true }),
        followUpDate: z.string().datetime({ offset: true }),
      }),
    ),
  }),
);

type SeedItem = z.infer<typeof seedDataSchema>[number];
function getSeedData(): SeedItem[] {
  const rawData = fs.readFileSync(SEED_DATA_PATH, "utf-8");

  const seedData: unknown = JSON.parse(rawData);
  return seedDataSchema.parse(seedData);
}

const normalizeName = (value: string): string =>
  value.trim().replace(/\s+/g, " ").toLowerCase();
const normalizePhone = (value: string): string =>
  value.trim().replace(/[\s().-]/g, "");
const registrationNumber = (index: number): string =>
  `BMDC-SEED-${String(index + 1).padStart(5, "0")}`;

type PatientIdentity = { name: string; phone: string; isDeleted?: boolean };

function indexPatientIdentities(patients: PatientIdentity[]) {
  const exact = new Map<string, PatientIdentity[]>();
  const names = new Map<string, number>();
  const phones = new Map<string, number>();
  let incomplete = false;
  for (const patient of patients) {
    const name = normalizeName(patient.name || "");
    const phone = normalizePhone(patient.phone || "");
    const isIncompleteIdentity = !name || !/^\+?\d{6,20}$/.test(phone);
    if (isIncompleteIdentity) incomplete = true;
    const key = JSON.stringify([name, phone]);
    const matches = exact.get(key) ?? [];
    matches.push(patient);
    exact.set(key, matches);
    names.set(name, (names.get(name) ?? 0) + 1);
    phones.set(phone, (phones.get(phone) ?? 0) + 1);
  }
  return { exact, names, phones, incomplete };
}

type SeedReport = {
  doctorsFound: number;
  doctorsReused: number;
  doctorsCreated: number;
  patientsSkipped: number;
  patientsInserted: number;
  patientsAmbiguous: number;
  failedBatches: number;
};
function createBatchRunner(report: SeedReport) {
  let hasRun = false;
  return async <T>(
    work: (tx: PrismaTransactionClient) => Promise<T>,
  ): Promise<T> => {
    if (hasRun) await sleep(SEED_BATCH_DELAY_MS);
    hasRun = true;
    try {
      for (let attempt = 0; ; attempt++) {
        try {
          return await userRepository.transaction(work);
        } catch (error) {
          const shouldAbortRetry =
            !(error instanceof Prisma.PrismaClientKnownRequestError) ||
            error.code !== "P2034" ||
            attempt >= SEED_MAX_RETRIES;
          if (shouldAbortRetry) throw error;
          await sleep(SEED_BATCH_DELAY_MS);
        }
      }
    } catch (error) {
      report.failedBatches++;
      throw error;
    }
  };
}
export async function seedDatabase(): Promise<void> {
  const startedAt = Date.now();
  const report: SeedReport = {
    doctorsFound: 0,
    doctorsReused: 0,
    doctorsCreated: 0,
    patientsSkipped: 0,
    patientsInserted: 0,
    patientsAmbiguous: 0,
    failedBatches: 0,
  };
  const runBatch = createBatchRunner(report);
  const accounts = new UserService();
  try {
    const seedData = getSeedData();
    report.doctorsFound = seedData.length;
    const uniqueDoctorEmails = new Set(seedData.map(item => item.doctor.email));
    if (uniqueDoctorEmails.size !== seedData.length)
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Duplicate doctor emails in seed data",
      );
    const adminUser = await runBatch(async tx => {
      let user = await userRepository.findFirst(
        { where: { email: defaultAdmin.email } },
        tx,
      );
      if (!user) {
        const created = await accounts.createAccount(
          {
            email: defaultAdmin.email,
            password: defaultAdmin.password,
            role: USER_ROLE.ADMIN,
          },
          tx,
        );
        user = await userRepository.findFirst(
          { where: { id: created.id } },
          tx,
        );
      }
      if (!user || user.role !== USER_ROLE.ADMIN)
        throw new ApiError(
          httpStatus.CONFLICT,
          "Default admin email belongs to a different role",
        );
      const existingAdmin = await adminRepository.findFirst(
        { where: { userId: user.id } },
        tx,
      );

      if (!existingAdmin)
        await adminRepository.create(
          {
            data: {
              userId: user.id,
              name: defaultAdmin.name,
              phone: defaultAdmin.phone,
            },
          },
          tx,
        );
      return user;
    });
    const resolved = new Map<string, string>();
    for (const [index, { doctor }] of seedData.entries()) {
      const result = await runBatch(async tx => {
        const user = await userRepository.findFirst(
          { where: { email: doctor.email } },
          tx,
        );
        const matches = await doctorRepository.findMany(
          {
            where: {
              OR: [
                { email: doctor.email },
                ...(user ? [{ userId: user.id }] : []),
              ],
            },
          },
          tx,
        );
        if (matches.length) {
          const existing = matches[0];
          const hasConflictingDoctorAssociation =
            matches.length !== 1 ||
            existing.isDeleted ||
            existing.email !== doctor.email ||
            !user ||
            user.role !== USER_ROLE.DOCTOR ||
            user.isDeleted ||
            existing.userId !== user.id;
          if (hasConflictingDoctorAssociation)
            throw new ApiError(
              httpStatus.CONFLICT,
              `Ambiguous doctor association at seed row ${index + 1}`,
            );
          return { doctor: existing, reused: true };
        }
        const medicalRegistrationNo = registrationNumber(index);
        const existingDoctor = await doctorRepository.findFirst(
          { where: { medicalRegistrationNo } },
          tx,
        );

        if (existingDoctor)
          throw new ApiError(
            httpStatus.CONFLICT,
            `Seed registration conflict at row ${index + 1}`,
          );
        if (user && (user.role !== USER_ROLE.DOCTOR || user.isDeleted))
          throw new ApiError(
            httpStatus.CONFLICT,
            `Seed account conflict at row ${index + 1}`,
          );
        const accountId =
          user?.id ??
          (
            await accounts.createAccount(
              {
                email: doctor.email,
                password: doctor.password,
                role: USER_ROLE.DOCTOR,
              },
              tx,
            )
          ).id;
        return {
          doctor: await doctorRepository.create(
            {
              data: {
                userId: accountId,
                createdBy: adminUser.id,
                name: doctor.name,
                medicalRegistrationNo,
                email: doctor.email,
                phone: doctor.phone,
                hospital: doctor.hospital,
                specialization: doctor.specialization,
              },
            },
            tx,
          ),
          reused: false,
        };
      });
      resolved.set(doctor.email, result.doctor.id);
      if (result.reused) report.doctorsReused++;
      else report.doctorsCreated++;
    }
    const existingPatients = await patientRepository.findMany({
      where: { doctorId: { in: [...resolved.values()] } },
      select: { doctorId: true, name: true, phone: true, isDeleted: true },
    });
    const missing: Prisma.PatientCreateManyInput[] = [];
    for (const { doctor, patients } of seedData) {
      const doctorId = resolved.get(doctor.email);
      if (!doctorId) throw new Error("Doctor association was not resolved");
      const existing = indexPatientIdentities(
        existingPatients.filter(patient => patient.doctorId === doctorId),
      );
      const seedIdentities = indexPatientIdentities(patients);
      for (const patient of patients) {
        const name = normalizeName(patient.name),
          phone = normalizePhone(patient.phone),
          key = JSON.stringify([name, phone]);
        const matches = existing.exact.get(key) ?? [];
        const duplicateSeed = (seedIdentities.exact.get(key)?.length ?? 0) > 1;
        const isExistingActivePatient =
          !duplicateSeed && matches.length === 1 && !matches[0].isDeleted;
        if (isExistingActivePatient) report.patientsSkipped++;
        else {
          const isAmbiguousPatient =
            duplicateSeed ||
            matches.length > 0 ||
            existing.incomplete ||
            !name ||
            !/^\+?\d{6,20}$/.test(phone) ||
            existing.names.has(name) ||
            existing.phones.has(phone) ||
            (seedIdentities.names.get(name) ?? 0) > 1 ||
            (seedIdentities.phones.get(phone) ?? 0) > 1;
          if (isAmbiguousPatient) report.patientsAmbiguous++;
          else
            missing.push({
              ...patient,
              doctorId,
              lastVisitAt: new Date(patient.lastVisitAt),
              followUpDate: new Date(patient.followUpDate),
            });
        }
      }
    }
    for (let offset = 0; offset < missing.length; offset += SEED_BATCH_SIZE) {
      const batch = missing.slice(offset, offset + SEED_BATCH_SIZE);
      await runBatch(async tx => {
        for (const patient of batch)
          await patientRepository.create({ data: patient }, tx);
      });
      report.patientsInserted += batch.length;
    }
  } finally {
    console.log("Seed summary:", {
      ...report,
      durationMs: Date.now() - startedAt,
    });
  }
}
async function main(): Promise<void> {
  try {
    await connectDatabase();
    await seedDatabase();
    console.log("Database seed completed");
  } catch (error) {
    console.error(
      "Database seed failed; inspect the seed summary. Error type:",
      error instanceof Error ? error.name : "UnknownError",
    );
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}
if (require.main === module) void main();
