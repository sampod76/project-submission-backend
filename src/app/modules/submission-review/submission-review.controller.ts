import type { Request } from "express";
import { AbstractController } from "../../core/abstract/AbstractController";
import type { ValidatedResponse } from "../../middlewares/validateRequestZod";
import type { ISubmissionReviewService } from "./submission-review.interface";
import {
  createReviewZodSchema,
  listReviewsZodSchema,
} from "./submission-review.validation";
export class SubmissionReviewController extends AbstractController {
  constructor(private readonly service: ISubmissionReviewService) {
    super();
  }
  create = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof createReviewZodSchema>,
    ) => {
      const { params, body } = res.locals.validated;
      const user = req.user!;
      const context = {
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      };

      const data = await this.service.create(params.id, body, user, context);

      return this.sendResponse(res, {
        statusCode: 201,
        message: "Submission reviewed",
        data,
      });
    },
  );
  list = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof listReviewsZodSchema>,
    ) => {
      const { params, query } = res.locals.validated;
      const user = req.user!;

      const { data, meta } = await this.service.findAll(params.id, query, user);

      return this.sendResponse(res, {
        statusCode: 200,
        data,
        meta,
      });
    },
  );
}
