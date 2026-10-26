import type { Prisma } from "@prisma/client";
import { escapeLike } from "../../../share/prisma/query-options";
import { ACTIVE_SUBMISSION_WHERE } from "../submission.constant";
import type { ListSubmissionsQuery } from "../submission.validation";

export class SubmissionQueryBuilder {
  private where: Prisma.SubmissionWhereInput = { ...ACTIVE_SUBMISSION_WHERE };

  addFilters(query: ListSubmissionsQuery): this {
    const { status } = query;

    if (status) this.where.status = status;
    return this;
  }

  addSearch(search?: string): this {
    if (!search) return this;
    const searchFilter: Prisma.StringFilter = {
      contains: escapeLike(search),
      mode: "insensitive",
    };
    this.where.OR = [
      { projectName: searchFilter },
      { repoFullName: searchFilter },
      { description: searchFilter },
      { student: { firstName: searchFilter } },
      { student: { lastName: searchFilter } },
    ];
    return this;
  }

  forStudent(studentId: string): this {
    this.where.studentId = studentId;
    return this;
  }

  build(): Prisma.SubmissionWhereInput {
    return this.where;
  }
}
