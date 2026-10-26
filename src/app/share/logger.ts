import path from "path";
import { inspect } from "util";
import { createLogger, format, transports } from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { env } from "../config/env";

const { combine, timestamp, label, printf, errors } = format;

const myFormat = printf(info => {
  const { level, message, label, timestamp, stack, ...metadata } = info;
  const date = new Date(timestamp as string | number | Date);
  const details = stack || message;
  const renderedMessage =
    typeof details === "string"
      ? details
      : inspect(details, { depth: null, colors: false, compact: false });
  const renderedMetadata = Object.keys(metadata).length
    ? `\n${inspect(metadata, { depth: null, colors: false, compact: false })}`
    : "";

  return `${date.toISOString()} [${label}] ${level}: ${renderedMessage}${renderedMetadata}`;
});

const baseFormat = combine(
  label({
    label:
      env.NODE_ENV === "production"
        ? "project-submission-backend-app"
        : "project-submission-backend-dev",
  }),
  timestamp(),
  errors({ stack: true }),
  myFormat,
);

const logger = createLogger({
  level: env.LOG_LEVEL,
  format: baseFormat,
  transports: [
    new transports.Console(),
    new DailyRotateFile({
      filename: path.join(
        process.cwd(),
        "logger",
        "winston",
        "successes",
        "project-submission-backend-%DATE%-success.log",
      ),
      datePattern: "YYYY-MM-DD-HH",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
    }),
  ],
});

const errorLogger = createLogger({
  level: "error",
  format: baseFormat,
  transports: [
    new transports.Console(),
    new DailyRotateFile({
      filename: path.join(
        process.cwd(),
        "logger",
        "winston",
        "errors",
        "project-submission-backend-%DATE%-error.log",
      ),
      datePattern: "YYYY-MM-DD-HH",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
    }),
  ],
});

export { errorLogger, logger };
