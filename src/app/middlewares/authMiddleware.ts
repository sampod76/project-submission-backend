import { isValidId } from "../../global/schema/global.schema";
import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { USER_ROLE } from "../../global/enums/users";
import { type CachedAuthUser, authCache } from "../../helper/authCache";
import { accessTokenSecret, jwtHelpers } from "../../helper/jwtHelpers";
import { ApiError } from "../errors/ApiError";
import { userRepository } from "../modules/user/user.repository";

interface AuthTokenPayload {
  userId: string;
  role: USER_ROLE;
}

const UNAUTHORIZED_MESSAGE = "Unauthorized access";
const FORBIDDEN_MESSAGE = "Forbidden access";

const extractBearerToken = (
  authorizationHeader: string | undefined,
): string => {
  if (!authorizationHeader)
    throw new ApiError(httpStatus.UNAUTHORIZED, UNAUTHORIZED_MESSAGE);

  const parts = authorizationHeader.trim().split(/\s+/);
  const hasInvalidAuthorizationHeader =
    parts.length !== 2 || parts[0].toLowerCase() !== "bearer" || !parts[1];
  if (hasInvalidAuthorizationHeader)
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid authorization header");

  return parts[1];
};

const authMiddleware =
  (...requiredUserTypes: USER_ROLE[]) =>
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = extractBearerToken(req.headers.authorization);

      let payload: AuthTokenPayload;
      try {
        payload = jwtHelpers.verifyToken(
          token,
          accessTokenSecret,
        ) as AuthTokenPayload;
      } catch (error) {
        if (error instanceof Error && error.name === "TokenExpiredError")
          throw new ApiError(httpStatus.UNAUTHORIZED, "Token expired");

        throw new ApiError(httpStatus.UNAUTHORIZED, UNAUTHORIZED_MESSAGE);
      }

      const hasInvalidUserId =
        typeof payload.userId !== "string" || !isValidId(payload.userId);
      if (hasInvalidUserId)
        throw new ApiError(httpStatus.UNAUTHORIZED, "Malformed token payload");

      const isTokenRoleForbidden =
        requiredUserTypes.length > 0 &&
        !requiredUserTypes.includes(payload.role);
      if (isTokenRoleForbidden)
        throw new ApiError(httpStatus.FORBIDDEN, FORBIDDEN_MESSAGE);

      let user: CachedAuthUser | null =
        authCache.getCachedAuthUser(payload.userId) ?? null;

      if (!user) {
        const dbUser = await userRepository.findFirst({
          where: { id: payload.userId, isDeleted: false },
          select: { id: true, email: true, role: true, isActive: true },
        });

        if (dbUser) {
          user = {
            id: dbUser.id,
            email: dbUser.email,
            role: dbUser.role,
            isActive: dbUser.isActive,
          };
          authCache.setCachedAuthUser(user);
        }
      }

      if (!user)
        throw new ApiError(httpStatus.UNAUTHORIZED, "User no longer exists");

      const isUserRoleForbidden =
        requiredUserTypes.length > 0 && !requiredUserTypes.includes(user.role);
      if (isUserRoleForbidden)
        throw new ApiError(httpStatus.FORBIDDEN, FORBIDDEN_MESSAGE);

      if (user.isActive === false)
        throw new ApiError(httpStatus.FORBIDDEN, "Account is inactive");

      req.user = {
        userId: user.id,
        email: user.email,
        role: user.role,
      };

      next();
    } catch (error) {
      next(error);
    }
  };

export default authMiddleware;
