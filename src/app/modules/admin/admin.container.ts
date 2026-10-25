import { userService } from "../user/user.container";
import { AdminController } from "./admin.controller";
import { adminRepository } from "./admin.repository";
import { AdminRoutes } from "./admin.route";
import { AdminService } from "./admin.service";
export const adminService = new AdminService(userService, adminRepository);
export const adminController = new AdminController(adminService);
export const adminRoutes = new AdminRoutes(adminController);
