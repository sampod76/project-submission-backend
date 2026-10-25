import type { Request } from "express";
import type { ValidatedResponse } from "../../../middlewares/validateRequestZod";
import { AuthenticationController } from "../authentication.controller";
import type { IAuthenticationService } from "../authentication.interface";
import { AuthValidation } from "../authentication.validation";

const body = { email: "doctor@example.com", password: "Password123" };
const result = {
  accessToken: "access-token",
  refreshToken: "refresh-token",
  expiresIn: 3600,
  user: {
    id: "user-id",
    email: body.email,
    role: "DOCTOR" as const,
    name: "Doctor",
  },
};
const service: IAuthenticationService = {
  login: jest.fn(),
  refresh: jest.fn(),
  profile: jest.fn(),
  changePassword: jest.fn(),
};
const controller = new AuthenticationController(service);
const req = {} as Request;
const res = {
  locals: { validated: { body } },
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
} as unknown as ValidatedResponse<typeof AuthValidation.loginZodSchema>;

test("passes validated credentials to the service and sends the login result", async () => {
  jest.mocked(service.login).mockResolvedValue(result);
  const next = jest.fn();

  await controller.login(req, res, next);

  expect(service.login).toHaveBeenCalledTimes(1);
  expect(service.login).toHaveBeenCalledWith(body);
  expect(res.status).toHaveBeenCalledWith(200);
  expect(res.json).toHaveBeenCalledWith({
    success: true,
    statusCode: 200,
    message: "Login successful",
    meta: undefined,
    data: result,
  });
  expect(next).not.toHaveBeenCalled();
});

test("forwards a login failure to Express", async () => {
  const error = new Error("Invalid credentials");
  jest.mocked(service.login).mockRejectedValueOnce(error);
  const next = jest.fn();

  await controller.login(req, res, next);

  expect(next).toHaveBeenCalledWith(error);
  expect(res.json).not.toHaveBeenCalled();
});
