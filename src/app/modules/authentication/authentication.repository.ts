import type { Prisma } from "@prisma/client";
import { prisma } from "../../share/prisma/prisma";
import type { RepositoryResult } from "../../share/prisma/repository-result";
import type { PrismaOrTx } from "../../share/prisma/transaction";
import type { IAuthenticationRepository } from "./authentication.interface";

export class AuthenticationRepository implements IAuthenticationRepository {
  findFirst<T extends Prisma.UserFindFirstArgs>(
    args: Prisma.SelectSubset<T, Prisma.UserFindFirstArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$UserPayload, T, "findFirst">> {
    return (tx ?? prisma).user.findFirst(args);
  }
  update<T extends Prisma.UserUpdateArgs>(
    args: Prisma.SelectSubset<T, Prisma.UserUpdateArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$UserPayload, T, "update">> {
    return (tx ?? prisma).user.update(args);
  }
}
export const authenticationRepository = new AuthenticationRepository();
