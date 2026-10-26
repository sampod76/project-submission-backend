import { requireManagement } from "../../share/authorization";
import type { IUserRef } from "../../interfaces/user.ref";
import type { Prisma } from "@prisma/client";
import type { IAuditLogService } from "./audit-log.interface";
import { AbstractService } from "../../core/abstract/AbstractService";
import { ApiError } from "../../errors/ApiError";
import { orderBy } from "../../share/prisma/query-options";
import type { PrismaOrTx } from "../../share/prisma/transaction";
import type {
  AuditInput,
  AuditLogResponse,
  IAuditLogRepository,
} from "./audit-log.interface";
import type { ListAuditLogsQuery } from "./audit-log.validation";
import { AUDIT_LOG_SELECT, sanitizeAuditData } from "./audit-log.constant";
import { AuditLogQueryBuilder } from "./builders/AuditLogQueryBuilder";
export class AuditLogService
  extends AbstractService
  implements IAuditLogService
{
  constructor(private readonly repository: IAuditLogRepository) {
    super();
  }
  private sanitize(row: AuditLogResponse): AuditLogResponse {
    return {
      ...row,
      oldData: sanitizeAuditData(row.oldData),
      newData: sanitizeAuditData(row.newData),
    };
  }
  record(input: AuditInput, tx: PrismaOrTx) {
    return this.repository.create({ data: input, select: { id: true } }, tx);
  }
  async findAll(query: ListAuditLogsQuery, authUser: IUserRef) {
    requireManagement(authUser);
    const pagination = this.calculatePagination(query);
    const where: Prisma.AuditLogWhereInput = {
      AND: [
        new AuditLogQueryBuilder().addFilters(query).build(),
        this.visibleLogs(authUser),
      ],
    };
    return this.repository.transaction(async tx => {
      const [data, total] = await Promise.all([
        this.repository.findMany(
          {
            where,
            select: AUDIT_LOG_SELECT,
            skip: pagination.skip,
            take: pagination.limit,
            orderBy: orderBy(pagination),
          },
          tx,
        ),
        this.repository.count({ where }, tx),
      ]);
      return {
        data: data.map(row => this.sanitize(row)),
        meta: { page: pagination.page, limit: pagination.limit, total },
      };
    });
  }
  private visibleLogs(authUser: IUserRef): Prisma.AuditLogWhereInput {
    // Security audit details about privileged accounts remain administrator-only.
    if (authUser.role === "MENTOR")
      return {
        actorUserId: authUser.userId,
        entityType: "Submission",
        action: "SUBMISSION_REVIEWED",
      };
    return {};
  }
  async findOne(id: string, authUser: IUserRef) {
    requireManagement(authUser);
    const row = await this.repository.findFirst({
      where: { id, isDeleted: false },
      select: AUDIT_LOG_SELECT,
    });
    if (!row) throw new ApiError(404, "Audit log not found");
    if (
      authUser.role === "MENTOR" &&
      (row.actorUserId !== authUser.userId ||
        row.entityType !== "Submission" ||
        row.action !== "SUBMISSION_REVIEWED")
    )
      throw new ApiError(403, "You cannot access this audit log");
    return this.sanitize(row);
  }
}
