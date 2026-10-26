import { createAuthMiddleware } from "../middlewares/authMiddleware";
import {
  registrationLimiter,
  loginLimiter,
  submissionLimiter,
} from "../middlewares/rate-limit";
import { adminController } from "../modules/admin/admin.container";
import { AdminRoutes } from "../modules/admin/admin.route";
import { auditLogController } from "../modules/audit-log/audit-log.container";
import { AuditLogRoutes } from "../modules/audit-log/audit-log.route";
import { authenticationController } from "../modules/authentication/authentication.container";
import { AuthenticationRoutes } from "../modules/authentication/authentication.route";
import { mentorController } from "../modules/mentor/mentor.container";
import { MentorRoutes } from "../modules/mentor/mentor.route";
import { studentController } from "../modules/student/student.container";
import { StudentRoutes } from "../modules/student/student.route";
import { submissionReviewController } from "../modules/submission-review/submission-review.container";
import { submissionController } from "../modules/submission/submission.container";
import { SubmissionRoutes } from "../modules/submission/submission.route";
import { userController, userRepository } from "../modules/user/user.container";
import { UserRoutes } from "../modules/user/user.route";

export const authMiddleware = createAuthMiddleware(userRepository);

export const adminRoutes = new AdminRoutes(adminController, authMiddleware);
export const auditLogRoutes = new AuditLogRoutes(
  auditLogController,
  authMiddleware,
);
export const authenticationRoutes = new AuthenticationRoutes(
  authenticationController,
  authMiddleware,
  registrationLimiter,
  loginLimiter,
);
export const mentorRoutes = new MentorRoutes(mentorController, authMiddleware);
export const studentRoutes = new StudentRoutes(
  studentController,
  authMiddleware,
);
export const submissionRoutes = new SubmissionRoutes(
  submissionController,
  submissionReviewController,
  authMiddleware,
  submissionLimiter,
);
export const userRoutes = new UserRoutes(
  userController,
  authenticationController,
  authMiddleware,
);
