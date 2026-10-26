import type { IUserRef } from "../../interfaces/user.ref";
import type { Prisma } from "@prisma/client";
import type { StudentRepository } from "./student.repository";
import type { STUDENT_SELECT } from "./student.constant";
export type IStudentRepository = Pick<
  StudentRepository,
  keyof StudentRepository
>;
export type StudentResponse = Prisma.StudentGetPayload<{
  select: typeof STUDENT_SELECT;
}>;
import type { PaginatedResult } from "../../interfaces/response";
import type { ListStudentsQuery } from "./student.validation";
export interface IStudentService {
  findAll(
    query: ListStudentsQuery,
    authUser: IUserRef,
  ): Promise<PaginatedResult<StudentResponse>>;
}
