import {
  Role as USER_ROLE,
  SubmissionStatus as SUBMISSION_STATUS,
} from "@prisma/client";
export { USER_ROLE, SUBMISSION_STATUS };
export const USER_TYPE_ARRAY = Object.values(USER_ROLE);
export type I_USER_TYPE = keyof typeof USER_ROLE;
