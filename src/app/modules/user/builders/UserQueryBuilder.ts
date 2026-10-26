import type { Prisma } from "@prisma/client";
import { UTCDateFormatter } from "../../../../utils/UTCDateFormatter";
import { escapeLike } from "../../../share/prisma/query-options";
import type { ListUsersQuery } from "../user.validation";

export class UserQueryBuilder {
  private where: Prisma.UserWhereInput = { isDeleted: false };

  addSearch(search?: string): this {
    if (!search) return this;
    this.where.OR = [
      { email: { contains: escapeLike(search), mode: "insensitive" } },
    ];
    return this;
  }

  addFilters(filter: ListUsersQuery): this {
    const { role, isActive, ids } = filter;

    if (role !== undefined) this.where.role = role;
    if (isActive !== undefined) this.where.isActive = isActive;
    if (ids) this.where.id = { in: ids };
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

  build(): Prisma.UserWhereInput {
    return this.where;
  }
}
