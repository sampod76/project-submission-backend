import type { Prisma } from "@prisma/client";
import { escapeLike } from "../../../share/prisma/query-options";
export class MentorQueryBuilder {
  private where: Prisma.MentorWhereInput = {
    isDeleted: false,
    user: { isDeleted: false, role: "MENTOR" },
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
  build(): Prisma.MentorWhereInput {
    return this.where;
  }
}
