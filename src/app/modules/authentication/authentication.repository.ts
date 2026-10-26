import type { Prisma, PrismaClient } from "@prisma/client";
import type { RepositoryResult } from "../../share/prisma/repository-result";
import type { PrismaOrTx } from "../../share/prisma/transaction";
import type { IAuthenticationRepository } from "./authentication.interface";

export class AuthenticationRepository implements IAuthenticationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findFirst<T extends Prisma.UserFindFirstArgs>(
    args: Prisma.SelectSubset<T, Prisma.UserFindFirstArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$UserPayload, T, "findFirst">> {
    return (tx ?? this.prisma).user.findFirst(args);
  }
  update<T extends Prisma.UserUpdateArgs>(
    args: Prisma.SelectSubset<T, Prisma.UserUpdateArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$UserPayload, T, "update">> {
    return (tx ?? this.prisma).user.update(args);
  }
}
