import type { Prisma } from "@prisma/client";
import { prisma } from "../../share/prisma/prisma";
import type { RepositoryResult } from "../../share/prisma/repository-result";
import type {
  PrismaOrTx,
  PrismaTransactionClient,
} from "../../share/prisma/transaction";
import type { IPatientRepository } from "./patient.interface";

export class PatientRepository implements IPatientRepository {
  create<T extends Prisma.PatientCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.PatientCreateArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$PatientPayload, T, "create">> {
    return (tx ?? prisma).patient.create(args);
  }
  findMany<T extends Prisma.PatientFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.PatientFindManyArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$PatientPayload, T, "findMany">> {
    return (tx ?? prisma).patient.findMany(args);
  }
  findFirst<T extends Prisma.PatientFindFirstArgs>(
    args: Prisma.SelectSubset<T, Prisma.PatientFindFirstArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$PatientPayload, T, "findFirst">> {
    return (tx ?? prisma).patient.findFirst(args);
  }
  update<T extends Prisma.PatientUpdateArgs>(
    args: Prisma.SelectSubset<T, Prisma.PatientUpdateArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$PatientPayload, T, "update">> {
    return (tx ?? prisma).patient.update(args);
  }
  count<T extends Prisma.PatientCountArgs>(
    args: Prisma.Subset<T, Prisma.PatientCountArgs>,
    tx?: PrismaOrTx,
  ): ReturnType<typeof prisma.patient.count<T>> {
    return (tx ?? prisma).patient.count(args);
  }
  groupBy<T extends Prisma.PatientGroupByArgs>(
    args: Prisma.Subset<T, Prisma.PatientGroupByArgs>,
    tx?: PrismaOrTx,
  ): Prisma.GetPatientGroupByPayload<T> {
    const groupBy = (tx ?? prisma).patient.groupBy as (
      args: Prisma.Subset<T, Prisma.PatientGroupByArgs>,
    ) => Prisma.GetPatientGroupByPayload<T>;
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
export const patientRepository = new PatientRepository();
