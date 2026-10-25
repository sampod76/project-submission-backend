import express, { ErrorRequestHandler } from "express";
import request from "supertest";
import { ZodError } from "zod";
import { USER_ROLE } from "../../src/global/enums/users";
import validateRequestZod from "../../src/app/middlewares/validateRequestZod";
import { DoctorController } from "../../src/app/modules/doctor/doctor.controller";
import type {
  DoctorListResponse,
  IDoctorService,
} from "../../src/app/modules/doctor/doctor.interface";
import { listDoctorsZodSchema } from "../../src/app/modules/doctor/doctor.validation";
import { PatientController } from "../../src/app/modules/patient/patient.controller";
import type { IPatientService } from "../../src/app/modules/patient/patient.interface";
import { createPatientZodSchema } from "../../src/app/modules/patient/patient.validation";
import { UserController } from "../../src/app/modules/user/user.controller";
import type { IUserService } from "../../src/app/modules/user/user.interface";
import { getUserZodSchema } from "../../src/app/modules/user/user.validation";

const id = "12345678-1234-4abc-8def-123456789abc";
const onError: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  res.status(error instanceof ZodError ? 400 : 500).json({ success: false });
};

test("passes parsed query values to services once and preserves pagination envelopes", async () => {
  const doctor: DoctorListResponse = {
    id,
    userId: id,
    createdBy: id,
    name: "Doctor",
    medicalRegistrationNo: "REG-123",
    email: "doctor@example.com",
    specialization: "OTHER",
    hospital: "Hospital",
    phone: "01234567890",
    isActive: false,
    isDeleted: false,
    deletedAt: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    _count: { patients: 0 },
  };
  const findAll = jest.fn<
    ReturnType<IDoctorService["findAll"]>,
    Parameters<IDoctorService["findAll"]>
  >();
  findAll.mockResolvedValue({
    data: [doctor],
    meta: { page: 2, limit: 5, total: 6 },
  });
  const service: IDoctorService = {
    create: jest.fn(),
    findOne: jest.fn(),
    findAll,
    update: jest.fn(),
    softDelete: jest.fn(),
    statistics: jest.fn(),
  };
  const controller = new DoctorController(service);
  const app = express();
  app.get("/", validateRequestZod(listDoctorsZodSchema), controller.findAll);
  app.use(onError);
  const response = await request(app).get("/").query({
    page: "2",
    limit: "5",
    isActive: "false",
    fromDate: "2026-01-01",
  });
  expect(response.status).toBe(200);
  expect(findAll).toHaveBeenCalledWith(
    {
      page: 2,
      limit: 5,
      isActive: false,
      fromDate: new Date("2026-01-01T00:00:00.000Z"),
    },
    undefined,
  );
  expect(response.body).toEqual({
    success: true,
    statusCode: 200,
    message: "",
    data: [
      {
        ...doctor,
        createdAt: doctor.createdAt.toISOString(),
        updatedAt: doctor.updatedAt.toISOString(),
      },
    ],
    meta: { page: 2, limit: 5, total: 6 },
  });
  findAll.mockClear();
  for (const selection of [
    { fields: "id,name" },
    { fields: "id,password" },
    { selectFields: "id" },
    { selectedFields: "id" },
    { selectableFields: "id" },
  ]) {
    expect((await request(app).get("/").query(selection)).status).toBe(400);
  }
  expect(findAll).not.toHaveBeenCalled();
});

test("passes parsed body dates to create services and forwards service failures", async () => {
  const create = jest.fn<
    ReturnType<IPatientService["create"]>,
    Parameters<IPatientService["create"]>
  >();
  const service: IPatientService = {
    create,
    findOne: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    statistics: jest.fn(),
  };
  const app = express();
  app.use(express.json());
  const authUser = {
    userId: id,
    email: "doctor@example.com",
    role: USER_ROLE.DOCTOR,
  };
  app.use((req, _res, next) => {
    req.user = authUser;
    next();
  });
  app.post(
    "/",
    validateRequestZod(createPatientZodSchema),
    new PatientController(service).create,
  );
  app.use(onError);
  create.mockRejectedValue(new Error("repository unavailable"));
  const response = await request(app).post("/").send({
    name: " Patient ",
    phone: "0123456789",
    doctorId: id,
    age: 30,
    gender: "FEMALE",
    patientComplaint: "Pain",
    lastVisitAt: "2026-01-02",
    followUpDate: null,
  });
  expect(response.status).toBe(500);
  expect(create).toHaveBeenCalledWith(
    {
      name: "Patient",
      phone: "0123456789",
      doctorId: id,
      age: 30,
      gender: "FEMALE",
      patientComplaint: "Pain",
      lastVisitAt: new Date("2026-01-02T00:00:00.000Z"),
      followUpDate: null,
    },
    authUser,
  );
});

test("keeps user deletion at HTTP 200 with null data and omitted metadata", async () => {
  const softDelete = jest.fn<
    ReturnType<IUserService["softDelete"]>,
    Parameters<IUserService["softDelete"]>
  >();
  const service: IUserService = {
    createAccount: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    findByEmail: jest.fn(),
    update: jest.fn(),
    softDelete,
    restore: jest.fn(),
    findByRole: jest.fn(),
  };
  const app = express();
  app.delete(
    "/:id",
    validateRequestZod(getUserZodSchema),
    new UserController(service).remove,
  );
  app.use(onError);
  const response = await request(app).delete(`/${id}`);
  expect(softDelete).toHaveBeenCalledWith(id);
  expect(response.status).toBe(200);
  expect(response.body).toEqual({
    success: true,
    statusCode: 200,
    message: "User deleted",
    data: null,
  });
});
