BEGIN;

CREATE TABLE "admins" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admins_user_id_key" ON "admins"("user_id");

CREATE INDEX "admins_is_deleted_created_at_idx" ON "admins"("is_deleted", "created_at" DESC);

ALTER TABLE "admins" ADD CONSTRAINT "admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "admins"
  ALTER COLUMN "name" TYPE VARCHAR(100) COLLATE "pg_c_utf8",
  ALTER COLUMN "phone" TYPE VARCHAR(20) COLLATE "pg_c_utf8";

COMMIT;
