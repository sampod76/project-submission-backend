import type { RequestHandler } from "express";
import type { AuthMiddleware } from "../../middlewares/authMiddleware";
import { AbstractRoute } from "../../core/abstract/AbstractRoute";
import { AuthenticationController } from "./authentication.controller";
import { AuthValidation } from "./authentication.validation";

export class AuthenticationRoutes extends AbstractRoute {
  constructor(
    private readonly controller: AuthenticationController,
    authMiddleware: AuthMiddleware,
    private readonly registrationLimiter: RequestHandler,
    private readonly loginLimiter: RequestHandler,
  ) {
    super(authMiddleware);
    this.init();
  }

  protected init(): void {
    this.router.post(
      "/register",
      this.registrationLimiter,
      this.validateRequestZod(AuthValidation.registerZodSchema),
      this.controller.register,
    );
    this.router.post("/logout", this.authMiddleware(), this.controller.logout);
    this.router.get("/session", this.authMiddleware(), this.controller.session);
    this.router.post(
      "/login",
      this.loginLimiter,
      this.validateRequestZod(AuthValidation.loginZodSchema),
      this.controller.login,
    );

    this.router.post(
      "/refresh-token",
      this.validateRequestZod(AuthValidation.refreshTokenZodSchema),
      this.controller.refresh,
    );

    this.router.get("/profile", this.authMiddleware(), this.controller.profile);

    this.router.post(
      "/change-password",
      this.authMiddleware(),
      this.validateRequestZod(AuthValidation.changePasswordZodSchema),
      this.controller.changePassword,
    );
  }
}
