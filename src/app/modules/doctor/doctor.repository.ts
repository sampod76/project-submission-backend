import type { Prisma } from "@prisma/client";
import { prisma } from "../../share/prisma/prisma";
import type { RepositoryResult } from "../../share/prisma/repository-result";
import type {
  PrismaOrTx,
  PrismaTransactionClient,
} from "../../share/prisma/transaction";
import type { IDoctorRepository } from "./doctor.interface";

export class DoctorRepository implements IDoctorRepository {
  create<T extends Prisma.DoctorCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.DoctorCreateArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$DoctorPayload, T, "create">> {
    return (tx ?? prisma).doctor.create(args);
  }
  findMany<T extends Prisma.DoctorFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.DoctorFindManyArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$DoctorPayload, T, "findMany">> {
    return (tx ?? prisma).doctor.findMany(args);
  }
  findFirst<T extends Prisma.DoctorFindFirstArgs>(
    args: Prisma.SelectSubset<T, Prisma.DoctorFindFirstArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$DoctorPayload, T, "findFirst">> {
    return (tx ?? prisma).doctor.findFirst(args);
  }
  update<T extends Prisma.DoctorUpdateArgs>(
    args: Prisma.SelectSubset<T, Prisma.DoctorUpdateArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$DoctorPayload, T, "update">> {
    return (tx ?? prisma).doctor.update(args);
  }
  count<T extends Prisma.DoctorCountArgs>(
    args: Prisma.Subset<T, Prisma.DoctorCountArgs>,
    tx?: PrismaOrTx,
  ): ReturnType<typeof prisma.doctor.count<T>> {
    return (tx ?? prisma).doctor.count(args);
  }
  groupBy<T extends Prisma.DoctorGroupByArgs>(
    args: Prisma.Subset<T, Prisma.DoctorGroupByArgs>,
    tx?: PrismaOrTx,
  ): Prisma.GetDoctorGroupByPayload<T> {
    const groupBy = (tx ?? prisma).doctor.groupBy as (
      args: Prisma.Subset<T, Prisma.DoctorGroupByArgs>,
    ) => Prisma.GetDoctorGroupByPayload<T>;
    return groupBy(args);
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
export const doctorRepository = new DoctorRepository();
