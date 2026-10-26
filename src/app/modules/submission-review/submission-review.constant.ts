import type { Prisma } from "@prisma/client";
export const REVIEW_SELECT = {
  id: true,
  submissionId: true,
  reviewerUserId: true,
  previousStatus: true,
  status: true,
  feedback: true,
  createdAt: true,
  updatedAt: true,
  reviewer: {
    select: {
      id: true,
      email: true,
      role: true,
      admin: {
        where: { isDeleted: false },
        select: { firstName: true, lastName: true },
      },
      mentor: {
        where: { isDeleted: false },
        select: { firstName: true, lastName: true },
      },
    },
  },
} as const satisfies Prisma.SubmissionReviewSelect;
