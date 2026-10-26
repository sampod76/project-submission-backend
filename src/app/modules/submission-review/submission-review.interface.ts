import type { SubmissionReviewRepository } from "./submission-review.repository";
export type ISubmissionReviewRepository = Pick<
  SubmissionReviewRepository,
  keyof SubmissionReviewRepository
>;
export interface ReviewRequestContext {
  ipAddress?: string;
  userAgent?: string;
}
import type { Prisma } from "@prisma/client";
import type { PaginatedResult } from "../../interfaces/response";
import type { IUserRef } from "../../interfaces/user.ref";
import type { REVIEW_SELECT } from "./submission-review.constant";
import type {
  CreateReviewDto,
  ListReviewsQuery,
} from "./submission-review.validation";
export type ReviewResponse = Prisma.SubmissionReviewGetPayload<{
  select: typeof REVIEW_SELECT;
}>;
export interface ISubmissionReviewService {
  create(
    id: string,
    dto: CreateReviewDto,
    authUser: IUserRef,
    context?: ReviewRequestContext,
  ): Promise<ReviewResponse>;
  findAll(
    id: string,
    query: ListReviewsQuery,
    authUser: IUserRef,
  ): Promise<PaginatedResult<ReviewResponse>>;
}
