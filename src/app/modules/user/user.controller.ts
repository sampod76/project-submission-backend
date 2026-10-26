import { Request, Response } from "express";
import httpStatus from "http-status";
import { AbstractController } from "../../core/abstract/AbstractController";
import type { ValidatedResponse } from "../../middlewares/validateRequestZod";
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
    const user = req.user!;

    const data = await this.service.ownProfile(user);

    return this.sendResponse(res, {
      statusCode: 200,
      data,
    });
  });
  updateProfile = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof updateProfileZodSchema>,
    ) => {
      const { body } = res.locals.validated;
      const user = req.user!;

      const data = await this.service.updateProfile(user, body);

      return this.sendResponse(res, {
        statusCode: 200,
        data,
      });
    },
  );
  updateStatus = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof updateUserStatusZodSchema>,
    ) => {
      const { params, body } = res.locals.validated;
      const user = req.user!;

      const data = await this.service.updateStatus(
        params.id,
        body.isActive,
        user,
      );

      return this.sendResponse(res, {
        statusCode: 200,
        data,
      });
    },
  );
  findMany = this.catchAsync(
    async (req: Request, res: ValidatedResponse<typeof listUsersZodSchema>) => {
      const { query } = res.locals.validated;

      const { data, meta } = await this.service.findAll(query, req.user!);

      return this.sendResponse<UserListResponse[]>(res, {
        statusCode: httpStatus.OK,
        data,
        meta,
      });
    },
  );

  getById = this.catchAsync(
    async (req: Request, res: ValidatedResponse<typeof getUserZodSchema>) => {
      const { params } = res.locals.validated;

      const data = await this.service.findOne(params.id, req.user!);

      return this.sendResponse<UserResponse>(res, {
        statusCode: httpStatus.OK,
        data,
      });
    },
  );

  update = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof updateUserZodSchema>,
    ) => {
      const { params, body } = res.locals.validated;
      const user = req.user!;

      const data = await this.service.update(params.id, body, user);

      return this.sendResponse<UserResponse>(res, {
        statusCode: httpStatus.OK,
        message: "User updated",
        data,
      });
    },
  );

  remove = this.catchAsync(
    async (req: Request, res: ValidatedResponse<typeof getUserZodSchema>) => {
      const { params } = res.locals.validated;

      await this.service.softDelete(params.id, req.user!);

      return this.sendResponse<void>(res, {
        statusCode: httpStatus.OK,
        message: "User deleted",
      });
    },
  );
}
