import type { prisma } from "../../share/prisma/prisma";
import type { Admin } from "@prisma/client";
import type { PaginatedResult } from "../../interfaces/response";
import type { IUserRef } from "../../interfaces/user.ref";
import type { AdminService } from "./admin.service";

import type { Prisma } from "@prisma/client";
import type { RepositoryResult } from "../../share/prisma/repository-result";
import type {
  PrismaOrTx,
  PrismaTransactionClient,
} from "../../share/prisma/transaction";
import type {
  CreateAdminDto,
  ListAdminsQuery,
  UpdateAdminDto,
} from "./admin.validation";

export type AdminResponse = Admin;
export type AdminDetailResponse = Awaited<ReturnType<AdminService["findOne"]>>;
export type AdminListResponse = Awaited<
  ReturnType<AdminService["findAll"]>
>["data"][number];
export interface IAdminService {
  create(payload: CreateAdminDto, authUser: IUserRef): Promise<AdminResponse>;
  findOne(id: string, authUser: IUserRef): Promise<AdminDetailResponse>;
  findAll(
    query: ListAdminsQuery,
    authUser: IUserRef,
  ): Promise<PaginatedResult<AdminListResponse>>;
  update(
    id: string,
    payload: UpdateAdminDto,
    authUser: IUserRef,
  ): Promise<AdminResponse>;
  softDelete(id: string, authUser: IUserRef): Promise<AdminResponse>;
}

export interface IAdminRepository {
  create<T extends Prisma.AdminCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.AdminCreateArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$AdminPayload, T, "create">>;
  findMany<T extends Prisma.AdminFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.AdminFindManyArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$AdminPayload, T, "findMany">>;
  findFirst<T extends Prisma.AdminFindFirstArgs>(
    args: Prisma.SelectSubset<T, Prisma.AdminFindFirstArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$AdminPayload, T, "findFirst">>;
  update<T extends Prisma.AdminUpdateArgs>(
    args: Prisma.SelectSubset<T, Prisma.AdminUpdateArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$AdminPayload, T, "update">>;
  count<T extends Prisma.AdminCountArgs>(
    args: Prisma.Subset<T, Prisma.AdminCountArgs>,
    tx?: PrismaOrTx,
  ): ReturnType<typeof prisma.admin.count<T>>;
  transaction<T>(work: (tx: PrismaTransactionClient) => Promise<T>): Promise<T>;
}
