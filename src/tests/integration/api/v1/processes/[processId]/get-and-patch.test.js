import crypto from "node:crypto";

import password from "@/infra/password.js";
import { prisma } from "@/infra/prisma.cjs";
import session from "@/infra/session.js";
import webserver from "@/infra/webserver.mjs";
import orchestrator from "@/tests/orchestrator/orchestrator.mjs";

describe("GET and PATCH /api/v1/processes/[processId]", () => {
  let departmentA;
  let departmentB;
  let solicitanteA;
  let solicitanteCookieA;
  let solicitanteB;
  let solicitanteCookieB;
  let agentA;
  let agentCookieA;
  let approverUser;
  let approverCookie;
  let adminUser;
  let adminCookie;
  let draftProcessA;
  let inAnalysisProcessA;

  beforeAll(async () => {
    await orchestrator.clearDatabase();

    const passwordHash = await password.hash("TestPass123!");

    departmentA = await prisma.department.create({
      data: { name: "Secretaria de Administração" },
    });

    departmentB = await prisma.department.create({
      data: { name: "Secretaria de Obras" },
    });

    solicitanteA = await prisma.user.create({
      data: {
        name: "Solicitante A",
        email: "solicitante.detail.a@sisd.com",
        passwordHash,
        role: "SOLICITANTE",
        departmentId: departmentA.id,
      },
    });
    solicitanteCookieA = (await session.create(solicitanteA.id)).sessionCookie;

    solicitanteB = await prisma.user.create({
      data: {
        name: "Solicitante B",
        email: "solicitante.detail.b@sisd.com",
        passwordHash,
        role: "SOLICITANTE",
        departmentId: departmentB.id,
      },
    });
    solicitanteCookieB = (await session.create(solicitanteB.id)).sessionCookie;

    agentA = await prisma.user.create({
      data: {
        name: "Agente Dept A",
        email: "agente.detail.a@sisd.com",
        passwordHash,
        role: "AGENTE_CONTRATACAO",
        departmentId: departmentA.id,
      },
    });
    agentCookieA = (await session.create(agentA.id)).sessionCookie;

    approverUser = await prisma.user.create({
      data: {
        name: "Aprovador",
        email: "aprovador.detail@sisd.com",
        passwordHash,
        role: "APROVADOR",
        departmentId: departmentA.id,
      },
    });
    approverCookie = (await session.create(approverUser.id)).sessionCookie;

    adminUser = await prisma.user.create({
      data: {
        name: "Admin",
        email: "admin.detail@sisd.com",
        passwordHash,
        role: "ADMIN",
        departmentId: departmentA.id,
      },
    });
    adminCookie = (await session.create(adminUser.id)).sessionCookie;

    // Create draft process via POST /api/v1/processes
    const createRes = await fetch(`${webserver.origin}/api/v1/processes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: solicitanteCookieA,
      },
      body: JSON.stringify({
        title: "Aquisição de Impressoras",
        object: "5 impressoras multifuncionais laser",
        description: "Para uso nas coordenadorias",
        legalBasis: "Art. 75, II",
        estimatedValue: 18500.0,
        category: "IT_GOODS",
        detailedJustification: "Substituição de equipamentos sem conserto.",
        technicalSpecifications: "Laser monocromática, duplex, rede Gigabit",
        urgency: "MEDIUM",
        responsibleName: "Solicitante A",
        responsibleEmail: "solicitante.detail.a@sisd.com",
        budgetSource: "Dotação 2026.01",
        desiredDeadlineDays: 20,
      }),
    });
    draftProcessA = await createRes.json();

    // Create non-DRAFT process directly in DB to test status restrictions
    inAnalysisProcessA = await prisma.process.create({
      data: {
        number: 50,
        year: 2026,
        title: "Processo em Análise",
        object: "Objeto já submetido para análise",
        status: "IN_ANALYSIS",
        departmentId: departmentA.id,
        requesterId: solicitanteA.id,
        demandDocument: {
          create: {
            category: "COMMON_GOODS",
            detailedJustification: "Justificativa inicial.",
            urgency: "LOW",
            responsibleName: "Solicitante A",
          },
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("GET /api/v1/processes/[processId]", () => {
    test("Rejects unauthenticated request with 401", async () => {
      const response = await fetch(
        `${webserver.origin}/api/v1/processes/${draftProcessA.id}`,
      );
      expect(response.status).toBe(401);
    });

    test("Rejects invalid processId format with 400", async () => {
      const response = await fetch(
        `${webserver.origin}/api/v1/processes/not-a-valid-uuid`,
        { headers: { Cookie: solicitanteCookieA } },
      );
      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.name).toBe("ValidationError");
    });

    test("Returns 404 when process does not exist", async () => {
      const response = await fetch(
        `${webserver.origin}/api/v1/processes/${crypto.randomUUID()}`,
        { headers: { Cookie: solicitanteCookieA } },
      );
      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.name).toBe("NotFoundError");
    });

    test("Rejects SOLICITANTE attempting to access another requester's process with 403", async () => {
      const response = await fetch(
        `${webserver.origin}/api/v1/processes/${draftProcessA.id}`,
        { headers: { Cookie: solicitanteCookieB } },
      );
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.name).toBe("ForbiddenError");
    });

    test("Returns complete process detail, associated DFD, and audit logs without sensitive fields", async () => {
      const response = await fetch(
        `${webserver.origin}/api/v1/processes/${draftProcessA.id}`,
        { headers: { Cookie: solicitanteCookieA } },
      );

      expect(response.status).toBe(200);
      const body = await response.json();

      expect(body.id).toBe(draftProcessA.id);
      expect(body.title).toBe("Aquisição de Impressoras");
      expect(body.object).toBe("5 impressoras multifuncionais laser");
      expect(body.description).toBe("Para uso nas coordenadorias");
      expect(body.legalBasis).toBe("Art. 75, II");
      expect(body.estimatedValue).toBe(18500);
      expect(body.status).toBe("DRAFT");
      expect(body.department).toEqual({
        id: departmentA.id,
        name: departmentA.name,
      });
      expect(body.requester).toEqual({
        id: solicitanteA.id,
        name: solicitanteA.name,
        email: solicitanteA.email,
        role: "SOLICITANTE",
      });
      expect(body.requester.passwordHash).toBeUndefined();
      expect(body.demandDocument).toBeDefined();
      expect(body.demandDocument.category).toBe("IT_GOODS");
      expect(body.demandDocument.detailedJustification).toBe(
        "Substituição de equipamentos sem conserto.",
      );
      expect(body.permissions).toEqual({ canEdit: true });
      expect(Array.isArray(body.auditLogs)).toBe(true);
      expect(body.auditLogs.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("PATCH /api/v1/processes/[processId]", () => {
    test("Rejects unauthenticated request with 401", async () => {
      const response = await fetch(
        `${webserver.origin}/api/v1/processes/${draftProcessA.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Novo Título" }),
        },
      );
      expect(response.status).toBe(401);
    });

    test("Rejects APROVADOR attempting to edit a process with 403", async () => {
      const response = await fetch(
        `${webserver.origin}/api/v1/processes/${draftProcessA.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: approverCookie,
          },
          body: JSON.stringify({ title: "Tentativa Aprovador" }),
        },
      );
      expect(response.status).toBe(403);
    });

    test("Rejects SOLICITANTE attempting to edit another requester's process with 403", async () => {
      const response = await fetch(
        `${webserver.origin}/api/v1/processes/${draftProcessA.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: solicitanteCookieB,
          },
          body: JSON.stringify({ title: "Tentativa Solicitante B" }),
        },
      );
      expect(response.status).toBe(403);
    });

    test("Rejects attempts to modify protected fields (status, number, year, requesterId, departmentId) with 400", async () => {
      const protectedPayloads = [
        { status: "APPROVED" },
        { number: 999 },
        { year: 2030 },
        { requesterId: solicitanteB.id },
        { departmentId: departmentB.id },
      ];

      for (const payload of protectedPayloads) {
        const response = await fetch(
          `${webserver.origin}/api/v1/processes/${draftProcessA.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Cookie: solicitanteCookieA,
            },
            body: JSON.stringify(payload),
          },
        );
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.name).toBe("ValidationError");
      }
    });

    test("Rejects editing a process that is not in DRAFT status with 409 ConflictError", async () => {
      const response = await fetch(
        `${webserver.origin}/api/v1/processes/${inAnalysisProcessA.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: solicitanteCookieA,
          },
          body: JSON.stringify({
            title: "Tentativa de Edição Fora de Rascunho",
          }),
        },
      );

      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body.name).toBe("ConflictError");
    });

    test("Successfully updates process and DFD fields in DRAFT status and records audit events", async () => {
      const response = await fetch(
        `${webserver.origin}/api/v1/processes/${draftProcessA.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: solicitanteCookieA,
          },
          body: JSON.stringify({
            title: "Aquisição de 8 Impressoras Laser",
            estimatedValue: 24800.75,
            legalBasis: "Art. 75, II da Lei nº 14.133/2021",
            demandDocument: {
              urgency: "HIGH",
              detailedJustification:
                "Aumento da demanda nas coordenadorias regionais.",
              desiredDeadlineDays: 15,
            },
          }),
        },
      );

      expect(response.status).toBe(200);
      const updated = await response.json();

      expect(updated.title).toBe("Aquisição de 8 Impressoras Laser");
      expect(updated.estimatedValue).toBe(24800.75);
      expect(updated.legalBasis).toBe("Art. 75, II da Lei nº 14.133/2021");
      expect(updated.demandDocument.urgency).toBe("HIGH");
      expect(updated.demandDocument.detailedJustification).toBe(
        "Aumento da demanda nas coordenadorias regionais.",
      );
      expect(updated.demandDocument.desiredDeadlineDays).toBe(15);

      // Ensure no duplicate DFD was created
      const dfdCount = await prisma.demandDocument.count({
        where: { processId: draftProcessA.id },
      });
      expect(dfdCount).toBe(1);

      // Ensure PROCESS_UPDATED and DEMAND_DOCUMENT_UPDATED audit logs were recorded
      const actions = updated.auditLogs.map((l) => l.action);
      expect(actions).toContain("PROCESS_UPDATED");
      expect(actions).toContain("DEMAND_DOCUMENT_UPDATED");
    });
  });
});
