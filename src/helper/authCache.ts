import NodeCache from "node-cache";
import type { USER_ROLE } from "../global/enums/users";

export interface CachedAuthUser {
  id: string;
  email: string;
  role: USER_ROLE;
  isActive: boolean;
}

const authUserCache = new NodeCache({
  stdTTL: 300,
  checkperiod: 60,
  useClones: false,
});

const buildAuthCacheKey = (userId: string): string =>
  `auth:user:${userId.toLowerCase()}`;

const getCachedAuthUser = (userId: string): CachedAuthUser | undefined => {
  return authUserCache.get<CachedAuthUser>(buildAuthCacheKey(userId));
};

const setCachedAuthUser = (user: CachedAuthUser): void => {
  authUserCache.set(buildAuthCacheKey(user.id), user);
};

const invalidateAuthUserCache = (userId: string): void => {
  authUserCache.del(buildAuthCacheKey(userId));
};

export const authCache = {
  getCachedAuthUser,
  setCachedAuthUser,
  invalidateAuthUserCache,
};
