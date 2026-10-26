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
      const { body } = res.locals.validated;
      const user = req.user!;

      const data = await this.service.create(body, user);

      return this.sendResponse<AdminResponse>(res, {
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
      const user = req.user!;

      const { data, meta } = await this.service.findAll(query, user);

      return this.sendResponse<AdminListResponse[]>(res, {
        statusCode: httpStatus.OK,
        data,
        meta,
      });
    },
  );
  getById = this.catchAsync(
    async (req: Request, res: ValidatedResponse<typeof getAdminZodSchema>) => {
      const { params } = res.locals.validated;
      const user = req.user!;

      const data = await this.service.findOne(params.id, user);

      return this.sendResponse<AdminDetailResponse>(res, {
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
      const { params, body } = res.locals.validated;
      const user = req.user!;

      const data = await this.service.update(params.id, body, user);

      return this.sendResponse<AdminResponse>(res, {
        statusCode: httpStatus.OK,
        message: "Admin updated",
        data,
      });
    },
  );
  remove = this.catchAsync(
    async (req: Request, res: ValidatedResponse<typeof getAdminZodSchema>) => {
      const { params } = res.locals.validated;
      const user = req.user!;

      const data = await this.service.softDelete(params.id, user);

      return this.sendResponse<AdminResponse>(res, {
        statusCode: httpStatus.OK,
        message: "Admin deleted",
        data,
      });
    },
  );
}
