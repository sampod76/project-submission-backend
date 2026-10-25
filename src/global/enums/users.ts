import { UserRole as USER_ROLE, Gender as ENUM_GENDER } from "@prisma/client";
export { USER_ROLE, ENUM_GENDER };

export const USER_TYPE_ARRAY = Object.values(USER_ROLE);
export type I_USER_TYPE = keyof typeof USER_ROLE;

export const GENDER_ARRAY = Object.values(ENUM_GENDER);
export type I_GENDER = keyof typeof ENUM_GENDER;
