jest.mock("../../../share/prisma/prisma", () => ({ prisma: {} }));

import bcrypt from "bcryptjs";
import { AuthenticationRepository } from "../authentication.repository";
import { AuthenticationService } from "../authentication.service";
import type { AuthAccount } from "../authentication.interface";

const account: AuthAccount = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "doctor@example.com",
  password: "password-hash",
  role: "DOCTOR",
  isActive: true,
  isDeleted: false,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  admin: null,
  doctor: { name: "Doctor" },
};

afterEach(() => jest.restoreAllMocks());

test.each([null, { ...account, isActive: false }])(
  "does not compare passwords for missing or inactive login accounts",
  async user => {
    const repository = new AuthenticationRepository();
    jest.spyOn(repository, "findFirst").mockResolvedValue(user);
    const compare = jest.spyOn(bcrypt, "compare");
    const service = new AuthenticationService(repository);

    await expect(
      service.login({ email: account.email, password: "secret" }),
    ).rejects.toMatchObject({
      statusCode: 401,
      userMessage: "Invalid credentials",
    });
    expect(compare).not.toHaveBeenCalled();
  },
);

test("compares an active account's password once and preserves invalid credential errors", async () => {
  const repository = new AuthenticationRepository();
  jest.spyOn(repository, "findFirst").mockResolvedValue(account);
  const compare = jest
    .spyOn(bcrypt, "compare")
    .mockImplementation(async () => false);
  const service = new AuthenticationService(repository);

  await expect(
    service.login({ email: account.email, password: "secret" }),
  ).rejects.toMatchObject({
    statusCode: 401,
    userMessage: "Invalid credentials",
  });
  expect(compare).toHaveBeenCalledTimes(1);
  expect(compare).toHaveBeenCalledWith("secret", account.password);
});

test("does not compare or update passwords when a password-change account is missing", async () => {
  const repository = new AuthenticationRepository();
  jest.spyOn(repository, "findFirst").mockResolvedValue(null);
  const compare = jest.spyOn(bcrypt, "compare");
  const updatePassword = jest.spyOn(repository, "update");
  const service = new AuthenticationService(repository);

  await expect(
    service.changePassword(account.id, {
      currentPassword: "old-password",
      newPassword: "new-password",
    }),
  ).rejects.toMatchObject({ statusCode: 404, userMessage: "User not found" });
  expect(compare).not.toHaveBeenCalled();
  expect(updatePassword).not.toHaveBeenCalled();
});
