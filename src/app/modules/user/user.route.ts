import { authenticationController } from "../authentication/authentication.container";
import { AuthValidation } from "../authentication/authentication.validation";
import { AbstractRoute } from "../../core/abstract/AbstractRoute";
import { UserController } from "./user.controller";
import {
  updateProfileZodSchema,
  updateUserStatusZodSchema,
  getUserZodSchema,
  listUsersZodSchema,
  updateUserZodSchema,
} from "./user.validation";

export class UserRoutes extends AbstractRoute {
  constructor(private readonly controller: UserController) {
    super();
    this.init();
  }

  protected init(): void {
    this.router.get("/profile", this.authMiddleware(), this.controller.profile);
    this.router.patch(
      "/profile",
      this.authMiddleware(),
      this.validateRequestZod(updateProfileZodSchema),
      this.controller.updateProfile,
    );
    this.router.patch(
      "/change-password",
      this.authMiddleware(),
      this.validateRequestZod(AuthValidation.changePasswordZodSchema),
      authenticationController.changePassword,
    );
    this.router.patch(
      "/:id/status",
      this.authMiddleware(this.USER_ROLE.ADMIN),
      this.validateRequestZod(updateUserStatusZodSchema),
      this.controller.updateStatus,
    );
    this.router
      .route("/")
      .get(
        this.authMiddleware(this.USER_ROLE.ADMIN),
        this.validateRequestZod(listUsersZodSchema),
        this.controller.findMany,
      );

    this.router
      .route("/:id")
      .get(
        this.authMiddleware(this.USER_ROLE.ADMIN),
        this.validateRequestZod(getUserZodSchema),
        this.controller.getById,
      )
      .patch(
        this.authMiddleware(this.USER_ROLE.ADMIN),
        this.validateRequestZod(updateUserZodSchema),
        this.controller.update,
      )
      .delete(
        this.authMiddleware(this.USER_ROLE.ADMIN),
        this.validateRequestZod(getUserZodSchema),
        this.controller.remove,
      );
  }
}
