import type { Prisma } from "@prisma/client";
import type {
  PrismaOrTx,
  PrismaTransactionClient,
} from "../../share/prisma/transaction";

export interface MonthlyCount {
  month: string;
  count: number;
}
export interface DashboardResponse {
  totalFollowUps: number;
  activeDoctors: number;
  patientsOverview: { month: string; newPatients: number; followUps: number }[];
  patientsPerDoctor: {
    doctorId: string;
    name: string;
    medicalRegistrationNo: string;
    patientsCount: number;
  }[];
  treatmentStatus: { name: string; value: number }[];
}
export interface IDashboardRepository {
  queryRaw<T>(query: Prisma.Sql, tx?: PrismaOrTx): Promise<T>;
  transaction<T>(work: (tx: PrismaTransactionClient) => Promise<T>): Promise<T>;
}
export interface IDashboardService {
  getOverview(followUpDate?: string | Date): Promise<DashboardResponse>;
}
