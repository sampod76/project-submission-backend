import { Prisma } from "@prisma/client";
import { AbstractService } from "../../core/abstract/AbstractService";
import { ApiError } from "../../errors/ApiError";
import type { IDoctorRepository } from "../doctor/doctor.interface";
import { doctorRepository } from "../doctor/doctor.repository";
import { TREATMENT_STATUS } from "../patient/patient.constant";
import type { IPatientRepository } from "../patient/patient.interface";
import { patientRepository } from "../patient/patient.repository";
import type {
  DashboardResponse,
  IDashboardRepository,
  IDashboardService,
  MonthlyCount,
} from "./dashboard.interface";
import { dashboardRepository } from "./dashboard.repository";

const treatmentStatusLabels: Record<TREATMENT_STATUS, string> = {
  [TREATMENT_STATUS.ACTIVE]: "Active",
  [TREATMENT_STATUS.UNDER_OBSERVATION]: "Under observation",
  [TREATMENT_STATUS.RECOVERED]: "Recovered",
};
export class DashboardService
  extends AbstractService
  implements IDashboardService
{
  constructor(
    private readonly repository: IDashboardRepository = dashboardRepository,
    private readonly patients: IPatientRepository = patientRepository,
    private readonly doctors: IDoctorRepository = doctorRepository,
  ) {
    super();
  }
  async getOverview(followUpDate?: string | Date): Promise<DashboardResponse> {
    if (followUpDate !== undefined) {
      const followUpTimestamp = new Date(followUpDate).getTime();
      const isValidFollowUpDate = Number.isFinite(followUpTimestamp);
      if (!isValidFollowUpDate)
        throw new ApiError(400, `Invalid followUpDate: ${followUpDate}`);
    }
    const now = new Date();
    const months = Array.from(
      { length: 6 },
      (_, index) =>
        new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1),
        ),
    );
    const end = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    );
    const start = months[0];
    const followUpWhere: Prisma.PatientWhereInput = {
      isDeleted: false,
      followUpDate: { not: null },
    };
    if (followUpDate !== undefined) {
      const nextDay = new Date(followUpDate);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      followUpWhere.followUpDate = { gte: new Date(followUpDate), lt: nextDay };
    }
    const rows = await this.repository.transaction(async tx => {
      const [
        totalFollowUps,
        activeDoctors,
        recentDoctors,
        treatmentStatus,
        newPatients,
        followUps,
      ] = await Promise.all([
        this.patients.count({ where: followUpWhere }, tx),
        this.doctors.count({ where: { isDeleted: false, isActive: true } }, tx),
        this.doctors.findMany(
          {
            where: { isDeleted: false },
            select: {
              id: true,
              name: true,
              medicalRegistrationNo: true,
              _count: { select: { patients: { where: { isDeleted: false } } } },
            },
            orderBy: [{ createdAt: "desc" }, { id: "asc" }],
            take: 5,
          },
          tx,
        ),
        this.patients.groupBy(
          {
            by: ["treatmentStatus"],
            where: { isDeleted: false },
            _count: true,
          },
          tx,
        ),
        this.repository.queryRaw<MonthlyCount[]>(
          Prisma.sql`SELECT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM') AS month, count(*)::int AS count FROM patients WHERE NOT is_deleted AND created_at >= ${start} AND created_at < ${end} GROUP BY 1`,
          tx,
        ),
        this.repository.queryRaw<MonthlyCount[]>(
          Prisma.sql`SELECT to_char(follow_up_date AT TIME ZONE 'UTC', 'YYYY-MM') AS month, count(*)::int AS count FROM patients WHERE NOT is_deleted AND follow_up_date >= ${start} AND follow_up_date < ${end} GROUP BY 1`,
          tx,
        ),
      ]);
      return {
        totalFollowUps,
        activeDoctors,
        recentDoctors,
        treatmentStatus,
        newPatients,
        followUps,
      };
    });
    const newPatients = new Map(
      rows.newPatients.map(row => [row.month, row.count]),
    );
    const followUps = new Map(
      rows.followUps.map(row => [row.month, row.count]),
    );
    const statuses = new Map(
      rows.treatmentStatus.map(row => [row.treatmentStatus, row._count]),
    );
    return {
      totalFollowUps: rows.totalFollowUps,
      activeDoctors: rows.activeDoctors,
      patientsOverview: months.map(date => ({
        month: date.toLocaleString("en-US", {
          month: "short",
          timeZone: "UTC",
        }),
        newPatients: newPatients.get(date.toISOString().slice(0, 7)) ?? 0,
        followUps: followUps.get(date.toISOString().slice(0, 7)) ?? 0,
      })),
      patientsPerDoctor: rows.recentDoctors.map(doctor => ({
        doctorId: doctor.id,
        name: doctor.name,
        medicalRegistrationNo: doctor.medicalRegistrationNo,
        patientsCount: doctor._count.patients,
      })),
      treatmentStatus: Object.values(TREATMENT_STATUS).map(status => ({
        name: treatmentStatusLabels[status],
        value: statuses.get(status) ?? 0,
      })),
    };
  }
}
