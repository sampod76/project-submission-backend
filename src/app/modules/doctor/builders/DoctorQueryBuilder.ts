import type { Prisma } from "@prisma/client";
import { UTCDateFormatter } from "../../../../utils/UTCDateFormatter";
import { escapeLike } from "../../../share/prisma/query-options";
import { DOCTOR_SEARCHABLE_FIELDS } from "../doctor.constant";
import type { ListDoctorsQuery } from "../doctor.validation";

export class DoctorQueryBuilder {
  private where: Prisma.DoctorWhereInput = { isDeleted: false };

  addSearch(search?: string): this {
    if (!search) return this;
    this.where.OR = DOCTOR_SEARCHABLE_FIELDS.map(field => ({
      [field]: { contains: escapeLike(search), mode: "insensitive" },
    }));
    return this;
  }

  addFilters(filter: ListDoctorsQuery): this {
    if (filter.specialization)
      this.where.specialization = filter.specialization;
    if (filter.hospital !== undefined) this.where.hospital = filter.hospital;
    if (filter.medicalRegistrationNo)
      this.where.medicalRegistrationNo = filter.medicalRegistrationNo;
    if (filter.isActive !== undefined) this.where.isActive = filter.isActive;
    if (filter.userId) this.where.userId = filter.userId;
    if (filter.createdBy) this.where.createdBy = filter.createdBy;
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

  build(): Prisma.DoctorWhereInput {
    return this.where;
  }
}
