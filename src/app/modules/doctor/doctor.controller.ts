import { Request, Response } from "express";
import httpStatus from "http-status";
import { AbstractController } from "../../core/abstract/AbstractController";
import type { ValidatedResponse } from "../../middlewares/validateRequestZod";
import type {
  DoctorDetailResponse,
  DoctorListResponse,
  DoctorResponse,
  DoctorStatistics,
  IDoctorService,
} from "./doctor.interface";
import {
  createDoctorZodSchema,
  getDoctorZodSchema,
  listDoctorsZodSchema,
  updateDoctorZodSchema,
} from "./doctor.validation";
export class DoctorController extends AbstractController {
  constructor(private readonly service: IDoctorService) {
    super();
  }
  create = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof createDoctorZodSchema>,
    ) => {
      const data = await this.service.create(
        res.locals.validated.body,
        req.user!,
      );
      this.sendResponse<DoctorResponse>(res, {
        statusCode: httpStatus.CREATED,
        message: "Doctor created",
        data,
      });
    },
  );
  findAll = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof listDoctorsZodSchema>,
    ) => {
      const { query } = res.locals.validated;
      const result = await this.service.findAll(query, req.user!);
      this.sendResponse<DoctorListResponse[]>(res, {
        statusCode: httpStatus.OK,
        data: result.data,
        meta: result.meta,
      });
    },
  );
  getById = this.catchAsync(
    async (req: Request, res: ValidatedResponse<typeof getDoctorZodSchema>) => {
      const data = await this.service.findOne(res.locals.validated.params.id);
      this.sendResponse<DoctorDetailResponse>(res, {
        statusCode: httpStatus.OK,
        data,
      });
    },
  );
  update = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof updateDoctorZodSchema>,
    ) => {
      const data = await this.service.update(
        res.locals.validated.params.id,
        res.locals.validated.body,
        req.user!,
      );
      this.sendResponse<DoctorResponse>(res, {
        statusCode: httpStatus.OK,
        message: "Doctor updated",
        data,
      });
    },
  );
  remove = this.catchAsync(
    async (req: Request, res: ValidatedResponse<typeof getDoctorZodSchema>) => {
      const data = await this.service.softDelete(
        res.locals.validated.params.id,
        req.user!,
      );
      this.sendResponse<DoctorResponse>(res, {
        statusCode: httpStatus.OK,
        message: "Doctor deleted",
        data,
      });
    },
  );

  statistics = this.catchAsync(async (req: Request, res: Response) => {
    const data = await this.service.statistics();
    this.sendResponse<DoctorStatistics>(res, {
      statusCode: httpStatus.OK,
      data,
    });
  });
}
