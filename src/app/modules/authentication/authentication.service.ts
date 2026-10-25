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
import { authenticationRepository } from "./authentication.repository";
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
    private readonly repository: IAuthenticationRepository = authenticationRepository,
  ) {
    super();
  }
  private authResult(user: AuthRefreshAccount): AuthResult {
    const name =
      (user.role === "ADMIN" ? user.admin?.name : user.doctor?.name) ?? "N/A";
    return {
      ...issueJwtTokens({ userId: user.id, role: user.role }),
      user: { id: user.id, email: user.email, role: user.role, name },
    };
  }
  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.repository.findFirst({
      where: { email: dto.email.trim().toLowerCase(), isDeleted: false },
      include: {
        admin: { select: { name: true } },
        doctor: { select: { name: true } },
      },
    });
    if (!user || !user.isActive)
      throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid credentials");

    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches)
      throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid credentials");
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
        admin: { select: { name: true } },
        doctor: { select: { name: true } },
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
      include: { admin: true, doctor: true },
      omit: { password: true },
    });
    if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");
    return user;
  }
  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<ChangePasswordResponse> {
    const user = await this.repository.findFirst({ where: { id: userId } });
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
      where: { id: user.id },
      data: { password },
    });
    return { message: "Password changed. Please log in again." };
  }
}
