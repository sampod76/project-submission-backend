/* eslint-disable @typescript-eslint/no-require-imports -- Jest setup uses CommonJS. */
require("dotenv").config();
const { getTestDatabaseName } = require("./tests/integration/test-database");

if (process.env.TEST_DATABASE_URL) {
  getTestDatabaseName(process.env.TEST_DATABASE_URL, process.env.DATABASE_URL);
}

process.env.NODE_ENV = "test";
process.env.JWT_SECRET =
  process.env.JWT_SECRET || "test-jwt-secret-must-be-long-enough";
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  "test-jwt-refresh-secret-must-be-long-enough";
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/doctor_tracker_test?schema=public";
