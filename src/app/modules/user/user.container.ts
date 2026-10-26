import { prisma } from "../../share/prisma/prisma";
import { authCache } from "../../../helper/authCache";
import { auditLogService } from "../audit-log/audit-log.container";
import { UserRepository } from "./user.repository";
import { UserService } from "./user.service";
import { UserController } from "./user.controller";

export const userRepository = new UserRepository(prisma);
export const userService = new UserService(
  userRepository,
  auditLogService,
  authCache,
);
export const userController = new UserController(userService);
