import { Request } from "express";
import httpStatus from "http-status";
import { AbstractController } from "../../core/abstract/AbstractController";
import type { ValidatedResponse } from "../../middlewares/validateRequestZod";
import type {
  AdminDetailResponse,
  AdminListResponse,
  AdminResponse,
  IAdminService,
} from "./admin.interface";
import {
  createAdminZodSchema,
  getAdminZodSchema,
  listAdminsZodSchema,
  updateAdminZodSchema,
} from "./admin.validation";
export class AdminController extends AbstractController {
  constructor(private readonly service: IAdminService) {
    super();
  }
  create = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof createAdminZodSchema>,
    ) => {
      const data = await this.service.create(
        res.locals.validated.body,
        req.user!,
      );
      this.sendResponse<AdminResponse>(res, {
        statusCode: httpStatus.CREATED,
        message: "Admin created",
        data,
      });
    },
  );
  list = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof listAdminsZodSchema>,
    ) => {
      const { query } = res.locals.validated;
      const result = await this.service.findAll(query, req.user!);
      this.sendResponse<AdminListResponse[]>(res, {
        statusCode: httpStatus.OK,
        data: result.data,
        meta: result.meta,
      });
    },
  );
  getById = this.catchAsync(
    async (req: Request, res: ValidatedResponse<typeof getAdminZodSchema>) => {
      const data = await this.service.findOne(
        res.locals.validated.params.id,
        req.user!,
      );
      this.sendResponse<AdminDetailResponse>(res, {
        statusCode: httpStatus.OK,
        data,
      });
    },
  );
  update = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof updateAdminZodSchema>,
    ) => {
      const data = await this.service.update(
        res.locals.validated.params.id,
        res.locals.validated.body,
        req.user!,
      );
      this.sendResponse<AdminResponse>(res, {
        statusCode: httpStatus.OK,
        message: "Admin updated",
        data,
      });
    },
  );
  remove = this.catchAsync(
    async (req: Request, res: ValidatedResponse<typeof getAdminZodSchema>) => {
      const data = await this.service.softDelete(
        res.locals.validated.params.id,
        req.user!,
      );
      this.sendResponse<AdminResponse>(res, {
        statusCode: httpStatus.OK,
        message: "Admin deleted",
        data,
      });
    },
  );
}
