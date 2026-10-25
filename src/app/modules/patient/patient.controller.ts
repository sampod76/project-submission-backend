import { Request } from "express";
import httpStatus from "http-status";
import { AbstractController } from "../../core/abstract/AbstractController";
import type { ValidatedResponse } from "../../middlewares/validateRequestZod";
import type {
  IPatientService,
  PatientDetailResponse,
  PatientListResponse,
  PatientResponse,
  PatientStatistics,
} from "./patient.interface";
import {
  createPatientZodSchema,
  getPatientZodSchema,
  listPatientsZodSchema,
  patientStatisticsZodSchema,
  updatePatientZodSchema,
} from "./patient.validation";
export class PatientController extends AbstractController {
  constructor(private readonly service: IPatientService) {
    super();
  }
  create = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof createPatientZodSchema>,
    ) => {
      const data = await this.service.create(
        res.locals.validated.body,
        req.user!,
      );
      this.sendResponse<PatientResponse>(res, {
        statusCode: httpStatus.CREATED,
        message: "Patient created",
        data,
      });
    },
  );
  list = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof listPatientsZodSchema>,
    ) => {
      const { query } = res.locals.validated;
      const result = await this.service.findAll(query, req.user!);
      this.sendResponse<PatientListResponse[]>(res, {
        statusCode: httpStatus.OK,
        data: result.data,
        meta: result.meta,
      });
    },
  );
  getById = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof getPatientZodSchema>,
    ) => {
      const data = await this.service.findOne(
        res.locals.validated.params.id,
        req.user!,
      );
      this.sendResponse<PatientDetailResponse>(res, {
        statusCode: httpStatus.OK,
        data,
      });
    },
  );
  update = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof updatePatientZodSchema>,
    ) => {
      const data = await this.service.update(
        res.locals.validated.params.id,
        res.locals.validated.body,
        req.user!,
      );
      this.sendResponse<PatientResponse>(res, {
        statusCode: httpStatus.OK,
        message: "Patient updated",
        data,
      });
    },
  );
  remove = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof getPatientZodSchema>,
    ) => {
      const data = await this.service.softDelete(
        res.locals.validated.params.id,
        req.user!,
      );
      this.sendResponse<PatientResponse>(res, {
        statusCode: httpStatus.OK,
        message: "Patient deleted",
        data,
      });
    },
  );

  statistics = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof patientStatisticsZodSchema>,
    ) => {
      const data = await this.service.statistics(
        res.locals.validated.query.doctorId,
        req.user!,
      );
      this.sendResponse<PatientStatistics>(res, {
        statusCode: httpStatus.OK,
        data,
      });
    },
  );
}
