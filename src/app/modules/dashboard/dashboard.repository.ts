import type { Prisma } from "@prisma/client";
import { prisma } from "../../share/prisma/prisma";
import type {
  PrismaOrTx,
  PrismaTransactionClient,
} from "../../share/prisma/transaction";
import type { IDashboardRepository } from "./dashboard.interface";

export class DashboardRepository implements IDashboardRepository {
  queryRaw<T>(query: Prisma.Sql, tx?: PrismaOrTx): Promise<T> {
    return (tx ?? prisma).$queryRaw<T>(query);
  }
  transaction<T>(
    work: (tx: PrismaTransactionClient) => Promise<T>,
  ): Promise<T> {
    return prisma.$transaction(work, { isolationLevel: "RepeatableRead" });
  }
}
export const dashboardRepository = new DashboardRepository();
