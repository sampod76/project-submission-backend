import { AbstractRoute } from "../../core/abstract/AbstractRoute";
import type { RequestHandler } from "express";
import type { AuthMiddleware } from "../../middlewares/authMiddleware";
import type { SubmissionController } from "./submission.controller";
import {
  createSubmissionZodSchema,
  updateSubmissionZodSchema,
  getSubmissionZodSchema,
  listSubmissionsZodSchema,
  mySubmissionsZodSchema,
} from "./submission.validation";
import type { SubmissionReviewController } from "../submission-review/submission-review.controller";
import {
  createReviewZodSchema,
  listReviewsZodSchema,
} from "../submission-review/submission-review.validation";
export class SubmissionRoutes extends AbstractRoute {
  constructor(
    private readonly controller: SubmissionController,
    private readonly reviewController: SubmissionReviewController,
    authMiddleware: AuthMiddleware,
    private readonly submissionLimiter: RequestHandler,
  ) {
    super(authMiddleware);
    this.init();
  }
  protected init(): void {
    const { ADMIN, MENTOR, STUDENT } = this.USER_ROLE;
    this.router.post(
      "/",
      this.authMiddleware(STUDENT),
      this.submissionLimiter,
      this.validateRequestZod(createSubmissionZodSchema),
      this.controller.create,
    );
    this.router.get(
      "/",
      this.authMiddleware(ADMIN, MENTOR),
      this.validateRequestZod(listSubmissionsZodSchema),
      this.controller.list,
    );
    this.router.get(
      "/my",
      this.authMiddleware(STUDENT),
      this.validateRequestZod(mySubmissionsZodSchema),
      this.controller.mine,
    );
    this.router.get(
      "/statistics",
      this.authMiddleware(ADMIN, MENTOR),
      this.controller.statistics,
    );
    this.router.get(
      "/:id",
      this.authMiddleware(ADMIN, MENTOR, STUDENT),
      this.validateRequestZod(getSubmissionZodSchema),
      this.controller.getById,
    );
    this.router.patch(
      "/:id",
      this.authMiddleware(STUDENT),
      this.validateRequestZod(updateSubmissionZodSchema),
      this.controller.update,
    );
    this.router.delete(
      "/:id",
      this.authMiddleware(STUDENT),
      this.validateRequestZod(getSubmissionZodSchema),
      this.controller.remove,
    );
    this.router.post(
      "/:id/reviews",
      this.authMiddleware(ADMIN, MENTOR),
      this.validateRequestZod(createReviewZodSchema),
      this.reviewController.create,
    );
    this.router.get(
      "/:id/reviews",
      this.authMiddleware(ADMIN, MENTOR),
      this.validateRequestZod(listReviewsZodSchema),
      this.reviewController.list,
    );
  }
}
