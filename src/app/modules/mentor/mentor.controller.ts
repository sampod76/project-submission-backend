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
      _req: Request,
      res: ValidatedResponse<typeof listMentorsZodSchema>,
    ) => {
      const result = await this.service.findAll(res.locals.validated.query);
      this.sendResponse(res, { statusCode: 200, ...result });
    },
  );
  create = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof createMentorZodSchema>,
    ) => {
      this.sendResponse(res, {
        statusCode: 201,
        message: "Mentor created",
        data: await this.service.create(res.locals.validated.body, req.user!),
      });
    },
  );
}
