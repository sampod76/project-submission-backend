import http from "http";
import { logger } from "./logger";

type ResourceKind = "http" | "database" | "redis";

export type ShutdownStep = {
  kind: ResourceKind;
  name: string;
  close: () => Promise<void> | void;
};

const GRACEFUL_SHUTDOWN_TIMEOUT_MS = 10_000;

let shutdownPromise: Promise<number> | undefined;
let registeredSteps: ShutdownStep[] = [];
let httpServerRef: http.Server | undefined;
let shutdownTimer: NodeJS.Timeout | undefined;
let signalHandlersRegistered = false;

export function registerShutdownSteps(steps: ShutdownStep[]): void {
  registeredSteps = steps;
}

export function registerHttpServer(server: http.Server): void {
  httpServerRef = server;
}

export function registerSignalHandlers(): void {
  if (signalHandlersRegistered) return;

  process.on("SIGINT", handleSigint);
  process.on("SIGTERM", handleSigterm);
  process.on("uncaughtException", handleUncaughtException);
  process.on("unhandledRejection", handleUnhandledRejection);
  signalHandlersRegistered = true;
}

function handleSigint(): void {
  void requestShutdown("SIGINT");
}

function handleSigterm(): void {
  void requestShutdown("SIGTERM");
}

function handleUncaughtException(error: Error): void {
  logger.error(
    `[lifecycle] uncaughtException: ${error.stack ?? error.message}`,
  );
  void requestShutdown("uncaughtException", 1);
}

function handleUnhandledRejection(reason: unknown): void {
  logger.error(`[lifecycle] unhandledRejection: ${getErrorMessage(reason)}`);
  void requestShutdown("unhandledRejection", 1);
}

function removeSignalHandlers(): void {
  process.off("SIGINT", handleSigint);
  process.off("SIGTERM", handleSigterm);
  process.off("uncaughtException", handleUncaughtException);
  process.off("unhandledRejection", handleUnhandledRejection);
  signalHandlersRegistered = false;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function setExitCode(exitCode: number): void {
  if (!Number(process.exitCode)) process.exitCode = exitCode;
}

export function requestShutdown(
  reason: string,
  exitCode: number = 0,
): Promise<number> {
  setExitCode(exitCode);
  shutdownPromise ??= Promise.resolve().then(() => shutdown(reason));
  return shutdownPromise;
}

function closeHttpServer(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close(error => {
      if (
        error &&
        (error as NodeJS.ErrnoException).code !== "ERR_SERVER_NOT_RUNNING"
      ) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function closeStep(step: ShutdownStep): Promise<void> {
  try {
    await step.close();
    logger.info(`[lifecycle] ${step.kind}/${step.name} closed`);
  } catch (error) {
    setExitCode(1);
    logger.error(
      `[lifecycle] ${step.kind}/${step.name} close failed: ${getErrorMessage(error)}`,
    );
  }
}

async function shutdown(reason: string): Promise<number> {
  shutdownTimer = setTimeout(() => {
    setExitCode(1);
    logger.error(
      `[lifecycle] shutdown timeout after ${GRACEFUL_SHUTDOWN_TIMEOUT_MS}ms; forcing exit`,
    );
    removeSignalHandlers();
    process.exit(Number(process.exitCode));
  }, GRACEFUL_SHUTDOWN_TIMEOUT_MS);

  try {
    logger.info(`[lifecycle] shutdown starting reason=${reason}`);
    const server = httpServerRef;
    if (server) {
      await closeStep({
        kind: "http",
        name: "server",
        close: () => closeHttpServer(server),
      });
    }

    for (const step of registeredSteps) {
      await closeStep(step);
    }

    const finalCode = Number(process.exitCode);
    logger.info(`[lifecycle] shutdown complete exitCode=${finalCode}`);
    return finalCode;
  } finally {
    clearTimeout(shutdownTimer);
    shutdownTimer = undefined;
    removeSignalHandlers();
  }
}

export function __resetForTests(): void {
  clearTimeout(shutdownTimer);
  shutdownTimer = undefined;
  removeSignalHandlers();
  shutdownPromise = undefined;
  registeredSteps = [];
  httpServerRef = undefined;
}
