import type { AuthMiddleware } from "../../middlewares/authMiddleware";
import { AbstractRoute } from "../../core/abstract/AbstractRoute";
import type { MentorController } from "./mentor.controller";
import {
  listMentorsZodSchema,
  createMentorZodSchema,
} from "./mentor.validation";
export class MentorRoutes extends AbstractRoute {
  constructor(
    private readonly controller: MentorController,
    authMiddleware: AuthMiddleware,
  ) {
    super(authMiddleware);
    this.init();
  }
  protected init(): void {
    this.router.get(
      "/",
      this.authMiddleware(this.USER_ROLE.ADMIN),
      this.validateRequestZod(listMentorsZodSchema),
      this.controller.list,
    );
    this.router.post(
      "/",
      this.authMiddleware(this.USER_ROLE.ADMIN),
      this.validateRequestZod(createMentorZodSchema),
      this.controller.create,
    );
  }
}
