import type { IUserRef } from "../../interfaces/user.ref";
import { requireManagement } from "../../share/authorization";
import type { IStudentService } from "./student.interface";
import { AbstractService } from "../../core/abstract/AbstractService";
import { orderBy } from "../../share/prisma/query-options";
import type { IStudentRepository } from "./student.interface";
import { STUDENT_SELECT } from "./student.constant";
import type { ListStudentsQuery } from "./student.validation";
import { StudentQueryBuilder } from "./builders/StudentQueryBuilder";

export class StudentService extends AbstractService implements IStudentService {
  constructor(private readonly repository: IStudentRepository) {
    super();
  }

  async findAll(query: ListStudentsQuery, authUser: IUserRef) {
    requireManagement(authUser);
    const pagination = this.calculatePagination(query);
    const where = new StudentQueryBuilder()
      .addSearch(query.searchTerm ?? query.search)
      .build();
    return this.repository.transaction(async tx => {
      const [data, total] = await Promise.all([
        this.repository.findMany(
          {
            where,
            select: STUDENT_SELECT,
            skip: pagination.skip,
            take: pagination.limit,
            orderBy: orderBy(pagination),
          },
          tx,
        ),
        this.repository.count({ where }, tx),
      ]);
      return {
        data,
        meta: { page: pagination.page, limit: pagination.limit, total },
      };
    });
  }
}
