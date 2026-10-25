import type { Prisma } from "@prisma/client";
import { UTCDateFormatter } from "../../../../utils/UTCDateFormatter";
import { escapeLike } from "../../../share/prisma/query-options";
import { ADMIN_SEARCHABLE_FIELDS } from "../admin.constant";
import type { ListAdminsQuery } from "../admin.validation";

export class AdminQueryBuilder {
  private where: Prisma.AdminWhereInput = { isDeleted: false };

  addSearch(search?: string): this {
    if (!search) return this;
    this.where.OR = ADMIN_SEARCHABLE_FIELDS.map(field => ({
      [field]: { contains: escapeLike(search), mode: "insensitive" },
    }));
    return this;
  }

  addFilters(filter: ListAdminsQuery): this {
    if (filter.userId) this.where.userId = filter.userId;
    return this;
  }

  addDateRange(fromDate?: Date, toDate?: Date): this {
    if (!fromDate && !toDate) return this;
    this.where.createdAt = {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate
        ? { lte: new UTCDateFormatter({ date: toDate }).endOfDayUtc() }
        : {}),
    };
    return this;
  }

  build(): Prisma.AdminWhereInput {
    return this.where;
  }
}
