import { prisma } from "../../share/prisma/prisma";
import { userService } from "../user/user.container";
import { adminRepository } from "../admin/admin.container";
import { MentorRepository } from "./mentor.repository";
import { MentorService } from "./mentor.service";
import { MentorController } from "./mentor.controller";

export const mentorRepository = new MentorRepository(prisma);
export const mentorService = new MentorService(
  userService,
  mentorRepository,
  adminRepository,
);
export const mentorController = new MentorController(mentorService);
