import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  PrismaOrTx,
  PrismaTransactionClient,
} from "../../share/prisma/transaction";
export class AuditLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create<T extends Prisma.AuditLogCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.AuditLogCreateArgs>,
    tx?: PrismaOrTx,
  ) {
    return (tx ?? this.prisma).auditLog.create(args);
  }
  findMany<T extends Prisma.AuditLogFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.AuditLogFindManyArgs>,
    tx?: PrismaOrTx,
  ) {
    return (tx ?? this.prisma).auditLog.findMany(args);
  }
  findFirst<T extends Prisma.AuditLogFindFirstArgs>(
    args: Prisma.SelectSubset<T, Prisma.AuditLogFindFirstArgs>,
    tx?: PrismaOrTx,
  ) {
    return (tx ?? this.prisma).auditLog.findFirst(args);
  }
  count<T extends Prisma.AuditLogCountArgs>(
    args: Prisma.Subset<T, Prisma.AuditLogCountArgs>,
    tx?: PrismaOrTx,
  ): ReturnType<typeof this.prisma.auditLog.count<T>> {
    return (tx ?? this.prisma).auditLog.count(args);
  }
  transaction<T>(
    work: (tx: PrismaTransactionClient) => Promise<T>,
    isolationLevel: Prisma.TransactionIsolationLevel = "RepeatableRead",
  ): Promise<T> {
    return this.prisma.$transaction(work, { isolationLevel, timeout: 30000 });
  }
}
