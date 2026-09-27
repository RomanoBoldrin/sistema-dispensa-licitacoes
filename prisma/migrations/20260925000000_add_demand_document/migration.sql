-- CreateEnum: ObjectCategory
CREATE TYPE "ObjectCategory" AS ENUM ('COMMON_GOODS', 'ENGINEERING_WORKS', 'GENERAL_SERVICES', 'IT_GOODS', 'HEALTH_SUPPLIES', 'OTHER');

-- CreateEnum: UrgencyLevel
CREATE TYPE "UrgencyLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- Alter DocumentType: remove DEMANDA (recreate enum)
CREATE TYPE "DocumentType_new" AS ENUM ('PESQUISA_PRECOS', 'JUSTIFICATIVA_PRECO', 'RAZAO_ESCOLHA_FORNECEDOR', 'DOCUMENTACAO_FORNECEDOR', 'PARECER_JURIDICO', 'TERMO_REFERENCIA', 'OUTRO');
ALTER TABLE "Document" ALTER COLUMN "type" TYPE "DocumentType_new" USING "type"::text::"DocumentType_new";
ALTER TYPE "DocumentType" RENAME TO "DocumentType_old";
ALTER TYPE "DocumentType_new" RENAME TO "DocumentType";
DROP TYPE "DocumentType_old";

-- Alter AuditAction: add DEMAND_DOCUMENT_CREATED and DEMAND_DOCUMENT_UPDATED
ALTER TYPE "AuditAction" ADD VALUE 'DEMAND_DOCUMENT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'DEMAND_DOCUMENT_UPDATED';

-- CreateTable: DemandDocument
CREATE TABLE "DemandDocument" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "category" "ObjectCategory" NOT NULL,
    "detailedJustification" TEXT NOT NULL,
    "technicalSpecifications" TEXT,
    "urgency" "UrgencyLevel" NOT NULL DEFAULT 'MEDIUM',
    "budgetSource" TEXT,
    "desiredDeadlineDays" INTEGER,
    "responsibleName" TEXT NOT NULL,
    "responsibleEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemandDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique processId (1:1 relation)
CREATE UNIQUE INDEX "DemandDocument_processId_key" ON "DemandDocument"("processId");

-- CreateIndex: category and urgency for compliance engine queries
CREATE INDEX "DemandDocument_category_idx" ON "DemandDocument"("category");
CREATE INDEX "DemandDocument_urgency_idx" ON "DemandDocument"("urgency");

-- AddForeignKey
ALTER TABLE "DemandDocument" ADD CONSTRAINT "DemandDocument_processId_fkey" FOREIGN KEY ("processId") REFERENCES "Process"("id") ON DELETE CASCADE ON UPDATE CASCADE;
