BEGIN;

CREATE TYPE "Specialization" AS ENUM ('CARDIOLOGY', 'DENTISTRY', 'DERMATOLOGY', 'ENT', 'GENERAL_MEDICINE', 'GENERAL_SURGERY', 'GYNECOLOGY', 'NEUROLOGY', 'OPHTHALMOLOGY', 'ORTHOPEDICS', 'OTHER', 'PEDIATRICS', 'PSYCHIATRY');

CREATE TABLE "doctors" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_by" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "medical_registration_no" VARCHAR(100) NOT NULL,
    "email" TEXT NOT NULL,
    "specialization" "Specialization" NOT NULL,
    "hospital" VARCHAR(200) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctors_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "doctors_user_id_key" ON "doctors"("user_id");

CREATE UNIQUE INDEX "doctors_medical_registration_no_key" ON "doctors"("medical_registration_no");

CREATE INDEX "doctors_is_deleted_created_at_idx" ON "doctors"("is_deleted", "created_at" DESC);

CREATE INDEX "doctors_specialization_is_deleted_is_active_idx" ON "doctors"("specialization", "is_deleted", "is_active");

ALTER TABLE "doctors" ADD CONSTRAINT "doctors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "doctors" ADD CONSTRAINT "doctors_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "doctors"
  ALTER COLUMN "name" TYPE VARCHAR(100) COLLATE "pg_c_utf8",
  ALTER COLUMN "medical_registration_no" TYPE VARCHAR(100) COLLATE "pg_c_utf8",
  ALTER COLUMN "hospital" TYPE VARCHAR(200) COLLATE "pg_c_utf8",
  ALTER COLUMN "email" TYPE TEXT COLLATE "pg_c_utf8",
  ALTER COLUMN "phone" TYPE VARCHAR(20) COLLATE "pg_c_utf8";

COMMIT;
