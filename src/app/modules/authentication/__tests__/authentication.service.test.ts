import bcrypt from "bcryptjs";
import { jwtHelpers } from "../../../../helper/jwtHelpers";
import { AuthenticationService } from "../authentication.service";
import type {
  AuthAccount,
  IAuthenticationRepository,
} from "../authentication.interface";

jest.mock("../../../share/prisma/prisma", () => ({ prisma: {} }));
jest.mock("bcryptjs", () => ({ compare: jest.fn() }));
jest.mock("../../../../helper/jwtHelpers", () => ({
  jwtHelpers: { createToken: jest.fn() },
  accessTokenSecret: "test-access-secret",
  refreshTokenSecret: "test-refresh-secret",
  accessTokenExpiresIn: 3600,
  refreshTokenExpiresIn: 7200,
}));

test("looks up a normalized email and returns tokens for a matching password", async () => {
  const account: AuthAccount = {
    id: "12345678-1234-4abc-8def-123456789abc",
    email: "doctor@example.com",
    password: "password-hash",
    role: "DOCTOR",
    isActive: true,
    isDeleted: false,
    deletedAt: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
    admin: null,
    doctor: { name: "Doctor" },
  };
  const repository: IAuthenticationRepository = {
    findFirst: jest.fn().mockResolvedValue(account),
    update: jest.fn(),
  };
  jest.spyOn(bcrypt, "compare").mockImplementation(async () => true);
  jest
    .mocked(jwtHelpers.createToken)
    .mockReturnValueOnce("access-token")
    .mockReturnValueOnce("refresh-token");

  const result = await new AuthenticationService(repository).login({
    email: " DOCTOR@example.com ",
    password: "Password123",
  });

  expect(repository.findFirst).toHaveBeenCalledWith({
    where: { email: account.email, isDeleted: false },
    include: {
      admin: { select: { name: true } },
      doctor: { select: { name: true } },
    },
  });
  expect(bcrypt.compare).toHaveBeenCalledWith("Password123", account.password);
  expect(jwtHelpers.createToken).toHaveBeenNthCalledWith(
    1,
    { userId: account.id, role: "DOCTOR" },
    "test-access-secret",
    3600,
  );
  expect(jwtHelpers.createToken).toHaveBeenNthCalledWith(
    2,
    { userId: account.id, role: "DOCTOR" },
    "test-refresh-secret",
    7200,
  );
  expect(result).toEqual({
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expiresIn: 3600,
    user: {
      id: account.id,
      email: account.email,
      role: "DOCTOR",
      name: "Doctor",
    },
  });
});
