import { ACTIVE_SUBMISSION_WHERE } from "./submission.constant";
import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  PrismaOrTx,
  PrismaTransactionClient,
} from "../../share/prisma/transaction";
export class SubmissionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create<T extends Prisma.SubmissionCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.SubmissionCreateArgs>,
    tx?: PrismaOrTx,
  ) {
    return (tx ?? this.prisma).submission.create(args);
  }
  findMany<T extends Prisma.SubmissionFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.SubmissionFindManyArgs>,
    tx?: PrismaOrTx,
  ) {
    return (tx ?? this.prisma).submission.findMany(args);
  }
  findFirst<T extends Prisma.SubmissionFindFirstArgs>(
    args: Prisma.SelectSubset<T, Prisma.SubmissionFindFirstArgs>,
    tx?: PrismaOrTx,
  ) {
    return (tx ?? this.prisma).submission.findFirst(args);
  }
  updateMany<T extends Prisma.SubmissionUpdateManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.SubmissionUpdateManyArgs>,
    tx?: PrismaOrTx,
  ) {
    return (tx ?? this.prisma).submission.updateMany(args);
  }
  count<T extends Prisma.SubmissionCountArgs>(
    args: Prisma.Subset<T, Prisma.SubmissionCountArgs>,
    tx?: PrismaOrTx,
  ): ReturnType<typeof this.prisma.submission.count<T>> {
    return (tx ?? this.prisma).submission.count(args);
  }
  transaction<T>(
    work: (tx: PrismaTransactionClient) => Promise<T>,
    isolationLevel: Prisma.TransactionIsolationLevel = "RepeatableRead",
  ): Promise<T> {
    return this.prisma.$transaction(work, { isolationLevel, timeout: 30000 });
  }
  groupByStatus(tx?: PrismaOrTx) {
    return (tx ?? this.prisma).submission.groupBy({
      by: ["status"],
      where: ACTIVE_SUBMISSION_WHERE,
      _count: true,
    });
  }

  studentForUser(userId: string, tx?: PrismaOrTx) {
    return (tx ?? this.prisma).student.findFirst({
      where: {
        userId,
        isDeleted: false,
        user: { isDeleted: false, isActive: true, role: "STUDENT" },
      },
      select: { id: true },
    });
  }
}
