import type { Request } from "express";
import { USER_ROLE } from "../../../../global/enums/users";
import type { ValidatedResponse } from "../../../middlewares/validateRequestZod";
import { PatientController } from "../patient.controller";
import type { IPatientService } from "../patient.interface";
import { listPatientsZodSchema } from "../patient.validation";

const authUser = {
  userId: "12345678-1234-4abc-8def-123456789abc",
  email: "admin@example.com",
  role: USER_ROLE.ADMIN,
};
const query = { page: 2, limit: 5 };
const result = { data: [], meta: { page: 2, limit: 5, total: 0 } };
const service: IPatientService = {
  create: jest.fn(),
  findOne: jest.fn(),
  findAll: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  statistics: jest.fn(),
};
const controller = new PatientController(service);
const req = { user: authUser } as Request;
const res = {
  locals: { validated: { query } },
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
} as unknown as ValidatedResponse<typeof listPatientsZodSchema>;

test("passes the validated query and actor to the service and sends a paginated response", async () => {
  jest.mocked(service.findAll).mockResolvedValue(result);
  const next = jest.fn();

  await controller.list(req, res, next);

  expect(service.findAll).toHaveBeenCalledTimes(1);
  expect(service.findAll).toHaveBeenCalledWith(query, authUser);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({
    success: true,
    statusCode: 200,
    message: "",
    data: [],
    meta: result.meta,
  });
  expect(next).not.toHaveBeenCalled();
});

test("forwards a service error to Express", async () => {
  const error = new Error("Service unavailable");
  jest.mocked(service.findAll).mockRejectedValueOnce(error);
  const next = jest.fn();

  await controller.list(req, res, next);

  expect(next).toHaveBeenCalledWith(error);
  expect(res.json).not.toHaveBeenCalled();
});
