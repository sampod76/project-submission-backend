import type { Prisma } from "@prisma/client";
import { UTCDateFormatter } from "../../../../utils/UTCDateFormatter";
import { escapeLike } from "../../../share/prisma/query-options";
import type { ListAdminsQuery } from "../admin.validation";

export class AdminQueryBuilder {
  private where: Prisma.AdminWhereInput = { isDeleted: false };

  addSearch(search?: string): this {
    if (!search) return this;
    const searchFilter: Prisma.StringFilter = {
      contains: escapeLike(search),
      mode: "insensitive",
    };
    this.where.OR = [
      { firstName: searchFilter },
      { lastName: searchFilter },
      { phone: searchFilter },
    ];
    return this;
  }

  addFilters(filter: ListAdminsQuery): this {
    const { userId } = filter;

    if (userId) this.where.userId = userId;
    return this;
  }

  addDateRange(fromDate?: Date, toDate?: Date): this {
    if (!fromDate && !toDate) return this;
    const createdAt: Prisma.DateTimeFilter = {};
    if (fromDate) createdAt.gte = fromDate;
    if (toDate)
      createdAt.lte = new UTCDateFormatter({ date: toDate }).endOfDayUtc();
    this.where.createdAt = createdAt;
    return this;
  }

  build(): Prisma.AdminWhereInput {
    return this.where;
  }
}
