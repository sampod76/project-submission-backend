import http from "http";
import {
  connectDatabase,
  disconnectDatabase,
} from "../../src/app/config/database";
import {
  registerHttpServer,
  registerShutdownSteps,
  registerSignalHandlers,
  requestShutdown,
} from "../../src/app/share/lifecycle";

jest.mock("../../src/app", () => ({ __esModule: true, default: jest.fn() }));
jest.mock("../../src/app/config/database", () => ({
  connectDatabase: jest.fn(),
  disconnectDatabase: jest.fn(),
}));
jest.mock("../../src/app/share/logger", () => ({
  logger: { info: jest.fn(), error: jest.fn() },
}));
jest.mock("../../src/app/share/lifecycle", () => ({
  registerHttpServer: jest.fn(),
  registerShutdownSteps: jest.fn(),
  registerSignalHandlers: jest.fn(),
  requestShutdown: jest.fn().mockResolvedValue(1),
}));

const originalExitCode = process.exitCode;
const flushStartup = () => new Promise<void>(resolve => setImmediate(resolve));

beforeEach(() => {
  process.exitCode = undefined;
  jest.spyOn(process, "exit").mockImplementation(() => undefined as never);
});

afterEach(() => {
  jest.restoreAllMocks();
  process.exitCode = originalExitCode;
});

function startServer(): void {
  jest.isolateModules(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("../../src/server");
  });
}

test("registers cleanup before connecting and HTTP before listening", async () => {
  const server = http.createServer();
  const listen = jest.spyOn(server, "listen").mockReturnValue(server);
  jest.spyOn(http, "createServer").mockReturnValue(server);
  jest.mocked(connectDatabase).mockResolvedValue(undefined as never);

  startServer();
  await flushStartup();

  expect(registerSignalHandlers).toHaveBeenCalledTimes(1);
  expect(
    jest.mocked(registerShutdownSteps).mock.invocationCallOrder[0],
  ).toBeLessThan(jest.mocked(connectDatabase).mock.invocationCallOrder[0]);
  expect(registerHttpServer).toHaveBeenCalledWith(server);
  expect(
    jest.mocked(registerHttpServer).mock.invocationCallOrder[0],
  ).toBeLessThan(listen.mock.invocationCallOrder[0]);
  expect(listen).toHaveBeenCalledTimes(1);
});

test("database startup failure requests failure shutdown and still allows disconnect", async () => {
  jest
    .mocked(connectDatabase)
    .mockRejectedValue(new Error("connection failed"));
  const createServer = jest.spyOn(http, "createServer");

  startServer();
  await flushStartup();

  expect(requestShutdown).toHaveBeenCalledWith("startup failure", 1);
  expect(createServer).not.toHaveBeenCalled();
  const [step] = jest.mocked(registerShutdownSteps).mock.calls[0][0];
  await step.close();
  expect(disconnectDatabase).toHaveBeenCalledTimes(1);
});

test("shutdown during database startup waits for the connection and prevents HTTP startup", async () => {
  let connect!: () => void;
  const connecting = new Promise<void>(resolve => (connect = resolve));
  jest.mocked(connectDatabase).mockImplementation(async () => {
    await connecting;
    return undefined as never;
  });
  const createServer = jest.spyOn(http, "createServer");

  startServer();
  const [step] = jest.mocked(registerShutdownSteps).mock.calls[0][0];
  process.exitCode = 0;
  const closing = step.close();
  await Promise.resolve();
  expect(disconnectDatabase).not.toHaveBeenCalled();

  connect();
  await closing;
  await flushStartup();
  expect(disconnectDatabase).toHaveBeenCalledTimes(1);
  expect(createServer).not.toHaveBeenCalled();
});
