-- CreateEnum
CREATE TYPE "submissions"."SubmissionStatus" AS ENUM (
  'PENDING',
  'APPROVED',
  'REJECTED',
  'REVISION_REQUIRED'
);

-- Convert the existing status columns to the native PostgreSQL enum.
ALTER TABLE "submissions"."submission_reviews"
  ALTER COLUMN "previous_status" TYPE "submissions"."SubmissionStatus"
    USING "previous_status"::"submissions"."SubmissionStatus",
  ALTER COLUMN "status" TYPE "submissions"."SubmissionStatus"
    USING "status"::"submissions"."SubmissionStatus";

ALTER TABLE "submissions"."submissions"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "submissions"."SubmissionStatus"
    USING "status"::"submissions"."SubmissionStatus",
  ALTER COLUMN "status" SET DEFAULT 'PENDING'::"submissions"."SubmissionStatus";
