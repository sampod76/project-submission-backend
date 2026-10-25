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
      _req: Request,
      res: ValidatedResponse<typeof listStudentsZodSchema>,
    ) => {
      const result = await this.service.findAll(res.locals.validated.query);
      this.sendResponse(res, { statusCode: 200, ...result });
    },
  );
}
