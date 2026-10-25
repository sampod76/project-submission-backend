import { USER_PROFILE_SELECT } from "./user.select";
import type { UpdateProfileDto } from "./user.validation";
import { auditLogService } from "../audit-log/audit-log.service";
import { orderBy } from "../../share/prisma/query-options";
import { UserQueryBuilder } from "./builders/UserQueryBuilder";
import type { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import { USER_ROLE } from "../../../global/enums/users";
import { isValidId } from "../../../global/schema/global.schema";
import { authCache } from "../../../helper/authCache";
import { env } from "../../config/env";
import { AbstractService } from "../../core/abstract/AbstractService";
import { ApiError } from "../../errors/ApiError";
import type { IPaginationOptions } from "../../interfaces/pagination";
import type { IUserRef } from "../../interfaces/user.ref";
import type { UserResponse } from "./user.interface";

import type { PrismaOrTx } from "../../share/prisma/transaction";
import type { IUserRepository, IUserService } from "./user.interface";
import { userRepository } from "./user.repository";
import {
  CreateAccountDto,
  createAccountZodSchema,
  ListUsersQuery,
  UpdateUserDto,
} from "./user.validation";

export class UserService extends AbstractService implements IUserService {
  constructor(private readonly repository: IUserRepository = userRepository) {
    super();
  }

  async createAccount(
    payload: CreateAccountDto,
    tx?: PrismaOrTx,
  ): Promise<UserResponse> {
    const account = createAccountZodSchema.parse(payload);
    const email = account.email.trim().toLowerCase();
    const existingUser = await this.repository.findFirst(
      { where: { email } },
      tx,
    );

    if (existingUser)
      throw new ApiError(httpStatus.CONFLICT, "Email already in use");

    const password = await bcrypt.hash(
      account.password,
      env.BCRYPT_SALT_ROUNDS,
    );
    return this.repository.create(
      { data: { ...account, email, password }, omit: { password: true } },
      tx,
    );
  }
  async findOne(id: string): Promise<UserResponse> {
    this.validateId(id);
    const user = await this.repository.findFirst({
      where: { id, isDeleted: false },
      omit: { password: true },
    });
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    return user;
  }
  private validateId(id: string): void {
    const hasValidId = isValidId(id);
    if (!hasValidId)
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid user id");
  }
  async findAll(
    filters: ListUsersQuery,
    paginationOptions: IPaginationOptions = filters,
    _authUser?: IUserRef,
  ) {
    const pagination = this.calculatePagination(paginationOptions);
    const where = new UserQueryBuilder()
      .addSearch(filters.search ?? filters.searchTerm)
      .addFilters(filters)
      .addDateRange(filters.fromDate, filters.toDate)
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
              email: true,
              role: true,
              isActive: true,
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
  async findByEmail(email: string): Promise<UserResponse | null> {
    return this.repository.findFirst({
      where: { email: email.trim().toLowerCase() },
      omit: { password: true },
    });
  }
  async update(id: string, payload: UpdateUserDto): Promise<UserResponse> {
    await this.findOne(id);
    const data: Prisma.UserUpdateInput = {
      ...(payload.email !== undefined ? { email: payload.email } : {}),
      ...(payload.role !== undefined ? { role: payload.role } : {}),
      ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
      ...(payload.password !== undefined
        ? {
            password: await bcrypt.hash(
              payload.password,
              env.BCRYPT_SALT_ROUNDS,
            ),
          }
        : {}),
    };
    const updated = await this.repository.update({
      where: { id },
      data,
      omit: { password: true },
    });
    authCache.invalidateAuthUserCache(updated.id);
    return updated;
  }
  async softDelete(id: string): Promise<UserResponse> {
    await this.findOne(id);
    const user = await this.repository.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
      omit: { password: true },
    });
    authCache.invalidateAuthUserCache(user.id);
    return user;
  }
  async restore(id: string): Promise<UserResponse> {
    this.validateId(id);
    const existingUser = await this.repository.findFirst({ where: { id } });

    if (!existingUser)
      throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    const user = await this.repository.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null },
      omit: { password: true },
    });
    authCache.invalidateAuthUserCache(user.id);
    return user;
  }
  async ownProfile(authUser: IUserRef) {
    const user = await this.repository.findFirst({
      where: {
        id: authUser.userId,
        role: authUser.role,
        isDeleted: false,
        isActive: true,
      },
      select: USER_PROFILE_SELECT,
    });
    if (!user) throw new ApiError(404, "User not found");
    return user;
  }
  async updateProfile(authUser: IUserRef, payload: UpdateProfileDto) {
    const profile =
      authUser.role === "ADMIN"
        ? "admin"
        : authUser.role === "MENTOR"
          ? "mentor"
          : "student";
    return this.repository.update({
      where: {
        id: authUser.userId,
        role: authUser.role,
        isDeleted: false,
        isActive: true,
      },
      data: {
        [profile]: { update: { where: { isDeleted: false }, data: payload } },
      },
      select: USER_PROFILE_SELECT,
    });
  }
  async updateStatus(
    id: string,
    isActive: boolean,
    authUser: IUserRef,
  ): Promise<UserResponse> {
    this.validateId(id);
    if (authUser.role !== USER_ROLE.ADMIN)
      throw new ApiError(403, "Forbidden access");
    if (id.toLowerCase() === authUser.userId.toLowerCase() && !isActive)
      throw new ApiError(409, "You cannot deactivate your own account");
    const user = await this.repository.transaction(async tx => {
      const existing = await this.repository.findFirst(
        {
          where: { id, isDeleted: false },
          select: { id: true, isActive: true },
        },
        tx,
      );
      if (!existing) throw new ApiError(404, "User not found");
      const result = await this.repository.update(
        {
          where: { id, isDeleted: false },
          data: { isActive },
          omit: { password: true },
        },
        tx,
      );
      await auditLogService.record(
        {
          actorUserId: authUser.userId,
          action: "USER_STATUS_CHANGED",
          entityType: "User",
          entityId: id,
          oldData: { isActive: existing.isActive },
          newData: { isActive },
        },
        tx,
      );
      return result;
    });
    authCache.invalidateAuthUserCache(id);
    return user;
  }
  async findByRole(role: USER_ROLE): Promise<UserResponse[]> {
    return this.repository.findMany({
      where: { role, isDeleted: false },
      omit: { password: true },
    });
  }
}
