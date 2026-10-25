import type { Prisma } from "@prisma/client";
import { UTCDateFormatter } from "../../../../utils/UTCDateFormatter";
import { escapeLike } from "../../../share/prisma/query-options";
import { PATIENT_SEARCHABLE_FIELDS } from "../patient.constant";
import type { ListPatientsQuery } from "../patient.validation";

export class PatientQueryBuilder {
  private where: Prisma.PatientWhereInput = { isDeleted: false };

  addSearch(search?: string): this {
    if (!search) return this;
    this.where.OR = PATIENT_SEARCHABLE_FIELDS.map(field => ({
      [field]: { contains: escapeLike(search), mode: "insensitive" },
    }));
    return this;
  }

  addFilters(filter: ListPatientsQuery): this {
    if (filter.doctorId) this.where.doctorId = filter.doctorId;
    if (filter.gender) this.where.gender = filter.gender;
    if (filter.treatmentStatus)
      this.where.treatmentStatus = filter.treatmentStatus;
    if (filter.followUpDate) this.where.followUpDate = filter.followUpDate;
    if (filter.lastVisitAt) this.where.lastVisitAt = filter.lastVisitAt;
    return this;
  }

  addDateRange(fromDate?: Date, toDate?: Date): this {
    if (!fromDate && !toDate) return this;
    this.where.createdAt = {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate
        ? { lte: new UTCDateFormatter({ date: toDate }).endOfDayUtc() }
        : {}),
    };
    return this;
  }

  build(): Prisma.PatientWhereInput {
    return this.where;
  }
}
