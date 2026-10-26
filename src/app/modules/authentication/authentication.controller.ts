import { ApiError } from "../../errors/ApiError";
import { refreshTokenExpiresIn } from "../../../helper/jwtHelpers";
import {
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} from "./authentication.constant";
import { Request, Response } from "express";
import httpStatus from "http-status";
import { AbstractController } from "../../core/abstract/AbstractController";
import type { ValidatedResponse } from "../../middlewares/validateRequestZod";
import type {
  AuthProfile,
  AuthResult,
  ChangePasswordResponse,
  IAuthenticationService,
} from "./authentication.interface";
import { AuthValidation } from "./authentication.validation";

export class AuthenticationController extends AbstractController {
  constructor(private readonly service: IAuthenticationService) {
    super();
  }

  register = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof AuthValidation.registerZodSchema>,
    ) => {
      const { body } = res.locals.validated;

      const data = await this.service.register(body);

      return this.sendResponse(res, {
        statusCode: 201,
        message: "Student registered",
        data,
      });
    },
  );
  session = this.catchAsync(async (req: Request, res: Response) => {
    const user = req.user!;

    const data = await this.service.session(user);

    return this.sendResponse(res, {
      statusCode: 200,
      data,
    });
  });
  logout = this.catchAsync(async (req: Request, res: Response) => {
    res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);

    return this.sendResponse(res, {
      statusCode: 200,
      message: "Logged out.",
    });
  });
  login = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof AuthValidation.loginZodSchema>,
    ) => {
      const { body } = res.locals.validated;

      const data = await this.service.login(body);

      res.cookie(REFRESH_COOKIE_NAME, data.refreshToken, {
        ...refreshCookieOptions,
        maxAge: refreshTokenExpiresIn * 1000,
      });

      return this.sendResponse<AuthResult>(res, {
        statusCode: httpStatus.OK,
        message: "Login successful",
        data,
      });
    },
  );

  refresh = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof AuthValidation.refreshTokenZodSchema>,
    ) => {
      const { body } = res.locals.validated;
      const token: unknown =
        req.cookies?.[REFRESH_COOKIE_NAME] ?? body.refreshToken;

      if (
        typeof token !== "string" ||
        token.length < 10 ||
        token.length > 4096
      ) {
        throw new ApiError(401, "Invalid refresh token");
      }

      const data = await this.service.refresh(token);

      res.cookie(REFRESH_COOKIE_NAME, data.refreshToken, {
        ...refreshCookieOptions,
        maxAge: refreshTokenExpiresIn * 1000,
      });

      return this.sendResponse<AuthResult>(res, {
        statusCode: httpStatus.OK,
        data,
      });
    },
  );

  profile = this.catchAsync(async (req: Request, res: Response) => {
    const user = req.user!;

    const data = await this.service.profile(user);

    return this.sendResponse<AuthProfile>(res, {
      statusCode: httpStatus.OK,
      data,
    });
  });

  changePassword = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof AuthValidation.changePasswordZodSchema>,
    ) => {
      const { body } = res.locals.validated;
      const user = req.user!;

      const data = await this.service.changePassword(user.userId, body);

      return this.sendResponse<ChangePasswordResponse>(res, {
        statusCode: httpStatus.OK,
        data,
      });
    },
  );
}
