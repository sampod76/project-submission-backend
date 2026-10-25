import { Request } from "express";
import httpStatus from "http-status";
import { AbstractController } from "../../core/abstract/AbstractController";
import type { ValidatedResponse } from "../../middlewares/validateRequestZod";
import type {
  IUserService,
  UserListResponse,
  UserResponse,
} from "./user.interface";
import {
  getUserZodSchema,
  listUsersZodSchema,
  updateUserZodSchema,
} from "./user.validation";

export class UserController extends AbstractController {
  constructor(private readonly service: IUserService) {
    super();
  }

  findMany = this.catchAsync(
    async (req: Request, res: ValidatedResponse<typeof listUsersZodSchema>) => {
      const result = await this.service.findAll(res.locals.validated.query);
      return this.sendResponse<UserListResponse[]>(res, {
        statusCode: httpStatus.OK,
        data: result.data,
        meta: result.meta,
      });
    },
  );

  getById = this.catchAsync(
    async (req: Request, res: ValidatedResponse<typeof getUserZodSchema>) => {
      const user = await this.service.findOne(res.locals.validated.params.id);
      return this.sendResponse<UserResponse>(res, {
        statusCode: httpStatus.OK,
        data: user,
      });
    },
  );

  update = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof updateUserZodSchema>,
    ) => {
      const user = await this.service.update(
        res.locals.validated.params.id,
        res.locals.validated.body,
      );
      return this.sendResponse<UserResponse>(res, {
        statusCode: httpStatus.OK,
        message: "User updated",
        data: user,
      });
    },
  );

  remove = this.catchAsync(
    async (req: Request, res: ValidatedResponse<typeof getUserZodSchema>) => {
      await this.service.softDelete(res.locals.validated.params.id);
      return this.sendResponse<void>(res, {
        statusCode: httpStatus.OK,
        message: "User deleted",
      });
    },
  );
}
