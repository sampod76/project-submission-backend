import type { Prisma } from "@prisma/client";
import { UTCDateFormatter } from "../../../../utils/UTCDateFormatter";
import type { ListAuditLogsQuery } from "../audit-log.validation";

export class AuditLogQueryBuilder {
  private where: Prisma.AuditLogWhereInput = { isDeleted: false };

  addFilters(query: ListAuditLogsQuery): this {
    const { action, entityType, entityId, actorUserId, fromDate, toDate } =
      query;

    if (action) this.where.action = action;
    if (entityType) this.where.entityType = entityType;
    if (entityId) this.where.entityId = entityId;
    if (actorUserId) this.where.actorUserId = actorUserId;

    if (fromDate || toDate) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (fromDate) createdAt.gte = fromDate;
      if (toDate)
        createdAt.lte = new UTCDateFormatter({ date: toDate }).endOfDayUtc();
      this.where.createdAt = createdAt;
    }
    return this;
  }

  build(): Prisma.AuditLogWhereInput {
    return this.where;
  }
}
