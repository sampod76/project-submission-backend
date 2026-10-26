import type { Prisma, PrismaClient } from "@prisma/client";
import type {
  PrismaOrTx,
  PrismaTransactionClient,
} from "../../share/prisma/transaction";
export class SubmissionReviewRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create<T extends Prisma.SubmissionReviewCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.SubmissionReviewCreateArgs>,
    tx?: PrismaOrTx,
  ) {
    return (tx ?? this.prisma).submissionReview.create(args);
  }
  findMany<T extends Prisma.SubmissionReviewFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.SubmissionReviewFindManyArgs>,
    tx?: PrismaOrTx,
  ) {
    return (tx ?? this.prisma).submissionReview.findMany(args);
  }
  count<T extends Prisma.SubmissionReviewCountArgs>(
    args: Prisma.Subset<T, Prisma.SubmissionReviewCountArgs>,
    tx?: PrismaOrTx,
  ): ReturnType<typeof this.prisma.submissionReview.count<T>> {
    return (tx ?? this.prisma).submissionReview.count(args);
  }
  transaction<T>(
    work: (tx: PrismaTransactionClient) => Promise<T>,
    isolationLevel: Prisma.TransactionIsolationLevel = "RepeatableRead",
  ): Promise<T> {
    return this.prisma.$transaction(work, { isolationLevel, timeout: 30000 });
  }
  async lockReviewer(userId: string, tx: PrismaOrTx) {
    return tx.$queryRaw<
      { id: string; role: string }[]
    >`SELECT id, role FROM "auth"."users" WHERE id = ${userId}::uuid AND is_active AND NOT is_deleted FOR SHARE`;
  }
}
