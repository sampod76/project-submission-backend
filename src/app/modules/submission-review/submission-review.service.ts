import type { ISubmissionReviewService } from "./submission-review.interface";
import { AbstractService } from "../../core/abstract/AbstractService";
import { ApiError } from "../../errors/ApiError";
import type { IUserRef } from "../../interfaces/user.ref";
import type {
  ISubmissionService,
  ISubmissionRepository,
} from "../submission/submission.interface";
import { ACTIVE_SUBMISSION_WHERE } from "../submission/submission.constant";
import type { IAuditLogService } from "../audit-log/audit-log.interface";
import type {
  ISubmissionReviewRepository,
  ReviewRequestContext,
} from "./submission-review.interface";
import { REVIEW_SELECT } from "./submission-review.constant";
import type {
  CreateReviewDto,
  ListReviewsQuery,
} from "./submission-review.validation";
export class SubmissionReviewService
  extends AbstractService
  implements ISubmissionReviewService
{
  constructor(
    private readonly repository: ISubmissionReviewRepository,
    private readonly submissions: ISubmissionService,
    private readonly audits: IAuditLogService,
    private readonly submissionRecords: ISubmissionRepository,
  ) {
    super();
  }

  async create(
    id: string,
    dto: CreateReviewDto,
    authUser: IUserRef,
    context: ReviewRequestContext = {},
  ) {
    if (dto.status !== "APPROVED" && dto.status !== "REJECTED")
      throw new ApiError(400, "Invalid review target status");
    return this.repository.transaction(async tx => {
      const [reviewer] = await this.repository.lockReviewer(
        authUser.userId,
        tx,
      );
      if (
        !reviewer ||
        (reviewer.role !== "ADMIN" && reviewer.role !== "MENTOR")
      )
        throw new ApiError(403, "Active reviewer account required");
      const row = await this.submissions.findOne(id, authUser, tx);
      if (row.status !== "PENDING")
        throw new ApiError(409, "Only PENDING submissions can be reviewed");
      const updated = await this.submissionRecords.updateMany(
        {
          where: { ...ACTIVE_SUBMISSION_WHERE, id, status: "PENDING" },
          data: { status: dto.status },
        },
        tx,
      );
      if (updated.count !== 1)
        throw new ApiError(409, "Submission already reviewed or changed");
      const review = await this.repository.create(
        {
          data: {
            submissionId: id,
            reviewerUserId: authUser.userId,
            previousStatus: row.status,
            status: dto.status,
            feedback: dto.feedback,
          },
          select: REVIEW_SELECT,
        },
        tx,
      );
      await this.audits.record(
        {
          actorUserId: authUser.userId,
          action: "SUBMISSION_REVIEWED",
          entityType: "Submission",
          entityId: id,
          oldData: { status: row.status },
          newData: { status: dto.status, reviewId: review.id },
          ...context,
        },
        tx,
      );
      return review;
    }, "ReadCommitted");
  }
  async findAll(id: string, query: ListReviewsQuery, authUser: IUserRef) {
    const pagination = this.calculatePagination(query);
    return this.repository.transaction(async tx => {
      await this.submissions.findOne(id, authUser, tx);
      const where = { submissionId: id, isDeleted: false };
      const [data, total] = await Promise.all([
        this.repository.findMany(
          {
            where,
            select: REVIEW_SELECT,
            skip: pagination.skip,
            take: pagination.limit,
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          },
          tx,
        ),
        this.repository.count({ where }, tx),
      ]);
      return {
        data,
        meta: { page: pagination.page, limit: pagination.limit, total },
      };
    });
  }
}
