import type { Request } from "express";
import { AbstractController } from "../../core/abstract/AbstractController";
import type { ValidatedResponse } from "../../middlewares/validateRequestZod";
import type { IStudentService } from "./student.interface";
import { listStudentsZodSchema } from "./student.validation";
export class StudentController extends AbstractController {
  constructor(private readonly service: IStudentService) {
    super();
  }
  list = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof listStudentsZodSchema>,
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
}
