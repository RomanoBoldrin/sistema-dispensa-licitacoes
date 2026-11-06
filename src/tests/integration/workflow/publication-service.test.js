import password from "@/infra/password.js";
import { prisma } from "@/infra/prisma.cjs";
import orchestrator from "@/tests/orchestrator/orchestrator.mjs";
import publicationService from "@/services/publication.service.js";
import finalAuthorizationService from "@/services/final-authorization.service.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/infra/errors.js";

describe("Publication Registration Service (Integration Tests)", () => {
  jest.setTimeout(60000);

  let departmentA;
  let departmentB;
  let solicitanteA;
  let agenteA1;
  let agenteA2;
  let agenteB;
  let aprovadorA;
  let autoridadeA;
  let adminUser;
  let supplierA;

  beforeAll(async () => {
    await orchestrator.clearDatabase();

    const passwordHash = await password.hash("TestPass123!");

    departmentA = await prisma.department.create({
      data: { name: "Secretaria Municipal de Administração" },
    });

    departmentB = await prisma.department.create({
      data: { name: "Secretaria Municipal de Saúde" },
    });

    solicitanteA = await prisma.user.create({
      data: {
        name: "Silvia Solicitante",
        email: "silvia.solicitante@sisd.gov.br",
        passwordHash,
        role: "SOLICITANTE",
        departmentId: departmentA.id,
      },
    });

    agenteA1 = await prisma.user.create({
      data: {
        name: "Arnaldo Agente 1",
        email: "arnaldo.agente1@sisd.gov.br",
        passwordHash,
        role: "AGENTE_CONTRATACAO",
        departmentId: departmentA.id,
      },
    });

    agenteA2 = await prisma.user.create({
      data: {
        name: "Alice Agente 2",
        email: "alice.agente2@sisd.gov.br",
        passwordHash,
        role: "AGENTE_CONTRATACAO",
        departmentId: departmentA.id,
      },
    });

    agenteB = await prisma.user.create({
      data: {
        name: "Bernardo Agente B",
        email: "bernardo.agente@sisd.gov.br",
        passwordHash,
        role: "AGENTE_CONTRATACAO",
        departmentId: departmentB.id,
      },
    });

    aprovadorA = await prisma.user.create({
      data: {
        name: "Aparecido Aprovador",
        email: "aparecido.aprovador@sisd.gov.br",
        passwordHash,
        role: "APROVADOR",
        departmentId: departmentA.id,
      },
    });

    autoridadeA = await prisma.user.create({
      data: {
        name: "Almir Autoridade",
        email: "almir.autoridade@sisd.gov.br",
        passwordHash,
        role: "AUTORIDADE_COMPETENTE",
        departmentId: departmentA.id,
      },
    });

    adminUser = await prisma.user.create({
      data: {
        name: "Adauto Administrador",
        email: "adauto.admin@sisd.gov.br",
        passwordHash,
        role: "ADMIN",
        departmentId: departmentA.id,
      },
    });

    supplierA = await prisma.supplier.create({
      data: {
        legalName: "Tech Solutions LTDA",
        tradeName: "TechSol",
        cnpj: "12345678000199",
        email: "contato@techsol.com.br",
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  /**
   * Helper to create a process in AWAITING_PUBLICATION status
   * with authorized final decision in cycle 1
   */
  async function createAwaitingPublicationProcess({
    requester = solicitanteA,
    department = departmentA,
    cycle = 1,
  } = {}) {
    const processCount = await prisma.process.count();
    const procNumber = processCount + 1;

    const proc = await prisma.process.create({
      data: {
        number: procNumber,
        year: 2026,
        title: `Processo Teste Publicação ${procNumber}`,
        object: "Aquisição de computadores para suporte operacional",
        description: "Equipamentos para atendimento à população.",
        legalBasis: "ART_75_II",
        legalJustification:
          "Dispensa por valor conforme Art. 75, II da Lei 14.133/2021.",
        estimatedValue: 42000.0,
        priceJustification:
          "Preço compatível com pesquisa de mercado com 3 fornecedores.",
        status: "AWAITING_PUBLICATION",
        departmentId: department.id,
        requesterId: requester.id,
        selectedSupplierId: supplierA.id,
        supplierJustification: "Menor valor obtido no mapa comparativo.",
      },
    });

    // Approvals (Phase 4)
    await prisma.approval.create({
      data: {
        processId: proc.id,
        stage: "ANALYSIS",
        assignedRole: "AGENTE_CONTRATACAO",
        cycle,
        userId: agenteA1.id,
        decision: "APPROVED",
        comment: "Instrução processual completa.",
        decidedAt: new Date(),
      },
    });

    await prisma.approval.create({
      data: {
        processId: proc.id,
        stage: "APPROVAL",
        assignedRole: "APROVADOR",
        cycle,
        userId: aprovadorA.id,
        decision: "APPROVED",
        comment: "Aprovação interna concluída.",
        decidedAt: new Date(),
      },
    });

    // Final authorization (Phase 5.2)
    await prisma.finalAuthorization.create({
      data: {
        processId: proc.id,
        userId: autoridadeA.id,
        decision: "AUTHORIZED",
        justification: "Autorizo a contratação direta com base nos autos.",
        cycle,
        decidedAt: new Date(),
      },
    });

    // Supporting document
    const doc = await prisma.document.create({
      data: {
        processId: proc.id,
        type: "TERMO_REFERENCIA",
        filename: "Termo_de_Referencia.pdf",
        storageKey: `doc_${proc.id}_tr.pdf`,
        mimeType: "application/pdf",
        size: 10240,
        uploadedById: agenteA1.id,
      },
    });

    return { process: proc, document: doc };
  }

  describe("registerPublication (Primary Workflow & Lifecycle Completion)", () => {
    it("successfully registers publication, transitions to COMPLETED, and writes audit logs", async () => {
      const { process: proc, document: doc } =
        await createAwaitingPublicationProcess();

      const pubPayload = {
        publicationType: "DIRECT_AWARD_NOTICE",
        destination: "Diário Oficial do Município de São Paulo",
        publishedAt: new Date().toISOString(),
        referenceNumber: "AVISO-DISP-001/2026",
        url: "https://diariooficial.sp.gov.br/atos/2026/001",
        documentId: doc.id,
      };

      const result = await publicationService.registerPublication(
        proc.id,
        agenteA1,
        pubPayload,
      );

      // Verification of returned payload
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.processId).toBe(proc.id);
      expect(result.processStatus).toBe("COMPLETED");
      expect(result.publicationType).toBe("DIRECT_AWARD_NOTICE");
      expect(result.destination).toBe(
        "Diário Oficial do Município de São Paulo",
      );
      expect(result.referenceNumber).toBe("AVISO-DISP-001/2026");
      expect(result.url).toBe("https://diariooficial.sp.gov.br/atos/2026/001");
      expect(result.documentId).toBe(doc.id);
      expect(result.document.filename).toBe("Termo_de_Referencia.pdf");
      expect(result.createdBy.name).toBe("Arnaldo Agente 1");

      // Database verification
      const dbProcess = await prisma.process.findUnique({
        where: { id: proc.id },
      });
      expect(dbProcess.status).toBe("COMPLETED");

      const dbPublication = await prisma.publicationRecord.findUnique({
        where: { id: result.id },
      });
      expect(dbPublication).toBeDefined();
      expect(dbPublication.destination).toBe(
        "Diário Oficial do Município de São Paulo",
      );
      expect(dbPublication.createdById).toBe(agenteA1.id);

      // Atomic audit logs verification
      const auditLogs = await prisma.auditLog.findMany({
        where: { processId: proc.id },
        orderBy: { createdAt: "asc" },
      });

      const pubLog = auditLogs.find(
        (log) => log.action === "PUBLICATION_REGISTERED",
      );
      const compLog = auditLogs.find(
        (log) => log.action === "PROCESS_COMPLETED",
      );

      expect(pubLog).toBeDefined();
      expect(pubLog.userId).toBe(agenteA1.id);
      expect(pubLog.description).toContain("DIRECT_AWARD_NOTICE");

      expect(compLog).toBeDefined();
      expect(compLog.userId).toBe(agenteA1.id);
      expect(compLog.fromStatus).toBe("AWAITING_PUBLICATION");
      expect(compLog.toStatus).toBe("COMPLETED");
    });

    it("registers publication without optional documentId or url and completes process", async () => {
      const { process: proc } = await createAwaitingPublicationProcess();

      const pubPayload = {
        publicationType: "AUTHORIZATION_EXTRACT",
        destination: "Portal Nacional de Contratações Públicas (PNCP)",
        publishedAt: new Date().toISOString(),
        referenceNumber: "EXT-2026/099",
      };

      const result = await publicationService.registerPublication(
        proc.id,
        agenteA1,
        pubPayload,
      );

      expect(result.processStatus).toBe("COMPLETED");
      expect(result.document).toBeNull();
      expect(result.url).toBeNull();

      const dbProcess = await prisma.process.findUnique({
        where: { id: proc.id },
      });
      expect(dbProcess.status).toBe("COMPLETED");
    });

    it("rejects publication registration if process is not in AWAITING_PUBLICATION", async () => {
      const { process: proc } = await createAwaitingPublicationProcess();

      // Put process in APPROVED (before final authorization initiation)
      await prisma.process.update({
        where: { id: proc.id },
        data: { status: "APPROVED" },
      });

      const pubPayload = {
        publicationType: "DIRECT_AWARD_NOTICE",
        destination: "Diário Oficial",
        publishedAt: new Date(),
      };

      await expect(
        publicationService.registerPublication(proc.id, agenteA1, pubPayload),
      ).rejects.toThrow(ConflictError);
    });

    it("rejects publication registration if process is already COMPLETED (duplicate registration)", async () => {
      const { process: proc } = await createAwaitingPublicationProcess();

      const pubPayload = {
        publicationType: "DIRECT_AWARD_NOTICE",
        destination: "Diário Oficial",
        publishedAt: new Date(),
      };

      // Complete it first time
      await publicationService.registerPublication(
        proc.id,
        agenteA1,
        pubPayload,
      );

      // Second attempt must fail with ConflictError
      await expect(
        publicationService.registerPublication(proc.id, agenteA1, pubPayload),
      ).rejects.toThrow(ConflictError);
    });

    it("rejects publication registration when final authorization is missing", async () => {
      const { process: proc } = await createAwaitingPublicationProcess();

      // Delete final authorization
      await prisma.finalAuthorization.deleteMany({
        where: { processId: proc.id },
      });

      const pubPayload = {
        publicationType: "DIRECT_AWARD_NOTICE",
        destination: "Diário Oficial",
        publishedAt: new Date(),
      };

      await expect(
        publicationService.registerPublication(proc.id, agenteA1, pubPayload),
      ).rejects.toThrow(ConflictError);
    });

    it("rejects publication registration when final authorization was REFUSED", async () => {
      const { process: proc } = await createAwaitingPublicationProcess();

      // Update final authorization to REFUSED
      await prisma.finalAuthorization.updateMany({
        where: { processId: proc.id },
        data: { decision: "REFUSED" },
      });

      const pubPayload = {
        publicationType: "DIRECT_AWARD_NOTICE",
        destination: "Diário Oficial",
        publishedAt: new Date(),
      };

      await expect(
        publicationService.registerPublication(proc.id, agenteA1, pubPayload),
      ).rejects.toThrow(ConflictError);
    });

    it("rejects publication registration when final authorization belongs to an earlier cycle", async () => {
      const { process: proc } = await createAwaitingPublicationProcess();

      // Advance cycle by adding cycle 2 approval without final authorization
      await prisma.approval.create({
        data: {
          processId: proc.id,
          stage: "APPROVAL",
          assignedRole: "APROVADOR",
          cycle: 2,
          userId: aprovadorA.id,
          decision: "APPROVED",
          decidedAt: new Date(),
        },
      });

      const pubPayload = {
        publicationType: "DIRECT_AWARD_NOTICE",
        destination: "Diário Oficial",
        publishedAt: new Date(),
      };

      await expect(
        publicationService.registerPublication(proc.id, agenteA1, pubPayload),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("Document Evidence Integration", () => {
    it("rejects publication when documentId belongs to a different process", async () => {
      const { process: proc1 } = await createAwaitingPublicationProcess();
      const { process: proc2, document: doc2 } =
        await createAwaitingPublicationProcess();

      const pubPayload = {
        publicationType: "DIRECT_AWARD_NOTICE",
        destination: "Diário Oficial",
        publishedAt: new Date(),
        documentId: doc2.id, // belongs to proc2!
      };

      await expect(
        publicationService.registerPublication(proc1.id, agenteA1, pubPayload),
      ).rejects.toThrow(ValidationError);
    });

    it("rejects publication when documentId is inactive or soft-deleted", async () => {
      const { process: proc, document: doc } =
        await createAwaitingPublicationProcess();

      await prisma.document.update({
        where: { id: doc.id },
        data: { isActive: false, deletedAt: new Date() },
      });

      const pubPayload = {
        publicationType: "DIRECT_AWARD_NOTICE",
        destination: "Diário Oficial",
        publishedAt: new Date(),
        documentId: doc.id,
      };

      await expect(
        publicationService.registerPublication(proc.id, agenteA1, pubPayload),
      ).rejects.toThrow(NotFoundError);
    });

    it("rejects publication when documentId does not exist", async () => {
      const { process: proc } = await createAwaitingPublicationProcess();

      const pubPayload = {
        publicationType: "DIRECT_AWARD_NOTICE",
        destination: "Diário Oficial",
        publishedAt: new Date(),
        documentId: "99999999-9999-9999-9999-999999999999",
      };

      await expect(
        publicationService.registerPublication(proc.id, agenteA1, pubPayload),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("Role Authorization & Department Isolation", () => {
    it("denies SOLICITANTE, APROVADOR, AUTORIDADE_COMPETENTE, and ADMIN from registering publication", async () => {
      const { process: proc } = await createAwaitingPublicationProcess();

      const pubPayload = {
        publicationType: "DIRECT_AWARD_NOTICE",
        destination: "Diário Oficial",
        publishedAt: new Date(),
      };

      await expect(
        publicationService.registerPublication(
          proc.id,
          solicitanteA,
          pubPayload,
        ),
      ).rejects.toThrow(ForbiddenError);

      await expect(
        publicationService.registerPublication(proc.id, aprovadorA, pubPayload),
      ).rejects.toThrow(ForbiddenError);

      await expect(
        publicationService.registerPublication(
          proc.id,
          autoridadeA,
          pubPayload,
        ),
      ).rejects.toThrow(ForbiddenError);

      await expect(
        publicationService.registerPublication(proc.id, adminUser, pubPayload),
      ).rejects.toThrow(ForbiddenError);
    });

    it("denies AGENTE_CONTRATACAO from another department (department isolation)", async () => {
      const { process: proc } = await createAwaitingPublicationProcess();

      const pubPayload = {
        publicationType: "DIRECT_AWARD_NOTICE",
        destination: "Diário Oficial",
        publishedAt: new Date(),
      };

      await expect(
        publicationService.registerPublication(
          proc.id,
          agenteB, // Dept B!
          pubPayload,
        ),
      ).rejects.toThrow(ForbiddenError);
    });

    it("enforces segregation of duties: agent cannot register publication on own requested process", async () => {
      // Agent requested the process
      const { process: proc } = await createAwaitingPublicationProcess({
        requester: agenteA1,
      });

      const pubPayload = {
        publicationType: "DIRECT_AWARD_NOTICE",
        destination: "Diário Oficial",
        publishedAt: new Date(),
      };

      // Same agent attempts to register publication
      await expect(
        publicationService.registerPublication(proc.id, agenteA1, pubPayload),
      ).rejects.toThrow(ForbiddenError);

      // Another agent from the same department CAN register
      const result = await publicationService.registerPublication(
        proc.id,
        agenteA2,
        pubPayload,
      );
      expect(result.processStatus).toBe("COMPLETED");
    });
  });

  describe("listPublications & getPublicationDetails", () => {
    it("lists publication history for authorized department users", async () => {
      const { process: proc, document: doc } =
        await createAwaitingPublicationProcess();

      await publicationService.registerPublication(proc.id, agenteA1, {
        publicationType: "DIRECT_AWARD_NOTICE",
        destination: "Diário Oficial",
        publishedAt: new Date(),
        referenceNumber: "PUB-001",
        documentId: doc.id,
      });

      // Agent in same department can list
      const agentResult = await publicationService.listPublications(
        proc.id,
        agenteA1,
      );
      expect(agentResult.publications).toHaveLength(1);
      expect(agentResult.publications[0].referenceNumber).toBe("PUB-001");
      expect(agentResult.publications[0].document.filename).toBe(
        "Termo_de_Referencia.pdf",
      );
      expect(agentResult.publications[0].document.storageKey).toBeUndefined(); // no leak

      // Requester can list
      const reqResult = await publicationService.listPublications(
        proc.id,
        solicitanteA,
      );
      expect(reqResult.publications).toHaveLength(1);

      // Admin can list
      const adminResult = await publicationService.listPublications(
        proc.id,
        adminUser,
      );
      expect(adminResult.publications).toHaveLength(1);

      // Agent from other department cannot list
      await expect(
        publicationService.listPublications(proc.id, agenteB),
      ).rejects.toThrow(ForbiddenError);
    });

    it("retrieves publication details for authorized department user", async () => {
      const { process: proc, document: doc } =
        await createAwaitingPublicationProcess();

      const registered = await publicationService.registerPublication(
        proc.id,
        agenteA1,
        {
          publicationType: "DIRECT_AWARD_NOTICE",
          destination: "Diário Oficial",
          publishedAt: new Date(),
          referenceNumber: "PUB-002",
          documentId: doc.id,
        },
      );

      const details = await publicationService.getPublicationDetails(
        registered.id,
        agenteA1,
      );
      expect(details.id).toBe(registered.id);
      expect(details.referenceNumber).toBe("PUB-002");
      expect(details.document.filename).toBe("Termo_de_Referencia.pdf");
      expect(details.createdBy.name).toBe("Arnaldo Agente 1");

      // Cross-department user denied
      await expect(
        publicationService.getPublicationDetails(registered.id, agenteB),
      ).rejects.toThrow(ForbiddenError);

      // Nonexistent publication returns NotFoundError
      await expect(
        publicationService.getPublicationDetails(
          "99999999-9999-9999-9999-999999999999",
          agenteA1,
        ),
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("Transaction Safety & Concurrency", () => {
    it("handles concurrent publication registrations safely without duplicating completion", async () => {
      const { process: proc } = await createAwaitingPublicationProcess();

      const payload1 = {
        publicationType: "DIRECT_AWARD_NOTICE",
        destination: "Diário Oficial A",
        publishedAt: new Date(),
      };

      const payload2 = {
        publicationType: "AUTHORIZATION_EXTRACT",
        destination: "Diário Oficial B",
        publishedAt: new Date(),
      };

      // Fire both registrations concurrently
      const [res1, res2] = await Promise.allSettled([
        publicationService.registerPublication(proc.id, agenteA1, payload1),
        publicationService.registerPublication(proc.id, agenteA2, payload2),
      ]);

      // Exactly one should succeed (fulfilled), and one should fail (rejected) due to optimistic lock
      const fulfilled = [res1, res2].filter((r) => r.status === "fulfilled");
      const rejected = [res1, res2].filter((r) => r.status === "rejected");

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toBeInstanceOf(ConflictError);

      // Process is COMPLETED
      const finalProc = await prisma.process.findUnique({
        where: { id: proc.id },
      });
      expect(finalProc.status).toBe("COMPLETED");

      // Exactly 1 publication record registered
      const pubCount = await prisma.publicationRecord.count({
        where: { processId: proc.id },
      });
      expect(pubCount).toBe(1);

      // Exactly 1 PROCESS_COMPLETED audit event
      const completedAuditCount = await prisma.auditLog.count({
        where: { processId: proc.id, action: "PROCESS_COMPLETED" },
      });
      expect(completedAuditCount).toBe(1);
    });
  });
});
