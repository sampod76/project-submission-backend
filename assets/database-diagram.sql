CREATE TABLE "users"(
    "id" UUID NOT NULL DEFAULT gen_random_uuid(), "email" VARCHAR(255) NOT NULL, "password" VARCHAR(255) NOT NULL, "role" VARCHAR(255) CHECK
        (
            "role" IN('ADMIN', 'MENTOR', 'STUDENT')
        ) NOT NULL DEFAULT 'STUDENT',
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "last_login_at" TIMESTAMP(0)
    WITH
        TIME zone NULL,
        "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
        "deleted_at" TIMESTAMP(0)
    WITH
        TIME zone NULL,
        "created_at" TIMESTAMP(0)
    WITH
        TIME zone NOT NULL DEFAULT NOW(), "updated_at" TIMESTAMP(0)
    WITH
        TIME zone NOT NULL DEFAULT NOW());
ALTER TABLE
    "users" ADD PRIMARY KEY("id");
ALTER TABLE
    "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");
CREATE TABLE "admins"(
    "id" UUID NOT NULL DEFAULT gen_random_uuid(), "user_id" UUID NOT NULL, "first_name" VARCHAR(100) NOT NULL, "last_name" VARCHAR(100) NOT NULL, "phone" VARCHAR(20) NULL, "bio" TEXT NULL, "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE, "deleted_at" TIMESTAMP(0) WITH
        TIME zone NULL,
        "created_at" TIMESTAMP(0)
    WITH
        TIME zone NOT NULL DEFAULT NOW(), "updated_at" TIMESTAMP(0)
    WITH
        TIME zone NOT NULL DEFAULT NOW());
ALTER TABLE
    "admins" ADD PRIMARY KEY("id");
ALTER TABLE
    "admins" ADD CONSTRAINT "admins_user_id_unique" UNIQUE("user_id");
CREATE TABLE "mentors"(
    "id" UUID NOT NULL DEFAULT gen_random_uuid(), "user_id" UUID NOT NULL, "first_name" VARCHAR(100) NOT NULL, "last_name" VARCHAR(100) NOT NULL, "gender" VARCHAR(255) NOT NULL, "phone" VARCHAR(20) NULL, "bio" TEXT NULL, "created_by_admin_id" UUID NULL, "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE, "deleted_at" TIMESTAMP(0) WITH
        TIME zone NULL,
        "created_at" TIMESTAMP(0)
    WITH
        TIME zone NOT NULL DEFAULT NOW(), "updated_at" TIMESTAMP(0)
    WITH
        TIME zone NOT NULL DEFAULT NOW());
ALTER TABLE
    "mentors" ADD PRIMARY KEY("id");
ALTER TABLE
    "mentors" ADD CONSTRAINT "mentors_user_id_unique" UNIQUE("user_id");
COMMENT
ON COLUMN
    "mentors"."created_by_admin_id" IS 'Null allowed for seeded or imported mentor accounts.';
CREATE TABLE "students"(
    "id" UUID NOT NULL DEFAULT gen_random_uuid(), "user_id" UUID NOT NULL, "first_name" VARCHAR(100) NOT NULL, "last_name" VARCHAR(100) NOT NULL, "phone" VARCHAR(20) NULL, "gender" VARCHAR(255) NULL, "bio" TEXT NULL, "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE, "deleted_at" TIMESTAMP(0) WITH
        TIME zone NULL,
        "created_at" TIMESTAMP(0)
    WITH
        TIME zone NOT NULL DEFAULT NOW(), "updated_at" TIMESTAMP(0)
    WITH
        TIME zone NOT NULL DEFAULT NOW());
ALTER TABLE
    "students" ADD PRIMARY KEY("id");
ALTER TABLE
    "students" ADD CONSTRAINT "students_user_id_unique" UNIQUE("user_id");
CREATE TABLE "submissions"(
    "id" UUID NOT NULL DEFAULT gen_random_uuid(), "student_id" UUID NOT NULL, "project_name" VARCHAR(200) NOT NULL, "repo_url" TEXT NOT NULL, "repo_full_name" TEXT NOT NULL, "live_url" TEXT NOT NULL, "description" TEXT NOT NULL, "status" VARCHAR(255) CHECK
        (
            "status" IN('PENDING', 'APPROVED', 'REJECTED')
        ) NOT NULL DEFAULT 'PENDING',
        "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
        "deleted_at" TIMESTAMP(0)
    WITH
        TIME zone NULL,
        "created_at" TIMESTAMP(0)
    WITH
        TIME zone NOT NULL DEFAULT NOW(), "updated_at" TIMESTAMP(0)
    WITH
        TIME zone NOT NULL DEFAULT NOW());
ALTER TABLE
    "submissions" ADD PRIMARY KEY("id");
COMMENT
ON COLUMN
    "submissions"."repo_full_name" IS 'Canonical GitHub repository URL for duplicate detection.';
CREATE TABLE "submission_reviews"(
    "id" UUID NOT NULL DEFAULT gen_random_uuid(), "submission_id" UUID NOT NULL, "reviewer_user_id" UUID NOT NULL, "previous_status" VARCHAR(255) CHECK
        (
            "previous_status" IN('PENDING', 'APPROVED', 'REJECTED')
        ) NOT NULL,
        "status" VARCHAR(255)
    CHECK
        (
            "status" IN('PENDING', 'APPROVED', 'REJECTED')
        ) NOT NULL,
        "feedback" TEXT NULL,
        "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
        "deleted_at" TIMESTAMP(0)
    WITH
        TIME zone NULL,
        "created_at" TIMESTAMP(0)
    WITH
        TIME zone NOT NULL DEFAULT NOW(), "updated_at" TIMESTAMP(0)
    WITH
        TIME zone NOT NULL DEFAULT NOW());
ALTER TABLE
    "submission_reviews" ADD PRIMARY KEY("id");
COMMENT
ON COLUMN
    "submission_reviews"."reviewer_user_id" IS 'Must belong to an active ADMIN or MENTOR. Enforce through backend RBAC.';
COMMENT
ON COLUMN
    "submission_reviews"."status" IS 'Review target should be APPROVED or REJECTED.';
CREATE TABLE "audit_logs"(
    "id" UUID NOT NULL DEFAULT gen_random_uuid(), "actor_user_id" UUID NULL, "action" VARCHAR(100) NOT NULL, "entity_type" VARCHAR(100) NOT NULL, "entity_id" UUID NULL, "old_data" jsonb NULL, "new_data" jsonb NULL, "ip_address" VARCHAR(45) NULL, "user_agent" TEXT NULL, "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE, "deleted_at" TIMESTAMP(0) WITH
        TIME zone NULL,
        "created_at" TIMESTAMP(0)
    WITH
        TIME zone NOT NULL DEFAULT NOW());
CREATE INDEX "audit_logs_actor_user_id_created_at_index" ON
    "audit_logs"("actor_user_id", "created_at");
CREATE INDEX "audit_logs_entity_type_entity_id_created_at_index" ON
    "audit_logs"(
        "entity_type",
        "entity_id",
        "created_at"
    );
ALTER TABLE
    "audit_logs" ADD PRIMARY KEY("id");
COMMENT
ON COLUMN
    "audit_logs"."actor_user_id" IS 'Nullable for automated or system activities.';
ALTER TABLE
    "mentors" ADD CONSTRAINT "mentors_user_id_foreign" FOREIGN KEY("user_id") REFERENCES "users"("id");
ALTER TABLE
    "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_foreign" FOREIGN KEY("actor_user_id") REFERENCES "users"("id");
ALTER TABLE
    "admins" ADD CONSTRAINT "admins_user_id_foreign" FOREIGN KEY("user_id") REFERENCES "users"("id");
ALTER TABLE
    "students" ADD CONSTRAINT "students_user_id_foreign" FOREIGN KEY("user_id") REFERENCES "users"("id");
ALTER TABLE
    "submission_reviews" ADD CONSTRAINT "submission_reviews_reviewer_user_id_foreign" FOREIGN KEY("reviewer_user_id") REFERENCES "users"("id");
ALTER TABLE
    "submission_reviews" ADD CONSTRAINT "submission_reviews_submission_id_foreign" FOREIGN KEY("submission_id") REFERENCES "submissions"("id");
ALTER TABLE
    "submissions" ADD CONSTRAINT "submissions_student_id_foreign" FOREIGN KEY("student_id") REFERENCES "students"("id");
ALTER TABLE
    "mentors" ADD CONSTRAINT "mentors_created_by_admin_id_foreign" FOREIGN KEY("created_by_admin_id") REFERENCES "admins"("id");