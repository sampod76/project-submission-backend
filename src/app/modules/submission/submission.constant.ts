import type { Prisma } from "@prisma/client";
export const ACTIVE_SUBMISSION_WHERE = {
  isDeleted: false,
  student: { isDeleted: false, user: { isDeleted: false } },
} as const satisfies Prisma.SubmissionWhereInput;
export const SUBMISSION_SELECT = {
  id: true,
  studentId: true,
  projectName: true,
  repoUrl: true,
  repoFullName: true,
  liveUrl: true,
  description: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  student: {
    select: {
      id: true,
      userId: true,
      firstName: true,
      lastName: true,
      user: { select: { id: true, email: true } },
    },
  },
} as const satisfies Prisma.SubmissionSelect;
export const SUBMISSION_SORTABLE_FIELDS = [
  "id",
  "createdAt",
  "updatedAt",
  "projectName",
  "status",
] as const;
