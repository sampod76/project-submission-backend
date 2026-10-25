import {
  getTestDatabaseName,
  verifyTestDatabase,
} from "../integration/test-database";

const testUrl =
  "postgresql://postgres:postgres@localhost:5432/doctor_tracker_test";
const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

test("accepts local test database names and rejects unsafe targets", () => {
  expect(getTestDatabaseName(testUrl)).toBe("doctor_tracker_test");
  expect(getTestDatabaseName(testUrl.replace("_test", "-test"))).toBe(
    "doctor_tracker-test",
  );
  for (const url of [
    undefined,
    testUrl.replace("_test", ""),
    testUrl.replace("_test", "_development"),
    testUrl.replace("_test", "_production"),
    testUrl.replace("localhost", "example.com"),
  ]) {
    expect(() => getTestDatabaseName(url)).toThrow();
  }
  expect(() =>
    getTestDatabaseName(testUrl, testUrl.replace("localhost", "127.0.0.1")),
  ).toThrow("different database");
});

test("refuses a Prisma URL mismatch before making a database query", async () => {
  process.env.NODE_ENV = "test";
  process.env.TEST_DATABASE_URL = testUrl;
  process.env.DATABASE_URL = testUrl;
  const prisma = { $queryRaw: jest.fn() };

  await expect(
    verifyTestDatabase(prisma, testUrl.replace("_test", "")),
  ).rejects.toThrow("Prisma must be configured");
  expect(prisma.$queryRaw).not.toHaveBeenCalled();
});

test("requires the correct connected database and initialized schema before allowing test writes", async () => {
  process.env.NODE_ENV = "test";
  process.env.TEST_DATABASE_URL = testUrl;
  process.env.DATABASE_URL = testUrl;
  const prisma = {
    $queryRaw: jest.fn().mockResolvedValue([{ database: "doctor_tracker" }]),
  };

  await expect(verifyTestDatabase(prisma, testUrl)).rejects.toThrow(
    "refusing test writes and cleanup",
  );
  prisma.$queryRaw.mockResolvedValue([
    { database: "doctor_tracker_test", schema_ready: false },
  ]);
  await expect(verifyTestDatabase(prisma, testUrl)).rejects.toThrow(
    "tables are missing",
  );
  prisma.$queryRaw.mockResolvedValue([
    { database: "doctor_tracker_test", schema_ready: true },
  ]);
  await expect(verifyTestDatabase(prisma, testUrl)).resolves.toBeUndefined();
});
