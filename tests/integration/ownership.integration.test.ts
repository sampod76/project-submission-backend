import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import request from "supertest";
import type { Doctor, Prisma } from "@prisma/client";
import app from "../../src/app";
import { USER_ROLE } from "../../src/global/enums/users";
import { authCache } from "../../src/helper/authCache";
import { accessTokenSecret, jwtHelpers } from "../../src/helper/jwtHelpers";
import type { IUserRef } from "../../src/app/interfaces/user.ref";
import { PatientRepository } from "../../src/app/modules/patient/patient.repository";
import { PatientService } from "../../src/app/modules/patient/patient.service";
import { prisma } from "../../src/app/share/prisma/prisma";
import type { RepositoryResult } from "../../src/app/share/prisma/repository-result";
import type { PrismaOrTx } from "../../src/app/share/prisma/transaction";
import { env } from "../../src/app/config/env";
import { verifyTestDatabase } from "./test-database";

const describeDatabase = process.env.TEST_DATABASE_URL
  ? describe
  : describe.skip;

describeDatabase("patient ownership authorization", () => {
  const tag = `ownership-${randomUUID()}`;
  const password = "Ownership@123";
  const userIds: string[] = [];
  let databaseVerified = false;
  let adminId: string,
    adminToken: string,
    doctorToken: string,
    missingDoctorToken: string;
  let doctorA: Doctor, doctorB: Doctor, patientAId: string, patientBId: string;
  let authUser: IUserRef;
  const headers = (token = doctorToken) => ({
    Authorization: `Bearer ${token}`,
  });
  const payload = {
    name: "Ownership Patient",
    phone: "01234567890",
    age: 30,
    gender: "FEMALE",
    patientComplaint: tag,
  };
  const login = async (email: string): Promise<string> => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email, password });
    expect(response.status).toBe(200);
    return response.body.data.accessToken;
  };

  beforeAll(async () => {
    await verifyTestDatabase(prisma, env.DATABASE_URL);
    databaseVerified = true;
    const hash = await bcrypt.hash(password, 4);
    const admin = await prisma.user.create({
      data: {
        email: `${tag}-admin@example.com`,
        password: hash,
        role: "ADMIN",
      },
    });
    adminId = admin.id;
    userIds.push(admin.id);
    const createDoctor = async (suffix: string): Promise<Doctor> => {
      const doctor = await prisma.doctor.create({
        data: {
          user: {
            create: {
              email: `${tag}-${suffix}@example.com`,
              password: hash,
              role: "DOCTOR",
            },
          },
          creator: { connect: { id: admin.id } },
          email: `${tag}-${suffix}@example.com`,
          name: `Doctor ${suffix}`,
          medicalRegistrationNo: `${tag}-${suffix}`,
          specialization: "OTHER",
          hospital: "Ownership Hospital",
          phone: "01234567890",
        },
      });
      userIds.push(doctor.userId);
      return doctor;
    };
    doctorA = await createDoctor("a");
    doctorB = await createDoctor("b");
    const missing = await prisma.user.create({
      data: {
        email: `${tag}-missing@example.com`,
        password: hash,
        role: "DOCTOR",
      },
    });
    userIds.push(missing.id);
    adminToken = await login(admin.email);
    doctorToken = await login(doctorA.email);
    missingDoctorToken = await login(missing.email);
    authUser = {
      userId: doctorA.userId,
      email: doctorA.email,
      role: USER_ROLE.DOCTOR,
    };
    patientAId = (
      await prisma.patient.create({
        data: { ...payload, gender: "FEMALE", doctorId: doctorA.id },
      })
    ).id;
    patientBId = (
      await prisma.patient.create({
        data: { ...payload, gender: "FEMALE", doctorId: doctorB.id },
      })
    ).id;
    expect(doctorA.id).not.toBe(doctorA.userId);
  });

  afterAll(async () => {
    try {
      if (!databaseVerified) return;
      await verifyTestDatabase(prisma, env.DATABASE_URL);
      await prisma.patient.deleteMany({
        where: { patientComplaint: tag },
      });
      await prisma.doctor.deleteMany({
        where: {
          userId: { in: userIds },
          medicalRegistrationNo: { startsWith: `${tag}-` },
        },
      });
      await prisma.user.deleteMany({
        where: { id: { in: userIds }, email: { startsWith: `${tag}-` } },
      });
    } finally {
      userIds.forEach(authCache.invalidateAuthUserCache);
      await prisma.$disconnect();
    }
  });

  test("returns only the owner's patient and nested doctor record", async () => {
    const own = await request(app)
      .get(`/api/v1/patients/${patientAId}`)
      .set(headers());
    expect(own.status).toBe(200);
    expect(own.body.data.doctor).toMatchObject({
      id: doctorA.id,
      userId: doctorA.userId,
    });
    const other = await request(app)
      .get(`/api/v1/patients/${patientBId}`)
      .set(headers());
    expect(other.status).toBe(404);
    expect(other.body.message).toBe("Patient not found");
  });

  test("scopes lists, searches, projections, pagination totals and statistics in the database", async () => {
    for (const query of [
      {},
      { search: tag },
      { searchTerm: tag, page: 1, limit: 1 },
    ]) {
      const response = await request(app)
        .get("/api/v1/patients")
        .set(headers())
        .query(query);
      expect(response.status).toBe(200);
      expect(response.body.meta.total).toBe(1);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toMatchObject({
        id: patientAId,
        doctorId: doctorA.id,
      });
    }
    const other = await request(app)
      .get("/api/v1/patients")
      .set(headers())
      .query({ doctorId: doctorB.id, search: tag });
    expect(other.status).toBe(200);
    expect(other.body.data).toEqual([]);
    expect(other.body.meta.total).toBe(0);
    const stats = await request(app)
      .get("/api/v1/patients/statistics")
      .set(headers());
    expect(stats.status).toBe(200);
    expect(stats.body.data).toMatchObject({
      total: 1,
      active: 1,
      byGender: [{ gender: "FEMALE", _count: 1 }],
    });
    const otherStats = await request(app)
      .get("/api/v1/patients/statistics")
      .set(headers())
      .query({ doctorId: doctorB.id });
    expect(otherStats.body.data).toMatchObject({
      total: 0,
      byGender: [],
      byTreatmentStatus: [],
    });
  });

  test("does not use doctorId, userId or role claims as ownership identity", async () => {
    const token = jwtHelpers.createToken(
      { userId: doctorA.userId, role: "ADMIN", doctorId: doctorB.id },
      accessTokenSecret,
      300,
    );
    const response = await request(app)
      .get("/api/v1/patients")
      .set(headers(token))
      .query({ search: tag });
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].doctorId).toBe(doctorA.id);
    expect(
      (
        await request(app)
          .get(`/api/v1/patients/${patientBId}`)
          .set(headers(token))
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .get("/api/v1/patients")
          .set(headers())
          .query({ userId: doctorB.userId })
      ).status,
    ).toBe(400);
  });

  test("automatically assigns doctor-created patients and ignores supplied owner IDs", async () => {
    for (const doctorId of [undefined, doctorB.id, doctorA.userId]) {
      const response = await request(app)
        .post("/api/v1/patients")
        .set(headers())
        .send({ ...payload, doctorId });
      expect(response.status).toBe(201);
      expect(response.body.data.doctorId).toBe(doctorA.id);
      const id: string = response.body.data.id;
      expect(
        (await request(app).delete(`/api/v1/patients/${id}`).set(headers()))
          .status,
      ).toBe(200);
    }
  });

  test("blocks cross-doctor updates, deletes and ownership changes", async () => {
    expect(
      (
        await request(app)
          .patch(`/api/v1/patients/${patientBId}`)
          .set(headers())
          .send({ notes: "intrusion" })
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .delete(`/api/v1/patients/${patientBId}`)
          .set(headers())
      ).status,
    ).toBe(404);
    for (const doctorId of [doctorB.id, doctorA.id])
      expect(
        (
          await request(app)
            .patch(`/api/v1/patients/${patientAId}`)
            .set(headers())
            .send({ doctorId })
        ).status,
      ).toBe(403);
    expect(
      await prisma.patient.findUniqueOrThrow({ where: { id: patientBId } }),
    ).toMatchObject({ doctorId: doctorB.id, notes: null, isDeleted: false });
    expect(
      (
        await request(app)
          .patch(`/api/v1/patients/${patientAId}`)
          .set(headers())
          .send({ notes: "own update" })
      ).status,
    ).toBe(200);
  });

  test("rejects nested relation and mass-assignment payloads", async () => {
    for (const injected of [
      { doctor: { connect: { id: doctorB.id } } },
      { userId: doctorB.userId },
      { isDeleted: true },
      { id: patientBId },
    ]) {
      expect(
        (
          await request(app)
            .post("/api/v1/patients")
            .set(headers())
            .send({ ...payload, ...injected })
        ).status,
      ).toBe(400);
      expect(
        (
          await request(app)
            .patch(`/api/v1/patients/${patientAId}`)
            .set(headers())
            .send({ notes: "intrusion", ...injected })
        ).status,
      ).toBe(400);
    }
  });

  test("preserves administrative cross-doctor access, reassignment and validation", async () => {
    for (const id of [patientAId, patientBId])
      expect(
        (
          await request(app)
            .get(`/api/v1/patients/${id}`)
            .set(headers(adminToken))
        ).status,
      ).toBe(200);
    const list = await request(app)
      .get("/api/v1/patients")
      .set(headers(adminToken))
      .query({ search: tag });
    expect(list.body.meta.total).toBe(2);
    const stats = await request(app)
      .get("/api/v1/patients/statistics")
      .set(headers(adminToken))
      .query({ doctorId: doctorB.id });
    expect(stats.body.data.total).toBe(1);
    expect(
      (
        await request(app)
          .post("/api/v1/patients")
          .set(headers(adminToken))
          .send(payload)
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post("/api/v1/patients")
          .set(headers(adminToken))
          .send({ ...payload, doctorId: randomUUID() })
      ).status,
    ).toBe(404);
    const created = await request(app)
      .post("/api/v1/patients")
      .set(headers(adminToken))
      .send({ ...payload, doctorId: doctorB.id });
    expect(created.status).toBe(201);
    const id: string = created.body.data.id;
    const reassigned = await request(app)
      .patch(`/api/v1/patients/${id}`)
      .set(headers(adminToken))
      .send({ doctorId: doctorA.id });
    expect(reassigned.status).toBe(200);
    expect(reassigned.body.data.doctorId).toBe(doctorA.id);
    expect(
      (
        await request(app)
          .delete(`/api/v1/patients/${id}`)
          .set(headers(adminToken))
      ).status,
    ).toBe(200);
  });

  test("denies all patient operations when the doctor record is missing", async () => {
    const responses = await Promise.all([
      request(app).get("/api/v1/patients").set(headers(missingDoctorToken)),
      request(app)
        .get("/api/v1/patients/statistics")
        .set(headers(missingDoctorToken)),
      request(app)
        .get(`/api/v1/patients/${patientAId}`)
        .set(headers(missingDoctorToken)),
      request(app)
        .post("/api/v1/patients")
        .set(headers(missingDoctorToken))
        .send({ ...payload, doctorId: doctorA.id }),
      request(app)
        .patch(`/api/v1/patients/${patientAId}`)
        .set(headers(missingDoctorToken))
        .send({ notes: "intrusion" }),
      request(app)
        .delete(`/api/v1/patients/${patientAId}`)
        .set(headers(missingDoctorToken)),
    ]);
    expect(responses.map(response => response.status)).toEqual([
      403, 403, 403, 403, 403, 403,
    ]);
  });

  test.each(["inactive", "deleted"])(
    "denies %s doctor profiles even with a cached authenticated user",
    async state => {
      await prisma.doctor.update({
        where: { id: doctorA.id },
        data: state === "inactive" ? { isActive: false } : { isDeleted: true },
      });
      try {
        expect(
          (await request(app).get("/api/v1/patients").set(headers())).status,
        ).toBe(403);
        expect(
          (
            await request(app)
              .post("/api/v1/patients")
              .set(headers())
              .send(payload)
          ).status,
        ).toBe(403);
      } finally {
        await prisma.doctor.update({
          where: { id: doctorA.id },
          data: { isActive: true, isDeleted: false },
        });
      }
    },
  );

  test.each(["update", "softDelete"] as const)(
    "retains the owner condition during final %s mutations after reassignment",
    async operation => {
      const patient = await prisma.patient.create({
        data: { ...payload, gender: "FEMALE", doctorId: doctorA.id },
      });
      try {
        class ReassigningRepository extends PatientRepository {
          override async update<T extends Prisma.PatientUpdateArgs>(
            args: Prisma.SelectSubset<T, Prisma.PatientUpdateArgs>,
            tx?: PrismaOrTx,
          ): Promise<RepositoryResult<Prisma.$PatientPayload, T, "update">> {
            await prisma.patient.update({
              where: { id: patient.id },
              data: { doctorId: doctorB.id },
            });
            return super.update(args, tx);
          }
        }
        const service = new PatientService(new ReassigningRepository());
        const result =
          operation === "update"
            ? service.update(patient.id, { notes: "intrusion" }, authUser)
            : service.softDelete(patient.id, authUser);
        await expect(result).rejects.toMatchObject({ code: "P2025" });
        expect(
          await prisma.patient.findUniqueOrThrow({ where: { id: patient.id } }),
        ).toMatchObject({
          doctorId: doctorB.id,
          notes: null,
          isDeleted: false,
        });
      } finally {
        await prisma.patient.deleteMany({
          where: { id: patient.id, patientComplaint: tag },
        });
      }
    },
  );

  test("keeps admin-only resources inaccessible to doctors and denies unauthenticated access", async () => {
    for (const path of [
      "/api/v1/doctors",
      "/api/v1/doctors/statistics",
      `/api/v1/doctors/${doctorB.id}`,
      "/api/v1/admins",
      "/api/v1/users",
      `/api/v1/users/${adminId}`,
      "/api/v1/dashboard/overview",
    ])
      expect((await request(app).get(path).set(headers())).status).toBe(403);
    expect((await request(app).get("/api/v1/patients")).status).toBe(401);
    expect(
      (await request(app).get("/api/v1/auth/profile").set(headers())).body.data
        .doctor.id,
    ).toBe(doctorA.id);
  });
});
