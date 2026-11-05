-- AlterEnum
ALTER TYPE "ProcessStatus" ADD VALUE 'RETURNED_FOR_ADJUSTMENT';

-- CreateEnum
CREATE TYPE "ApprovalStage" AS ENUM ('ANALYSIS', 'APPROVAL');

-- AlterEnum
ALTER TYPE "ApprovalDecision" ADD VALUE 'ADJUSTMENT_REQUESTED';

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'APPROVAL_TASK_ASSIGNED';
ALTER TYPE "AuditAction" ADD VALUE 'APPROVAL_STAGE_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE 'PROCESS_ADJUSTMENT_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE 'PROCESS_RESUBMITTED';

-- AlterTable Approval: add columns in migration-compatible state
ALTER TABLE "Approval" ADD COLUMN "stage" "ApprovalStage";
ALTER TABLE "Approval" ADD COLUMN "assignedRole" "UserRole";
ALTER TABLE "Approval" ADD COLUMN "cycle" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Approval" ADD COLUMN "decidedAt" TIMESTAMP(3);
ALTER TABLE "Approval" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "Approval" ALTER COLUMN "decision" DROP NOT NULL;

-- AlterTable AuditLog: add fromStatus and toStatus
ALTER TABLE "AuditLog" ADD COLUMN "fromStatus" "ProcessStatus";
ALTER TABLE "AuditLog" ADD COLUMN "toStatus" "ProcessStatus";

-- Backfill legacy completed approval records
UPDATE "Approval"
SET
  "stage" = 'APPROVAL',
  "assignedRole" = 'APROVADOR',
  "cycle" = 1,
  "decidedAt" = "createdAt"
WHERE "stage" IS NULL;

-- Backfill legacy processes currently in AWAITING_APPROVAL without pending or completed tasks
INSERT INTO "Approval" ("id", "processId", "stage", "assignedRole", "cycle", "createdAt")
SELECT
  gen_random_uuid(),
  p."id",
  'APPROVAL',
  'APROVADOR',
  1,
  NOW()
FROM "Process" p
WHERE p."status" = 'AWAITING_APPROVAL'
  AND p."deletedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM "Approval" a
    WHERE a."processId" = p."id"
  );

-- Enforce NOT NULL on backfilled columns
ALTER TABLE "Approval" ALTER COLUMN "stage" SET NOT NULL;
ALTER TABLE "Approval" ALTER COLUMN "assignedRole" SET NOT NULL;
ALTER TABLE "Approval" ALTER COLUMN "cycle" SET NOT NULL;

-- Database integrity constraints
ALTER TABLE "Approval" ADD CONSTRAINT "chk_approval_stage_role"
CHECK (
  ("stage" = 'ANALYSIS' AND "assignedRole" = 'AGENTE_CONTRATACAO') OR
  ("stage" = 'APPROVAL' AND "assignedRole" = 'APROVADOR')
);

ALTER TABLE "Approval" ADD CONSTRAINT "chk_approval_decision_consistency"
CHECK (
  ("decision" IS NULL AND "userId" IS NULL AND "decidedAt" IS NULL) OR
  ("decision" IS NOT NULL AND "userId" IS NOT NULL AND "decidedAt" IS NOT NULL)
);

-- Partial unique index: exactly one pending task per process, cycle, and stage
CREATE UNIQUE INDEX "idx_approval_pending_unique"
ON "Approval" ("processId", "cycle", "stage")
WHERE "decision" IS NULL;

-- Performance indexes
CREATE INDEX "Approval_processId_cycle_idx" ON "Approval"("processId", "cycle");
CREATE INDEX "Approval_assignedRole_decision_idx" ON "Approval"("assignedRole", "decision");
CREATE INDEX "Approval_stage_decision_idx" ON "Approval"("stage", "decision");

