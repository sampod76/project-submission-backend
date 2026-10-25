import type { Prisma } from "@prisma/client";
import { UTCDateFormatter } from "../../../../utils/UTCDateFormatter";
import { escapeLike } from "../../../share/prisma/query-options";
import { USER_SEARCHABLE_FIELDS } from "../user.constant";
import type { ListUsersQuery } from "../user.validation";

export class UserQueryBuilder {
  private where: Prisma.UserWhereInput = { isDeleted: false };

  addSearch(search?: string): this {
    if (!search) return this;
    this.where.OR = USER_SEARCHABLE_FIELDS.map(field => ({
      [field]: { contains: escapeLike(search), mode: "insensitive" },
    }));
    return this;
  }

  addFilters(filter: ListUsersQuery): this {
    if (filter.role !== undefined) this.where.role = filter.role;
    if (filter.isActive !== undefined) this.where.isActive = filter.isActive;
    if (filter.ids) this.where.id = { in: filter.ids };
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

  build(): Prisma.UserWhereInput {
    return this.where;
  }
}
