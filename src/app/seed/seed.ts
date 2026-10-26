import { USER_ROLE } from "../../global/enums/users";
import { passwordSchema } from "../../global/schema/global.schema";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { env } from "../config/env";
import { prisma } from "../share/prisma/prisma";

const seedPasswordSchema = passwordSchema.refine(
  value => value.length >= 8,
  "Seed password must contain at least 8 characters",
);

const credentialsSchema = z
  .object({
    SEED_ADMIN_EMAIL: z.string().trim().email().max(255).toLowerCase(),
    SEED_ADMIN_PASSWORD: seedPasswordSchema,
    SEED_ADMIN_FIRST_NAME: z.string().trim().min(1).max(100).default("Project"),
    SEED_ADMIN_LAST_NAME: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .default("Administrator"),
    SEED_MENTOR_EMAIL: z.string().trim().email().max(255).toLowerCase(),
    SEED_MENTOR_PASSWORD: seedPasswordSchema,
    SEED_MENTOR_FIRST_NAME: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .default("Default"),
    SEED_MENTOR_LAST_NAME: z.string().trim().min(1).max(100).default("Mentor"),
  })
  .refine(
    credentials =>
      credentials.SEED_ADMIN_EMAIL !== credentials.SEED_MENTOR_EMAIL,
    {
      message: "Admin and Mentor seed emails must differ",
      path: ["SEED_MENTOR_EMAIL"],
    },
  );

export async function seedAdmin() {
  const credentials = credentialsSchema.parse(process.env);
  const [adminPassword, mentorPassword] = await Promise.all([
    bcrypt.hash(credentials.SEED_ADMIN_PASSWORD, env.BCRYPT_SALT_ROUNDS),
    bcrypt.hash(credentials.SEED_MENTOR_PASSWORD, env.BCRYPT_SALT_ROUNDS),
  ]);
  return prisma.$transaction(async tx => {
    const adminUser = await tx.user.upsert({
      where: { email: credentials.SEED_ADMIN_EMAIL },
      update: {},
      create: {
        email: credentials.SEED_ADMIN_EMAIL,
        password: adminPassword,
        role: USER_ROLE.ADMIN,
      },
    });
    if (
      adminUser.role !== USER_ROLE.ADMIN ||
      adminUser.isDeleted ||
      adminUser.deletedAt !== null ||
      !adminUser.isActive
    ) {
      throw new Error(
        "Seed Admin email belongs to an incompatible, inactive, or deleted account",
      );
    }
    const admin = await tx.admin.upsert({
      where: { userId: adminUser.id },
      update: {},
      create: {
        userId: adminUser.id,
        firstName: credentials.SEED_ADMIN_FIRST_NAME,
        lastName: credentials.SEED_ADMIN_LAST_NAME,
      },
    });
    if (admin.isDeleted || admin.deletedAt !== null)
      throw new Error("Seed administrator profile is deleted");

    const mentorUser = await tx.user.upsert({
      where: { email: credentials.SEED_MENTOR_EMAIL },
      update: {},
      create: {
        email: credentials.SEED_MENTOR_EMAIL,
        password: mentorPassword,
        role: USER_ROLE.MENTOR,
      },
    });
    if (
      mentorUser.role !== USER_ROLE.MENTOR ||
      mentorUser.isDeleted ||
      mentorUser.deletedAt !== null ||
      !mentorUser.isActive
    ) {
      throw new Error(
        "Seed Mentor email belongs to an incompatible, inactive, or deleted account",
      );
    }
    const mentor = await tx.mentor.upsert({
      where: { userId: mentorUser.id },
      update: {},
      create: {
        userId: mentorUser.id,
        firstName: credentials.SEED_MENTOR_FIRST_NAME,
        lastName: credentials.SEED_MENTOR_LAST_NAME,
        gender: "unspecified",
        createdByAdminId: admin.id,
      },
    });
    if (mentor.isDeleted || mentor.deletedAt !== null)
      throw new Error("Seed mentor profile is deleted");

    return admin;
  });
}

if (require.main === module) {
  seedAdmin()
    .then(() => console.log("Administrator and Mentor seed completed"))
    .catch(error => {
      console.error(
        error instanceof z.ZodError
          ? error.issues
              .map(issue => issue.path.join(".") + ": " + issue.message)
              .join("; ")
          : error.message,
      );
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
