import "colors";
import http from "http";
import app from "./app";
import { connectDatabase, disconnectDatabase } from "./app/config/database";
import { env } from "./app/config/env";
import {
  registerHttpServer,
  registerShutdownSteps,
  registerSignalHandlers,
  requestShutdown,
} from "./app/share/lifecycle";
import { logger } from "./app/share/logger";

async function main(): Promise<void> {
  try {
    logger.info("[server:start] startup started");

    registerSignalHandlers();
    registerShutdownSteps([
      {
        kind: "database",
        name: "prisma",
        close: async () => {
          await databaseConnection.catch(() => undefined);
          await disconnectDatabase();
        },
      },
    ]);

    const databaseConnection = connectDatabase();
    await databaseConnection;
    if (process.exitCode !== undefined) return;

    const server = http.createServer(app);
    registerHttpServer(server);
    server.listen(env.PORT, () => {
      logger.info(
        `HTTP Server running on port ${env.PORT}`.blue.underline.bold,
      );
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (env.NODE_ENV === "production")
      logger.error(`Failed to start app: ${message}`);
    else console.log(`Failed to start app: ${message}`);

    await requestShutdown("startup failure", 1);
  }
}

void main();
