import { Request } from "express";
import httpStatus from "http-status";
import { AbstractController } from "../../core/abstract/AbstractController";
import type { ValidatedResponse } from "../../middlewares/validateRequestZod";
import type {
  DashboardResponse,
  IDashboardService,
} from "./dashboard.interface";
import { dashboardOverviewZodSchema } from "./dashboard.validation";

export class DashboardController extends AbstractController {
  constructor(private readonly service: IDashboardService) {
    super();
  }

  overview = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof dashboardOverviewZodSchema>,
    ) => {
      const { query } = res.locals.validated;
      const data = await this.service.getOverview(query.followUpDate);
      this.sendResponse<DashboardResponse>(res, {
        statusCode: httpStatus.OK,
        message: "Dashboard overview retrieved successfully",
        data,
      });
    },
  );
}
