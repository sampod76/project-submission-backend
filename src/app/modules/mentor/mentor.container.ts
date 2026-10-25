import { userService } from "../user/user.container";
import { MentorService } from "./mentor.service";
import { mentorRepository } from "./mentor.repository";
import { MentorController } from "./mentor.controller";
import { MentorRoutes } from "./mentor.route";
export const mentorService = new MentorService(userService, mentorRepository);
export const mentorController = new MentorController(mentorService);
export const mentorRoutes = new MentorRoutes(mentorController);
