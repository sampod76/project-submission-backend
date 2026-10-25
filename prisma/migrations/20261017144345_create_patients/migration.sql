BEGIN;

CREATE TYPE "Gender" AS ENUM ('FEMALE', 'MALE', 'OTHER');

CREATE TYPE "TreatmentStatus" AS ENUM ('ACTIVE', 'RECOVERED', 'UNDER_OBSERVATION');

CREATE TABLE "patients" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "doctor_id" UUID NOT NULL,
    "age" DOUBLE PRECISION NOT NULL,
    "gender" "Gender" NOT NULL,
    "address" VARCHAR(500),
    "patient_complaint" VARCHAR(5000) NOT NULL,
    "doctor_advice" VARCHAR(5000),
    "notes" VARCHAR(5000),
    "treatment_status" "TreatmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_visit_at" TIMESTAMPTZ(3),
    "follow_up_date" TIMESTAMPTZ(3),
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "patients_doctor_id_is_deleted_created_at_idx" ON "patients"("doctor_id", "is_deleted", "created_at" DESC);

CREATE INDEX "patients_doctor_id_is_deleted_phone_idx" ON "patients"("doctor_id", "is_deleted", "phone");

ALTER TABLE "patients" ADD CONSTRAINT "patients_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "patients"
  ALTER COLUMN "name" TYPE VARCHAR(100) COLLATE "pg_c_utf8",
  ALTER COLUMN "phone" TYPE VARCHAR(20) COLLATE "pg_c_utf8",
  ALTER COLUMN "patient_complaint" TYPE VARCHAR(5000) COLLATE "pg_c_utf8";
ALTER TABLE "patients" ADD CONSTRAINT "patients_age_range" CHECK ("age" >= 0 AND "age" <= 150);

COMMIT;
