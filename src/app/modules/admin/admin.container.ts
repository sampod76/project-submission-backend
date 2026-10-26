import { prisma } from "../../share/prisma/prisma";
import { userService } from "../user/user.container";
import { AdminRepository } from "./admin.repository";
import { AdminService } from "./admin.service";
import { AdminController } from "./admin.controller";

export const adminRepository = new AdminRepository(prisma);
export const adminService = new AdminService(userService, adminRepository);
export const adminController = new AdminController(adminService);
