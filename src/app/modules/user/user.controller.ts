import { Request, Response } from "express";
import httpStatus from "http-status";
import { AbstractController } from "../../core/abstract/AbstractController";
import type { ValidatedResponse } from "../../middlewares/validateRequestZod";
import { ApiError } from "../../errors/ApiError";
import type {
  IUserService,
  UserListResponse,
  UserResponse,
} from "./user.interface";
import {
  updateProfileZodSchema,
  updateUserStatusZodSchema,
  getUserZodSchema,
  listUsersZodSchema,
  updateUserZodSchema,
} from "./user.validation";

export class UserController extends AbstractController {
  constructor(private readonly service: IUserService) {
    super();
  }

  profile = this.catchAsync(async (req: Request, res: Response) => {
    this.sendResponse(res, {
      statusCode: 200,
      data: await this.service.ownProfile(req.user!),
    });
  });
  updateProfile = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof updateProfileZodSchema>,
    ) => {
      this.sendResponse(res, {
        statusCode: 200,
        data: await this.service.updateProfile(
          req.user!,
          res.locals.validated.body,
        ),
      });
    },
  );
  updateStatus = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof updateUserStatusZodSchema>,
    ) => {
      this.sendResponse(res, {
        statusCode: 200,
        data: await this.service.updateStatus(
          res.locals.validated.params.id,
          res.locals.validated.body.isActive,
          req.user!,
        ),
      });
    },
  );
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
      if (
        res.locals.validated.body.isActive === false &&
        res.locals.validated.params.id.toLowerCase() ===
          req.user?.userId.toLowerCase()
      ) {
        throw new ApiError(409, "You cannot deactivate your own account");
      }
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
