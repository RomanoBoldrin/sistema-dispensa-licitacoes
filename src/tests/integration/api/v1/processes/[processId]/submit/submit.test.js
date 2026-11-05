import password from "@/infra/password.js";
import { prisma } from "@/infra/prisma.cjs";
import session from "@/infra/session.js";
import webserver from "@/infra/webserver.mjs";
import orchestrator from "@/tests/orchestrator/orchestrator.mjs";

describe("Process Submission Workflow & Justifications (Integration Tests)", () => {
  let departmentA;
  let departmentB;
  let solicitanteA;
  let solicitanteCookieA;
  let solicitanteB;
  let solicitanteCookieB;
  let approverUser;
  let approverCookie;
  let adminUser;
  let adminCookie;
  let supplierA;
  let supplierB;
  let draftProcess;

  beforeAll(async () => {
    await orchestrator.clearDatabase();

    const passwordHash = await password.hash("SubmitTest123!");

    departmentA = await prisma.department.create({
      data: { name: "Secretaria de Educação" },
    });

    departmentB = await prisma.department.create({
      data: { name: "Secretaria de Transportes" },
    });

    solicitanteA = await prisma.user.create({
      data: {
        name: "Carlos Solicitante",
        email: "carlos.sub@sisd.com",
        passwordHash,
        role: "SOLICITANTE",
        departmentId: departmentA.id,
      },
    });
    solicitanteCookieA = (await session.create(solicitanteA.id)).sessionCookie;

    solicitanteB = await prisma.user.create({
      data: {
        name: "Daniel Solicitante",
        email: "daniel.sub@sisd.com",
        passwordHash,
        role: "SOLICITANTE",
        departmentId: departmentB.id,
      },
    });
    solicitanteCookieB = (await session.create(solicitanteB.id)).sessionCookie;

    approverUser = await prisma.user.create({
      data: {
        name: "Helena Aprovadora",
        email: "helena.sub@sisd.com",
        passwordHash,
        role: "APROVADOR",
        departmentId: departmentA.id,
      },
    });
    approverCookie = (await session.create(approverUser.id)).sessionCookie;

    adminUser = await prisma.user.create({
      data: {
        name: "Admin Principal",
        email: "admin.sub@sisd.com",
        passwordHash,
        role: "ADMIN",
        departmentId: departmentA.id,
      },
    });
    adminCookie = (await session.create(adminUser.id)).sessionCookie;

    // Create suppliers
    supplierA = await prisma.supplier.create({
      data: {
        legalName: "Papelaria Central Ltda",
        cnpj: "11.222.333/0001-44",
        email: "contato@papelariacentral.com",
      },
    });

    supplierB = await prisma.supplier.create({
      data: {
        legalName: "Distribuidora Modelo Eireli",
        cnpj: "55.666.777/0001-88",
        email: "vendas@modelodist.com",
      },
    });

    // Create base draft process
    const procRes = await fetch(`${webserver.origin}/api/v1/processes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: solicitanteCookieA,
      },
      body: JSON.stringify({
        title: "Aquisição de materiais pedagógicos",
        object: "Kits escolares e cadernos pedagógicos",
        estimatedValue: 35000.0,
        category: "COMMON_GOODS",
        detailedJustification:
          "Distribuição anual para alunos da rede municipal.",
        responsibleName: "Carlos Solicitante",
        responsibleEmail: "carlos.sub@sisd.com",
      }),
    });
    draftProcess = await procRes.json();
  });

  describe("POST /api/v1/processes/[processId]/submit (Authorization & Guards)", () => {
    it("returns 401 when unauthenticated", async () => {
      const res = await fetch(
        `${webserver.origin}/api/v1/processes/${draftProcess.id}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );
      expect(res.status).toBe(401);
    });

    it("returns 403 when user belongs to another department", async () => {
      const res = await fetch(
        `${webserver.origin}/api/v1/processes/${draftProcess.id}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: solicitanteCookieB,
          },
        },
      );
      expect(res.status).toBe(403);
    });

    it("returns 403 when user is an APROVADOR", async () => {
      const res = await fetch(
        `${webserver.origin}/api/v1/processes/${draftProcess.id}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: approverCookie,
          },
        },
      );
      expect(res.status).toBe(403);
    });

    it("returns 400 when submitting an incomplete process", async () => {
      // Incomplete: missing legalBasis, quotations, justifications, documents
      const res = await fetch(
        `${webserver.origin}/api/v1/processes/${draftProcess.id}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: solicitanteCookieA,
          },
        },
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toContain("pendências");
      expect(body.action).toBeDefined();
    });
  });

  describe("Supplier Selection & Justifications Endpoints", () => {
    it("rejects selecting a supplier that has no quotation on the process", async () => {
      const res = await fetch(
        `${webserver.origin}/api/v1/processes/${draftProcess.id}/supplier`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Cookie: solicitanteCookieA,
          },
          body: JSON.stringify({
            supplierId: supplierA.id,
            supplierJustification: "Tentando selecionar sem cotacao previa",
          }),
        },
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toContain("cotação registrada");
    });

    it("allows registering quotations and then selecting the supplier", async () => {
      // Add quotation for Supplier A
      const qResA = await fetch(
        `${webserver.origin}/api/v1/processes/${draftProcess.id}/quotations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: solicitanteCookieA,
          },
          body: JSON.stringify({
            supplierId: supplierA.id,
            value: 32000.0,
            description: "Proposta completa de kits escolares",
          }),
        },
      );
      expect(qResA.status).toBe(201);

      // Add quotation for Supplier B
      const qResB = await fetch(
        `${webserver.origin}/api/v1/processes/${draftProcess.id}/quotations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: solicitanteCookieA,
          },
          body: JSON.stringify({
            supplierId: supplierB.id,
            value: 34500.0,
            description: "Proposta concorrente de kits",
          }),
        },
      );
      expect(qResB.status).toBe(201);

      // Now select Supplier A
      const selRes = await fetch(
        `${webserver.origin}/api/v1/processes/${draftProcess.id}/supplier`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Cookie: solicitanteCookieA,
          },
          body: JSON.stringify({
            supplierId: supplierA.id,
            supplierJustification:
              "A empresa Papelaria Central apresentou a proposta de menor valor e atendeu todos os prazos.",
          }),
        },
      );

      expect(selRes.status).toBe(200);
      const selBody = await selRes.json();
      expect(selBody.selectedSupplierId).toBe(supplierA.id);
      expect(selBody.supplierJustification).toContain("Papelaria Central");

      // Verify audit logs
      const audit = await prisma.auditLog.findFirst({
        where: {
          processId: draftProcess.id,
          action: "SUPPLIER_SELECTED",
        },
      });
      expect(audit).toBeDefined();
    });

    it("updates price justification via /justifications endpoint", async () => {
      const res = await fetch(
        `${webserver.origin}/api/v1/processes/${draftProcess.id}/justifications`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Cookie: solicitanteCookieA,
          },
          body: JSON.stringify({
            priceJustification:
              "O valor da proposta selecionada (R$ 32.000,00) está abaixo do valor estimado e alinhado aos preços públicos praticados.",
          }),
        },
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.priceJustification).toContain("R$ 32.000,00");

      const audit = await prisma.auditLog.findFirst({
        where: {
          processId: draftProcess.id,
          action: "PRICE_JUSTIFICATION_UPDATED",
        },
      });
      expect(audit).toBeDefined();
    });
  });

  describe("Successful Process Submission Workflow", () => {
    it("completes required legal classification and documents, then submits successfully", async () => {
      // 1. Legal Classification
      const legalRes = await fetch(
        `${webserver.origin}/api/v1/processes/${draftProcess.id}/legal-classification`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Cookie: solicitanteCookieA,
          },
          body: JSON.stringify({
            legalBasis: "ART_75_II",
            legalJustification:
              "Dispensa fundamentada no Art. 75, inciso II da Lei nº 14.133/2021 por estar abaixo do teto de compras.",
          }),
        },
      );
      expect(legalRes.status).toBe(200);

      // 2. Attach Termo de Referência (document)
      const mockPdfBuffer = Buffer.from(
        "%PDF-1.4 Mock Termo de Referencia content for test",
      );
      const boundary = "----TestBoundary" + Date.now();
      const bodyPayload = Buffer.concat([
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="type"\r\n\r\nTERMO_REFERENCIA\r\n` +
            `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="termo_referencia.pdf"\r\n` +
            `Content-Type: application/pdf\r\n\r\n`,
        ),
        mockPdfBuffer,
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ]);

      const docRes = await fetch(
        `${webserver.origin}/api/v1/processes/${draftProcess.id}/documents`,
        {
          method: "POST",
          headers: {
            "Content-Type": `multipart/form-data; boundary=${boundary}`,
            Cookie: solicitanteCookieA,
          },
          body: bodyPayload,
        },
      );
      expect(docRes.status).toBe(201);

      // 3. Submit process for analysis
      const submitRes = await fetch(
        `${webserver.origin}/api/v1/processes/${draftProcess.id}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: solicitanteCookieA,
          },
        },
      );

      expect(submitRes.status).toBe(200);
      const submitBody = await submitRes.json();
      expect(submitBody.success).toBe(true);
      expect(submitBody.process.status).toBe("IN_ANALYSIS");

      // Verify database state directly
      const dbProcess = await prisma.process.findUnique({
        where: { id: draftProcess.id },
      });
      expect(dbProcess.status).toBe("IN_ANALYSIS");

      // Verify initial Stage 1 approval task assigned to AGENTE_CONTRATACAO
      const pendingTask = await prisma.approval.findFirst({
        where: { processId: draftProcess.id, decision: null },
      });
      expect(pendingTask).toBeDefined();
      expect(pendingTask.stage).toBe("ANALYSIS");
      expect(pendingTask.assignedRole).toBe("AGENTE_CONTRATACAO");
      expect(pendingTask.cycle).toBe(1);

      // Verify audit log
      const submitAudit = await prisma.auditLog.findFirst({
        where: {
          processId: draftProcess.id,
          action: "PROCESS_SUBMITTED",
        },
      });
      expect(submitAudit).toBeDefined();
      expect(submitAudit.description).toContain("submetido para análise");
    });

    it("rejects subsequent submission attempts with 409 Conflict", async () => {
      const res = await fetch(
        `${webserver.origin}/api/v1/processes/${draftProcess.id}/submit`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: solicitanteCookieA,
          },
        },
      );

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.message).toContain("já foi submetido");
    });

    it("locks ordinary editing (PATCH) once the process is in IN_ANALYSIS", async () => {
      const res = await fetch(
        `${webserver.origin}/api/v1/processes/${draftProcess.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: solicitanteCookieA,
          },
          body: JSON.stringify({
            title: "Tentativa de alteracao indevida pos-submissao",
          }),
        },
      );

      expect(res.status).toBe(409);
      const body = await res.json();
      expect(body.message).toContain("DRAFT");
    });

    it("rejects generic PATCH trying to alter status or protected fields", async () => {
      const res = await fetch(
        `${webserver.origin}/api/v1/processes/${draftProcess.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: adminCookie,
          },
          body: JSON.stringify({
            status: "APPROVED",
          }),
        },
      );

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.message).toContain("status");
    });
  });
});
