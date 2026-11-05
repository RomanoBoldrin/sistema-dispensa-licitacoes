import password from "@/infra/password.js";
import { prisma } from "@/infra/prisma.cjs";
import session from "@/infra/session.js";
import webserver from "@/infra/webserver.mjs";
import orchestrator from "@/tests/orchestrator/orchestrator.mjs";

describe("Internal Analysis & Approval Workflow (Integration Tests)", () => {
  jest.setTimeout(60000);

  let departmentA;
  let departmentB;
  let solicitanteA;
  let solicitanteCookieA;
  let solicitanteB;
  let solicitanteCookieB;
  let agenteA;
  let agenteCookieA;
  let agenteB;
  let agenteCookieB;
  let aprovadorA;
  let aprovadorCookieA;
  let aprovadorB;
  let aprovadorCookieB;
  let aprovadorNullDept;
  let aprovadorNullCookie;
  let adminUser;
  let adminCookie;
  let supplierA;
  let supplierB;
  let supplierC;

  beforeAll(async () => {
    await orchestrator.clearDatabase();

    const passwordHash = await password.hash("WorkflowTest123!");

    departmentA = await prisma.department.create({
      data: { name: "Secretaria de Saúde" },
    });

    departmentB = await prisma.department.create({
      data: { name: "Secretaria de Obras" },
    });

    solicitanteA = await prisma.user.create({
      data: {
        name: "Samuel Solicitante",
        email: "samuel.wf@sisd.com",
        passwordHash,
        role: "SOLICITANTE",
        departmentId: departmentA.id,
      },
    });
    solicitanteCookieA = (await session.create(solicitanteA.id)).sessionCookie;

    solicitanteB = await prisma.user.create({
      data: {
        name: "Sabrina Solicitante",
        email: "sabrina.wf@sisd.com",
        passwordHash,
        role: "SOLICITANTE",
        departmentId: departmentB.id,
      },
    });
    solicitanteCookieB = (await session.create(solicitanteB.id)).sessionCookie;

    agenteA = await prisma.user.create({
      data: {
        name: "Almir Agente A",
        email: "almir.wf@sisd.com",
        passwordHash,
        role: "AGENTE_CONTRATACAO",
        departmentId: departmentA.id,
      },
    });
    agenteCookieA = (await session.create(agenteA.id)).sessionCookie;

    agenteB = await prisma.user.create({
      data: {
        name: "Beatriz Agente B",
        email: "beatriz.wf@sisd.com",
        passwordHash,
        role: "AGENTE_CONTRATACAO",
        departmentId: departmentB.id,
      },
    });
    agenteCookieB = (await session.create(agenteB.id)).sessionCookie;

    aprovadorA = await prisma.user.create({
      data: {
        name: "Arthur Aprovador A",
        email: "arthur.wf@sisd.com",
        passwordHash,
        role: "APROVADOR",
        departmentId: departmentA.id,
      },
    });
    aprovadorCookieA = (await session.create(aprovadorA.id)).sessionCookie;

    aprovadorB = await prisma.user.create({
      data: {
        name: "Bruna Aprovador B",
        email: "bruna.wf@sisd.com",
        passwordHash,
        role: "APROVADOR",
        departmentId: departmentB.id,
      },
    });
    aprovadorCookieB = (await session.create(aprovadorB.id)).sessionCookie;

    aprovadorNullDept = await prisma.user.create({
      data: {
        name: "Aníbal Null Dept",
        email: "anibal.wf@sisd.com",
        passwordHash,
        role: "APROVADOR",
        departmentId: null,
      },
    });
    aprovadorNullCookie = (await session.create(aprovadorNullDept.id))
      .sessionCookie;

    adminUser = await prisma.user.create({
      data: {
        name: "Augusto Admin",
        email: "augusto.wf@sisd.com",
        passwordHash,
        role: "ADMIN",
        departmentId: departmentA.id,
      },
    });
    adminCookie = (await session.create(adminUser.id)).sessionCookie;

    supplierA = await prisma.supplier.create({
      data: {
        legalName: "Fornecedor Alfa Medicamentos Ltda",
        cnpj: "12.345.678/0001-90",
        email: "alfa@med.com",
      },
    });

    supplierB = await prisma.supplier.create({
      data: {
        legalName: "Fornecedor Beta Distribuição SA",
        cnpj: "98.765.432/0001-10",
        email: "beta@dist.com",
      },
    });

    supplierC = await prisma.supplier.create({
      data: {
        legalName: "Fornecedor Gama Suprimentos Eireli",
        cnpj: "44.555.666/0001-77",
        email: "gama@sup.com",
      },
    });
  }, 60000);

  async function createAndSubmitCompleteProcess(
    userCookie,
    userRequester,
    department,
  ) {
    // 1. Create Process
    const procRes = await fetch(`${webserver.origin}/api/v1/processes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: userCookie,
      },
      body: JSON.stringify({
        title: "Aquisição de Insumos Hospitalares",
        object: "Luvas, seringas e descartáveis para UBS",
        estimatedValue: 45000.0,
        category: "HEALTH_SUPPLIES",
        detailedJustification:
          "Abastecimento preventivo da rede básica de saúde municipal.",
        responsibleName: userRequester.name,
        responsibleEmail: userRequester.email,
        departmentId: department.id,
      }),
    });
    const proc = await procRes.json();

    // 2. Legal Classification
    await fetch(
      `${webserver.origin}/api/v1/processes/${proc.id}/legal-classification`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: userCookie,
        },
        body: JSON.stringify({
          legalBasis: "ART_75_II",
          legalJustification:
            "Valor inferior ao teto de compras e serviços gerais da Lei 14.133.",
        }),
      },
    );

    // 3. Register Quotations
    await fetch(`${webserver.origin}/api/v1/processes/${proc.id}/quotations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: userCookie,
      },
      body: JSON.stringify({
        supplierId: supplierA.id,
        value: 42000.0,
      }),
    });

    await fetch(`${webserver.origin}/api/v1/processes/${proc.id}/quotations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: userCookie,
      },
      body: JSON.stringify({
        supplierId: supplierB.id,
        value: 44000.0,
      }),
    });

    // 4. Select Supplier
    await fetch(`${webserver.origin}/api/v1/processes/${proc.id}/supplier`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: userCookie,
      },
      body: JSON.stringify({
        supplierId: supplierA.id,
        supplierJustification:
          "Fornecedor Alfa apresentou a menor proposta e atende requisitos.",
      }),
    });

    // 5. Justifications
    await fetch(
      `${webserver.origin}/api/v1/processes/${proc.id}/justifications`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: userCookie,
        },
        body: JSON.stringify({
          priceJustification:
            "Preços compatíveis com a média das cotações de mercado obtidas.",
          supplierJustification:
            "Fornecedor Alfa apresentou a menor proposta e atende requisitos.",
        }),
      },
    );

    // 6. Mandatory TR Document
    await prisma.document.create({
      data: {
        processId: proc.id,
        type: "TERMO_REFERENCIA",
        filename: "Termo_Referencia.pdf",
        storageKey: `doc_${proc.id}_tr.pdf`,
        mimeType: "application/pdf",
        size: 1024,
        uploadedById: userRequester.id,
        isActive: true,
      },
    });

    // 7. Submit Process
    const submitRes = await fetch(
      `${webserver.origin}/api/v1/processes/${proc.id}/submit`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: userCookie,
        },
      },
    );
    const submitData = await submitRes.json();

    return { proc, submitData };
  }

  describe("Authentication & Access Boundaries", () => {
    it("returns 401 when unauthenticated", async () => {
      const inboxRes = await fetch(`${webserver.origin}/api/v1/approvals`);
      expect(inboxRes.status).toBe(401);

      const approveRes = await fetch(
        `${webserver.origin}/api/v1/processes/00000000-0000-0000-0000-000000000000/workflow/approve`,
        { method: "POST" },
      );
      expect(approveRes.status).toBe(401);
    });

    it("returns 403 when a SOLICITANTE attempts to access the approvals inbox", async () => {
      const res = await fetch(`${webserver.origin}/api/v1/approvals`, {
        headers: { Cookie: solicitanteCookieA },
      });
      expect(res.status).toBe(403);
    });
  });

  describe("Golden Path: 2-Stage Sequential Workflow Execution", () => {
    let processRecord;

    beforeAll(async () => {
      const { proc } = await createAndSubmitCompleteProcess(
        solicitanteCookieA,
        solicitanteA,
        departmentA,
      );
      processRecord = proc;
    }, 30000);

    it("submits into IN_ANALYSIS and creates pending Stage 1 task for AGENTE_CONTRATACAO in Cycle 1", async () => {
      const dbProc = await prisma.process.findUnique({
        where: { id: processRecord.id },
      });
      expect(dbProc.status).toBe("IN_ANALYSIS");

      const pendingTask = await prisma.approval.findFirst({
        where: { processId: processRecord.id, decision: null },
      });
      expect(pendingTask).toBeDefined();
      expect(pendingTask.stage).toBe("ANALYSIS");
      expect(pendingTask.assignedRole).toBe("AGENTE_CONTRATACAO");
      expect(pendingTask.cycle).toBe(1);
    });

    it("locks ordinary requester editing (PATCH) during IN_ANALYSIS", async () => {
      const res = await fetch(
        `${webserver.origin}/api/v1/processes/${processRecord.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: solicitanteCookieA,
          },
          body: JSON.stringify({ title: "Edição indevida durante análise" }),
        },
      );
      expect(res.status).toBe(409);
    });

    it("enforces department isolation: Agente B (Dept B) cannot see or act on Dept A's Stage 1 task", async () => {
      // Inbox check
      const inboxRes = await fetch(`${webserver.origin}/api/v1/approvals`, {
        headers: { Cookie: agenteCookieB },
      });
      expect(inboxRes.status).toBe(200);
      const inboxData = await inboxRes.json();
      const hasDeptATask = inboxData.tasks.some(
        (t) => t.process.id === processRecord.id,
      );
      expect(hasDeptATask).toBe(false);

      // Direct action check
      const approveRes = await fetch(
        `${webserver.origin}/api/v1/processes/${processRecord.id}/workflow/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: agenteCookieB,
          },
        },
      );
      expect(approveRes.status).toBe(403);
    });

    it("denies APROVADOR from approving Stage 1 (ANALYSIS)", async () => {
      const res = await fetch(
        `${webserver.origin}/api/v1/processes/${processRecord.id}/workflow/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: aprovadorCookieA,
          },
        },
      );
      expect(res.status).toBe(403);
    });

    it("denies ADMIN from approving Stage 1 (strictly read-only during active workflow)", async () => {
      const res = await fetch(
        `${webserver.origin}/api/v1/processes/${processRecord.id}/workflow/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: adminCookie,
          },
        },
      );
      expect(res.status).toBe(403);
    });

    it("allows Agente A (Dept A) to see the task in inbox and approve Stage 1", async () => {
      // 1. Check inbox
      const inboxRes = await fetch(`${webserver.origin}/api/v1/approvals`, {
        headers: { Cookie: agenteCookieA },
      });
      expect(inboxRes.status).toBe(200);
      const inboxData = await inboxRes.json();
      const task = inboxData.tasks.find(
        (t) => t.process.id === processRecord.id,
      );
      expect(task).toBeDefined();
      expect(task.stage).toBe("ANALYSIS");
      expect(task.canAct).toBe(true);

      // 2. Approve Stage 1
      const approveRes = await fetch(
        `${webserver.origin}/api/v1/processes/${processRecord.id}/workflow/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: agenteCookieA,
          },
          body: JSON.stringify({
            comment: "Instrução técnica e pesquisa de preços conformes.",
            approvalId: task.id,
          }),
        },
      );

      expect(approveRes.status).toBe(200);
      const approveData = await approveRes.json();
      expect(approveData.success).toBe(true);
      expect(approveData.processStatus).toBe("AWAITING_APPROVAL");
      expect(approveData.nextStage).toBe("APPROVAL");

      // Verify DB state
      const dbProc = await prisma.process.findUnique({
        where: { id: processRecord.id },
      });
      expect(dbProc.status).toBe("AWAITING_APPROVAL");

      // Verify Stage 1 task is completed
      const completedStage1 = await prisma.approval.findUnique({
        where: { id: task.id },
      });
      expect(completedStage1.decision).toBe("APPROVED");
      expect(completedStage1.userId).toBe(agenteA.id);
      expect(completedStage1.decidedAt).toBeDefined();
      expect(completedStage1.comment).toContain("Instrução técnica");

      // Verify Stage 2 task is created in the same cycle
      const stage2Task = await prisma.approval.findFirst({
        where: { processId: processRecord.id, decision: null },
      });
      expect(stage2Task).toBeDefined();
      expect(stage2Task.stage).toBe("APPROVAL");
      expect(stage2Task.assignedRole).toBe("APROVADOR");
      expect(stage2Task.cycle).toBe(1);

      // Verify audit logs
      const auditStage1 = await prisma.auditLog.findFirst({
        where: {
          processId: processRecord.id,
          action: "APPROVAL_STAGE_APPROVED",
        },
      });
      expect(auditStage1).toBeDefined();
      expect(auditStage1.fromStatus).toBe("IN_ANALYSIS");
      expect(auditStage1.toStatus).toBe("AWAITING_APPROVAL");
    });

    it("enforces department isolation on Stage 2: Aprovador B cannot act on Dept A's process", async () => {
      const res = await fetch(
        `${webserver.origin}/api/v1/processes/${processRecord.id}/workflow/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: aprovadorCookieB,
          },
        },
      );
      expect(res.status).toBe(403);
    });

    it("enforces fail-closed: Aprovador with null department cannot act", async () => {
      const res = await fetch(
        `${webserver.origin}/api/v1/processes/${processRecord.id}/workflow/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: aprovadorNullCookie,
          },
        },
      );
      expect(res.status).toBe(403);
    });

    it("allows Aprovador A (Dept A) to approve Stage 2, reaching APPROVED status", async () => {
      // 1. Fetch workflow state
      const wfRes = await fetch(
        `${webserver.origin}/api/v1/processes/${processRecord.id}/workflow`,
        { headers: { Cookie: aprovadorCookieA } },
      );
      expect(wfRes.status).toBe(200);
      const wfData = await wfRes.json();
      expect(wfData.currentStage).toBe("APPROVAL");
      expect(wfData.permissions.canApprove).toBe(true);

      // 2. Approve Stage 2
      const approveRes = await fetch(
        `${webserver.origin}/api/v1/processes/${processRecord.id}/workflow/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: aprovadorCookieA,
          },
          body: JSON.stringify({
            comment: "Aprovação formal da contratação direta deferida.",
            approvalId: wfData.pendingTask.id,
          }),
        },
      );

      expect(approveRes.status).toBe(200);
      const approveData = await approveRes.json();
      expect(approveData.success).toBe(true);
      expect(approveData.processStatus).toBe("APPROVED");

      // Verify DB process status
      const dbProc = await prisma.process.findUnique({
        where: { id: processRecord.id },
      });
      expect(dbProc.status).toBe("APPROVED");

      // Verify no more pending tasks
      const pendingTask = await prisma.approval.findFirst({
        where: { processId: processRecord.id, decision: null },
      });
      expect(pendingTask).toBeNull();
    });

    it("rejects duplicate approval attempts with 409 Conflict", async () => {
      const res = await fetch(
        `${webserver.origin}/api/v1/processes/${processRecord.id}/workflow/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: aprovadorCookieA,
          },
        },
      );
      expect(res.status).toBe(409);
    });
  });

  describe("Adjustment & Resubmission Cycle Path", () => {
    let procAdj;

    beforeAll(async () => {
      const { proc } = await createAndSubmitCompleteProcess(
        solicitanteCookieA,
        solicitanteA,
        departmentA,
      );
      procAdj = proc;
    }, 30000);

    it("requires a meaningful comment (>= 10 characters) when requesting adjustment", async () => {
      const res = await fetch(
        `${webserver.origin}/api/v1/processes/${procAdj.id}/workflow/request-adjustment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: agenteCookieA,
          },
          body: JSON.stringify({ comment: "Curto" }),
        },
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.message).toContain("mínimo de 10 caracteres");
    });

    it("returns process to RETURNED_FOR_ADJUSTMENT and marks task ADJUSTMENT_REQUESTED", async () => {
      const res = await fetch(
        `${webserver.origin}/api/v1/processes/${procAdj.id}/workflow/request-adjustment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: agenteCookieA,
          },
          body: JSON.stringify({
            comment:
              "Favor detalhar a especificação técnica dos insumos no DFD.",
          }),
        },
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.processStatus).toBe("RETURNED_FOR_ADJUSTMENT");

      // Verify DB
      const dbProc = await prisma.process.findUnique({
        where: { id: procAdj.id },
      });
      expect(dbProc.status).toBe("RETURNED_FOR_ADJUSTMENT");

      const completedTask = await prisma.approval.findFirst({
        where: { processId: procAdj.id, cycle: 1 },
      });
      expect(completedTask.decision).toBe("ADJUSTMENT_REQUESTED");
      expect(completedTask.userId).toBe(agenteA.id);
      expect(completedTask.comment).toContain("Favor detalhar");

      // Verify Audit Log
      const audit = await prisma.auditLog.findFirst({
        where: {
          processId: procAdj.id,
          action: "PROCESS_ADJUSTMENT_REQUESTED",
        },
      });
      expect(audit).toBeDefined();
      expect(audit.fromStatus).toBe("IN_ANALYSIS");
      expect(audit.toStatus).toBe("RETURNED_FOR_ADJUSTMENT");
    });

    it("allows the requester to regain editing rights and update the process in RETURNED_FOR_ADJUSTMENT", async () => {
      const editRes = await fetch(
        `${webserver.origin}/api/v1/processes/${procAdj.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: solicitanteCookieA,
          },
          body: JSON.stringify({
            object:
              "Luvas cirúrgicas estéreis e descartáveis com certificação Anvisa",
          }),
        },
      );
      expect(editRes.status).toBe(200);
      const updated = await editRes.json();
      expect(updated.object).toContain("certificação Anvisa");
    });

    it("resubmits the process into IN_ANALYSIS, creating Cycle 2 Stage 1 task and preserving Cycle 1", async () => {
      const resubmitRes = await fetch(
        `${webserver.origin}/api/v1/processes/${procAdj.id}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: solicitanteCookieA,
          },
        },
      );
      expect(resubmitRes.status).toBe(200);
      const resubmitData = await resubmitRes.json();
      expect(resubmitData.success).toBe(true);
      expect(resubmitData.process.status).toBe("IN_ANALYSIS");
      expect(resubmitData.cycle).toBe(2);

      // Verify DB
      const dbProc = await prisma.process.findUnique({
        where: { id: procAdj.id },
      });
      expect(dbProc.status).toBe("IN_ANALYSIS");

      // Verify Cycle 1 decision is still preserved
      const cycle1Task = await prisma.approval.findFirst({
        where: { processId: procAdj.id, cycle: 1 },
      });
      expect(cycle1Task.decision).toBe("ADJUSTMENT_REQUESTED");

      // Verify Cycle 2 pending task
      const cycle2Task = await prisma.approval.findFirst({
        where: { processId: procAdj.id, cycle: 2, decision: null },
      });
      expect(cycle2Task).toBeDefined();
      expect(cycle2Task.stage).toBe("ANALYSIS");
      expect(cycle2Task.assignedRole).toBe("AGENTE_CONTRATACAO");

      // Verify Workflow API exposes both cycles
      const wfRes = await fetch(
        `${webserver.origin}/api/v1/processes/${procAdj.id}/workflow`,
        { headers: { Cookie: agenteCookieA } },
      );
      const wfData = await wfRes.json();
      expect(wfData.currentCycle).toBe(2);
      expect(wfData.cycles.length).toBe(2);
      expect(wfData.cycles[0].cycleNumber).toBe(1);
      expect(wfData.cycles[1].cycleNumber).toBe(2);
    });
  });

  describe("Rejection & Terminal State Path", () => {
    let procRej;

    beforeAll(async () => {
      const { proc } = await createAndSubmitCompleteProcess(
        solicitanteCookieA,
        solicitanteA,
        departmentA,
      );
      procRej = proc;

      // Agente A approves Stage 1 to forward to Stage 2
      const task = await prisma.approval.findFirst({
        where: { processId: procRej.id, decision: null },
      });

      await fetch(
        `${webserver.origin}/api/v1/processes/${procRej.id}/workflow/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: agenteCookieA,
          },
          body: JSON.stringify({ approvalId: task.id }),
        },
      );
    }, 30000);

    it("requires a meaningful rejection reason (>= 10 characters)", async () => {
      const res = await fetch(
        `${webserver.origin}/api/v1/processes/${procRej.id}/workflow/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: aprovadorCookieA,
          },
          body: JSON.stringify({ comment: "Rejeito" }),
        },
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.message).toContain("mínimo de 10 caracteres");
    });

    it("rejects the process, setting status REJECTED and completing task", async () => {
      const res = await fetch(
        `${webserver.origin}/api/v1/processes/${procRej.id}/workflow/reject`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: aprovadorCookieA,
          },
          body: JSON.stringify({
            comment:
              "Proposta técnica inadequada para a demanda do exercício fiscal.",
          }),
        },
      );
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.processStatus).toBe("REJECTED");

      // Verify DB
      const dbProc = await prisma.process.findUnique({
        where: { id: procRej.id },
      });
      expect(dbProc.status).toBe("REJECTED");

      const rejectedTask = await prisma.approval.findFirst({
        where: { processId: procRej.id, stage: "APPROVAL" },
      });
      expect(rejectedTask.decision).toBe("REJECTED");
      expect(rejectedTask.userId).toBe(aprovadorA.id);
      expect(rejectedTask.comment).toContain("Proposta técnica inadequada");

      // Verify Audit Log
      const audit = await prisma.auditLog.findFirst({
        where: { processId: procRej.id, action: "PROCESS_REJECTED" },
      });
      expect(audit).toBeDefined();
      expect(audit.fromStatus).toBe("AWAITING_APPROVAL");
      expect(audit.toStatus).toBe("REJECTED");
    });

    it("prevents subsequent approval or submission operations after rejection", async () => {
      const approveRes = await fetch(
        `${webserver.origin}/api/v1/processes/${procRej.id}/workflow/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: aprovadorCookieA,
          },
        },
      );
      expect(approveRes.status).toBe(409);

      const submitRes = await fetch(
        `${webserver.origin}/api/v1/processes/${procRej.id}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: solicitanteCookieA,
          },
        },
      );
      expect(submitRes.status).toBe(409);
    });
  });
});
