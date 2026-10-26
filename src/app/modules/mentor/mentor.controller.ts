import type { Request } from "express";
import { AbstractController } from "../../core/abstract/AbstractController";
import type { ValidatedResponse } from "../../middlewares/validateRequestZod";
import type { IMentorService } from "./mentor.interface";
import {
  listMentorsZodSchema,
  createMentorZodSchema,
} from "./mentor.validation";
export class MentorController extends AbstractController {
  constructor(private readonly service: IMentorService) {
    super();
  }
  list = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof listMentorsZodSchema>,
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
  create = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof createMentorZodSchema>,
    ) => {
      const { body } = res.locals.validated;
      const user = req.user!;

      const data = await this.service.create(body, user);

      return this.sendResponse(res, {
        statusCode: 201,
        message: "Mentor created",
        data,
      });
    },
  );
}
