import password from "@/infra/password.js";
import { prisma } from "@/infra/prisma.js";

describe("Phase 5.1 Database Integrity and Domain Models (Integration Tests)", () => {
  let department;
  let departmentB;
  let authorityUser;
  let authorityUserB;
  let agentUser;
  let requesterUser;
  let testProcess;
  let testDocument;

  beforeAll(async () => {
    const passwordHash = await password.hash("Test@123456");

    department = await prisma.department.create({
      data: { name: `Dept Phase 5.1 A ${Date.now()}` },
    });

    departmentB = await prisma.department.create({
      data: { name: `Dept Phase 5.1 B ${Date.now()}` },
    });

    authorityUser = await prisma.user.create({
      data: {
        name: "Autoridade Competente A",
        email: `auth.a.${Date.now()}@sisd.test`,
        passwordHash,
        role: "AUTORIDADE_COMPETENTE",
        departmentId: department.id,
      },
    });

    authorityUserB = await prisma.user.create({
      data: {
        name: "Autoridade Competente B",
        email: `auth.b.${Date.now()}@sisd.test`,
        passwordHash,
        role: "AUTORIDADE_COMPETENTE",
        departmentId: departmentB.id,
      },
    });

    agentUser = await prisma.user.create({
      data: {
        name: "Agente Contratacao A",
        email: `agent.a.${Date.now()}@sisd.test`,
        passwordHash,
        role: "AGENTE_CONTRATACAO",
        departmentId: department.id,
      },
    });

    requesterUser = await prisma.user.create({
      data: {
        name: "Solicitante A",
        email: `req.a.${Date.now()}@sisd.test`,
        passwordHash,
        role: "SOLICITANTE",
        departmentId: department.id,
      },
    });

    testProcess = await prisma.process.create({
      data: {
        number: Math.floor(Math.random() * 80000) + 10000,
        year: 2026,
        title: "Processo Teste Integridade Fase 5.1",
        object: "Simulação de autorização final e publicação",
        status: "APPROVED",
        departmentId: department.id,
        requesterId: requesterUser.id,
      },
    });

    testDocument = await prisma.document.create({
      data: {
        processId: testProcess.id,
        type: "OUTRO",
        filename: "extrato_autorizacao.pdf",
        storageKey: `docs/test-${Date.now()}.pdf`,
        mimeType: "application/pdf",
        size: 1024,
        uploadedById: agentUser.id,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Role and Department Scoping in Database", () => {
    it("persists AUTORIDADE_COMPETENTE user with department association", async () => {
      const dbUser = await prisma.user.findUnique({
        where: { id: authorityUser.id },
        include: { department: true },
      });

      expect(dbUser).toBeDefined();
      expect(dbUser.role).toBe("AUTORIDADE_COMPETENTE");
      expect(dbUser.departmentId).toBe(department.id);
      expect(dbUser.department.name).toBe(department.name);
    });

    it("allows multiple AUTORIDADE_COMPETENTE users in the same department", async () => {
      const secondAuthority = await prisma.user.create({
        data: {
          name: "Segunda Autoridade Dept A",
          email: `auth2.a.${Date.now()}@sisd.test`,
          passwordHash: authorityUser.passwordHash,
          role: "AUTORIDADE_COMPETENTE",
          departmentId: department.id,
        },
      });

      expect(secondAuthority.departmentId).toBe(department.id);
      expect(secondAuthority.role).toBe("AUTORIDADE_COMPETENTE");
    });
  });

  describe("Process Lifecycle Status Persistence", () => {
    it("persists process with Phase 5 statuses", async () => {
      // 1. AWAITING_FINAL_AUTHORIZATION
      const updated1 = await prisma.process.update({
        where: { id: testProcess.id },
        data: { status: "AWAITING_FINAL_AUTHORIZATION" },
      });
      expect(updated1.status).toBe("AWAITING_FINAL_AUTHORIZATION");

      // 2. AWAITING_PUBLICATION
      const updated2 = await prisma.process.update({
        where: { id: testProcess.id },
        data: { status: "AWAITING_PUBLICATION" },
      });
      expect(updated2.status).toBe("AWAITING_PUBLICATION");

      // 3. FINAL_AUTHORIZATION_REFUSED
      const updated3 = await prisma.process.update({
        where: { id: testProcess.id },
        data: { status: "FINAL_AUTHORIZATION_REFUSED" },
      });
      expect(updated3.status).toBe("FINAL_AUTHORIZATION_REFUSED");

      // Reset back for subsequent tests
      await prisma.process.update({
        where: { id: testProcess.id },
        data: { status: "AWAITING_FINAL_AUTHORIZATION" },
      });
    });
  });

  describe("FinalAuthorization Model & Constraints", () => {
    let createdCycle1Auth;

    it("creates an AUTHORIZED decision successfully with correct process and user attribution", async () => {
      createdCycle1Auth = await prisma.finalAuthorization.create({
        data: {
          processId: testProcess.id,
          userId: authorityUser.id,
          decision: "AUTHORIZED",
          justification: "Homologado conforme parecer jurídico favorável.",
          cycle: 1,
        },
        include: {
          process: true,
          user: true,
        },
      });

      expect(createdCycle1Auth.id).toBeDefined();
      expect(createdCycle1Auth.processId).toBe(testProcess.id);
      expect(createdCycle1Auth.userId).toBe(authorityUser.id);
      expect(createdCycle1Auth.decision).toBe("AUTHORIZED");
      expect(createdCycle1Auth.cycle).toBe(1);
      expect(createdCycle1Auth.decidedAt).toBeDefined();
      expect(isNaN(new Date(createdCycle1Auth.decidedAt).getTime())).toBe(
        false,
      );
      expect(createdCycle1Auth.user.role).toBe("AUTORIDADE_COMPETENTE");
    });

    it("enforces idx_final_auth_active_cycle_unique: prevents duplicate active decision in same cycle", async () => {
      let error;
      try {
        await prisma.finalAuthorization.create({
          data: {
            processId: testProcess.id,
            userId: authorityUser.id,
            decision: "REFUSED",
            justification: "Tentativa conflitante de recusa no mesmo ciclo.",
            cycle: 1,
          },
        });
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect(
        error.code === "P2002" ||
          error.message.includes("idx_final_auth_active_cycle_unique") ||
          error.message.includes("unique"),
      ).toBe(true);
    });

    it("allows a subsequent decision in a DIFFERENT workflow cycle (cycle 2)", async () => {
      const cycle2Auth = await prisma.finalAuthorization.create({
        data: {
          processId: testProcess.id,
          userId: authorityUser.id,
          decision: "ADJUSTMENT_REQUESTED",
          justification: "Ciclo 2: Solicito atualização de certidão vencida.",
          cycle: 2,
        },
      });

      expect(cycle2Auth.cycle).toBe(2);
      expect(cycle2Auth.decision).toBe("ADJUSTMENT_REQUESTED");

      // Verify both historical decisions remain queryable
      const history = await prisma.finalAuthorization.findMany({
        where: { processId: testProcess.id },
        orderBy: { cycle: "asc" },
      });
      expect(history.length).toBeGreaterThanOrEqual(2);
      expect(history[0].cycle).toBe(1);
      expect(history[1].cycle).toBe(2);
    });

    it("enforces chk_final_auth_justification: rejects REFUSED decision without justification", async () => {
      const proc = await prisma.process.create({
        data: {
          number: Math.floor(Math.random() * 80000) + 10000,
          year: 2026,
          title: "Processo Check Constraint Refused",
          object: "Objeto teste",
          departmentId: department.id,
          requesterId: requesterUser.id,
        },
      });

      let errorNull;
      try {
        await prisma.finalAuthorization.create({
          data: {
            processId: proc.id,
            userId: authorityUser.id,
            decision: "REFUSED",
            justification: null,
            cycle: 1,
          },
        });
      } catch (err) {
        errorNull = err;
      }
      expect(errorNull).toBeDefined();
      expect(errorNull.message).toContain("chk_final_auth_justification");

      let errorEmpty;
      try {
        await prisma.finalAuthorization.create({
          data: {
            processId: proc.id,
            userId: authorityUser.id,
            decision: "REFUSED",
            justification: "   ",
            cycle: 1,
          },
        });
      } catch (err) {
        errorEmpty = err;
      }
      expect(errorEmpty).toBeDefined();
      expect(errorEmpty.message).toContain("chk_final_auth_justification");
    });

    it("enforces chk_final_auth_justification: rejects ADJUSTMENT_REQUESTED decision without justification", async () => {
      const proc = await prisma.process.create({
        data: {
          number: Math.floor(Math.random() * 80000) + 10000,
          year: 2026,
          title: "Processo Check Constraint Adj",
          object: "Objeto teste",
          departmentId: department.id,
          requesterId: requesterUser.id,
        },
      });

      let error;
      try {
        await prisma.finalAuthorization.create({
          data: {
            processId: proc.id,
            userId: authorityUser.id,
            decision: "ADJUSTMENT_REQUESTED",
            justification: null,
            cycle: 1,
          },
        });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error.message).toContain("chk_final_auth_justification");
    });

    it("enforces chk_final_auth_cycle_positive: rejects cycle < 1", async () => {
      const proc = await prisma.process.create({
        data: {
          number: Math.floor(Math.random() * 80000) + 10000,
          year: 2026,
          title: "Processo Cycle Check",
          object: "Objeto teste",
          departmentId: department.id,
          requesterId: requesterUser.id,
        },
      });

      let error;
      try {
        await prisma.finalAuthorization.create({
          data: {
            processId: proc.id,
            userId: authorityUser.id,
            decision: "AUTHORIZED",
            cycle: 0,
          },
        });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error.message).toContain("chk_final_auth_cycle_positive");
    });
  });

  describe("PublicationRecord Model & Constraints", () => {
    it("creates a PublicationRecord with supporting document link", async () => {
      const pubRecord = await prisma.publicationRecord.create({
        data: {
          processId: testProcess.id,
          publicationType: "AUTHORIZATION_EXTRACT",
          destination: "Diário Oficial do Estado (DOE)",
          publishedAt: new Date("2026-11-05T10:00:00Z"),
          referenceNumber: "DOE-ED-2026-4412",
          url: "https://doe.sp.gov.br/atos/4412",
          documentId: testDocument.id,
          createdById: agentUser.id,
        },
        include: {
          process: true,
          createdBy: true,
          document: true,
        },
      });

      expect(pubRecord.id).toBeDefined();
      expect(pubRecord.processId).toBe(testProcess.id);
      expect(pubRecord.publicationType).toBe("AUTHORIZATION_EXTRACT");
      expect(pubRecord.destination).toBe("Diário Oficial do Estado (DOE)");
      expect(pubRecord.referenceNumber).toBe("DOE-ED-2026-4412");
      expect(pubRecord.documentId).toBe(testDocument.id);
      expect(pubRecord.document.filename).toBe("extrato_autorizacao.pdf");
      expect(pubRecord.createdById).toBe(agentUser.id);
    });

    it("creates simulated publication record for academic demonstration without external integration", async () => {
      const simulatedPub = await prisma.publicationRecord.create({
        data: {
          processId: testProcess.id,
          publicationType: "DIRECT_AWARD_NOTICE",
          destination: "PNCP (Simulação Acadêmica)",
          publishedAt: new Date(),
          referenceNumber: "SIM-PNCP-2026-001",
          createdById: agentUser.id,
        },
      });

      expect(simulatedPub.destination).toBe("PNCP (Simulação Acadêmica)");
      expect(simulatedPub.documentId).toBeNull();
      expect(simulatedPub.url).toBeNull();
    });

    it("enforces chk_publication_destination_not_empty: rejects empty destination", async () => {
      let error;
      try {
        await prisma.publicationRecord.create({
          data: {
            processId: testProcess.id,
            publicationType: "CONTRACT_EXTRACT",
            destination: "   ",
            publishedAt: new Date(),
            createdById: agentUser.id,
          },
        });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error.message).toContain("chk_publication_destination_not_empty");
    });

    it("retains historical publication records without overwriting", async () => {
      const records = await prisma.publicationRecord.findMany({
        where: { processId: testProcess.id },
        orderBy: { createdAt: "asc" },
      });

      expect(records.length).toBeGreaterThanOrEqual(2);
      expect(records[0].destination).toContain("Diário Oficial");
      expect(records[1].destination).toContain("Simulação Acadêmica");
    });
  });

  describe("Audit Trail Integration", () => {
    it("records all Phase 5 audit actions in AuditLog table", async () => {
      const phase5Actions = [
        "FINAL_AUTHORIZATION_INITIATED",
        "FINAL_AUTHORIZATION_GRANTED",
        "FINAL_AUTHORIZATION_REFUSED",
        "FINAL_AUTHORIZATION_ADJUSTMENT_REQUESTED",
        "PUBLICATION_REGISTERED",
        "PUBLICATION_SUPERSEDED",
        "PROCESS_COMPLETED",
      ];

      for (const action of phase5Actions) {
        const audit = await prisma.auditLog.create({
          data: {
            processId: testProcess.id,
            userId: authorityUser.id,
            action,
            description: `Audit event for ${action}`,
            fromStatus: "AWAITING_FINAL_AUTHORIZATION",
            toStatus: "AWAITING_PUBLICATION",
          },
        });

        expect(audit.id).toBeDefined();
        expect(audit.action).toBe(action);
      }
    });
  });
});
