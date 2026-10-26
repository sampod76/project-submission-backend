-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "auth";

CREATE SCHEMA IF NOT EXISTS "logs";

CREATE SCHEMA IF NOT EXISTS "submissions";

-- CreateEnum
CREATE TYPE "auth"."Role" AS ENUM ('ADMIN', 'MENTOR', 'STUDENT');

-- CreateTable
CREATE TABLE
    "auth"."admins" (
        "id" UUID NOT NULL,
        "user_id" UUID NOT NULL,
        "first_name" VARCHAR(100) NOT NULL,
        "last_name" VARCHAR(100) NOT NULL,
        "phone" VARCHAR(20),
        "bio" TEXT,
        "is_deleted" BOOLEAN NOT NULL DEFAULT false,
        "deleted_at" TIMESTAMPTZ (0),
        "created_at" TIMESTAMPTZ (0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ (0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
    );

-- CreateTable
CREATE TABLE
    "logs"."audit_logs" (
        "id" UUID NOT NULL,
        "actor_user_id" UUID,
        "action" VARCHAR(100) NOT NULL,
        "entity_type" VARCHAR(100) NOT NULL,
        "entity_id" UUID,
        "old_data" JSONB,
        "new_data" JSONB,
        "ip_address" VARCHAR(45),
        "user_agent" TEXT,
        "is_deleted" BOOLEAN NOT NULL DEFAULT false,
        "deleted_at" TIMESTAMPTZ (0),
        "created_at" TIMESTAMPTZ (0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
    );

-- CreateTable
CREATE TABLE
    "auth"."mentors" (
        "id" UUID NOT NULL,
        "user_id" UUID NOT NULL,
        "first_name" VARCHAR(100) NOT NULL,
        "last_name" VARCHAR(100) NOT NULL,
        "phone" VARCHAR(20),
        "bio" TEXT,
        "gender" VARCHAR(255) NOT NULL,
        "created_by_admin_id" UUID,
        "is_deleted" BOOLEAN NOT NULL DEFAULT false,
        "deleted_at" TIMESTAMPTZ (0),
        "created_at" TIMESTAMPTZ (0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ (0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "mentors_pkey" PRIMARY KEY ("id")
    );

-- CreateTable
CREATE TABLE
    "auth"."students" (
        "id" UUID NOT NULL,
        "user_id" UUID NOT NULL,
        "first_name" VARCHAR(100) NOT NULL,
        "last_name" VARCHAR(100) NOT NULL,
        "phone" VARCHAR(20),
        "bio" TEXT,
        "gender" VARCHAR(255),
        "is_deleted" BOOLEAN NOT NULL DEFAULT false,
        "deleted_at" TIMESTAMPTZ (0),
        "created_at" TIMESTAMPTZ (0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ (0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "students_pkey" PRIMARY KEY ("id")
    );

-- CreateTable
CREATE TABLE
    "submissions"."submission_reviews" (
        "id" UUID NOT NULL,
        "submission_id" UUID NOT NULL,
        "reviewer_user_id" UUID NOT NULL,
        "previous_status" VARCHAR(255) NOT NULL,
        "status" VARCHAR(255) NOT NULL,
        "feedback" TEXT,
        "is_deleted" BOOLEAN NOT NULL DEFAULT false,
        "deleted_at" TIMESTAMPTZ (0),
        "created_at" TIMESTAMPTZ (0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ (0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "submission_reviews_pkey" PRIMARY KEY ("id")
    );

-- CreateTable
CREATE TABLE
    "submissions"."submissions" (
        "id" UUID NOT NULL,
        "student_id" UUID NOT NULL,
        "project_name" VARCHAR(200) NOT NULL,
        "repo_url" TEXT NOT NULL,
        "repo_full_name" TEXT NOT NULL,
        "live_url" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "status" VARCHAR(255) NOT NULL DEFAULT 'PENDING',
        "is_deleted" BOOLEAN NOT NULL DEFAULT false,
        "deleted_at" TIMESTAMPTZ (0),
        "created_at" TIMESTAMPTZ (0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ (0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
    );

-- CreateTable
CREATE TABLE
    "auth"."users" (
        "id" UUID NOT NULL,
        "email" VARCHAR(255) NOT NULL,
        "password" VARCHAR(255) NOT NULL,
        "role" "auth"."Role" NOT NULL DEFAULT 'STUDENT',
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "last_login_at" TIMESTAMPTZ (0),
        "is_deleted" BOOLEAN NOT NULL DEFAULT false,
        "deleted_at" TIMESTAMPTZ (0),
        "created_at" TIMESTAMPTZ (0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ (0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "users_pkey" PRIMARY KEY ("id")
    );

-- CreateIndex
CREATE UNIQUE INDEX "admins_user_id_key" ON "auth"."admins" ("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "logs"."audit_logs" ("actor_user_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_created_at_idx" ON "logs"."audit_logs" ("entity_type", "entity_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "mentors_user_id_key" ON "auth"."mentors" ("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "students_user_id_key" ON "auth"."students" ("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "auth"."users" ("email");

-- AddForeignKey
ALTER TABLE "auth"."admins" ADD CONSTRAINT "admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs"."audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth"."mentors" ADD CONSTRAINT "mentors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth"."mentors" ADD CONSTRAINT "mentors_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "auth"."admins" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth"."students" ADD CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions"."submission_reviews" ADD CONSTRAINT "submission_reviews_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"."submissions" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions"."submission_reviews" ADD CONSTRAINT "submission_reviews_reviewer_user_id_fkey" FOREIGN KEY ("reviewer_user_id") REFERENCES "auth"."users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions"."submissions" ADD CONSTRAINT "submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "auth"."students" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;