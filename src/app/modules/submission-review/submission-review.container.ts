import { prisma } from "../../share/prisma/prisma";
import {
  submissionRepository,
  submissionService,
} from "../submission/submission.container";
import { auditLogService } from "../audit-log/audit-log.container";
import { SubmissionReviewRepository } from "./submission-review.repository";
import { SubmissionReviewService } from "./submission-review.service";
import { SubmissionReviewController } from "./submission-review.controller";

export const submissionReviewRepository = new SubmissionReviewRepository(
  prisma,
);
export const submissionReviewService = new SubmissionReviewService(
  submissionReviewRepository,
  submissionService,
  auditLogService,
  submissionRepository,
);
export const submissionReviewController = new SubmissionReviewController(
  submissionReviewService,
);
