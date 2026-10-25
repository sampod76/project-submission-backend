import { AbstractRoute } from "../../core/abstract/AbstractRoute";
import type { StudentController } from "./student.controller";
import { listStudentsZodSchema } from "./student.validation";
export class StudentRoutes extends AbstractRoute {
  constructor(private readonly controller: StudentController) {
    super();
    this.init();
  }
  protected init(): void {
    this.router.get(
      "/",
      this.authMiddleware(this.USER_ROLE.ADMIN),
      this.validateRequestZod(listStudentsZodSchema),
      this.controller.list,
    );
  }
}
