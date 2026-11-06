import password from "@/infra/password.js";
import { prisma } from "@/infra/prisma.cjs";
import orchestrator from "@/tests/orchestrator/orchestrator.mjs";
import finalAuthorizationService from "@/services/final-authorization.service.js";
import submissionService from "@/services/submission.service.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/infra/errors.js";

describe("Final Authorization Service (Integration Tests)", () => {
  jest.setTimeout(60000);

  let departmentA;
  let departmentB;
  let solicitanteA;
  let agenteA;
  let agenteB;
  let aprovadorA;
  let autoridadeA1;
  let autoridadeA2;
  let autoridadeB;
  let adminUser;
  let supplierA;

  beforeAll(async () => {
    await orchestrator.clearDatabase();

    const passwordHash = await password.hash("TestPass123!");

    departmentA = await prisma.department.create({
      data: { name: "Secretaria Municipal de Administração" },
    });

    departmentB = await prisma.department.create({
      data: { name: "Secretaria Municipal de Obras" },
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

    agenteA = await prisma.user.create({
      data: {
        name: "Arnaldo Agente",
        email: "arnaldo.agente@sisd.gov.br",
        passwordHash,
        role: "AGENTE_CONTRATACAO",
        departmentId: departmentA.id,
      },
    });

    agenteB = await prisma.user.create({
      data: {
        name: "Bernardo Agente",
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

    autoridadeA1 = await prisma.user.create({
      data: {
        name: "Almir Autoridade",
        email: "almir.autoridade@sisd.gov.br",
        passwordHash,
        role: "AUTORIDADE_COMPETENTE",
        departmentId: departmentA.id,
      },
    });

    autoridadeA2 = await prisma.user.create({
      data: {
        name: "Adriana Autoridade",
        email: "adriana.autoridade@sisd.gov.br",
        passwordHash,
        role: "AUTORIDADE_COMPETENTE",
        departmentId: departmentA.id,
      },
    });

    autoridadeB = await prisma.user.create({
      data: {
        name: "Beto Autoridade",
        email: "beto.autoridade@sisd.gov.br",
        passwordHash,
        role: "AUTORIDADE_COMPETENTE",
        departmentId: departmentB.id,
      },
    });

    adminUser = await prisma.user.create({
      data: {
        name: "Administrador Geral",
        email: "admin.root@sisd.gov.br",
        passwordHash,
        role: "ADMIN",
        departmentId: departmentA.id,
      },
    });

    supplierA = await prisma.supplier.create({
      data: {
        legalName: "Distribuidora Nacional de Bens LTDA",
        tradeName: "Distribuidora Nacional",
        cnpj: "11222333000181",
        email: "contato@distribuidora.com.br",
      },
    });
  });

  /**
   * Helper to create a process in APPROVED status with completed Phase 4 approvals
   */
  async function createApprovedProcess({
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
        title: `Processo Teste Autorização ${procNumber}`,
        object: "Aquisição de suprimentos de informática para o departamento",
        description: "Suprimentos essenciais para continuidade das operações.",
        legalBasis: "ART_75_II",
        legalJustification:
          "Valor compatível com dispensa de pequeno valor da Lei 14.133/2021.",
        estimatedValue: 28500.0,
        priceJustification:
          "Preços compatíveis com a média das cotações obtidas no mercado.",
        status: "APPROVED",
        departmentId: department.id,
        requesterId: requester.id,
        selectedSupplierId: supplierA.id,
        supplierJustification:
          "Menor preço obtido em cotação válida de mercado.",
      },
    });

    // Create DFD
    await prisma.demandDocument.create({
      data: {
        processId: proc.id,
        category: "COMMON_GOODS",
        detailedJustification:
          "Aquisição de suprimentos essenciais para continuidade das atividades.",
        responsibleName: requester.name,
        responsibleEmail: requester.email,
      },
    });

    // Create Quotation
    await prisma.quotation.create({
      data: {
        processId: proc.id,
        supplierId: supplierA.id,
        value: 28500.0,
      },
    });

    // Create completed Stage 1 Analysis
    await prisma.approval.create({
      data: {
        processId: proc.id,
        stage: "ANALYSIS",
        assignedRole: "AGENTE_CONTRATACAO",
        cycle,
        userId: agenteA.id,
        decision: "APPROVED",
        comment: "Instrução técnica e jurídica concluída com sucesso.",
        decidedAt: new Date(),
      },
    });

    // Create completed Stage 2 Internal Approval
    await prisma.approval.create({
      data: {
        processId: proc.id,
        stage: "APPROVAL",
        assignedRole: "APROVADOR",
        cycle,
        userId: aprovadorA.id,
        decision: "APPROVED",
        comment: "Aprovação interna concluída conforme conformidade legal.",
        decidedAt: new Date(),
      },
    });

    // Mandatory Termo de Referencia document
    await prisma.document.create({
      data: {
        processId: proc.id,
        type: "TERMO_REFERENCIA",
        filename: "Termo_de_Referencia.pdf",
        storageKey: `doc_${proc.id}_tr.pdf`,
        mimeType: "application/pdf",
        size: 2048,
        uploadedById: requester.id,
        isActive: true,
      },
    });

    return proc;
  }

  describe("initiateFinalAuthorization", () => {
    it("allows AGENTE_CONTRATACAO in the same department to initiate final authorization", () => {
      return (async () => {
        const proc = await createApprovedProcess();

        const result =
          await finalAuthorizationService.initiateFinalAuthorization(
            proc.id,
            agenteA,
          );

        expect(result.success).toBe(true);
        expect(result.status).toBe("AWAITING_FINAL_AUTHORIZATION");
        expect(result.cycle).toBe(1);

        // Verify database state
        const dbProc = await prisma.process.findUnique({
          where: { id: proc.id },
        });
        expect(dbProc.status).toBe("AWAITING_FINAL_AUTHORIZATION");

        // Verify audit log
        const audit = await prisma.auditLog.findFirst({
          where: {
            processId: proc.id,
            action: "FINAL_AUTHORIZATION_INITIATED",
          },
        });
        expect(audit).toBeDefined();
        expect(audit.userId).toBe(agenteA.id);
        expect(audit.fromStatus).toBe("APPROVED");
        expect(audit.toStatus).toBe("AWAITING_FINAL_AUTHORIZATION");
      })();
    });

    it("rejects initiation by non-agente roles (SOLICITANTE, APROVADOR, AUTORIDADE, ADMIN)", async () => {
      const proc = await createApprovedProcess();

      await expect(
        finalAuthorizationService.initiateFinalAuthorization(
          proc.id,
          solicitanteA,
        ),
      ).rejects.toThrow(ForbiddenError);

      await expect(
        finalAuthorizationService.initiateFinalAuthorization(
          proc.id,
          aprovadorA,
        ),
      ).rejects.toThrow(ForbiddenError);

      await expect(
        finalAuthorizationService.initiateFinalAuthorization(
          proc.id,
          autoridadeA1,
        ),
      ).rejects.toThrow(ForbiddenError);

      await expect(
        finalAuthorizationService.initiateFinalAuthorization(
          proc.id,
          adminUser,
        ),
      ).rejects.toThrow(ForbiddenError);
    });

    it("rejects initiation by AGENTE_CONTRATACAO from a different department", async () => {
      const proc = await createApprovedProcess();

      await expect(
        finalAuthorizationService.initiateFinalAuthorization(proc.id, agenteB),
      ).rejects.toThrow(ForbiddenError);
    });

    it("enforces segregation of duties: agent cannot initiate if they requested the process", async () => {
      const proc = await createApprovedProcess({ requester: agenteA });

      await expect(
        finalAuthorizationService.initiateFinalAuthorization(proc.id, agenteA),
      ).rejects.toThrow(ForbiddenError);
    });

    it("rejects initiation if process is not in APPROVED status", async () => {
      const proc = await createApprovedProcess();
      // Move to DRAFT
      await prisma.process.update({
        where: { id: proc.id },
        data: { status: "DRAFT" },
      });

      await expect(
        finalAuthorizationService.initiateFinalAuthorization(proc.id, agenteA),
      ).rejects.toThrow(ConflictError);
    });

    it("rejects invalid UUID with ValidationError", async () => {
      await expect(
        finalAuthorizationService.initiateFinalAuthorization(
          "invalid-uuid",
          agenteA,
        ),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("listPendingFinalAuthorizations", () => {
    it("lists pending processes awaiting final authorization for AUTORIDADE_COMPETENTE in department", async () => {
      const proc = await createApprovedProcess();
      await finalAuthorizationService.initiateFinalAuthorization(
        proc.id,
        agenteA,
      );

      const result =
        await finalAuthorizationService.listPendingFinalAuthorizations(
          autoridadeA1,
        );

      expect(result.tasks).toBeDefined();
      expect(result.tasks.length).toBeGreaterThanOrEqual(1);

      const task = result.tasks.find((t) => t.id === proc.id);
      expect(task).toBeDefined();
      expect(task.status).toBe("AWAITING_FINAL_AUTHORIZATION");
      expect(task.currentCycle).toBe(1);
      expect(task.canDecide).toBe(true);
      expect(task.department.id).toBe(departmentA.id);
      expect(task.internalApproval).toBeDefined();
      expect(task.internalApproval.decidedBy).toBe(aprovadorA.name);
    });

    it("enforces department isolation: authority from another department cannot see tasks", async () => {
      const proc = await createApprovedProcess();
      await finalAuthorizationService.initiateFinalAuthorization(
        proc.id,
        agenteA,
      );

      const result =
        await finalAuthorizationService.listPendingFinalAuthorizations(
          autoridadeB,
        );

      const task = result.tasks.find((t) => t.id === proc.id);
      expect(task).toBeUndefined();
    });

    it("rejects non-authority users including ADMIN from decision inbox", async () => {
      await expect(
        finalAuthorizationService.listPendingFinalAuthorizations(adminUser),
      ).rejects.toThrow(ForbiddenError);

      await expect(
        finalAuthorizationService.listPendingFinalAuthorizations(agenteA),
      ).rejects.toThrow(ForbiddenError);

      await expect(
        finalAuthorizationService.listPendingFinalAuthorizations(solicitanteA),
      ).rejects.toThrow(ForbiddenError);
    });

    it("marks canDecide as false if the authority requested the process (segregation of duties)", async () => {
      const proc = await createApprovedProcess({ requester: autoridadeA1 });
      await finalAuthorizationService.initiateFinalAuthorization(
        proc.id,
        agenteA,
      );

      const result =
        await finalAuthorizationService.listPendingFinalAuthorizations(
          autoridadeA1,
        );

      const task = result.tasks.find((t) => t.id === proc.id);
      expect(task).toBeDefined();
      expect(task.canDecide).toBe(false);

      // But another authority in the same department CAN decide
      const result2 =
        await finalAuthorizationService.listPendingFinalAuthorizations(
          autoridadeA2,
        );
      const task2 = result2.tasks.find((t) => t.id === proc.id);
      expect(task2).toBeDefined();
      expect(task2.canDecide).toBe(true);
    });
  });

  describe("getFinalAuthorizationDetails", () => {
    it("returns complete details for authorized AUTORIDADE_COMPETENTE", async () => {
      const proc = await createApprovedProcess();
      await finalAuthorizationService.initiateFinalAuthorization(
        proc.id,
        agenteA,
      );

      const details =
        await finalAuthorizationService.getFinalAuthorizationDetails(
          proc.id,
          autoridadeA1,
        );

      expect(details.id).toBe(proc.id);
      expect(details.status).toBe("AWAITING_FINAL_AUTHORIZATION");
      expect(details.currentCycle).toBe(1);
      expect(details.canDecide).toBe(true);
      expect(details.approvals.length).toBe(2);
      expect(details.historicalDecisions).toEqual([]);
      expect(details.currentCycleDecision).toBeNull();
      expect(details.documents.length).toBeGreaterThanOrEqual(1);
    });

    it("rejects cross-department authority with ForbiddenError", async () => {
      const proc = await createApprovedProcess();
      await finalAuthorizationService.initiateFinalAuthorization(
        proc.id,
        agenteA,
      );

      await expect(
        finalAuthorizationService.getFinalAuthorizationDetails(
          proc.id,
          autoridadeB,
        ),
      ).rejects.toThrow(ForbiddenError);
    });

    it("rejects ADMIN with ForbiddenError (no administrative bypass)", async () => {
      const proc = await createApprovedProcess();
      await finalAuthorizationService.initiateFinalAuthorization(
        proc.id,
        agenteA,
      );

      await expect(
        finalAuthorizationService.getFinalAuthorizationDetails(
          proc.id,
          adminUser,
        ),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("authorizeProcess", () => {
    it("authorizes process, updates status to AWAITING_PUBLICATION, and records audit trail", async () => {
      const proc = await createApprovedProcess();
      await finalAuthorizationService.initiateFinalAuthorization(
        proc.id,
        agenteA,
      );

      const result = await finalAuthorizationService.authorizeProcess(
        proc.id,
        autoridadeA1,
        {
          justification:
            "Homologado e autorizado conforme pareceres e conformidade legal.",
        },
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe("AWAITING_PUBLICATION");
      expect(result.decision).toBe("AUTHORIZED");
      expect(result.cycle).toBe(1);
      expect(result.finalAuthorization).toBeDefined();
      expect(result.finalAuthorization.decision).toBe("AUTHORIZED");

      // Verify database persistence
      const dbProc = await prisma.process.findUnique({
        where: { id: proc.id },
      });
      expect(dbProc.status).toBe("AWAITING_PUBLICATION");

      const dbFinalAuth = await prisma.finalAuthorization.findFirst({
        where: { processId: proc.id, cycle: 1 },
      });
      expect(dbFinalAuth).toBeDefined();
      expect(dbFinalAuth.decision).toBe("AUTHORIZED");
      expect(dbFinalAuth.userId).toBe(autoridadeA1.id);
      expect(dbFinalAuth.justification).toBe(
        "Homologado e autorizado conforme pareceres e conformidade legal.",
      );

      // Verify audit trail
      const audit = await prisma.auditLog.findFirst({
        where: {
          processId: proc.id,
          action: "FINAL_AUTHORIZATION_GRANTED",
        },
      });
      expect(audit).toBeDefined();
      expect(audit.fromStatus).toBe("AWAITING_FINAL_AUTHORIZATION");
      expect(audit.toStatus).toBe("AWAITING_PUBLICATION");
    });

    it("prevents duplicate decisions in the same workflow cycle", async () => {
      const proc = await createApprovedProcess();
      await finalAuthorizationService.initiateFinalAuthorization(
        proc.id,
        agenteA,
      );

      // First decision succeeds
      await finalAuthorizationService.authorizeProcess(proc.id, autoridadeA1);

      // Second decision fails with ConflictError
      await expect(
        finalAuthorizationService.authorizeProcess(proc.id, autoridadeA1),
      ).rejects.toThrow(ConflictError);
    });

    it("enforces segregation of duties: authority cannot authorize own requested process", async () => {
      const proc = await createApprovedProcess({ requester: autoridadeA1 });
      await finalAuthorizationService.initiateFinalAuthorization(
        proc.id,
        agenteA,
      );

      await expect(
        finalAuthorizationService.authorizeProcess(proc.id, autoridadeA1),
      ).rejects.toThrow(ForbiddenError);

      // But another authority in the same department can
      const res = await finalAuthorizationService.authorizeProcess(
        proc.id,
        autoridadeA2,
      );
      expect(res.success).toBe(true);
      expect(res.status).toBe("AWAITING_PUBLICATION");
    });

    it("rejects cross-department authority with ForbiddenError", async () => {
      const proc = await createApprovedProcess();
      await finalAuthorizationService.initiateFinalAuthorization(
        proc.id,
        agenteA,
      );

      await expect(
        finalAuthorizationService.authorizeProcess(proc.id, autoridadeB),
      ).rejects.toThrow(ForbiddenError);
    });

    it("rejects ADMIN with ForbiddenError", async () => {
      const proc = await createApprovedProcess();
      await finalAuthorizationService.initiateFinalAuthorization(
        proc.id,
        agenteA,
      );

      await expect(
        finalAuthorizationService.authorizeProcess(proc.id, adminUser),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("refuseFinalAuthorization", () => {
    it("refuses authorization with valid justification and moves to terminal FINAL_AUTHORIZATION_REFUSED", async () => {
      const proc = await createApprovedProcess();
      await finalAuthorizationService.initiateFinalAuthorization(
        proc.id,
        agenteA,
      );

      const justification =
        "Recusado em razão de restrição orçamentária superveniente do exercício 2026.";
      const result = await finalAuthorizationService.refuseFinalAuthorization(
        proc.id,
        autoridadeA1,
        { justification },
      );

      expect(result.success).toBe(true);
      expect(result.status).toBe("FINAL_AUTHORIZATION_REFUSED");
      expect(result.decision).toBe("REFUSED");

      // Verify database
      const dbProc = await prisma.process.findUnique({
        where: { id: proc.id },
      });
      expect(dbProc.status).toBe("FINAL_AUTHORIZATION_REFUSED");

      const dbFinalAuth = await prisma.finalAuthorization.findFirst({
        where: { processId: proc.id, cycle: 1 },
      });
      expect(dbFinalAuth.decision).toBe("REFUSED");
      expect(dbFinalAuth.justification).toBe(justification);

      // Verify audit
      const audit = await prisma.auditLog.findFirst({
        where: {
          processId: proc.id,
          action: "FINAL_AUTHORIZATION_REFUSED",
        },
      });
      expect(audit).toBeDefined();
      expect(audit.toStatus).toBe("FINAL_AUTHORIZATION_REFUSED");
    });

    it("rejects refusal without justification or with short justification (< 10 chars)", async () => {
      const proc = await createApprovedProcess();
      await finalAuthorizationService.initiateFinalAuthorization(
        proc.id,
        agenteA,
      );

      await expect(
        finalAuthorizationService.refuseFinalAuthorization(
          proc.id,
          autoridadeA1,
          { justification: "" },
        ),
      ).rejects.toThrow(ValidationError);

      await expect(
        finalAuthorizationService.refuseFinalAuthorization(
          proc.id,
          autoridadeA1,
          { justification: "Curto" },
        ),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("requestFinalAuthorizationAdjustments & Resubmission Cycle Trace", () => {
    it("completes adjustment request, resubmission, second approval cycle, and final authorization in cycle 2", async () => {
      // Step 1: Initial approved process in Cycle 1
      const proc = await createApprovedProcess();
      await finalAuthorizationService.initiateFinalAuthorization(
        proc.id,
        agenteA,
      );

      // Step 2: Competent authority requests adjustments in Cycle 1
      const adjustJustification =
        "Adequar o termo de referência para incluir cronograma físico-financeiro detalhado.";
      const adjResult =
        await finalAuthorizationService.requestFinalAuthorizationAdjustments(
          proc.id,
          autoridadeA1,
          { justification: adjustJustification },
        );

      expect(adjResult.success).toBe(true);
      expect(adjResult.status).toBe("RETURNED_FOR_ADJUSTMENT");
      expect(adjResult.decision).toBe("ADJUSTMENT_REQUESTED");
      expect(adjResult.cycle).toBe(1);

      // Verify process in database
      let dbProc = await prisma.process.findUnique({ where: { id: proc.id } });
      expect(dbProc.status).toBe("RETURNED_FOR_ADJUSTMENT");

      // Verify audit
      const adjAudit = await prisma.auditLog.findFirst({
        where: {
          processId: proc.id,
          action: "FINAL_AUTHORIZATION_ADJUSTMENT_REQUESTED",
        },
      });
      expect(adjAudit).toBeDefined();
      expect(adjAudit.toStatus).toBe("RETURNED_FOR_ADJUSTMENT");

      // Step 3: Requester resubmits the process -> Cycle increments to 2
      const resubmitted = await submissionService.submitProcess(
        proc.id,
        solicitanteA,
      );
      expect(resubmitted.process.status).toBe("IN_ANALYSIS");

      // Verify Stage 1 task in Cycle 2 was created
      const stage1Cycle2 = await prisma.approval.findFirst({
        where: { processId: proc.id, stage: "ANALYSIS", cycle: 2 },
      });
      expect(stage1Cycle2).toBeDefined();
      expect(stage1Cycle2.decision).toBeNull(); // Pending

      // Step 4: Agente approves Stage 1 (Cycle 2)
      await prisma.approval.update({
        where: { id: stage1Cycle2.id },
        data: {
          decision: "APPROVED",
          userId: agenteA.id,
          decidedAt: new Date(),
        },
      });
      await prisma.process.update({
        where: { id: proc.id },
        data: { status: "AWAITING_APPROVAL" },
      });

      // Create Stage 2 task (Cycle 2)
      const stage2Cycle2 = await prisma.approval.create({
        data: {
          processId: proc.id,
          stage: "APPROVAL",
          assignedRole: "APROVADOR",
          cycle: 2,
        },
      });

      // Step 5: Aprovador approves Stage 2 (Cycle 2)
      await prisma.approval.update({
        where: { id: stage2Cycle2.id },
        data: {
          decision: "APPROVED",
          userId: aprovadorA.id,
          decidedAt: new Date(),
        },
      });
      await prisma.process.update({
        where: { id: proc.id },
        data: { status: "APPROVED" },
      });

      // Step 6: Agente initiates final authorization in Cycle 2
      const initCycle2 =
        await finalAuthorizationService.initiateFinalAuthorization(
          proc.id,
          agenteA,
        );
      expect(initCycle2.status).toBe("AWAITING_FINAL_AUTHORIZATION");
      expect(initCycle2.cycle).toBe(2);

      // Verify details shows Cycle 1 historical decision and Cycle 2 current state
      const details =
        await finalAuthorizationService.getFinalAuthorizationDetails(
          proc.id,
          autoridadeA1,
        );
      expect(details.currentCycle).toBe(2);
      expect(details.historicalDecisions.length).toBe(1);
      expect(details.historicalDecisions[0].cycle).toBe(1);
      expect(details.historicalDecisions[0].decision).toBe(
        "ADJUSTMENT_REQUESTED",
      );
      expect(details.currentCycleDecision).toBeNull();

      // Step 7: Competent authority authorizes in Cycle 2
      const authCycle2 = await finalAuthorizationService.authorizeProcess(
        proc.id,
        autoridadeA1,
        {
          justification:
            "Cronograma revisado e aprovado com sucesso no Ciclo 2.",
        },
      );
      expect(authCycle2.status).toBe("AWAITING_PUBLICATION");
      expect(authCycle2.cycle).toBe(2);

      // Verify database has BOTH decisions (Cycle 1 and Cycle 2)
      const allDecisions = await prisma.finalAuthorization.findMany({
        where: { processId: proc.id },
        orderBy: { cycle: "asc" },
      });
      expect(allDecisions.length).toBe(2);
      expect(allDecisions[0].cycle).toBe(1);
      expect(allDecisions[0].decision).toBe("ADJUSTMENT_REQUESTED");
      expect(allDecisions[1].cycle).toBe(2);
      expect(allDecisions[1].decision).toBe("AUTHORIZED");
    });
  });

  describe("Concurrency & Conflict Protection", () => {
    it("handles two simultaneous decisions on the same process safely: exactly one succeeds and one receives ConflictError", async () => {
      const proc = await createApprovedProcess();
      await finalAuthorizationService.initiateFinalAuthorization(
        proc.id,
        agenteA,
      );

      // Simultaneous decisions by autoridadeA1 and autoridadeA2
      const results = await Promise.allSettled([
        finalAuthorizationService.authorizeProcess(proc.id, autoridadeA1, {
          justification: "Decisão simultânea 1",
        }),
        finalAuthorizationService.refuseFinalAuthorization(
          proc.id,
          autoridadeA2,
          {
            justification: "Decisão simultânea 2 com justificativa suficiente.",
          },
        ),
      ]);

      const fulfilled = results.filter((r) => r.status === "fulfilled");
      const rejected = results.filter((r) => r.status === "rejected");

      expect(fulfilled.length).toBe(1);
      expect(rejected.length).toBe(1);
      expect(rejected[0].reason).toBeInstanceOf(ConflictError);

      // Verify database has exactly ONE decision record
      const decisions = await prisma.finalAuthorization.findMany({
        where: { processId: proc.id },
      });
      expect(decisions.length).toBe(1);
    });
  });
});
