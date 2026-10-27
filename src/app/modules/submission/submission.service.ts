import { requireManagement } from "../../share/authorization";
import type { Prisma } from "@prisma/client";
import { USER_ROLE } from "../../../global/enums/users";
import type { ISubmissionService } from "./submission.interface";
import { AbstractService } from "../../core/abstract/AbstractService";
import { ApiError } from "../../errors/ApiError";
import type { IUserRef } from "../../interfaces/user.ref";
import { orderBy } from "../../share/prisma/query-options";
import type { PrismaOrTx } from "../../share/prisma/transaction";
import type { ISubmissionRepository } from "./submission.interface";
import {
  ACTIVE_SUBMISSION_WHERE,
  SUBMISSION_SELECT,
} from "./submission.constant";
import { normalizeGithubRepository } from "./submission.utils";
import { SubmissionQueryBuilder } from "./builders/SubmissionQueryBuilder";
import type {
  CreateSubmissionDto,
  UpdateSubmissionDto,
  ListSubmissionsQuery,
  MySubmissionsQuery,
} from "./submission.validation";
export class SubmissionService
  extends AbstractService
  implements ISubmissionService
{
  constructor(private readonly repository: ISubmissionRepository) {
    super();
  }

  private async student(authUser: IUserRef, tx?: PrismaOrTx) {
    const student = await this.repository.studentForUser(authUser.userId, tx);
    if (!student) throw new ApiError(403, "Active student profile required");
    return student;
  }
  private async duplicate(
    repoFullName: string,
    tx: PrismaOrTx,
    excludeId?: string,
  ) {
    const existing = await this.repository.findFirst(
      {
        where: {
          repoFullName,
          isDeleted: false,
          ...(excludeId ? { id: { not: excludeId } } : {}),
        },
        select: { id: true },
      },
      tx,
    );
    if (existing)
      throw new ApiError(
        409,
        "This GitHub repository already has an active submission",
      );
  }
  async create(dto: CreateSubmissionDto, authUser: IUserRef) {
    const repoFullName = normalizeGithubRepository(dto.repoUrl);
    return this.repository.transaction(async tx => {
      const student = await this.student(authUser, tx);
      await this.duplicate(repoFullName, tx);
      return this.repository.create(
        {
          data: {
            ...dto,
            repoFullName,
            studentId: student.id,
            status: "PENDING",
          },
          select: SUBMISSION_SELECT,
        },
        tx,
      );
    }, "ReadCommitted");
  }
  async findOne(id: string, authUser: IUserRef, tx?: PrismaOrTx) {
    if (authUser.role !== "STUDENT") requireManagement(authUser);
    const row = await this.repository.findFirst(
      { where: { ...ACTIVE_SUBMISSION_WHERE, id }, select: SUBMISSION_SELECT },
      tx,
    );
    if (!row) throw new ApiError(404, "Submission not found");
    if (authUser.role === "STUDENT" && row.student.userId !== authUser.userId)
      throw new ApiError(403, "You cannot access another student's submission");
    return row;
  }
  async update(id: string, dto: UpdateSubmissionDto, authUser: IUserRef) {
    return this.repository.transaction(async tx => {
      const student = await this.student(authUser, tx);
      const row = await this.findOne(id, authUser, tx);
      if (row.status !== "PENDING")
        throw new ApiError(409, "Only PENDING submissions can be updated");
      const repoFullName = dto.repoUrl
        ? normalizeGithubRepository(dto.repoUrl)
        : undefined;
      if (repoFullName) await this.duplicate(repoFullName, tx, id);
      const result = await this.repository.updateMany(
        {
          where: {
            id,
            studentId: student.id,
            isDeleted: false,
            status: "PENDING",
          },
          data: { ...dto, ...(repoFullName ? { repoFullName } : {}) },
        },
        tx,
      );
      if (result.count !== 1)
        throw new ApiError(409, "Submission changed; please reload");
      return this.findOne(id, authUser, tx);
    }, "ReadCommitted");
  }
  async softDelete(id: string, authUser: IUserRef) {
    return this.repository.transaction(async tx => {
      const student = await this.student(authUser, tx);
      const row = await this.findOne(id, authUser, tx);
      if (row.status !== "PENDING")
        throw new ApiError(409, "Only PENDING submissions can be deleted");
      const result = await this.repository.updateMany(
        {
          where: {
            id,
            studentId: student.id,
            isDeleted: false,
            status: "PENDING",
          },
          data: { isDeleted: true, deletedAt: new Date() },
        },
        tx,
      );
      if (result.count !== 1)
        throw new ApiError(409, "Submission changed; please reload");
      return { id, isDeleted: true };
    }, "ReadCommitted");
  }
  async findAll(query: ListSubmissionsQuery, authUser: IUserRef) {
    return this.list(query);
  }
  async findMine(query: MySubmissionsQuery, authUser: IUserRef) {
    const student = await this.student(authUser);
    return this.list(query, student.id);
  }
  private async list(query: ListSubmissionsQuery, studentId?: string) {
    const pagination = this.calculatePagination(query);
    const builder = new SubmissionQueryBuilder()
      .addFilters(query)
      .addSearch(query.searchTerm);
    if (studentId) builder.forStudent(studentId);
    const where = builder.build();
    return this.repository.transaction(async tx => {
      const [data, total] = await Promise.all([
        this.repository.findMany(
          {
            where,
            select: SUBMISSION_SELECT,
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
  async statistics(authUser: IUserRef) {
    let where: Prisma.SubmissionWhereInput = {};
    if (authUser.role === USER_ROLE.STUDENT) {
      where = { student: { userId: authUser.userId } };
    } else {
      requireManagement(authUser);
    }
    const groups = await this.repository.groupByStatus(where);
    const counts = new Map(groups.map(group => [group.status, group._count]));
    return {
      total: groups.reduce((sum, group) => sum + group._count, 0),
      pending: counts.get("PENDING") ?? 0,
      approved: counts.get("APPROVED") ?? 0,
      rejected: counts.get("REJECTED") ?? 0,
      revisionRequired: counts.get("REVISION_REQUIRED") ?? 0,
    };
  }
}
