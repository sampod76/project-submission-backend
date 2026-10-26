import { prisma } from "../../share/prisma/prisma";
import { AuditLogRepository } from "./audit-log.repository";
import { AuditLogService } from "./audit-log.service";
import { AuditLogController } from "./audit-log.controller";

export const auditLogRepository = new AuditLogRepository(prisma);
export const auditLogService = new AuditLogService(auditLogRepository);
export const auditLogController = new AuditLogController(auditLogService);
