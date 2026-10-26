import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  PrismaOrTx,
  PrismaTransactionClient,
} from "../../share/prisma/transaction";
export class MentorRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create<T extends Prisma.MentorCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.MentorCreateArgs>,
    tx?: PrismaOrTx,
  ) {
    return (tx ?? this.prisma).mentor.create(args);
  }
  findMany<T extends Prisma.MentorFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.MentorFindManyArgs>,
    tx?: PrismaOrTx,
  ) {
    return (tx ?? this.prisma).mentor.findMany(args);
  }
  count<T extends Prisma.MentorCountArgs>(
    args: Prisma.Subset<T, Prisma.MentorCountArgs>,
    tx?: PrismaOrTx,
  ): ReturnType<typeof this.prisma.mentor.count<T>> {
    return (tx ?? this.prisma).mentor.count(args);
  }
  transaction<T>(
    work: (tx: PrismaTransactionClient) => Promise<T>,
    isolationLevel: Prisma.TransactionIsolationLevel = "RepeatableRead",
  ): Promise<T> {
    return this.prisma.$transaction(work, { isolationLevel, timeout: 30000 });
  }
}
