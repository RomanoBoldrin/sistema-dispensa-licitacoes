-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'AUTORIDADE_COMPETENTE';

-- AlterEnum
ALTER TYPE "ProcessStatus" ADD VALUE 'AWAITING_FINAL_AUTHORIZATION';
ALTER TYPE "ProcessStatus" ADD VALUE 'AWAITING_PUBLICATION';
ALTER TYPE "ProcessStatus" ADD VALUE 'FINAL_AUTHORIZATION_REFUSED';

-- CreateEnum
CREATE TYPE "FinalAuthorizationDecision" AS ENUM ('AUTHORIZED', 'REFUSED', 'ADJUSTMENT_REQUESTED');

-- CreateEnum
CREATE TYPE "PublicationType" AS ENUM ('DIRECT_AWARD_NOTICE', 'AUTHORIZATION_EXTRACT', 'CONTRACT_EXTRACT', 'OTHER');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'FINAL_AUTHORIZATION_INITIATED';
ALTER TYPE "AuditAction" ADD VALUE 'FINAL_AUTHORIZATION_GRANTED';
ALTER TYPE "AuditAction" ADD VALUE 'FINAL_AUTHORIZATION_REFUSED';
ALTER TYPE "AuditAction" ADD VALUE 'FINAL_AUTHORIZATION_ADJUSTMENT_REQUESTED';
ALTER TYPE "AuditAction" ADD VALUE 'PUBLICATION_REGISTERED';
ALTER TYPE "AuditAction" ADD VALUE 'PUBLICATION_SUPERSEDED';

-- CreateTable FinalAuthorization
CREATE TABLE "FinalAuthorization" (
    "id" UUID NOT NULL,
    "processId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "decision" "FinalAuthorizationDecision" NOT NULL,
    "justification" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cycle" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "FinalAuthorization_pkey" PRIMARY KEY ("id")
);

-- CreateTable PublicationRecord
CREATE TABLE "PublicationRecord" (
    "id" UUID NOT NULL,
    "processId" UUID NOT NULL,
    "publicationType" "PublicationType" NOT NULL,
    "destination" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "referenceNumber" TEXT,
    "url" TEXT,
    "documentId" UUID,
    "createdById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "PublicationRecord_pkey" PRIMARY KEY ("id")
);

-- Foreign Keys for FinalAuthorization
ALTER TABLE "FinalAuthorization" ADD CONSTRAINT "FinalAuthorization_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "FinalAuthorization" ADD CONSTRAINT "FinalAuthorization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Foreign Keys for PublicationRecord
ALTER TABLE "PublicationRecord" ADD CONSTRAINT "PublicationRecord_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PublicationRecord" ADD CONSTRAINT "PublicationRecord_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PublicationRecord" ADD CONSTRAINT "PublicationRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Database Integrity Constraints for FinalAuthorization
ALTER TABLE "FinalAuthorization" ADD CONSTRAINT "chk_final_auth_cycle_positive"
CHECK ("cycle" >= 1);

ALTER TABLE "FinalAuthorization" ADD CONSTRAINT "chk_final_auth_justification"
CHECK (
  ("decision" = 'AUTHORIZED') OR
  (("decision" = 'REFUSED' OR "decision" = 'ADJUSTMENT_REQUESTED') AND "justification" IS NOT NULL AND length(trim("justification")) > 0)
);

-- Partial unique index: exactly one active final authorization decision per process and cycle
CREATE UNIQUE INDEX "idx_final_auth_active_cycle_unique"
ON "FinalAuthorization" ("processId", "cycle")
WHERE "deletedAt" IS NULL;

-- Indexes for FinalAuthorization
CREATE INDEX "FinalAuthorization_processId_cycle_idx" ON "FinalAuthorization"("processId", "cycle");
CREATE INDEX "FinalAuthorization_userId_idx" ON "FinalAuthorization"("userId");
CREATE INDEX "FinalAuthorization_decision_idx" ON "FinalAuthorization"("decision");
CREATE INDEX "FinalAuthorization_decidedAt_idx" ON "FinalAuthorization"("decidedAt");

-- Database Integrity Constraints for PublicationRecord
ALTER TABLE "PublicationRecord" ADD CONSTRAINT "chk_publication_destination_not_empty"
CHECK (length(trim("destination")) > 0);

-- Indexes for PublicationRecord
CREATE INDEX "PublicationRecord_processId_idx" ON "PublicationRecord"("processId");
CREATE INDEX "PublicationRecord_createdById_idx" ON "PublicationRecord"("createdById");
CREATE INDEX "PublicationRecord_publicationType_idx" ON "PublicationRecord"("publicationType");
CREATE INDEX "PublicationRecord_publishedAt_idx" ON "PublicationRecord"("publishedAt");
CREATE INDEX "PublicationRecord_documentId_idx" ON "PublicationRecord"("documentId");

