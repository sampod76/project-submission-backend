import http from "http";
import {
  __resetForTests,
  registerHttpServer,
  registerShutdownSteps,
  registerSignalHandlers,
  requestShutdown,
} from "../../src/app/share/lifecycle";

jest.mock("../../src/app/share/logger", () => ({
  logger: { info: jest.fn(), error: jest.fn() },
}));

const events = [
  "SIGINT",
  "SIGTERM",
  "uncaughtException",
  "unhandledRejection",
] as const;
const originalExitCode = process.exitCode;

beforeEach(() => {
  process.exitCode = undefined;
  jest.useFakeTimers();
  jest.spyOn(process, "exit").mockImplementation(() => undefined as never);
});

afterEach(() => {
  __resetForTests();
  jest.useRealTimers();
  jest.restoreAllMocks();
  process.exitCode = originalExitCode;
});

test("registers handlers once and reset removes only lifecycle handlers", () => {
  const existingListeners = events.map(event => process.listeners(event));
  registerSignalHandlers();
  registerSignalHandlers();

  events.forEach((event, index) => {
    expect(process.listenerCount(event)).toBe(
      existingListeners[index].length + 1,
    );
  });

  __resetForTests();
  events.forEach((event, index) => {
    expect(process.listeners(event)).toEqual(existingListeners[index]);
  });

  registerSignalHandlers();
  expect(process.listenerCount("SIGINT")).toBe(existingListeners[0].length + 1);
});

test.each([
  ["SIGINT", undefined, 0],
  ["SIGTERM", undefined, 0],
  ["uncaughtException", new Error("fatal"), 1],
  ["unhandledRejection", "rejected", 1],
] as const)("handles %s", async (event, error, exitCode) => {
  const existingListeners = process.listeners(event);
  const close = jest.fn();
  registerShutdownSteps([{ kind: "database", name: "prisma", close }]);
  registerSignalHandlers();
  const handler = process
    .listeners(event)
    .find(listener => !existingListeners.includes(listener))!;

  (handler as (reason?: unknown) => void)(error);
  await expect(requestShutdown("duplicate")).resolves.toBe(exitCode);

  expect(close).toHaveBeenCalledTimes(1);
  expect(process.exitCode).toBe(exitCode);
  expect(process.listeners(event)).toEqual(existingListeners);
  expect(process.exit).not.toHaveBeenCalled();
  expect(jest.getTimerCount()).toBe(0);
});

test("shares one shutdown promise, including calls made inside cleanup", async () => {
  let nestedShutdown: Promise<number> | undefined;
  const close = jest.fn(() => {
    nestedShutdown = requestShutdown("nested");
  });
  registerShutdownSteps([{ kind: "database", name: "prisma", close }]);

  const shutdown = requestShutdown("first");
  expect(requestShutdown("second")).toBe(shutdown);
  await expect(shutdown).resolves.toBe(0);
  expect(nestedShutdown).toBe(shutdown);
  expect(close).toHaveBeenCalledTimes(1);
});

test("a fatal error during shutdown upgrades the exit code without restarting cleanup", async () => {
  let finish!: () => void;
  const close = jest.fn(() => new Promise<void>(resolve => (finish = resolve)));
  registerShutdownSteps([{ kind: "database", name: "prisma", close }]);
  const shutdown = requestShutdown("SIGTERM");
  await Promise.resolve();

  expect(requestShutdown("uncaughtException", 1)).toBe(shutdown);
  expect(requestShutdown("SIGINT")).toBe(shutdown);
  finish();

  await expect(shutdown).resolves.toBe(1);
  expect(close).toHaveBeenCalledTimes(1);
});

test.each(["throw", "reject"])(
  "continues resource cleanup after a %s and preserves an existing failure code",
  async failure => {
    const closeRedis = jest.fn();
    registerShutdownSteps([
      {
        kind: "database",
        name: "prisma",
        close: () => {
          if (failure === "throw") throw new Error("database failed");
          return Promise.reject(new Error("database failed"));
        },
      },
      { kind: "redis", name: "redis", close: closeRedis },
    ]);

    await expect(requestShutdown("failure", 2)).resolves.toBe(2);
    expect(closeRedis).toHaveBeenCalledTimes(1);
    expect(process.exitCode).toBe(2);
  },
);

test("a cleanup failure changes a successful exit code to failure", async () => {
  registerShutdownSteps([
    {
      kind: "redis",
      name: "redis",
      close: () => Promise.reject(new Error("redis failed")),
    },
  ]);
  await expect(requestShutdown("SIGTERM")).resolves.toBe(1);
});

test("does not overwrite a pre-existing process failure code", async () => {
  process.exitCode = 3;
  await expect(requestShutdown("SIGTERM")).resolves.toBe(3);
});

test.each(["callback", "throw"])(
  "handles an HTTP close %s error and still closes the database",
  async failure => {
    const server = http.createServer();
    const error = new Error("HTTP close failed");
    jest.spyOn(server, "close").mockImplementation(callback => {
      if (failure === "throw") throw error;
      callback?.(error);
      return server;
    });
    const closeDatabase = jest.fn();
    registerHttpServer(server);
    registerShutdownSteps([
      { kind: "database", name: "prisma", close: closeDatabase },
    ]);

    await expect(requestShutdown("SIGTERM")).resolves.toBe(1);
    expect(closeDatabase).toHaveBeenCalledTimes(1);
  },
);

test("accepts an HTTP server that has already stopped or never started", async () => {
  registerHttpServer(http.createServer());
  const shutdown = requestShutdown("startup failure", 1);
  await jest.runAllTimersAsync();
  await expect(shutdown).resolves.toBe(1);
  expect(process.exit).not.toHaveBeenCalled();
});

test("runs registered HTTP cleanup steps", async () => {
  const close = jest.fn();
  registerShutdownSteps([{ kind: "http", name: "http", close }]);
  await requestShutdown("SIGTERM");
  expect(close).toHaveBeenCalledTimes(1);
});

test.each([0, 2])(
  "forces exit after 10 seconds when cleanup hangs (initial code %s)",
  async exitCode => {
    let finish!: () => void;
    const close = () => new Promise<void>(resolve => (finish = resolve));
    const listeners = events.map(event => process.listeners(event));
    registerSignalHandlers();
    registerShutdownSteps([{ kind: "database", name: "prisma", close }]);
    const shutdown = requestShutdown("SIGTERM", exitCode);

    await jest.advanceTimersByTimeAsync(9_999);
    expect(process.exit).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    expect(process.exit).toHaveBeenCalledWith(exitCode || 1);
    events.forEach((event, index) => {
      expect(process.listeners(event)).toEqual(listeners[index]);
    });

    finish();
    await shutdown;
    expect(process.exit).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  },
);

test("reset clears a pending shutdown timer", async () => {
  let finish!: () => void;
  registerShutdownSteps([
    {
      kind: "database",
      name: "prisma",
      close: () => new Promise<void>(resolve => (finish = resolve)),
    },
  ]);
  const shutdown = requestShutdown("SIGTERM");
  await Promise.resolve();
  expect(jest.getTimerCount()).toBe(1);

  __resetForTests();
  await jest.advanceTimersByTimeAsync(10_000);
  expect(process.exit).not.toHaveBeenCalled();
  finish();
  await shutdown;
});

test("stops accepting HTTP connections and drains requests before closing resources", async () => {
  jest.useRealTimers();
  let response!: http.ServerResponse;
  let received!: () => void;
  const requestReceived = new Promise<void>(resolve => (received = resolve));
  const server = http.createServer((_request, res) => {
    response = res;
    received();
  });
  const closeDatabase = jest.fn();

  try {
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("No HTTP port");
    const url = `http://127.0.0.1:${address.port}`;
    const get = () =>
      new Promise<void>((resolve, reject) => {
        http
          .get(url, { agent: false }, res => {
            res.resume();
            res.on("end", resolve);
            res.on("error", reject);
          })
          .on("error", reject);
      });
    const activeRequest = get();
    await requestReceived;
    registerHttpServer(server);
    registerShutdownSteps([
      { kind: "database", name: "prisma", close: closeDatabase },
    ]);

    const shutdown = requestShutdown("SIGTERM");
    await Promise.resolve();
    expect(server.listening).toBe(false);
    expect(closeDatabase).not.toHaveBeenCalled();
    await expect(get()).rejects.toMatchObject({ code: "ECONNREFUSED" });

    response.end("done");
    await activeRequest;
    await expect(shutdown).resolves.toBe(0);
    expect(closeDatabase).toHaveBeenCalledTimes(1);
    expect(process.exit).not.toHaveBeenCalled();
  } finally {
    server.closeAllConnections();
    server.close();
  }
});
