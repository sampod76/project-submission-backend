import type { IUserRef } from "../../interfaces/user.ref";
import type { Prisma } from "@prisma/client";
import type { AuditLogRepository } from "./audit-log.repository";
import type { AUDIT_LOG_SELECT } from "./audit-log.constant";
export type IAuditLogRepository = Pick<
  AuditLogRepository,
  keyof AuditLogRepository
>;
export type AuditLogResponse = Prisma.AuditLogGetPayload<{
  select: typeof AUDIT_LOG_SELECT;
}>;
export interface AuditInput {
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldData?: Prisma.InputJsonObject;
  newData?: Prisma.InputJsonObject;
  ipAddress?: string;
  userAgent?: string;
}
import type { PaginatedResult } from "../../interfaces/response";
import type { PrismaOrTx } from "../../share/prisma/transaction";
import type { ListAuditLogsQuery } from "./audit-log.validation";
export interface IAuditLogService {
  record(input: AuditInput, tx: PrismaOrTx): Promise<{ id: string }>;
  findAll(
    query: ListAuditLogsQuery,
    authUser: IUserRef,
  ): Promise<PaginatedResult<AuditLogResponse>>;
  findOne(id: string, authUser: IUserRef): Promise<AuditLogResponse>;
}
