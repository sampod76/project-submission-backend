import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  PrismaOrTx,
  PrismaTransactionClient,
} from "../../share/prisma/transaction";
export class StudentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create<T extends Prisma.StudentCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.StudentCreateArgs>,
    tx?: PrismaOrTx,
  ) {
    return (tx ?? this.prisma).student.create(args);
  }
  findMany<T extends Prisma.StudentFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.StudentFindManyArgs>,
    tx?: PrismaOrTx,
  ) {
    return (tx ?? this.prisma).student.findMany(args);
  }
  count<T extends Prisma.StudentCountArgs>(
    args: Prisma.Subset<T, Prisma.StudentCountArgs>,
    tx?: PrismaOrTx,
  ): ReturnType<typeof this.prisma.student.count<T>> {
    return (tx ?? this.prisma).student.count(args);
  }
  transaction<T>(
    work: (tx: PrismaTransactionClient) => Promise<T>,
    isolationLevel: Prisma.TransactionIsolationLevel = "RepeatableRead",
  ): Promise<T> {
    return this.prisma.$transaction(work, { isolationLevel, timeout: 30000 });
  }
}
