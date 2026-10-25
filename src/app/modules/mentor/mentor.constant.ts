import type { Prisma } from "@prisma/client";
export const MENTOR_SELECT = {
  id: true,
  userId: true,
  firstName: true,
  lastName: true,
  phone: true,
  bio: true,
  gender: true,
  createdAt: true,
  updatedAt: true,
  user: { select: { id: true, email: true, role: true, isActive: true } },
  createdByAdminId: true,
} as const satisfies Prisma.MentorSelect;
