-- AlterTable: add isActive to Document
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex: unique quotation per supplier per process
CREATE UNIQUE INDEX IF NOT EXISTS "Quotation_processId_supplierId_key" ON "Quotation"("processId", "supplierId");

-- CreateIndex: Document active queries
CREATE INDEX IF NOT EXISTS "Document_processId_isActive_idx" ON "Document"("processId", "isActive");

-- CreateIndex: Process dashboard composites
CREATE INDEX IF NOT EXISTS "Process_departmentId_status_idx" ON "Process"("departmentId", "status");
CREATE INDEX IF NOT EXISTS "Process_requesterId_status_idx" ON "Process"("requesterId", "status");

-- CreateIndex: Session composite
CREATE INDEX IF NOT EXISTS "idxSessionsUserExpires" ON "sessions"("user_id", "expires_at");

