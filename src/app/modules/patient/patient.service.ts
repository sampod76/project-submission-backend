import { orderBy } from "../../share/prisma/query-options";
import { PatientQueryBuilder } from "./builders/PatientQueryBuilder";
import httpStatus from "http-status";
import type { Prisma } from "@prisma/client";
import { USER_ROLE } from "../../../global/enums/users";
import { isValidId } from "../../../global/schema/global.schema";
import { AbstractService } from "../../core/abstract/AbstractService";
import { ApiError } from "../../errors/ApiError";
import type { IUserRef } from "../../interfaces/user.ref";
import type {
  PatientResponse,
  PatientStatistics,
  PatientOwnershipScope,
} from "./patient.interface";

import type { IDoctorRepository } from "../doctor/doctor.interface";
import { doctorRepository } from "../doctor/doctor.repository";
import type { IPatientRepository, IPatientService } from "./patient.interface";
import { patientRepository } from "./patient.repository";
import {
  CreatePatientDto,
  ListPatientsQuery,
  UpdatePatientDto,
} from "./patient.validation";

export class PatientService extends AbstractService implements IPatientService {
  constructor(
    private readonly repository: IPatientRepository = patientRepository,
    private readonly doctors: IDoctorRepository = doctorRepository,
  ) {
    super();
  }
  private validateId(id: string): void {
    const hasValidId = isValidId(id);
    if (!hasValidId) throw new ApiError(httpStatus.BAD_REQUEST, "Invalid id");
  }
  private async resolveOwnership(
    authUser: IUserRef,
  ): Promise<PatientOwnershipScope> {
    if (!authUser)
      throw new ApiError(httpStatus.UNAUTHORIZED, "Unauthorized access");
    if (authUser.role === USER_ROLE.ADMIN) return {};
    if (authUser.role !== USER_ROLE.DOCTOR)
      throw new ApiError(httpStatus.FORBIDDEN, "Forbidden access");
    const where: Prisma.DoctorWhereInput = {
      userId: authUser.userId,
      isDeleted: false,
      isActive: true,
      user: { isDeleted: false, isActive: true, role: USER_ROLE.DOCTOR },
    };
    const doctor = await this.doctors.findFirst({
      where,
      select: { id: true },
    });
    if (!doctor)
      throw new ApiError(
        httpStatus.FORBIDDEN,
        "Active doctor profile required",
      );
    return { doctorId: doctor.id, doctor: where };
  }
  private async validateDoctor(doctorId: string): Promise<void> {
    this.validateId(doctorId);
    const doctor = await this.doctors.findFirst({
      where: { id: doctorId, isDeleted: false, isActive: true },
      select: { id: true },
    });

    if (!doctor) throw new ApiError(httpStatus.NOT_FOUND, "Doctor not found");
  }
  async create(
    payload: CreatePatientDto,
    authUser: IUserRef,
  ): Promise<PatientResponse> {
    const scope = await this.resolveOwnership(authUser);
    const { doctorId: requestedDoctorId, ...data } = payload;
    const doctorId = scope.doctorId ?? requestedDoctorId;
    if (!doctorId)
      throw new ApiError(httpStatus.BAD_REQUEST, "doctorId is required");
    if (!scope.doctorId) await this.validateDoctor(doctorId);
    return this.repository.create({
      data: {
        ...data,
        doctor: {
          connect: {
            id: doctorId,
            isDeleted: false,
            isActive: true,
            ...(scope.doctor ? { AND: scope.doctor } : {}),
          },
        },
      },
    });
  }
  async findOne(id: string, authUser: IUserRef) {
    this.validateId(id);
    const scope = await this.resolveOwnership(authUser);
    const patient = await this.repository.findFirst({
      where: { id, isDeleted: false, ...scope },
      include: {
        doctor: {
          select: {
            id: true,
            userId: true,
            createdBy: true,
            name: true,
            medicalRegistrationNo: true,
            email: true,
            specialization: true,
            hospital: true,
            isActive: true,
          },
        },
      },
    });
    if (!patient) throw new ApiError(httpStatus.NOT_FOUND, "Patient not found");
    return patient;
  }
  async findAll(query: ListPatientsQuery, authUser: IUserRef) {
    if (query.doctorId) this.validateId(query.doctorId);
    const scope = await this.resolveOwnership(authUser);
    const pagination = this.calculatePagination(query);
    const filters = new PatientQueryBuilder()
      .addSearch(query.search ?? query.searchTerm)
      .addFilters(query)
      .addDateRange(query.fromDate, query.toDate)
      .build();
    const where: Prisma.PatientWhereInput = { AND: [filters, scope] };
    const { data, total } = await this.repository.transaction(async tx => {
      const [data, total] = await Promise.all([
        this.repository.findMany(
          {
            where,
            skip: pagination.skip,
            take: pagination.limit,
            orderBy: orderBy(pagination),
            select: {
              id: true,
              name: true,
              phone: true,
              doctorId: true,
              age: true,
              gender: true,
              treatmentStatus: true,
              lastVisitAt: true,
              followUpDate: true,
              createdAt: true,
              doctor: {
                select: {
                  name: true,
                  medicalRegistrationNo: true,
                  email: true,
                  specialization: true,
                },
              },
            },
          },
          tx,
        ),
        this.repository.count({ where }, tx),
      ]);
      return { data, total };
    });
    return {
      data,
      meta: { page: pagination.page, limit: pagination.limit, total },
    };
  }
  async update(
    id: string,
    payload: UpdatePatientDto,
    authUser: IUserRef,
  ): Promise<PatientResponse> {
    this.validateId(id);
    const scope = await this.resolveOwnership(authUser);
    if (scope.doctorId && payload.doctorId !== undefined)
      throw new ApiError(
        httpStatus.FORBIDDEN,
        "Patient ownership cannot be changed",
      );
    if (payload.doctorId) await this.validateDoctor(payload.doctorId);
    const patient = await this.repository.findFirst({
      where: { id, isDeleted: false, doctorId: scope.doctorId },
      select: { id: true },
    });

    if (!patient) throw new ApiError(httpStatus.NOT_FOUND, "Patient not found");
    return this.repository.update({
      where: { id, isDeleted: false, doctorId: scope.doctorId },
      data: payload,
    });
  }
  async softDelete(id: string, authUser: IUserRef): Promise<PatientResponse> {
    this.validateId(id);
    const scope = await this.resolveOwnership(authUser);
    const patient = await this.repository.findFirst({
      where: { id, isDeleted: false, doctorId: scope.doctorId },
      select: { id: true },
    });

    if (!patient) throw new ApiError(httpStatus.NOT_FOUND, "Patient not found");
    return this.repository.update({
      where: { id, isDeleted: false, doctorId: scope.doctorId },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }
  async statistics(
    doctorId: string | undefined,
    authUser: IUserRef,
  ): Promise<PatientStatistics> {
    if (doctorId) this.validateId(doctorId);
    const scope = await this.resolveOwnership(authUser);
    const now = new Date();
    const where: Prisma.PatientWhereInput = {
      isDeleted: false,
      ...(doctorId ? { doctorId } : {}),
      AND: scope,
    };
    return this.repository.transaction(async tx => {
      const [statuses, genders, upcomingFollowUps] = await Promise.all([
        this.repository.groupBy(
          { by: ["treatmentStatus"], where, _count: true },
          tx,
        ),
        this.repository.groupBy({ by: ["gender"], where, _count: true }, tx),
        this.repository.count(
          { where: { ...where, followUpDate: { gte: now } } },
          tx,
        ),
      ]);
      const count = (status: string) =>
        statuses.find(row => row.treatmentStatus === status)?._count ?? 0;
      return {
        total: statuses.reduce((sum, row) => sum + row._count, 0),
        active: count("ACTIVE"),
        recovered: count("RECOVERED"),
        underObservation: count("UNDER_OBSERVATION"),
        upcomingFollowUps,
        byGender: genders,
        byTreatmentStatus: statuses,
      };
    });
  }
}
