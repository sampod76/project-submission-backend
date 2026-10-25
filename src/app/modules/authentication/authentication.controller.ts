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

  login = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof AuthValidation.loginZodSchema>,
    ) => {
      const result = await this.service.login(res.locals.validated.body);
      this.sendResponse<AuthResult>(res, {
        statusCode: httpStatus.OK,
        message: "Login successful",
        data: result,
      });
    },
  );

  refresh = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof AuthValidation.refreshTokenZodSchema>,
    ) => {
      const result = await this.service.refresh(
        res.locals.validated.body.refreshToken,
      );
      this.sendResponse<AuthResult>(res, {
        statusCode: httpStatus.OK,
        data: result,
      });
    },
  );

  profile = this.catchAsync(async (req: Request, res: Response) => {
    const authUser = req.user!;
    const profile = await this.service.profile(authUser);
    this.sendResponse<AuthProfile>(res, {
      statusCode: httpStatus.OK,
      data: profile,
    });
  });

  changePassword = this.catchAsync(
    async (
      req: Request,
      res: ValidatedResponse<typeof AuthValidation.changePasswordZodSchema>,
    ) => {
      const result = await this.service.changePassword(
        req.user!.userId,
        res.locals.validated.body,
      );
      this.sendResponse<ChangePasswordResponse>(res, {
        statusCode: httpStatus.OK,
        data: result,
      });
    },
  );
}
