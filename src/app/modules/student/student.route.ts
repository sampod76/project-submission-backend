import type { AuthMiddleware } from "../../middlewares/authMiddleware";
import { AbstractRoute } from "../../core/abstract/AbstractRoute";
import type { StudentController } from "./student.controller";
import { listStudentsZodSchema } from "./student.validation";
export class StudentRoutes extends AbstractRoute {
  constructor(
    private readonly controller: StudentController,
    authMiddleware: AuthMiddleware,
  ) {
    super(authMiddleware);
    this.init();
  }
  protected init(): void {
    this.router.get(
      "/",
      this.authMiddleware(this.USER_ROLE.ADMIN, this.USER_ROLE.MENTOR),
      this.validateRequestZod(listStudentsZodSchema),
      this.controller.list,
    );
  }
}
