import type { AppPrismaClient } from "../../src/app/share/prisma/prisma";

export function getTestDatabaseName(
  testDatabaseUrl: string | undefined,
  applicationDatabaseUrl?: string,
): string {
  if (!testDatabaseUrl) throw new Error("TEST_DATABASE_URL is required");

  const url = new URL(testDatabaseUrl);
  const database = decodeURIComponent(url.pathname.slice(1));
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    !/^.+[-_]test$/.test(database)
  ) {
    throw new Error(
      "Integration tests require a local database ending in _test or -test",
    );
  }

  if (
    applicationDatabaseUrl &&
    database ===
      decodeURIComponent(new URL(applicationDatabaseUrl).pathname.slice(1))
  ) {
    throw new Error(
      "TEST_DATABASE_URL must use a different database from DATABASE_URL",
    );
  }
  return database;
}

export async function verifyTestDatabase(
  prisma: Pick<AppPrismaClient, "$queryRaw">,
  configuredDatabaseUrl: string,
): Promise<void> {
  const database = getTestDatabaseName(process.env.TEST_DATABASE_URL);
  if (
    process.env.NODE_ENV !== "test" ||
    configuredDatabaseUrl !== process.env.TEST_DATABASE_URL ||
    process.env.DATABASE_URL !== process.env.TEST_DATABASE_URL
  ) {
    throw new Error(
      "Prisma must be configured with TEST_DATABASE_URL in test mode",
    );
  }

  const [connection] = await prisma.$queryRaw<
    { database: string; schema_ready: boolean }[]
  >`
    SELECT current_database() AS database,
      to_regclass('public.users') IS NOT NULL
      AND to_regclass('public.admins') IS NOT NULL
      AND to_regclass('public.doctors') IS NOT NULL
      AND to_regclass('public.patients') IS NOT NULL AS schema_ready
  `;
  if (connection?.database !== database) {
    throw new Error(
      "Prisma is connected to a different database; refusing test writes and cleanup",
    );
  }
  if (!connection.schema_ready) {
    throw new Error(
      "Test database tables are missing; apply the existing migrations to TEST_DATABASE_URL first",
    );
  }
}
