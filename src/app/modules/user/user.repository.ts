import type { Prisma } from "@prisma/client";
import { prisma } from "../../share/prisma/prisma";
import type { RepositoryResult } from "../../share/prisma/repository-result";
import type {
  PrismaOrTx,
  PrismaTransactionClient,
} from "../../share/prisma/transaction";
import type { IUserRepository } from "./user.interface";

export class UserRepository implements IUserRepository {
  create<T extends Prisma.UserCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.UserCreateArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$UserPayload, T, "create">> {
    return (tx ?? prisma).user.create(args);
  }
  findMany<T extends Prisma.UserFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.UserFindManyArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$UserPayload, T, "findMany">> {
    return (tx ?? prisma).user.findMany(args);
  }
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
  count<T extends Prisma.UserCountArgs>(
    args: Prisma.Subset<T, Prisma.UserCountArgs>,
    tx?: PrismaOrTx,
  ): ReturnType<typeof prisma.user.count<T>> {
    return (tx ?? prisma).user.count(args);
  }
  transaction<T>(
    work: (tx: PrismaTransactionClient) => Promise<T>,
  ): Promise<T> {
    return prisma.$transaction(work, {
      isolationLevel: "RepeatableRead",
      timeout: 30000,
    });
  }
}
export const userRepository = new UserRepository();
