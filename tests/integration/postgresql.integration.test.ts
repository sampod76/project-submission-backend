import { randomUUID } from "crypto";
import { isValidId } from "../../src/global/schema/global.schema";
import request from "supertest";
import bcrypt from "bcryptjs";
import app from "../../src/app";
import { prisma } from "../../src/app/share/prisma/prisma";
import { UserService } from "../../src/app/modules/user/user.service";
import { DoctorService } from "../../src/app/modules/doctor/doctor.service";
import { userRepository } from "../../src/app/modules/user/user.repository";
import { authCache } from "../../src/helper/authCache";
import { USER_ROLE } from "../../src/global/enums/users";
import { SPECIALIZATION } from "../../src/app/modules/doctor/doctor.constant";
import { env } from "../../src/app/config/env";
import { verifyTestDatabase } from "./test-database";

const describeDatabase = process.env.TEST_DATABASE_URL
  ? describe
  : describe.skip;
describeDatabase("PostgreSQL native API", () => {
  const password = "Migration@123";
  const users = new UserService();
  const tag = `migration-${randomUUID()}`;
  let databaseVerified = false;
  let token: string,
    doctorToken: string,
    adminId: string,
    doctorId: string,
    patientId: string,
    doctorUserId: string;
  let doctorCountBefore: number;
  const headers = () => ({ Authorization: `Bearer ${token}` });
  beforeAll(async () => {
    await verifyTestDatabase(prisma, env.DATABASE_URL);
    databaseVerified = true;
    doctorCountBefore = await prisma.doctor.count({
      where: { isDeleted: false },
    });
    const user = await users.createAccount({
      email: `${tag}@example.com`,
      password,
      role: USER_ROLE.ADMIN,
    });
    adminId = user.id;
    await prisma.admin.create({
      data: { userId: adminId, name: "Migration Admin", phone: "01234567890" },
    });
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: user.email, password });
    expect(login.status).toBe(200);
    token = login.body.data.accessToken;
  });
  afterAll(async () => {
    try {
      if (!databaseVerified) return;
      await verifyTestDatabase(prisma, env.DATABASE_URL);
      const suiteUsers = await prisma.user.findMany({
        where: {
          OR: [
            { email: `${tag}@example.com` },
            { email: { startsWith: `${tag}-` } },
          ],
        },
        select: { id: true },
      });
      const ids = suiteUsers.map(user => user.id);
      await prisma.patient.deleteMany({
        where: { patientComplaint: { startsWith: `${tag} ` } },
      });
      await prisma.doctor.deleteMany({
        where: {
          userId: { in: ids },
          medicalRegistrationNo: { startsWith: tag },
        },
      });
      await prisma.admin.deleteMany({ where: { userId: { in: ids } } });
      await prisma.user.deleteMany({ where: { id: { in: ids } } });
      ids.forEach(authCache.invalidateAuthUserCache);
    } finally {
      await prisma.$disconnect();
    }
  });
  test("keeps login, refresh, profile and role authorization", async () => {
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: `${tag}@example.com`, password });
    expect(login.body.data.user).toMatchObject({
      id: adminId,
      name: "Migration Admin",
      role: "ADMIN",
    });
    expect(JSON.stringify(login.body)).not.toContain("password");
    const refresh = await request(app)
      .post("/api/v1/auth/refresh-token")
      .send({ refreshToken: login.body.data.refreshToken });
    expect(refresh.status).toBe(200);
    const profile = await request(app)
      .get("/api/v1/auth/profile")
      .set(headers());
    expect(profile.body.data.admin).toMatchObject({
      userId: adminId,
      name: "Migration Admin",
    });
    expect((await request(app).get("/api/v1/users")).status).toBe(401);
    expect(
      (
        await request(app)
          .post("/api/v1/auth/login")
          .send({ email: `${tag}@example.com`, password: "wrong" })
      ).status,
    ).toBe(401);
  });
  test("creates doctors atomically with native UUID fields", async () => {
    const result = await request(app)
      .post("/api/v1/doctors")
      .set(headers())
      .send({
        email: `${tag}-doctor@example.com`,
        password,
        name: "Dr Literal%_.*",
        medicalRegistrationNo: tag,
        specialization: "CARDIOLOGY",
        hospital: "Test Hospital",
        phone: "01234567890",
      });
    expect(result.status).toBe(201);
    doctorId = result.body.data.id;
    doctorUserId = result.body.data.userId;
    expect(isValidId(doctorId)).toBe(true);
    expect(result.body.data.id).toBe(doctorId);
    const login = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: `${tag}-doctor@example.com`, password });
    doctorToken = login.body.data.accessToken;
    expect(
      (
        await request(app)
          .get("/api/v1/doctors")
          .set({ Authorization: `Bearer ${doctorToken}` })
      ).status,
    ).toBe(403);
    const detail = await request(app)
      .get(`/api/v1/doctors/${doctorId.toUpperCase()}`)
      .set(headers());
    expect(detail.body.data).toMatchObject({
      id: doctorId,
      user: { id: doctorUserId, email: `${tag}-doctor@example.com` },
      creator: { id: adminId },
      createdBy: adminId,
      userId: doctorUserId,
    });
    expect(detail.body.data.userId).toBe(doctorUserId);
    expect(detail.body.data.id).toBe(doctorId);
    expect(JSON.stringify(detail.body)).not.toContain("password");
  });
  test("rolls back an account when creating its doctor profile fails", async () => {
    const email = `${tag}-rollback@example.com`;
    const service = new DoctorService(users);
    await expect(
      service.create(
        {
          email,
          password,
          name: "Rollback Doctor",
          medicalRegistrationNo: `${tag}-rollback`,
          specialization: SPECIALIZATION.CARDIOLOGY,
          hospital: "Test",
          phone: "01234567890",
        },
        {
          userId: "ffffffff-ffff-4fff-bfff-ffffffffffff",
          role: USER_ROLE.ADMIN,
          email: "missing@example.com",
        },
      ),
    ).rejects.toThrow();
    expect(await prisma.user.count({ where: { email } })).toBe(0);
  });
  test("preserves literal search, filters, stable pagination and patient counts", async () => {
    const filtered = await request(app)
      .get("/api/v1/doctors")
      .set(headers())
      .query({
        searchTerm: "%_.*",
        specialization: "CARDIOLOGY",
        hospital: "Test Hospital",
        medicalRegistrationNo: tag,
        isActive: "true",
        page: 1,
        limit: 1,
        sortBy: "name",
        sortOrder: "asc",
      });
    expect(filtered.status).toBe(200);
    expect(filtered.body.meta).toEqual({ page: 1, limit: 1, total: 1 });
    expect(filtered.body.data[0]).toMatchObject({
      id: doctorId,
      _count: { patients: 0 },
    });
    expect(filtered.body.data[0].id).toBe(doctorId);
    const duplicate = await request(app)
      .post("/api/v1/doctors")
      .set(headers())
      .send({
        email: `${tag}-duplicate@example.com`,
        password,
        name: "Duplicate",
        medicalRegistrationNo: tag,
        specialization: "CARDIOLOGY",
        hospital: "Test",
        phone: "01234567890",
      });
    expect(duplicate.status).toBe(409);
    expect(
      await prisma.user.count({
        where: { email: `${tag}-duplicate@example.com` },
      }),
    ).toBe(0);
  });
  test("preserves patient create, list projection, detail relation and exact dates", async () => {
    const response = await request(app)
      .post("/api/v1/patients")
      .set({ Authorization: `Bearer ${doctorToken}` })
      .send({
        name: "Patient Literal%_.*",
        phone: "01234567890",
        doctorId,
        age: 30,
        gender: "FEMALE",
        patientComplaint: `${tag} Literal%_.*`,
        followUpDate: "2030-01-01",
        lastVisitAt: "2026-10-01",
      });
    expect(response.status).toBe(201);
    patientId = response.body.data.id;
    expect(response.body.data.address).toBeNull();
    expect(response.body.data.doctorAdvice).toBeNull();
    expect(response.body.data.notes).toBeNull();
    expect(response.body.data).not.toHaveProperty("nullFields");
    const list = await request(app)
      .get("/api/v1/patients")
      .set(headers())
      .query({
        doctorId,
        gender: "FEMALE",
        treatmentStatus: "ACTIVE",
        followUpDate: "2030-01-01",
        searchTerm: "%_.*",
      });
    expect(list.status).toBe(200);
    expect(list.body.meta.total).toBe(1);
    expect(list.body.data[0].doctor).toEqual({
      name: "Dr Literal%_.*",
      medicalRegistrationNo: tag,
      email: `${tag}-doctor@example.com`,
      specialization: "CARDIOLOGY",
    });
    expect(list.body.data[0]).not.toHaveProperty("patientComplaint");
    const detail = await request(app)
      .get(`/api/v1/patients/${patientId}`)
      .set(headers());
    expect(detail.body.data.doctor).toMatchObject({
      id: doctorId,
      userId: doctorUserId,
    });
    expect(detail.body.data.doctorId).toBe(doctorId);
    expect(detail.body.data.doctor).not.toHaveProperty("phone");
  });
  test("integrates query builders, safe projections, UTC date filters, and pagination", async () => {
    const cases = [
      {
        path: "/api/v1/users",
        filter: { ids: adminId, role: "ADMIN", isActive: "true" },
        expectedKeys: [
          "id",
          "email",
          "role",
          "isActive",
          "isDeleted",
          "deletedAt",
          "createdAt",
          "updatedAt",
        ],
        expected: adminId,
      },
      {
        path: "/api/v1/admins",
        filter: { userId: adminId, search: "Migration Admin" },
        expectedKeys: [
          "id",
          "userId",
          "name",
          "phone",
          "isDeleted",
          "deletedAt",
          "createdAt",
          "updatedAt",
        ],
        expected: undefined,
      },
      {
        path: "/api/v1/doctors",
        filter: {
          createdBy: adminId,
          userId: doctorUserId,
          specialization: "CARDIOLOGY",
          search: "%_.*",
        },
        expectedKeys: [
          "id",
          "userId",
          "createdBy",
          "name",
          "medicalRegistrationNo",
          "email",
          "specialization",
          "hospital",
          "phone",
          "isActive",
          "isDeleted",
          "deletedAt",
          "createdAt",
          "updatedAt",
          "_count",
        ],
        expected: doctorId,
      },
      {
        path: "/api/v1/patients",
        filter: {
          doctorId,
          gender: "FEMALE",
          treatmentStatus: "ACTIVE",
          search: "%_.*",
        },
        expectedKeys: [
          "id",
          "name",
          "phone",
          "doctorId",
          "age",
          "gender",
          "treatmentStatus",
          "lastVisitAt",
          "followUpDate",
          "createdAt",
          "doctor",
        ],
        expected: patientId,
      },
    ];
    for (const { path, filter, expectedKeys, expected } of cases) {
      const response = await request(app)
        .get(path)
        .set(headers())
        .query({
          ...filter,
          fromDate: "2000-01-01",
          toDate: "2099-12-31",
          page: 1,
          limit: 1,
          sortBy: "id",
          sortOrder: "asc",
        });
      expect(response.status).toBe(200);
      expect(response.body.meta).toEqual({ page: 1, limit: 1, total: 1 });
      expect(Object.keys(response.body.data[0]).sort()).toEqual(
        [...expectedKeys].sort(),
      );
      if (expected) expect(response.body.data[0].id).toBe(expected);
      const absent = await request(app)
        .get(path)
        .set(headers())
        .query({ ...filter, toDate: "1999-12-31" });
      expect(absent.status).toBe(200);
      expect(absent.body.meta.total).toBe(0);
      expect(absent.body.data).toEqual([]);
      const page = await request(app)
        .get(path)
        .set(headers())
        .query({ ...filter, page: 2, limit: 1 });
      expect(page.body.meta.total).toBe(1);
      expect(page.body.data).toEqual([]);
      for (const invalid of [
        { fields: "id,name" },
        { fields: "password" },
        { selectFields: "id" },
        { selectedFields: "id" },
        { selectableFields: "id" },
        { sortBy: "password" },
        { limit: 101 },
        { fromDate: "2026-02-02", toDate: "2026-02-01" },
        { isDeleted: "true" },
      ]) {
        expect(
          (await request(app).get(path).set(headers()).query(invalid)).status,
        ).toBe(400);
      }
    }
    expect(
      (
        await request(app)
          .get("/api/v1/users")
          .set(headers())
          .query({ ids: `${adminId},invalid` })
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .get("/api/v1/dashboard/overview")
          .set(headers())
          .query({ followUpDate: "2026-02-30" })
      ).status,
    ).toBe(400);
  });
  test("preserves updates, statistics and database dashboard aggregates", async () => {
    const updated = await request(app)
      .patch(`/api/v1/patients/${patientId}`)
      .set(headers())
      .send({ treatmentStatus: "UNDER_OBSERVATION", notes: "Updated" });
    expect(updated.status).toBe(200);
    expect(updated.body.data.treatmentStatus).toBe("UNDER_OBSERVATION");
    const statistics = await request(app)
      .get("/api/v1/patients/statistics")
      .set(headers())
      .query({ doctorId });
    expect(statistics.body.data).toMatchObject({
      total: 1,
      underObservation: 1,
      upcomingFollowUps: 1,
      byGender: [{ gender: "FEMALE", _count: 1 }],
    });
    const doctors = await request(app)
      .get("/api/v1/doctors/statistics")
      .set(headers());
    expect(doctors.body.data.total).toBe(doctorCountBefore + 1);
    const updatedDoctor = await request(app)
      .patch(`/api/v1/doctors/${doctorId}`)
      .set(headers())
      .send({ hospital: "Updated Hospital" });
    expect(updatedDoctor.status).toBe(200);
    expect(updatedDoctor.body.data).toMatchObject({
      id: doctorId,
      hospital: "Updated Hospital",
    });
    const overview = await request(app)
      .get("/api/v1/dashboard/overview")
      .set(headers())
      .query({ followUpDate: "2030-01-01" });
    expect(overview.status).toBe(200);
    expect(overview.body.data.totalFollowUps).toBeGreaterThanOrEqual(1);
    expect(overview.body.data.patientsOverview).toHaveLength(6);
    expect(overview.body.data.patientsPerDoctor).toContainEqual(
      expect.objectContaining({ doctorId, patientsCount: 1 }),
    );
    expect(overview.body.data.treatmentStatus).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Under observation",
          value: expect.any(Number),
        }),
      ]),
    );
  });
  test("preserves Unicode and backslash searches and nullable date sorting", async () => {
    const created = await request(app)
      .post("/api/v1/patients")
      .set(headers())
      .send({
        name: "ÉLODIE Literal\\Case",
        phone: "01234567890",
        doctorId,
        age: 20,
        gender: "OTHER",
        patientComplaint: `${tag} Complaint`,
      });
    expect(created.status).toBe(201);
    const extraId = created.body.data.id;
    const unicode = await request(app)
      .get("/api/v1/patients")
      .set(headers())
      .query({ doctorId, searchTerm: "élodie" });
    expect(
      unicode.body.data.map((patient: { id: string }) => patient.id),
    ).toContain(extraId);
    const backslash = await request(app)
      .get("/api/v1/patients")
      .set(headers())
      .query({ doctorId, searchTerm: "Literal\\Case" });
    expect(backslash.body.meta.total).toBe(1);
    const ascending = await request(app)
      .get("/api/v1/patients")
      .set(headers())
      .query({ doctorId, sortBy: "followUpDate", sortOrder: "asc" });
    expect(ascending.body.data[0].id).toBe(patientId);
    const descending = await request(app)
      .get("/api/v1/patients")
      .set(headers())
      .query({ doctorId, sortBy: "followUpDate", sortOrder: "desc" });
    expect(descending.body.data[0].id).toBe(extraId);
    await request(app).delete(`/api/v1/patients/${extraId}`).set(headers());
  });
  test("preserves admin CRUD and native account relations", async () => {
    const created = await request(app)
      .post("/api/v1/admins")
      .set(headers())
      .send({
        name: "Second Admin",
        phone: "01234567890",
        email: `${tag}-admin@example.com`,
        password,
      });
    expect(created.status).toBe(201);
    const id = created.body.data.id;
    const detail = await request(app)
      .get(`/api/v1/admins/${id}`)
      .set(headers());
    expect(detail.body.data.user).toMatchObject({
      id: created.body.data.userId,
      role: "ADMIN",
    });
    const updated = await request(app)
      .patch(`/api/v1/admins/${id}`)
      .set(headers())
      .send({ name: "Renamed Admin" });
    expect(updated.body.data.name).toBe("Renamed Admin");
    const list = await request(app)
      .get("/api/v1/admins")
      .set(headers())
      .query({ searchTerm: "Renamed Admin" });
    expect(list.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: id })]),
    );
    expect(
      (await request(app).delete(`/api/v1/admins/${id}`).set(headers())).status,
    ).toBe(200);
    expect(
      (await request(app).get(`/api/v1/admins/${id}`).set(headers())).status,
    ).toBe(404);
    expect(
      await prisma.user.findUnique({ where: { id: created.body.data.userId } }),
    ).toMatchObject({ isDeleted: false });
  });
  test("returns native fields and excludes sensitive values across all read endpoints", async () => {
    for (const path of [
      "/api/v1/users",
      `/api/v1/users/${adminId}`,
      "/api/v1/admins",
      "/api/v1/doctors",
      `/api/v1/doctors/${doctorId}`,
      "/api/v1/patients",
      `/api/v1/patients/${patientId}`,
      "/api/v1/auth/profile",
      "/api/v1/dashboard/overview",
    ]) {
      const response = await request(app).get(path).set(headers());
      expect(response.status).toBe(200);
      expect(JSON.stringify(response.body.data)).not.toMatch(
        /"(?:_id|password|refreshToken|otpSecret|otpCode)"\s*:/,
      );
    }
    const columns = await prisma.$queryRaw<
      { table_name: string; column_default: string | null; data_type: string }[]
    >`SELECT table_name, column_default, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name IN ('users', 'admins', 'doctors', 'patients')
        AND column_name = 'id'`;
    expect(columns).toHaveLength(4);
    expect(columns.every(column => column.column_default === null)).toBe(true);
    expect(columns.every(column => column.data_type === "uuid")).toBe(true);
  });
  test("password changes are hashed and safe user responses exclude passwords", async () => {
    const response = await request(app)
      .post("/api/v1/auth/change-password")
      .set({ Authorization: `Bearer ${doctorToken}` })
      .send({ currentPassword: password, newPassword: "Changed@123" });
    expect(response.status).toBe(200);
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: doctorUserId },
    });
    expect(await bcrypt.compare("Changed@123", user.password)).toBe(true);
    const listed = await request(app)
      .get("/api/v1/users")
      .set(headers())
      .query({ ids: doctorUserId, role: "DOCTOR" });
    expect(listed.body.meta.total).toBe(1);
    expect(listed.body.data[0]).not.toHaveProperty("password");
    const detail = await request(app)
      .get(`/api/v1/users/${doctorUserId}`)
      .set(headers());
    expect(detail.status).toBe(200);
    expect(detail.body.data).not.toHaveProperty("password");
    const updated = await request(app)
      .patch(`/api/v1/users/${doctorUserId}`)
      .set(headers())
      .send({ isActive: false });
    expect(updated.status).toBe(200);
    expect(updated.body.data).not.toHaveProperty("password");
    expect(
      (
        await request(app)
          .get("/api/v1/auth/profile")
          .set({ Authorization: `Bearer ${doctorToken}` })
      ).status,
    ).toBe(403);
    await users.update(doctorUserId, { isActive: true });
  });
  test("preserves soft deletes without cascading to related records", async () => {
    expect(
      (
        await request(app)
          .delete(`/api/v1/patients/${patientId}`)
          .set(headers())
      ).body.data.isDeleted,
    ).toBe(true);
    expect(
      (await request(app).get(`/api/v1/patients/${patientId}`).set(headers()))
        .status,
    ).toBe(404);
    const list = await request(app)
      .get("/api/v1/doctors")
      .set(headers())
      .query({ medicalRegistrationNo: tag });
    expect(list.body.data[0]._count.patients).toBe(0);
    const deleted = await request(app)
      .delete(`/api/v1/doctors/${doctorId}`)
      .set(headers());
    expect(deleted.body.data.isDeleted).toBe(true);
    expect(
      (await request(app).get(`/api/v1/doctors/${doctorId}`).set(headers()))
        .status,
    ).toBe(404);
    expect(
      await prisma.user.findUnique({ where: { id: doctorUserId } }),
    ).toMatchObject({ isDeleted: false });
    const profile = await request(app)
      .get("/api/v1/auth/profile")
      .set({ Authorization: `Bearer ${doctorToken}` });
    expect(profile.status).toBe(200);
    expect(profile.body.data.doctor.isDeleted).toBe(true);
    const removedUser = await request(app)
      .delete(`/api/v1/users/${doctorUserId}`)
      .set(headers());
    expect(removedUser.status).toBe(200);
    expect(removedUser.body.data).toBeNull();
    expect(
      (
        await request(app)
          .get("/api/v1/auth/profile")
          .set({ Authorization: `Bearer ${doctorToken}` })
      ).status,
    ).toBe(401);
    await users.restore(doctorUserId);
    expect(
      (
        await request(app)
          .get("/api/v1/auth/profile")
          .set({ Authorization: `Bearer ${doctorToken}` })
      ).status,
    ).toBe(200);
  });
  test("retains id validation and missing record errors", async () => {
    expect(
      (await request(app).get("/api/v1/doctors/invalid").set(headers())).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .get("/api/v1/patients/ffffffff-ffff-4fff-bfff-ffffffffffff")
          .set(headers())
      ).status,
    ).toBe(404);
    await expect(
      userRepository.transaction(async tx => {
        const created = await userRepository.create(
          {
            data: {
              email: `${tag}-transaction@example.com`,
              password: "hashhashhash",
              role: "ADMIN",
            },
          },
          tx,
        );
        expect(created.email).toBe(`${tag}-transaction@example.com`);
        throw new Error("rollback");
      }),
    ).rejects.toThrow("rollback");
    expect(
      await prisma.user.count({
        where: { email: `${tag}-transaction@example.com` },
      }),
    ).toBe(0);
  });
});
