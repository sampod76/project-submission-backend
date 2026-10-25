import type { Specialization } from "@prisma/client";
import { orderBy } from "../../share/prisma/query-options";
import { DoctorQueryBuilder } from "./builders/DoctorQueryBuilder";
import httpStatus from "http-status";
import { USER_ROLE } from "../../../global/enums/users";
import { isValidId } from "../../../global/schema/global.schema";
import { AbstractService } from "../../core/abstract/AbstractService";
import { ApiError } from "../../errors/ApiError";
import type { IUserRef } from "../../interfaces/user.ref";
import type { DoctorResponse, DoctorStatistics } from "./doctor.interface";

import type { IUserService } from "../user/user.interface";
import type { IDoctorRepository, IDoctorService } from "./doctor.interface";
import { doctorRepository } from "./doctor.repository";
import {
  CreateDoctorDto,
  ListDoctorsQuery,
  UpdateDoctorDto,
} from "./doctor.validation";

export class DoctorService extends AbstractService implements IDoctorService {
  constructor(
    private readonly userService: IUserService,
    private readonly repository: IDoctorRepository = doctorRepository,
  ) {
    super();
  }
  async statistics(): Promise<DoctorStatistics> {
    return this.repository.transaction(async tx => {
      const rows = await this.repository.groupBy(
        {
          by: ["specialization", "isActive"],
          where: { isDeleted: false },
          _count: true,
        },
        tx,
      );
      const specializations = new Map<Specialization, number>();
      let total = 0,
        active = 0;
      for (const row of rows) {
        total += row._count;
        if (row.isActive) active += row._count;
        specializations.set(
          row.specialization,
          (specializations.get(row.specialization) ?? 0) + row._count,
        );
      }
      return {
        total,
        active,
        inactive: total - active,
        bySpecialization: [...specializations]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([specialization, count]) => ({ specialization, count })),
      };
    });
  }
  private validateId(id: string): void {
    const hasValidId = isValidId(id);
    if (!hasValidId)
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid doctor id");
  }
  private async validateRegistrationNumber(
    medicalRegistrationNo: string,
    excludeId?: string,
  ): Promise<void> {
    const existingDoctor = await this.repository.findFirst({
      where: {
        medicalRegistrationNo: medicalRegistrationNo.trim(),
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true },
    });

    if (existingDoctor)
      throw new ApiError(
        httpStatus.CONFLICT,
        "Medical registration number already exists",
      );
  }
  async create(
    payload: CreateDoctorDto,
    authUser: IUserRef,
  ): Promise<DoctorResponse> {
    await this.validateRegistrationNumber(payload.medicalRegistrationNo);
    return this.repository.transaction(async tx => {
      const user = await this.userService.createAccount(
        {
          email: payload.email,
          password: payload.password,
          role: USER_ROLE.DOCTOR,
        },
        tx,
      );
      const doctor = await this.repository.create(
        {
          data: {
            userId: user.id,
            createdBy: authUser.userId,
            name: payload.name,
            medicalRegistrationNo: payload.medicalRegistrationNo,
            email: user.email,
            specialization: payload.specialization,
            hospital: payload.hospital,
            phone: payload.phone,
            isActive: payload.isActive,
          },
        },
        tx,
      );
      return doctor;
    });
  }
  async findOne(id: string) {
    this.validateId(id);
    const result = await this.repository.findFirst({
      where: { id, isDeleted: false },
      include: {
        user: {
          select: { id: true, email: true, role: true, isActive: true },
        },
        creator: {
          select: { id: true, email: true, role: true, isActive: true },
        },
      },
    });
    if (!result) throw new ApiError(httpStatus.NOT_FOUND, "Doctor not found");
    return result;
  }
  async findAll(query: ListDoctorsQuery, _authUser: IUserRef) {
    const pagination = this.calculatePagination(query);
    const where = new DoctorQueryBuilder()
      .addSearch(query.search ?? query.searchTerm)
      .addFilters(query)
      .addDateRange(query.fromDate, query.toDate)
      .build();
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
              userId: true,
              createdBy: true,
              name: true,
              medicalRegistrationNo: true,
              email: true,
              specialization: true,
              hospital: true,
              phone: true,
              isActive: true,
              isDeleted: true,
              deletedAt: true,
              createdAt: true,
              updatedAt: true,
              _count: { select: { patients: { where: { isDeleted: false } } } },
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
    payload: UpdateDoctorDto,
    _authUser: IUserRef,
  ): Promise<DoctorResponse> {
    this.validateId(id);
    if (payload.medicalRegistrationNo !== undefined)
      await this.validateRegistrationNumber(payload.medicalRegistrationNo, id);
    const existingDoctor = await this.repository.findFirst({
      where: { id, isDeleted: false },
      select: { id: true },
    });

    if (!existingDoctor)
      throw new ApiError(httpStatus.NOT_FOUND, "Doctor not found");
    const doctor = await this.repository.update({
      where: { id, isDeleted: false },
      data: payload,
    });
    return doctor;
  }
  async softDelete(id: string, _authUser: IUserRef): Promise<DoctorResponse> {
    this.validateId(id);
    const existingDoctor = await this.repository.findFirst({
      where: { id, isDeleted: false },
      select: { id: true },
    });

    if (!existingDoctor)
      throw new ApiError(httpStatus.NOT_FOUND, "Doctor not found");
    const doctor = await this.repository.update({
      where: { id, isDeleted: false },
      data: { isDeleted: true, deletedAt: new Date() },
    });
    return doctor;
  }
}
