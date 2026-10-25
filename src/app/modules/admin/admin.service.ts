import { orderBy } from "../../share/prisma/query-options";
import { AdminQueryBuilder } from "./builders/AdminQueryBuilder";
import httpStatus from "http-status";
import { USER_ROLE } from "../../../global/enums/users";
import { isValidId } from "../../../global/schema/global.schema";
import { AbstractService } from "../../core/abstract/AbstractService";
import { ApiError } from "../../errors/ApiError";
import type { IUserRef } from "../../interfaces/user.ref";
import type { AdminResponse } from "./admin.interface";

import type { IUserService } from "../user/user.interface";
import type { IAdminRepository, IAdminService } from "./admin.interface";
import { adminRepository } from "./admin.repository";
import {
  CreateAdminDto,
  ListAdminsQuery,
  UpdateAdminDto,
} from "./admin.validation";

export class AdminService extends AbstractService implements IAdminService {
  constructor(
    private readonly userService: IUserService,
    private readonly repository: IAdminRepository = adminRepository,
  ) {
    super();
  }
  private validateId(id: string): void {
    const hasValidId = isValidId(id);
    if (!hasValidId)
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid admin id");
  }
  async create(
    payload: CreateAdminDto,
    _authUser: IUserRef,
  ): Promise<AdminResponse> {
    return this.repository.transaction(async tx => {
      const user = await this.userService.createAccount(
        {
          email: payload.email,
          password: payload.password,
          role: USER_ROLE.ADMIN,
        },
        tx,
      );
      return this.repository.create(
        {
          data: {
            userId: user.id,
            name: payload.name,
            phone: payload.phone,
          },
        },
        tx,
      );
    });
  }
  async findOne(id: string, _authUser: IUserRef) {
    this.validateId(id);
    const result = await this.repository.findFirst({
      where: { id, isDeleted: false },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            isDeleted: true,
          },
        },
      },
    });
    if (!result) throw new ApiError(httpStatus.NOT_FOUND, "Admin not found");
    return result;
  }
  async findAll(query: ListAdminsQuery, _authUser: IUserRef) {
    const pagination = this.calculatePagination(query);
    const where = new AdminQueryBuilder()
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
              name: true,
              phone: true,
              isDeleted: true,
              deletedAt: true,
              createdAt: true,
              updatedAt: true,
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
    payload: UpdateAdminDto,
    _authUser: IUserRef,
  ): Promise<AdminResponse> {
    this.validateId(id);
    const admin = await this.repository.findFirst({
      where: { id, isDeleted: false },
      select: { id: true },
    });

    if (!admin) throw new ApiError(httpStatus.NOT_FOUND, "Admin not found");
    return this.repository.update({
      where: { id, isDeleted: false },
      data: payload,
    });
  }
  async softDelete(id: string, authUser: IUserRef): Promise<AdminResponse> {
    this.validateId(id);
    const admin = await this.repository.findFirst({
      where: { id, isDeleted: false },
      select: { id: true },
    });

    if (!admin) throw new ApiError(httpStatus.NOT_FOUND, "Admin not found");
    return this.repository.update({
      where: { id, isDeleted: false },
      data: { isDeleted: true, deletedAt: new Date() },
    });
  }
}
