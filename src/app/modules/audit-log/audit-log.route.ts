import type { AuthMiddleware } from "../../middlewares/authMiddleware";
import { AbstractRoute } from "../../core/abstract/AbstractRoute";
import type { AuditLogController } from "./audit-log.controller";
import {
  listAuditLogsZodSchema,
  getAuditLogZodSchema,
} from "./audit-log.validation";
export class AuditLogRoutes extends AbstractRoute {
  constructor(
    private readonly controller: AuditLogController,
    authMiddleware: AuthMiddleware,
  ) {
    super(authMiddleware);
    this.init();
  }
  protected init(): void {
    this.router.get(
      "/",
      this.authMiddleware(this.USER_ROLE.ADMIN, this.USER_ROLE.MENTOR),
      this.validateRequestZod(listAuditLogsZodSchema),
      this.controller.list,
    );
    this.router.get(
      "/:id",
      this.authMiddleware(this.USER_ROLE.ADMIN, this.USER_ROLE.MENTOR),
      this.validateRequestZod(getAuditLogZodSchema),
      this.controller.getById,
    );
  }
}
