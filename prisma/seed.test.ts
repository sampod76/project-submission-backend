import assert from "node:assert/strict";
import { mock, test } from "node:test";
import { formatSeedError, seedDatabase } from "./seed";
import { prisma } from "../src/app/share/prisma/prisma";

test("seed waits for a usable connection before acquiring a transaction", async () => {
  const calls: string[] = [];
  const originalQuery = prisma.$queryRaw;
  const originalTransaction = prisma.$transaction;
  const ready = mock.fn(async () => {
    await new Promise(resolve => setTimeout(resolve, 10));
    calls.push("ready");
    return [{ value: 1 }];
  });
  const transaction = mock.fn(
    async (
      _work: unknown,
      options: { maxWait: number; timeout: number; isolationLevel: string },
    ) => {
      calls.push("transaction");
      assert.deepEqual(calls, ["ready", "transaction"]);
      assert.equal(options.maxWait, 20_000);
      assert.equal(options.timeout, 30_000);
      assert.equal(options.isolationLevel, "Serializable");
      return { defaults: [], counts: [] };
    },
  );
  prisma.$queryRaw = ready as typeof prisma.$queryRaw;
  prisma.$transaction = transaction as unknown as typeof prisma.$transaction;
  const log = mock.method(console, "log", () => {});
  try {
    await seedDatabase();
    assert.equal(ready.mock.callCount(), 1);
    assert.equal(transaction.mock.callCount(), 1);
  } finally {
    prisma.$queryRaw = originalQuery;
    prisma.$transaction = originalTransaction;
    log.mock.restore();
  }
});

test("connection failure prevents seed writes and preserves the original error", async () => {
  const failure = new Error("Connection unavailable");
  const originalQuery = prisma.$queryRaw;
  const originalTransaction = prisma.$transaction;
  const ready = mock.fn(async () => {
    throw failure;
  });
  const transaction = mock.fn(async () => {
    assert.fail("Must not start a transaction after connection failure");
  });
  prisma.$queryRaw = ready as typeof prisma.$queryRaw;
  prisma.$transaction = transaction as typeof prisma.$transaction;
  try {
    await assert.rejects(seedDatabase(), error => error === failure);
    assert.equal(transaction.mock.callCount(), 0);
  } finally {
    prisma.$queryRaw = originalQuery;
    prisma.$transaction = originalTransaction;
  }
});

test("diagnostics retain error details while redacting credentials", () => {
  const previousUrl = process.env.DATABASE_URL;
  const previousSecret = process.env.SEED_ADMIN_PASSWORD;
  process.env.DATABASE_URL =
    "postgresql://private_user:private%40password@example.invalid/db?sslmode=verify-full";
  process.env.SEED_ADMIN_PASSWORD = "test-private-seed-password";
  try {
    const error = Object.assign(
      new Error(
        `Unable to start transaction: ${process.env.DATABASE_URL}; private@password; private_user; ${process.env.SEED_ADMIN_PASSWORD}`,
      ),
      {
        code: "P2028",
        meta: {
          reason: "acquisition timeout",
          password: "another-secret-value",
        },
      },
    );
    const output = formatSeedError(error);
    assert.match(output, /P2028/);
    assert.match(output, /Unable to start transaction/);
    assert.match(output, /acquisition timeout/);
    assert.match(output, /stack/);
    for (const secret of [
      process.env.DATABASE_URL,
      "private_user",
      "private%40password",
      "private@password",
      process.env.SEED_ADMIN_PASSWORD,
      "another-secret-value",
    ]) {
      assert.ok(!output.includes(secret), "Credential must be redacted");
    }
    assert.doesNotThrow(() => JSON.parse(output));
  } finally {
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
    if (previousSecret === undefined) delete process.env.SEED_ADMIN_PASSWORD;
    else process.env.SEED_ADMIN_PASSWORD = previousSecret;
  }
});
