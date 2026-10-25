import type { Prisma } from "@prisma/client";

export const PROFILE_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  phone: true,
  bio: true,
  createdAt: true,
  updatedAt: true,
} as const;
export const USER_PROFILE_SELECT = {
  id: true,
  email: true,
  role: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  admin: { where: { isDeleted: false }, select: PROFILE_SELECT },
  mentor: {
    where: { isDeleted: false },
    select: { ...PROFILE_SELECT, gender: true },
  },
  student: {
    where: { isDeleted: false },
    select: { ...PROFILE_SELECT, gender: true },
  },
} as const satisfies Prisma.UserSelect;
