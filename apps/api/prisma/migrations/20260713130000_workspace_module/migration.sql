-- Workspace vertical slice (Phase 2 · Sprint 2 · Epic 1).
-- Adds case-insensitive per-owner name uniqueness via `normalizedName`, and a
-- minimal append-only audit trail for workspace create/rename.

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('WORKSPACE_CREATED', 'WORKSPACE_RENAMED');

-- AlterTable: add normalizedName in three safe steps (nullable -> backfill -> NOT NULL)
ALTER TABLE "workspaces" ADD COLUMN "normalizedName" TEXT;
UPDATE "workspaces" SET "normalizedName" = lower(btrim("name"));
ALTER TABLE "workspaces" ALTER COLUMN "normalizedName" SET NOT NULL;

-- Replace the case-sensitive per-owner name uniqueness with the normalized one.
DROP INDEX "workspaces_ownerId_name_key";
CREATE UNIQUE INDEX "workspaces_ownerId_normalizedName_key" ON "workspaces"("ownerId", "normalizedName");

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "beforeSnapshot" JSONB,
    "afterSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_workspaceId_idx" ON "audit_logs"("workspaceId");

-- CreateIndex
CREATE INDEX "audit_logs_actorId_idx" ON "audit_logs"("actorId");

-- AddForeignKey: RESTRICT so audit history is never silently erased by a future
-- workspace or user deletion (no deletion functionality exists in this epic).
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
