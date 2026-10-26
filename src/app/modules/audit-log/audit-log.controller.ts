import type { Request } from "express";
import { AbstractController } from "../../core/abstract/AbstractController";
import type { ValidatedResponse } from "../../middlewares/validateRequestZod";
import type { IAuditLogService } from "./audit-log.interface";
import {
  listAuditLogsZodSchema,
  getAuditLogZodSchema,
} from "./audit-log.validation";
export class AuditLogController extends AbstractController {
  constructor(private readonly service: IAuditLogService) {
    super();
  }
  list = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof listAuditLogsZodSchema>,
    ) => {
      const { query } = res.locals.validated;

      const { data, meta } = await this.service.findAll(query, req.user!);

      return this.sendResponse(res, {
        statusCode: 200,
        data,
        meta,
      });
    },
  );
  getById = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof getAuditLogZodSchema>,
    ) => {
      const { params } = res.locals.validated;

      const data = await this.service.findOne(params.id, req.user!);

      return this.sendResponse(res, {
        statusCode: 200,
        data,
      });
    },
  );
}
