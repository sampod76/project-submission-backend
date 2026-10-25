import type { prisma } from "../../share/prisma/prisma";
import type { Doctor, Specialization } from "@prisma/client";
import type { PaginatedResult } from "../../interfaces/response";
import type { IUserRef } from "../../interfaces/user.ref";
import type { DoctorService } from "./doctor.service";

import type { Prisma } from "@prisma/client";
import type { RepositoryResult } from "../../share/prisma/repository-result";
import type {
  PrismaOrTx,
  PrismaTransactionClient,
} from "../../share/prisma/transaction";
import type {
  CreateDoctorDto,
  ListDoctorsQuery,
  UpdateDoctorDto,
} from "./doctor.validation";

export type DoctorResponse = Doctor;
export type DoctorDetailResponse = Awaited<
  ReturnType<DoctorService["findOne"]>
>;
export type DoctorListResponse = Awaited<
  ReturnType<DoctorService["findAll"]>
>["data"][number];
export interface DoctorStatistics {
  total: number;
  active: number;
  inactive: number;
  bySpecialization: { specialization: Specialization; count: number }[];
}
export interface IDoctorService {
  create(payload: CreateDoctorDto, authUser: IUserRef): Promise<DoctorResponse>;
  findOne(id: string): Promise<DoctorDetailResponse>;
  findAll(
    query: ListDoctorsQuery,
    authUser: IUserRef,
  ): Promise<PaginatedResult<DoctorListResponse>>;
  update(
    id: string,
    payload: UpdateDoctorDto,
    authUser: IUserRef,
  ): Promise<DoctorResponse>;
  softDelete(id: string, authUser: IUserRef): Promise<DoctorResponse>;
  statistics(): Promise<DoctorStatistics>;
}

export interface IDoctorRepository {
  create<T extends Prisma.DoctorCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.DoctorCreateArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$DoctorPayload, T, "create">>;
  findMany<T extends Prisma.DoctorFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.DoctorFindManyArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$DoctorPayload, T, "findMany">>;
  findFirst<T extends Prisma.DoctorFindFirstArgs>(
    args: Prisma.SelectSubset<T, Prisma.DoctorFindFirstArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$DoctorPayload, T, "findFirst">>;
  update<T extends Prisma.DoctorUpdateArgs>(
    args: Prisma.SelectSubset<T, Prisma.DoctorUpdateArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$DoctorPayload, T, "update">>;
  count<T extends Prisma.DoctorCountArgs>(
    args: Prisma.Subset<T, Prisma.DoctorCountArgs>,
    tx?: PrismaOrTx,
  ): ReturnType<typeof prisma.doctor.count<T>>;
  groupBy<T extends Prisma.DoctorGroupByArgs>(
    args: Prisma.Subset<T, Prisma.DoctorGroupByArgs>,
    tx?: PrismaOrTx,
  ): Prisma.GetDoctorGroupByPayload<T>;
  transaction<T>(work: (tx: PrismaTransactionClient) => Promise<T>): Promise<T>;
}
