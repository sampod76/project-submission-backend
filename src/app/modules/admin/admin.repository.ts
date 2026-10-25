import type { Prisma } from "@prisma/client";
import { prisma } from "../../share/prisma/prisma";
import type { RepositoryResult } from "../../share/prisma/repository-result";
import type {
  PrismaOrTx,
  PrismaTransactionClient,
} from "../../share/prisma/transaction";
import type { IAdminRepository } from "./admin.interface";

export class AdminRepository implements IAdminRepository {
  create<T extends Prisma.AdminCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.AdminCreateArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$AdminPayload, T, "create">> {
    return (tx ?? prisma).admin.create(args);
  }
  findMany<T extends Prisma.AdminFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.AdminFindManyArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$AdminPayload, T, "findMany">> {
    return (tx ?? prisma).admin.findMany(args);
  }
  findFirst<T extends Prisma.AdminFindFirstArgs>(
    args: Prisma.SelectSubset<T, Prisma.AdminFindFirstArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$AdminPayload, T, "findFirst">> {
    return (tx ?? prisma).admin.findFirst(args);
  }
  update<T extends Prisma.AdminUpdateArgs>(
    args: Prisma.SelectSubset<T, Prisma.AdminUpdateArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$AdminPayload, T, "update">> {
    return (tx ?? prisma).admin.update(args);
  }
  count<T extends Prisma.AdminCountArgs>(
    args: Prisma.Subset<T, Prisma.AdminCountArgs>,
    tx?: PrismaOrTx,
  ): ReturnType<typeof prisma.admin.count<T>> {
    return (tx ?? prisma).admin.count(args);
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
export const adminRepository = new AdminRepository();
