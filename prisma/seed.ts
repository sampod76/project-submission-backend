import { Role, SubmissionStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { env } from "../src/app/config/env";
import { prisma } from "../src/app/share/prisma/prisma";
import { passwordSchema } from "../src/global/schema/global.schema";

class SeedError extends Error {}

// Prisma messages/metadata may include connection URLs or query values.
export function formatSeedError(error: unknown): string {
  const sensitiveKey = /password|secret|token|key|database_url|smtp_pass/i;
  const secrets = Object.entries(process.env)
    .filter(([key, value]) => sensitiveKey.test(key) && value)
    .map(([, value]) => value!);
  try {
    const url = new URL(process.env.DATABASE_URL ?? "");
    for (const value of [url.username, url.password]) {
      if (value) secrets.push(value, decodeURIComponent(value));
    }
  } catch {
    /* An invalid URL must not hide the original error. */
  }
  try {
    const data = JSON.parse(
      readFileSync(join(__dirname, "seed-data.json"), "utf8"),
    );
    for (const user of data.users ?? []) {
      if (typeof user.password === "string" && user.password)
        secrets.push(user.password);
    }
  } catch {
    /* The seed file itself may be the source of the error. */
  }
  const detail = error as {
    name?: string;
    code?: string;
    message?: string;
    meta?: unknown;
    stack?: string;
  } | null;
  let output = JSON.stringify(
    {
      name: detail?.name,
      code: detail?.code,
      message:
        error instanceof SyntaxError
          ? "Invalid seed-data.json JSON"
          : detail?.message ?? "Unknown seed error",
      meta: detail?.meta,
      stack: error instanceof SyntaxError ? undefined : detail?.stack,
    },
    (key, value) => (sensitiveKey.test(key) ? "[REDACTED]" : value),
    2,
  );
  for (const secret of [...new Set(secrets)].sort(
    (a, b) => b.length - a.length,
  )) {
    output = output
      .split(JSON.stringify(secret).slice(1, -1))
      .join("[REDACTED]");
  }
  return output
    .replace(/postgres(?:ql)?:\/\/[^\s"'\\]+/gi, "[REDACTED_DATABASE_URL]")
    .replace(/\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/g, "[REDACTED_HASH]");
}

const uuid = z.string().uuid();
const name = z.string().trim().min(1).max(100);
const email = z.string().trim().email().max(255).toLowerCase();
const defaultIds = z.object({ id: uuid, profileId: uuid }).strict();
const profile = z
  .object({
    id: uuid,
    userId: uuid,
    firstName: name,
    lastName: name,
    phone: z.string().max(20).optional(),
    bio: z.string().optional(),
  })
  .strict();
const dataSchema = z
  .object({
    // Reserved IDs also let demo records refer to the environment-based accounts.
    defaults: z
      .object({
        admin: defaultIds,
        mentor: defaultIds.extend({ gender: z.string().min(1).max(255) }),
      })
      .strict(),
    users: z.array(
      z
        .object({
          id: uuid,
          email,
          password: passwordSchema,
          role: z.nativeEnum(Role),
        })
        .strict(),
    ),
    admins: z.array(profile),
    mentors: z.array(
      profile.extend({
        gender: z.string().min(1).max(255),
        createdByAdminId: uuid,
      }),
    ),
    students: z.array(
      profile.extend({ gender: z.string().max(255).optional() }),
    ),
    submissions: z.array(
      z
        .object({
          id: uuid,
          studentId: uuid,
          projectName: z.string().min(1).max(200),
          repoUrl: z.string().url(),
          repoFullName: z.string().regex(/^[\w.-]+\/[\w.-]+$/),
          liveUrl: z.string().url(),
          description: z.string().min(1),
          status: z.nativeEnum(SubmissionStatus),
        })
        .strict(),
    ),
    reviews: z.array(
      z
        .object({
          id: uuid,
          submissionId: uuid,
          reviewerUserId: uuid,
          previousStatus: z.literal("PENDING"),
          status: z.enum(["APPROVED", "REJECTED", "REVISION_REQUIRED"]),
          feedback: z.string().min(1),
        })
        .strict(),
    ),
    // Historical IDs are lookup aliases, never IDs assigned to new records.
    legacySubmissionIds: z.record(uuid, uuid).default({}),
  })
  .strict();

const credentialsSchema = z
  .object({
    SEED_ADMIN_EMAIL: email,
    SEED_ADMIN_PASSWORD: passwordSchema,
    SEED_ADMIN_FIRST_NAME: name.default("Project"),
    SEED_ADMIN_LAST_NAME: name.default("Administrator"),
    SEED_MENTOR_EMAIL: email,
    SEED_MENTOR_PASSWORD: passwordSchema,
    SEED_MENTOR_FIRST_NAME: name.default("Default"),
    SEED_MENTOR_LAST_NAME: name.default("Mentor"),
    SEED_DEMO_DATA: z.enum(["true", "false"]).optional(),
  })
  .refine(c => c.SEED_ADMIN_EMAIL !== c.SEED_MENTOR_EMAIL, {
    message: "Default Admin and Mentor emails must differ",
    path: ["SEED_MENTOR_EMAIL"],
  });

type ProfileRow = {
  id: string;
  userId: string;
  isDeleted: boolean;
  deletedAt: Date | null;
};
const active = (row: { isDeleted: boolean; deletedAt: Date | null }) =>
  !row.isDeleted && row.deletedAt === null;

// Resolve profile IDs by the actual owner, including profiles predating this seed.
function resolveProfiles(
  expected: { id: string; userId: string }[],
  rows: ProfileRow[],
) {
  const byId = new Map(rows.map(row => [row.id, row]));
  const byUser = new Map(rows.map(row => [row.userId, row]));
  const resolved = new Map<string, string>();
  for (const item of expected) {
    const collision = byId.get(item.id);
    if (collision && collision.userId !== item.userId)
      throw new SeedError(
        `Reserved profile UUID belongs to another account: ${item.id}`,
      );
    const row = byUser.get(item.userId);
    if (!row) throw new SeedError(`Could not resolve profile: ${item.id}`);
    if (active(row)) resolved.set(item.id, row.id);
  }
  return resolved;
}

export async function seedDatabase() {
  const credentials = credentialsSchema.parse(process.env);
  const demoEnabled =
    credentials.SEED_DEMO_DATA === "true" ||
    (env.NODE_ENV !== "production" && credentials.SEED_DEMO_DATA !== "false");
  const data = dataSchema.parse(
    JSON.parse(readFileSync(join(__dirname, "seed-data.json"), "utf8")),
  );
  const defaults = data.defaults;
  const defaultUsers = [
    {
      id: defaults.admin.id,
      email: credentials.SEED_ADMIN_EMAIL,
      password: credentials.SEED_ADMIN_PASSWORD,
      role: Role.ADMIN,
    },
    {
      id: defaults.mentor.id,
      email: credentials.SEED_MENTOR_EMAIL,
      password: credentials.SEED_MENTOR_PASSWORD,
      role: Role.MENTOR,
    },
  ];
  const allUsers = [...defaultUsers, ...data.users];
  const allAdmins = [
    {
      id: defaults.admin.profileId,
      userId: defaults.admin.id,
      firstName: credentials.SEED_ADMIN_FIRST_NAME,
      lastName: credentials.SEED_ADMIN_LAST_NAME,
    },
    ...data.admins,
  ];
  const allMentors = [
    {
      id: defaults.mentor.profileId,
      userId: defaults.mentor.id,
      firstName: credentials.SEED_MENTOR_FIRST_NAME,
      lastName: credentials.SEED_MENTOR_LAST_NAME,
      gender: defaults.mentor.gender,
      createdByAdminId: defaults.admin.profileId,
    },
    ...data.mentors,
  ];

  // Validate the editable dataset before opening a write transaction.
  const records = [
    ...allUsers,
    ...allAdmins,
    ...allMentors,
    ...data.students,
    ...data.submissions,
    ...data.reviews,
  ];
  if (new Set(records.map(row => row.id)).size !== records.length)
    throw new SeedError("Seed UUIDs must be globally unique");
  const legacyIds = Object.values(data.legacySubmissionIds);
  if (
    new Set(legacyIds).size !== legacyIds.length ||
    legacyIds.some(id => records.some(row => row.id === id)) ||
    Object.keys(data.legacySubmissionIds).some(
      id => !data.submissions.some(row => row.id === id),
    )
  )
    throw new SeedError("Invalid legacy submission aliases");
  if (
    demoEnabled &&
    new Set(allUsers.map(row => row.email)).size !== allUsers.length
  )
    throw new SeedError(
      "Seed emails must be unique, including the environment-based accounts",
    );
  const roles = new Map(allUsers.map(row => [row.id, row.role]));
  const profiledUsers = new Set<string>();
  for (const [role, profiles] of [
    [Role.ADMIN, allAdmins],
    [Role.MENTOR, allMentors],
    [Role.STUDENT, data.students],
  ] as const) {
    for (const row of profiles) {
      if (roles.get(row.userId) !== role || profiledUsers.has(row.userId))
        throw new SeedError(`Invalid or duplicate profile owner: ${row.id}`);
      profiledUsers.add(row.userId);
    }
  }
  if (profiledUsers.size !== allUsers.length)
    throw new SeedError("Each seed user must have one role-specific profile");
  for (const row of allMentors) {
    if (!allAdmins.some(admin => admin.id === row.createdByAdminId))
      throw new SeedError(`Unknown mentor creator: ${row.id}`);
  }
  for (const row of data.submissions) {
    if (!data.students.some(student => student.id === row.studentId))
      throw new SeedError(`Unknown submission student: ${row.id}`);
  }
  const reviewed = new Set<string>();
  for (const row of data.reviews) {
    const submission = data.submissions.find(
      item => item.id === row.submissionId,
    );
    if (
      !submission ||
      submission.status !== row.status ||
      ![Role.ADMIN, Role.MENTOR].some(
        role => role === roles.get(row.reviewerUserId),
      ) ||
      reviewed.has(row.submissionId)
    )
      throw new SeedError(`Invalid submission review: ${row.id}`);
    reviewed.add(row.submissionId);
  }
  if (
    data.submissions.some(
      row => row.status !== "PENDING" && !reviewed.has(row.id),
    )
  )
    throw new SeedError("Every non-pending seed submission must have a review");
  const users = demoEnabled ? allUsers : defaultUsers;
  // Passwords are validated per account; the default Student has its own password.
  // Hash once per distinct password, using exactly the application's bcrypt settings.
  // Do this before the transaction so password hashing does not hold database locks.
  const passwords = new Map(
    await Promise.all(
      [...new Set(users.map(row => row.password))].map(
        async password =>
          [
            password,
            await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS),
          ] as const,
      ),
    ),
  );

  // Wake Neon and establish a usable connection before starting the transaction.
  // $connect() alone only initializes the adapter's lazily connected pg pool.
  await prisma.$queryRaw`SELECT 1`;

  const result = await prisma.$transaction(
    async tx => {
      const counts: { model: string; requested: number; inserted: number }[] =
        [];
      const existingUsers = await tx.user.findMany({
        where: {
          OR: [
            { email: { in: users.map(row => row.email) } },
            { id: { in: users.map(row => row.id) } },
          ],
        },
        select: { id: true, email: true },
      });
      for (const row of users) {
        const collision = existingUsers.find(item => item.id === row.id);
        if (collision && collision.email !== row.email)
          throw new SeedError(
            `Reserved user UUID belongs to another account: ${row.id}`,
          );
      }
      const userData = users.map(row => ({
        ...row,
        password: passwords.get(row.password)!,
      }));
      const defaultInsert = await tx.user.createMany({
        data: userData.slice(0, 2),
        skipDuplicates: true,
      });
      const demoInsert = await tx.user.createMany({
        data: userData.slice(2),
        skipDuplicates: true,
      });
      counts.push({
        model: "Users",
        requested: users.length,
        inserted: defaultInsert.count + demoInsert.count,
      });
      const storedUsers = await tx.user.findMany({
        where: { email: { in: users.map(row => row.email) } },
        select: {
          id: true,
          email: true,
          role: true,
          isActive: true,
          isDeleted: true,
          deletedAt: true,
        },
      });
      const userIds = new Map<string, string>();
      for (const row of users) {
        const stored = storedUsers.find(item => item.email === row.email);
        if (!stored || stored.role !== row.role)
          throw new SeedError(
            `Seed account is missing or has an incompatible role: ${row.email}`,
          );
        if (active(stored) && stored.isActive) userIds.set(row.id, stored.id);
        else if (defaultUsers.some(item => item.id === row.id))
          throw new SeedError("Default seed account is inactive or deleted");
      }

      const admins = (demoEnabled ? allAdmins : allAdmins.slice(0, 1))
        .filter(row => userIds.has(row.userId))
        .map(row => ({ ...row, userId: userIds.get(row.userId)! }));
      const adminInsert = await tx.admin.createMany({
        data: admins,
        skipDuplicates: true,
      });
      counts.push({
        model: "Admin profiles",
        requested: demoEnabled ? allAdmins.length : 1,
        inserted: adminInsert.count,
      });
      const adminIds = resolveProfiles(
        admins,
        await tx.admin.findMany({
          where: {
            OR: [
              { userId: { in: admins.map(row => row.userId) } },
              { id: { in: admins.map(row => row.id) } },
            ],
          },
        }),
      );
      if (!adminIds.has(defaults.admin.profileId))
        throw new SeedError("Default Admin profile is deleted");

      const mentors = (demoEnabled ? allMentors : allMentors.slice(0, 1))
        .filter(
          row => userIds.has(row.userId) && adminIds.has(row.createdByAdminId),
        )
        .map(row => ({
          ...row,
          userId: userIds.get(row.userId)!,
          createdByAdminId: adminIds.get(row.createdByAdminId)!,
        }));
      const mentorInsert = await tx.mentor.createMany({
        data: mentors,
        skipDuplicates: true,
      });
      counts.push({
        model: "Mentor profiles",
        requested: demoEnabled ? allMentors.length : 1,
        inserted: mentorInsert.count,
      });
      const mentorIds = resolveProfiles(
        mentors,
        await tx.mentor.findMany({
          where: {
            OR: [
              { userId: { in: mentors.map(row => row.userId) } },
              { id: { in: mentors.map(row => row.id) } },
            ],
          },
        }),
      );
      if (!mentorIds.has(defaults.mentor.profileId))
        throw new SeedError("Default Mentor profile is deleted");

      const students = (demoEnabled ? data.students : [])
        .filter(row => userIds.has(row.userId))
        .map(row => ({ ...row, userId: userIds.get(row.userId)! }));
      const studentInsert = await tx.student.createMany({
        data: students,
        skipDuplicates: true,
      });
      counts.push({
        model: "Student profiles",
        requested: demoEnabled ? data.students.length : 0,
        inserted: studentInsert.count,
      });
      const studentIds = resolveProfiles(
        students,
        await tx.student.findMany({
          where: {
            OR: [
              { userId: { in: students.map(row => row.userId) } },
              { id: { in: students.map(row => row.id) } },
            ],
          },
        }),
      );
      const reviewerIds = new Set([
        ...allAdmins
          .filter(row => adminIds.has(row.id))
          .map(row => userIds.get(row.userId)!),
        ...allMentors
          .filter(row => mentorIds.has(row.id))
          .map(row => userIds.get(row.userId)!),
      ]);

      const submissions = (demoEnabled ? data.submissions : [])
        .filter(row => studentIds.has(row.studentId))
        .map(row => ({ ...row, studentId: studentIds.get(row.studentId)! }));
      // Reuse the previous seed's IDs even if repository details were edited.
      // Include deleted rows so UUID replacement never recreates deleted data.
      const previousSubmissions = await tx.submission.findMany({
        where: {
          id: {
            in: submissions.flatMap(row => [
              row.id,
              ...(data.legacySubmissionIds[row.id]
                ? [data.legacySubmissionIds[row.id]]
                : []),
            ]),
          },
        },
        select: { id: true, studentId: true },
      });
      const submissionIds = new Map<string, string>();
      for (const row of submissions) {
        const current = previousSubmissions.find(item => item.id === row.id);
        const legacy = previousSubmissions.find(
          item => item.id === data.legacySubmissionIds[row.id],
        );
        if (current && legacy)
          throw new SeedError(
            `Both current and legacy submission IDs exist: ${row.id}`,
          );
        const stored = current ?? legacy;
        if (stored && stored.studentId !== row.studentId)
          throw new SeedError(
            `Reserved submission UUID belongs to another student: ${stored.id}`,
          );
        submissionIds.set(row.id, stored?.id ?? row.id);
      }
      const submissionInsert = await tx.submission.createMany({
        data: submissions.map(row => ({
          ...row,
          id: submissionIds.get(row.id)!,
        })),
        skipDuplicates: true,
      });
      counts.push({
        model: "Project submissions",
        requested: demoEnabled ? data.submissions.length : 0,
        inserted: submissionInsert.count,
      });
      const storedSubmissions = await tx.submission.findMany({
        where: { id: { in: [...submissionIds.values()] } },
        select: {
          id: true,
          studentId: true,
          status: true,
          isDeleted: true,
          deletedAt: true,
        },
      });
      for (const row of submissions) {
        if (
          storedSubmissions.find(item => item.id === submissionIds.get(row.id))
            ?.studentId !== row.studentId
        )
          throw new SeedError(
            `Reserved submission UUID belongs to another student: ${row.id}`,
          );
      }
      const reviewData = (demoEnabled ? data.reviews : [])
        .filter(row => submissionIds.has(row.submissionId))
        .map(row => ({
          ...row,
          submissionId: submissionIds.get(row.submissionId)!,
        }));
      const existingReviews = await tx.submissionReview.findMany({
        where: {
          OR: [
            { id: { in: demoEnabled ? data.reviews.map(row => row.id) : [] } },
            { submissionId: { in: [...submissionIds.values()] } },
          ],
        },
        select: { id: true, submissionId: true },
      });
      for (const row of reviewData) {
        const collision = existingReviews.find(item => item.id === row.id);
        if (collision && collision.submissionId !== row.submissionId)
          throw new SeedError(
            `Reserved review UUID belongs to another submission: ${row.id}`,
          );
      }
      const reviews = reviewData
        .filter(row => {
          const submission = storedSubmissions.find(
            item => item.id === row.submissionId,
          );
          // Preserve manual status changes and all existing history, including deleted reviews.
          return (
            submission &&
            active(submission) &&
            submission.status === row.status &&
            reviewerIds.has(userIds.get(row.reviewerUserId)!) &&
            !existingReviews.some(
              item => item.submissionId === row.submissionId,
            )
          );
        })
        .map(row => ({
          ...row,
          reviewerUserId: userIds.get(row.reviewerUserId)!,
        }));
      const reviewInsert = await tx.submissionReview.createMany({
        data: reviews,
        skipDuplicates: true,
      });
      counts.push({
        model: "Submission reviews",
        requested: demoEnabled ? data.reviews.length : 0,
        inserted: reviewInsert.count,
      });

      return {
        defaults: defaultUsers.map(row => ({
          role: row.role,
          state: existingUsers.some(item => item.email === row.email)
            ? "Existing"
            : "Created",
        })),
        counts,
      };
    },
    { isolationLevel: "Serializable", maxWait: 20_000, timeout: 30_000 },
  );

  console.log(
    "========================================\n DATABASE SEED COMPLETED\n========================================",
  );
  for (const row of result.defaults)
    console.log(`Default ${row.role}: ${row.state}`);
  console.log(
    `Demo data: ${demoEnabled ? "Enabled" : "Disabled (set SEED_DEMO_DATA=true to enable)"}`,
  );
  for (const row of result.counts)
    console.log(
      `${row.model}: ${row.requested} requested; ${row.inserted} inserted; ${row.requested - row.inserted} existing/skipped`,
    );
  console.log(
    `Newly inserted: ${result.counts.reduce((sum, row) => sum + row.inserted, 0)}`,
  );
  console.log(
    `Already existing / skipped: ${result.counts.reduce((sum, row) => sum + row.requested - row.inserted, 0)}`,
  );
  console.log(
    "Seed completed successfully.\n========================================",
  );
  return result;
}

if (require.main === module) {
  seedDatabase()
    .finally(() => prisma.$disconnect())
    .catch(error => {
      console.error("Seed failed:", formatSeedError(error));
      process.exitCode = 1;
    });
}
