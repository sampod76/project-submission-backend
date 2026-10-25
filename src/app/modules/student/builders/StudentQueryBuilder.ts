import type { Prisma } from "@prisma/client";
import { escapeLike } from "../../../share/prisma/query-options";
export class StudentQueryBuilder {
  private where: Prisma.StudentWhereInput = {
    isDeleted: false,
    user: { isDeleted: false, role: "STUDENT" },
  };
  addSearch(search?: string): this {
    if (search) {
      const filter = {
        contains: escapeLike(search),
        mode: "insensitive" as const,
      };
      this.where.OR = [
        { firstName: filter },
        { lastName: filter },
        { phone: filter },
        { user: { email: filter } },
      ];
    }
    return this;
  }
  build(): Prisma.StudentWhereInput {
    return this.where;
  }
}
