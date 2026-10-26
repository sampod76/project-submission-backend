import type { Prisma, User } from "@prisma/client";
import type { IUserRef } from "../../interfaces/user.ref";
import type { RepositoryResult } from "../../share/prisma/repository-result";
import type { PrismaOrTx } from "../../share/prisma/transaction";
import type { AuthenticationService } from "./authentication.service";

import type {
  ChangePasswordDto,
  LoginDto,
  RegisterDto,
} from "./authentication.validation";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
export type AuthResult = AuthTokens & {
  user: Pick<User, "id" | "email" | "role"> & { name: string };
};
export type AuthAccount = Prisma.UserGetPayload<{
  include: {
    admin: { select: { firstName: true; lastName: true } };
    mentor: { select: { firstName: true; lastName: true } };
    student: { select: { firstName: true; lastName: true } };
  };
}>;
export type AuthRefreshAccount = Omit<AuthAccount, "password">;
export type AuthProfile = Awaited<ReturnType<AuthenticationService["profile"]>>;
export type ChangePasswordResponse = { message: string };
export interface IAuthenticationRepository {
  findFirst<T extends Prisma.UserFindFirstArgs>(
    args: Prisma.SelectSubset<T, Prisma.UserFindFirstArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$UserPayload, T, "findFirst">>;
  update<T extends Prisma.UserUpdateArgs>(
    args: Prisma.SelectSubset<T, Prisma.UserUpdateArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$UserPayload, T, "update">>;
}
export interface IAuthenticationService {
  register(
    dto: RegisterDto,
  ): Promise<Awaited<ReturnType<AuthenticationService["register"]>>>;
  session(
    authUser: IUserRef,
  ): Promise<Pick<User, "id" | "email" | "role" | "isActive">>;
  login(dto: LoginDto): Promise<AuthResult>;
  refresh(refreshToken: string): Promise<AuthResult>;
  profile(authUser: IUserRef): Promise<AuthProfile>;
  changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<ChangePasswordResponse>;
}
