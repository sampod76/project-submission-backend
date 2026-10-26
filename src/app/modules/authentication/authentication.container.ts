import { prisma } from "../../share/prisma/prisma";
import { userService } from "../user/user.container";
import { studentRepository } from "../student/student.container";
import { AuthenticationRepository } from "./authentication.repository";
import { AuthenticationService } from "./authentication.service";
import { AuthenticationController } from "./authentication.controller";

export const authenticationRepository = new AuthenticationRepository(prisma);
export const authenticationService = new AuthenticationService(
  authenticationRepository,
  userService,
  studentRepository,
);
export const authenticationController = new AuthenticationController(
  authenticationService,
);
