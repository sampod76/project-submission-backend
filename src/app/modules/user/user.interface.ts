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
  UpdateProfileDto,
} from "./user.validation";

export type UserResponse = Omit<User, "password">;
export type UserListResponse = Awaited<
  ReturnType<UserService["findAll"]>
>["data"][number];
export type UserProfileResponse = Prisma.UserGetPayload<{
  select: typeof import("./user.select").USER_PROFILE_SELECT;
}>;
export interface IUserService {
  ownProfile(authUser: IUserRef): Promise<UserProfileResponse>;
  updateProfile(
    authUser: IUserRef,
    payload: UpdateProfileDto,
  ): Promise<UserProfileResponse>;
  updateStatus(
    id: string,
    isActive: boolean,
    authUser: IUserRef,
  ): Promise<UserResponse>;
  createAccount(
    payload: CreateAccountDto,
    tx?: PrismaOrTx,
    authUser?: IUserRef,
  ): Promise<UserResponse>;
  findOne(id: string, authUser: IUserRef): Promise<UserResponse>;
  findAll(
    filters: ListUsersQuery,
    authUser: IUserRef,
    pagination?: IPaginationOptions,
  ): Promise<PaginatedResult<UserListResponse>>;
  findByEmail(email: string, authUser: IUserRef): Promise<UserResponse | null>;
  update(
    id: string,
    payload: UpdateUserDto,
    authUser: IUserRef,
  ): Promise<UserResponse>;
  softDelete(id: string, authUser: IUserRef): Promise<UserResponse>;
  restore(id: string, authUser: IUserRef): Promise<UserResponse>;
  findByRole(role: USER_ROLE, authUser: IUserRef): Promise<UserResponse[]>;
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
