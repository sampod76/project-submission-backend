import type { Prisma } from "@prisma/client";
import type { SubmissionRepository } from "./submission.repository";
import type { SUBMISSION_SELECT } from "./submission.constant";
export type ISubmissionRepository = Pick<
  SubmissionRepository,
  keyof SubmissionRepository
>;
export type SubmissionResponse = Prisma.SubmissionGetPayload<{
  select: typeof SUBMISSION_SELECT;
}>;
import type { IUserRef } from "../../interfaces/user.ref";
import type { PaginatedResult } from "../../interfaces/response";
import type { PrismaOrTx } from "../../share/prisma/transaction";
import type {
  CreateSubmissionDto,
  UpdateSubmissionDto,
  ListSubmissionsQuery,
  MySubmissionsQuery,
} from "./submission.validation";
export interface SubmissionStatistics {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  revisionRequired: number;
}
export interface ISubmissionService {
  create(
    dto: CreateSubmissionDto,
    authUser: IUserRef,
  ): Promise<SubmissionResponse>;
  findOne(
    id: string,
    authUser: IUserRef,
    tx?: PrismaOrTx,
  ): Promise<SubmissionResponse>;
  update(
    id: string,
    dto: UpdateSubmissionDto,
    authUser: IUserRef,
  ): Promise<SubmissionResponse>;
  softDelete(
    id: string,
    authUser: IUserRef,
  ): Promise<{ id: string; isDeleted: boolean }>;
  findAll(
    query: ListSubmissionsQuery,
    authUser: IUserRef,
  ): Promise<PaginatedResult<SubmissionResponse>>;
  findMine(
    query: MySubmissionsQuery,
    authUser: IUserRef,
  ): Promise<PaginatedResult<SubmissionResponse>>;
  statistics(authUser: IUserRef): Promise<SubmissionStatistics>;
}
