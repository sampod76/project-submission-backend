import { prisma } from "../../share/prisma/prisma";
import { SubmissionRepository } from "./submission.repository";
import { SubmissionService } from "./submission.service";
import { SubmissionController } from "./submission.controller";

export const submissionRepository = new SubmissionRepository(prisma);
export const submissionService = new SubmissionService(submissionRepository);
export const submissionController = new SubmissionController(submissionService);
