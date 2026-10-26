import type { Prisma } from "@prisma/client";
import { escapeLike } from "../../../share/prisma/query-options";

export class StudentQueryBuilder {
  private where: Prisma.StudentWhereInput = {
    isDeleted: false,
    user: { isDeleted: false, role: "STUDENT" },
  };

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
      { user: { email: searchFilter } },
    ];
    return this;
  }

  build(): Prisma.StudentWhereInput {
    return this.where;
  }
}
