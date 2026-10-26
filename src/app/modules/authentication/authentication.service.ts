import type { IUserService } from "../user/user.interface";
import type { IStudentRepository } from "../student/student.interface";
import { USER_PROFILE_SELECT } from "../user/user.select";
import type { RegisterDto } from "./authentication.validation";
import bcrypt from "bcryptjs";
import httpStatus from "http-status";
import type { JwtPayload } from "jsonwebtoken";
import { isValidId } from "../../../global/schema/global.schema";
import {
  accessTokenExpiresIn,
  accessTokenSecret,
  jwtHelpers,
  refreshTokenExpiresIn,
  refreshTokenSecret,
} from "../../../helper/jwtHelpers";
import { env } from "../../config/env";
import { AbstractService } from "../../core/abstract/AbstractService";
import { ApiError } from "../../errors/ApiError";
import type { IUserRef } from "../../interfaces/user.ref";
import type { ChangePasswordResponse } from "./authentication.interface";

import type {
  AuthRefreshAccount,
  AuthResult,
  AuthTokens,
  IAuthenticationRepository,
  IAuthenticationService,
} from "./authentication.interface";
import { ChangePasswordDto, LoginDto } from "./authentication.validation";
export type { AuthResult } from "./authentication.interface";

const issueJwtTokens = (payload: Record<string, unknown>): AuthTokens => ({
  accessToken: jwtHelpers.createToken(
    payload,
    accessTokenSecret,
    accessTokenExpiresIn,
  ),
  refreshToken: jwtHelpers.createToken(
    payload,
    refreshTokenSecret,
    refreshTokenExpiresIn,
  ),
  expiresIn: accessTokenExpiresIn,
});
export class AuthenticationService
  extends AbstractService
  implements IAuthenticationService
{
  constructor(
    private readonly repository: IAuthenticationRepository,
    private readonly accountService: IUserService,
    private readonly students: IStudentRepository,
  ) {
    super();
  }
  async register(dto: RegisterDto) {
    return this.students.transaction(async tx => {
      const { firstName, lastName, phone, gender, ...account } = dto;
      const user = await this.accountService.createAccount(
        { ...account, role: "STUDENT" },
        tx,
      );
      const student = await this.students.create(
        {
          data: { userId: user.id, firstName, lastName, phone, gender },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            gender: true,
          },
        },
        tx,
      );
      return { ...user, student };
    });
  }
  async session(authUser: IUserRef) {
    const user = await this.repository.findFirst({
      where: { id: authUser.userId, isDeleted: false, isActive: true },
      select: { id: true, email: true, role: true, isActive: true },
    });
    if (!user) throw new ApiError(401, "User not found");
    return user;
  }
  private authResult(user: AuthRefreshAccount): AuthResult {
    const profile =
      user.role === "ADMIN"
        ? user.admin
        : user.role === "MENTOR"
          ? user.mentor
          : user.student;
    const name = profile
      ? [profile.firstName, profile.lastName].join(" ")
      : "N/A";
    return {
      ...issueJwtTokens({ userId: user.id, role: user.role }),
      user: { id: user.id, email: user.email, role: user.role, name },
    };
  }
  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.repository.findFirst({
      where: { email: dto.email.toLowerCase(), isDeleted: false },
      include: {
        admin: { select: { firstName: true, lastName: true } },
        mentor: { select: { firstName: true, lastName: true } },
        student: { select: { firstName: true, lastName: true } },
      },
    });
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "Not found user");

    if (!user.isActive)
      throw new ApiError(httpStatus.UNAUTHORIZED, "Inactive user");

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches)
      throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid credentials");
    await this.repository.update({
      where: { id: user.id, isDeleted: false, isActive: true },
      data: { lastLoginAt: new Date() },
    });
    return this.authResult(user);
  }
  async refresh(refreshToken: string): Promise<AuthResult> {
    let decoded: JwtPayload;
    try {
      decoded = jwtHelpers.verifyToken(refreshToken, refreshTokenSecret);
    } catch {
      throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid refresh token");
    }
    const hasInvalidUserId =
      typeof decoded.userId !== "string" || !isValidId(decoded.userId);
    if (hasInvalidUserId)
      throw new ApiError(httpStatus.UNAUTHORIZED, "Malformed refresh token");
    const user = await this.repository.findFirst({
      where: { id: decoded.userId, isDeleted: false },
      include: {
        admin: { select: { firstName: true, lastName: true } },
        mentor: { select: { firstName: true, lastName: true } },
        student: { select: { firstName: true, lastName: true } },
      },
      omit: { password: true },
    });
    if (!user || !user.isActive)
      throw new ApiError(httpStatus.UNAUTHORIZED, "User not found");
    return this.authResult(user);
  }
  async profile(authUser: IUserRef) {
    const user = await this.repository.findFirst({
      where: { id: authUser.userId, isDeleted: false },
      select: USER_PROFILE_SELECT,
    });
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    return user;
  }
  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<ChangePasswordResponse> {
    const user = await this.repository.findFirst({
      where: { id: userId, isDeleted: false, isActive: true },
    });
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    const currentPasswordMatches = await bcrypt.compare(
      dto.currentPassword,
      user.password,
    );
    if (!currentPasswordMatches)
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Current password is incorrect",
      );
    const password = await bcrypt.hash(dto.newPassword, env.BCRYPT_SALT_ROUNDS);
    await this.repository.update({
      where: {
        id: user.id,
        isDeleted: false,
        isActive: true,
        password: user.password,
      },
      data: { password },
    });
    return {
      message: "Password changed.",
    };
  }
}
