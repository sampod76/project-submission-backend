import type { prisma } from "../../share/prisma/prisma";
import type { Gender, Patient, TreatmentStatus } from "@prisma/client";
import type { PaginatedResult } from "../../interfaces/response";
import type { IUserRef } from "../../interfaces/user.ref";
import type { PatientService } from "./patient.service";

import type { Prisma } from "@prisma/client";
import type { RepositoryResult } from "../../share/prisma/repository-result";
import type {
  PrismaOrTx,
  PrismaTransactionClient,
} from "../../share/prisma/transaction";
import type {
  CreatePatientDto,
  ListPatientsQuery,
  UpdatePatientDto,
} from "./patient.validation";

export type PatientResponse = Patient;
export type PatientDetailResponse = Awaited<
  ReturnType<PatientService["findOne"]>
>;
export type PatientListResponse = Awaited<
  ReturnType<PatientService["findAll"]>
>["data"][number];
export type PatientOwnershipScope = {
  doctorId?: string;
  doctor?: Prisma.DoctorWhereInput;
};
export interface PatientStatistics {
  total: number;
  active: number;
  underObservation: number;
  recovered: number;
  upcomingFollowUps: number;
  byGender: { gender: Gender; _count: number }[];
  byTreatmentStatus: { treatmentStatus: TreatmentStatus; _count: number }[];
}
export interface IPatientService {
  create(
    payload: CreatePatientDto,
    authUser: IUserRef,
  ): Promise<PatientResponse>;
  findOne(id: string, authUser: IUserRef): Promise<PatientDetailResponse>;
  findAll(
    query: ListPatientsQuery,
    authUser: IUserRef,
  ): Promise<PaginatedResult<PatientListResponse>>;
  update(
    id: string,
    payload: UpdatePatientDto,
    authUser: IUserRef,
  ): Promise<PatientResponse>;
  softDelete(id: string, authUser: IUserRef): Promise<PatientResponse>;
  statistics(
    doctorId: string | undefined,
    authUser: IUserRef,
  ): Promise<PatientStatistics>;
}

export interface IPatientRepository {
  create<T extends Prisma.PatientCreateArgs>(
    args: Prisma.SelectSubset<T, Prisma.PatientCreateArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$PatientPayload, T, "create">>;
  findMany<T extends Prisma.PatientFindManyArgs>(
    args: Prisma.SelectSubset<T, Prisma.PatientFindManyArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$PatientPayload, T, "findMany">>;
  findFirst<T extends Prisma.PatientFindFirstArgs>(
    args: Prisma.SelectSubset<T, Prisma.PatientFindFirstArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$PatientPayload, T, "findFirst">>;
  update<T extends Prisma.PatientUpdateArgs>(
    args: Prisma.SelectSubset<T, Prisma.PatientUpdateArgs>,
    tx?: PrismaOrTx,
  ): Promise<RepositoryResult<Prisma.$PatientPayload, T, "update">>;
  count<T extends Prisma.PatientCountArgs>(
    args: Prisma.Subset<T, Prisma.PatientCountArgs>,
    tx?: PrismaOrTx,
  ): ReturnType<typeof prisma.patient.count<T>>;
  groupBy<T extends Prisma.PatientGroupByArgs>(
    args: Prisma.Subset<T, Prisma.PatientGroupByArgs>,
    tx?: PrismaOrTx,
  ): Prisma.GetPatientGroupByPayload<T>;
  transaction<T>(work: (tx: PrismaTransactionClient) => Promise<T>): Promise<T>;
}
