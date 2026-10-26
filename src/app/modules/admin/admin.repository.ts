import type { Prisma, PrismaClient } from "@prisma/client";
import type { RepositoryResult } from "../../share/prisma/repository-result";
import type {
  PrismaOrTx,
  PrismaTransactionClient,
} from "../../share/prisma/transaction";
import type { IAdminRepository } from "./admin.interface";

export class AdminRepository implements IAdminRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create<T extends Prisma.AdminCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.AdminCreateArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$AdminPayload, T, "create">> {
    return (tx ?? this.prisma).admin.create(args);
  }
  findMany<T extends Prisma.AdminFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.AdminFindManyArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$AdminPayload, T, "findMany">> {
    return (tx ?? this.prisma).admin.findMany(args);
  }
  findFirst<T extends Prisma.AdminFindFirstArgs>(
    args: Prisma.SelectSubset<T, Prisma.AdminFindFirstArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$AdminPayload, T, "findFirst">> {
    return (tx ?? this.prisma).admin.findFirst(args);
  }
  update<T extends Prisma.AdminUpdateArgs>(
    args: Prisma.SelectSubset<T, Prisma.AdminUpdateArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$AdminPayload, T, "update">> {
    return (tx ?? this.prisma).admin.update(args);
  }
  count<T extends Prisma.AdminCountArgs>(
    args: Prisma.Subset<T, Prisma.AdminCountArgs>,
    tx?: PrismaOrTx,
  ): ReturnType<typeof this.prisma.admin.count<T>> {
    return (tx ?? this.prisma).admin.count(args);
  }
  transaction<T>(
    work: (tx: PrismaTransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(work, {
      isolationLevel: "RepeatableRead",
      timeout: 30000,
    });
  }
}
