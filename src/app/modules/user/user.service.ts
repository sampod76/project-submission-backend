import {
  authorizeAccount,
  requireAdmin,
  requireManagement,
} from "../../share/authorization";
import { USER_PROFILE_SELECT } from "./user.select";
import type { UpdateProfileDto } from "./user.validation";
import type { IAuditLogService } from "../audit-log/audit-log.interface";
import { orderBy } from "../../share/prisma/query-options";
import { UserQueryBuilder } from "./builders/UserQueryBuilder";
import type { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import { USER_ROLE } from "../../../global/enums/users";
import { isValidId } from "../../../global/schema/global.schema";
import type { authCache } from "../../../helper/authCache";
import { env } from "../../config/env";
import { AbstractService } from "../../core/abstract/AbstractService";
import { ApiError } from "../../errors/ApiError";
import type { IPaginationOptions } from "../../interfaces/pagination";
import type { IUserRef } from "../../interfaces/user.ref";
import type { UserResponse } from "./user.interface";

import type { PrismaOrTx } from "../../share/prisma/transaction";
import type { IUserRepository, IUserService } from "./user.interface";
import {
  CreateAccountDto,
  createAccountZodSchema,
  ListUsersQuery,
  UpdateUserDto,
  updateUserZodSchema,
  profileBodySchema,
} from "./user.validation";

export class UserService extends AbstractService implements IUserService {
  constructor(
    private readonly repository: IUserRepository,
    private readonly audits: IAuditLogService,
    private readonly cache: typeof authCache,
  ) {
    super();
  }

  async createAccount(
    payload: CreateAccountDto,
    tx?: PrismaOrTx,
    authUser?: IUserRef,
  ): Promise<UserResponse> {
    // Shared account creation also has direct callers without HTTP middleware.
    const account = createAccountZodSchema.parse(payload);
    if (account.role !== USER_ROLE.STUDENT) {
      requireAdmin(authUser);
    }
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
  async findOne(id: string, authUser: IUserRef): Promise<UserResponse> {
    requireManagement(authUser);
    this.validateId(id);
    const user = await this.repository.findFirst({
      where: { id, isDeleted: false },
      omit: { password: true },
    });
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    authorizeAccount(authUser, user.role);
    return user;
  }
  private validateId(id: string): void {
    // findOne and restore are also used by direct service callers.
    const hasValidId = isValidId(id);
    if (!hasValidId)
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid user id");
  }
  async findAll(
    filters: ListUsersQuery,
    authUser: IUserRef,
    paginationOptions: IPaginationOptions = filters,
  ) {
    requireManagement(authUser);
    const pagination = this.calculatePagination(paginationOptions);
    const requestedWhere = new UserQueryBuilder()
      .addSearch(filters.search ?? filters.searchTerm)
      .addFilters(filters)
      .addDateRange(filters.fromDate, filters.toDate)
      .build();
    const where: Prisma.UserWhereInput = {
      AND: [
        requestedWhere,
        ...(authUser.role === USER_ROLE.MENTOR
          ? [{ role: USER_ROLE.STUDENT }]
          : []),
      ],
    };
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
  async findByEmail(
    email: string,
    authUser: IUserRef,
  ): Promise<UserResponse | null> {
    requireManagement(authUser);
    const user = await this.repository.findFirst({
      where: { email: email.trim().toLowerCase() },
      omit: { password: true },
    });
    if (user) authorizeAccount(authUser, user.role);
    return user;
  }
  async update(
    id: string,
    payload: UpdateUserDto,
    authUser: IUserRef,
  ): Promise<UserResponse> {
    const target = await this.findOne(id, authUser);
    if (payload.role !== undefined) requireAdmin(authUser);
    // Direct service callers also supply update payloads without middleware.
    payload = updateUserZodSchema.shape.body.parse(payload);
    if (
      id.toLowerCase() === authUser.userId.toLowerCase() &&
      payload.isActive === false
    )
      throw new ApiError(409, "You cannot deactivate your own account");
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
      where: { id, role: target.role, isDeleted: false },
      data,
      omit: { password: true },
    });
    this.cache.invalidateAuthUserCache(updated.id);
    return updated;
  }
  async softDelete(id: string, authUser: IUserRef): Promise<UserResponse> {
    const target = await this.findOne(id, authUser);
    const user = await this.repository.update({
      where: { id, role: target.role, isDeleted: false },
      data: { isDeleted: true, deletedAt: new Date() },
      omit: { password: true },
    });
    this.cache.invalidateAuthUserCache(user.id);
    return user;
  }
  async restore(id: string, authUser: IUserRef): Promise<UserResponse> {
    requireManagement(authUser);
    this.validateId(id);
    const existingUser = await this.repository.findFirst({ where: { id } });

    if (!existingUser)
      throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    authorizeAccount(authUser, existingUser.role);
    const user = await this.repository.update({
      where: { id, role: existingUser.role },
      data: { isDeleted: false, deletedAt: null },
      omit: { password: true },
    });
    this.cache.invalidateAuthUserCache(user.id);
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
    // Preserve strict field validation for direct profile updates.
    payload = profileBodySchema.parse(payload);
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
    requireManagement(authUser);
    const user = await this.repository.transaction(async tx => {
      const existing = await this.repository.findFirst(
        {
          where: { id, isDeleted: false },
          select: { id: true, role: true, isActive: true },
        },
        tx,
      );
      if (!existing) throw new ApiError(404, "User not found");
      authorizeAccount(authUser, existing.role);
      if (id.toLowerCase() === authUser.userId.toLowerCase() && !isActive)
        throw new ApiError(409, "You cannot deactivate your own account");
      const result = await this.repository.update(
        {
          where: { id, role: existing.role, isDeleted: false },
          data: { isActive },
          omit: { password: true },
        },
        tx,
      );
      await this.audits.record(
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
    this.cache.invalidateAuthUserCache(id);
    return user;
  }
  async findByRole(
    role: USER_ROLE,
    authUser: IUserRef,
  ): Promise<UserResponse[]> {
    authorizeAccount(authUser, role);
    return this.repository.findMany({
      where: { role, isDeleted: false },
      omit: { password: true },
    });
  }
}
