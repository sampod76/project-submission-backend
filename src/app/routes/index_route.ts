import express from "express";
import {
  submissionRoutes,
  mentorRoutes,
  studentRoutes,
  auditLogRoutes,
  adminRoutes,
  authenticationRoutes,
  userRoutes,
} from "./routes.container";

const router = express.Router();

type ModuleRoute = {
  path: string;
  route: express.Router;
};

const moduleRoutes: ModuleRoute[] = [
  { path: "/submissions", route: submissionRoutes.router },
  { path: "/mentors", route: mentorRoutes.router },
  { path: "/students", route: studentRoutes.router },
  { path: "/audit-logs", route: auditLogRoutes.router },
  { path: "/admins", route: adminRoutes.router },
  {
    path: "/auth",
    route: authenticationRoutes.router,
  },
  {
    path: "/users",
    route: userRoutes.router,
  },
];

moduleRoutes.forEach(({ path, route }) => router.use(path, route));

export default router;
