import type { UserService } from "./user.service";
import type { prisma } from "../../share/prisma/prisma";
import type { USER_ROLE } from "../../../global/enums/users";
import type { IPaginationOptions } from "../../interfaces/pagination";
import type { PaginatedResult } from "../../interfaces/response";
import type { IUserRef } from "../../interfaces/user.ref";

import type { Prisma, User } from "@prisma/client";
import type { RepositoryResult } from "../../share/prisma/repository-result";
import type {
  PrismaOrTx,
  PrismaTransactionClient,
} from "../../share/prisma/transaction";
import type {
  CreateAccountDto,
  ListUsersQuery,
  UpdateUserDto,
} from "./user.validation";

export type UserResponse = Omit<User, "password">;
export type UserListResponse = Awaited<
  ReturnType<UserService["findAll"]>
>["data"][number];
export interface IUserService {
  createAccount(
    payload: CreateAccountDto,
    tx?: PrismaOrTx,
  ): Promise<UserResponse>;
  findOne(id: string): Promise<UserResponse>;
  findAll(
    filters: ListUsersQuery,
    pagination?: IPaginationOptions,
    authUser?: IUserRef,
  ): Promise<PaginatedResult<UserListResponse>>;
  findByEmail(email: string): Promise<UserResponse | null>;
  update(id: string, payload: UpdateUserDto): Promise<UserResponse>;
  softDelete(id: string): Promise<UserResponse>;
  restore(id: string): Promise<UserResponse>;
  findByRole(role: USER_ROLE): Promise<UserResponse[]>;
}

export interface IUserRepository {
  create<T extends Prisma.UserCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.UserCreateArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$UserPayload, T, "create">>;
  findMany<T extends Prisma.UserFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.UserFindManyArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$UserPayload, T, "findMany">>;
  findFirst<T extends Prisma.UserFindFirstArgs>(
    args: Prisma.SelectSubset<T, Prisma.UserFindFirstArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$UserPayload, T, "findFirst">>;
  update<T extends Prisma.UserUpdateArgs>(
    args: Prisma.SelectSubset<T, Prisma.UserUpdateArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$UserPayload, T, "update">>;
  count<T extends Prisma.UserCountArgs>(
    args: Prisma.Subset<T, Prisma.UserCountArgs>,
    tx?: PrismaOrTx,
  ): ReturnType<typeof prisma.user.count<T>>;
  transaction<T>(work: (tx: PrismaTransactionClient) => Promise<T>): Promise<T>;
}
