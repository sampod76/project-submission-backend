import type { Request, Response } from "express";
import { AbstractController } from "../../core/abstract/AbstractController";
import type { ValidatedResponse } from "../../middlewares/validateRequestZod";
import type { ISubmissionService } from "./submission.interface";
import {
  createSubmissionZodSchema,
  updateSubmissionZodSchema,
  getSubmissionZodSchema,
  listSubmissionsZodSchema,
  mySubmissionsZodSchema,
} from "./submission.validation";
export class SubmissionController extends AbstractController {
  constructor(private readonly service: ISubmissionService) {
    super();
  }
  create = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof createSubmissionZodSchema>,
    ) => {
      const { body } = res.locals.validated;
      const user = req.user!;

      const data = await this.service.create(body, user);

      return this.sendResponse(res, {
        statusCode: 201,
        data,
      });
    },
  );
  getById = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof getSubmissionZodSchema>,
    ) => {
      const { params } = res.locals.validated;
      const user = req.user!;

      const data = await this.service.findOne(params.id, user);

      return this.sendResponse(res, {
        statusCode: 200,
        data,
      });
    },
  );
  update = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof updateSubmissionZodSchema>,
    ) => {
      const { params, body } = res.locals.validated;
      const user = req.user!;

      const data = await this.service.update(params.id, body, user);

      return this.sendResponse(res, {
        statusCode: 200,
        data,
      });
    },
  );
  remove = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof getSubmissionZodSchema>,
    ) => {
      const { params } = res.locals.validated;
      const user = req.user!;

      const data = await this.service.softDelete(params.id, user);

      return this.sendResponse(res, {
        statusCode: 200,
        data,
      });
    },
  );
  list = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof listSubmissionsZodSchema>,
    ) => {
      const { query } = res.locals.validated;
      const user = req.user!;

      const { data, meta } = await this.service.findAll(query, user);

      return this.sendResponse(res, {
        statusCode: 200,
        data,
        meta,
      });
    },
  );
  mine = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof mySubmissionsZodSchema>,
    ) => {
      const { query } = res.locals.validated;
      const user = req.user!;

      const { data, meta } = await this.service.findMine(query, user);

      return this.sendResponse(res, {
        statusCode: 200,
        data,
        meta,
      });
    },
  );
  statistics = this.catchAsync(async (req: Request, res: Response) => {
    const data = await this.service.statistics(req.user!);

    return this.sendResponse(res, {
      statusCode: 200,
      data,
    });
  });
}
