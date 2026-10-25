import type { Prisma } from "@prisma/client";
import { prisma } from "../../share/prisma/prisma";
import type {
  PrismaOrTx,
  PrismaTransactionClient,
} from "../../share/prisma/transaction";
export class StudentRepository {
  create<T extends Prisma.StudentCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.StudentCreateArgs>,
    tx?: PrismaOrTx,
  ) {
    return (tx ?? prisma).student.create(args);
  }
  findMany<T extends Prisma.StudentFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.StudentFindManyArgs>,
    tx?: PrismaOrTx,
  ) {
    return (tx ?? prisma).student.findMany(args);
  }
  count<T extends Prisma.StudentCountArgs>(
    args: Prisma.Subset<T, Prisma.StudentCountArgs>,
    tx?: PrismaOrTx,
  ): ReturnType<typeof prisma.student.count<T>> {
    return (tx ?? prisma).student.count(args);
  }
  transaction<T>(
    work: (tx: PrismaTransactionClient) => Promise<T>,
    isolationLevel: Prisma.TransactionIsolationLevel = "RepeatableRead",
  ): Promise<T> {
    return prisma.$transaction(work, { isolationLevel, timeout: 30000 });
  }
}
export const studentRepository = new StudentRepository();
