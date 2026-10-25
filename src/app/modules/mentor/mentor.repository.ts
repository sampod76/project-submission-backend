import type { Prisma } from "@prisma/client";
import { prisma } from "../../share/prisma/prisma";
import type {
  PrismaOrTx,
  PrismaTransactionClient,
} from "../../share/prisma/transaction";
export class MentorRepository {
  create<T extends Prisma.MentorCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.MentorCreateArgs>,
    tx?: PrismaOrTx,
  ) {
    return (tx ?? prisma).mentor.create(args);
  }
  findMany<T extends Prisma.MentorFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.MentorFindManyArgs>,
    tx?: PrismaOrTx,
  ) {
    return (tx ?? prisma).mentor.findMany(args);
  }
  count<T extends Prisma.MentorCountArgs>(
    args: Prisma.Subset<T, Prisma.MentorCountArgs>,
    tx?: PrismaOrTx,
  ): ReturnType<typeof prisma.mentor.count<T>> {
    return (tx ?? prisma).mentor.count(args);
  }
  transaction<T>(
    work: (tx: PrismaTransactionClient) => Promise<T>,
    isolationLevel: Prisma.TransactionIsolationLevel = "RepeatableRead",
  ): Promise<T> {
    return prisma.$transaction(work, { isolationLevel, timeout: 30000 });
  }
}
export const mentorRepository = new MentorRepository();
