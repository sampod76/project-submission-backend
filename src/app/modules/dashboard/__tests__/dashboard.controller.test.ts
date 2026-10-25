import type { Request } from "express";
import type { ValidatedResponse } from "../../../middlewares/validateRequestZod";
import { DashboardController } from "../dashboard.controller";
import type {
  DashboardResponse,
  IDashboardService,
} from "../dashboard.interface";
import { dashboardOverviewZodSchema } from "../dashboard.validation";

const followUpDate = new Date("2026-10-17T00:00:00.000Z");
const data: DashboardResponse = {
  totalFollowUps: 2,
  activeDoctors: 1,
  patientsOverview: [],
  patientsPerDoctor: [],
  treatmentStatus: [],
};
const service: IDashboardService = { getOverview: jest.fn() };
const controller = new DashboardController(service);
const req = {} as Request;
const res = {
  locals: { validated: { query: { followUpDate } } },
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
} as unknown as ValidatedResponse<typeof dashboardOverviewZodSchema>;

test("passes the validated follow-up date to the service and sends the overview", async () => {
  jest.mocked(service.getOverview).mockResolvedValue(data);
  const next = jest.fn();

  await controller.overview(req, res, next);

  expect(service.getOverview).toHaveBeenCalledTimes(1);
  expect(service.getOverview).toHaveBeenCalledWith(followUpDate);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({
    success: true,
    statusCode: 200,
    message: "Dashboard overview retrieved successfully",
    meta: undefined,
    data,
  });
  expect(next).not.toHaveBeenCalled();
});

test("forwards an overview failure to Express", async () => {
  const error = new Error("Overview unavailable");
  jest.mocked(service.getOverview).mockRejectedValueOnce(error);
  const next = jest.fn();

  await controller.overview(req, res, next);

  expect(next).toHaveBeenCalledWith(error);
  expect(res.json).not.toHaveBeenCalled();
});
