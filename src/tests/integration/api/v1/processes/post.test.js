import crypto from "node:crypto";

import password from "@/infra/password.js";
import { prisma } from "@/infra/prisma.cjs";
import session from "@/infra/session.js";
import webserver from "@/infra/webserver.mjs";
import orchestrator from "@/tests/orchestrator/orchestrator.mjs";

describe("POST /api/v1/processes", () => {
  let departmentA;
  let departmentB;
  let solicitanteUserA;
  let solicitanteCookieA;
  let solicitanteUserB;
  let solicitanteCookieB;
  let solicitanteWithoutDept;
  let solicitanteWithoutDeptCookie;
  let approverUser;
  let approverCookie;
  let adminUser;
  let adminCookie;
  let inactiveUser;
  let inactiveCookie;

  beforeAll(async () => {
    await orchestrator.clearDatabase();

    const passwordHash = await password.hash("TestPass123!");

    // Create Departments
    departmentA = await prisma.department.create({
      data: { name: "Secretaria de Obras e Serviços" },
    });

    departmentB = await prisma.department.create({
      data: { name: "Secretaria de Saúde" },
    });

    // Create Solicitante A (in Department A)
    solicitanteUserA = await prisma.user.create({
      data: {
        name: "Solicitante A",
        email: "solicitante.a@sisd.com",
        passwordHash,
        role: "SOLICITANTE",
        departmentId: departmentA.id,
      },
    });
    const sessionSolA = await session.create(solicitanteUserA.id);
    solicitanteCookieA = sessionSolA.sessionCookie;

    // Create Solicitante B (in Department B)
    solicitanteUserB = await prisma.user.create({
      data: {
        name: "Solicitante B",
        email: "solicitante.b@sisd.com",
        passwordHash,
        role: "SOLICITANTE",
        departmentId: departmentB.id,
      },
    });
    const sessionSolB = await session.create(solicitanteUserB.id);
    solicitanteCookieB = sessionSolB.sessionCookie;

    // Create Solicitante without department
    solicitanteWithoutDept = await prisma.user.create({
      data: {
        name: "Solicitante Sem Dept",
        email: "solicitante.nodept@sisd.com",
        passwordHash,
        role: "SOLICITANTE",
        departmentId: null,
      },
    });
    const sessionNoDept = await session.create(solicitanteWithoutDept.id);
    solicitanteWithoutDeptCookie = sessionNoDept.sessionCookie;

    // Create Approver
    approverUser = await prisma.user.create({
      data: {
        name: "Aprovador Geral",
        email: "aprovador@sisd.com",
        passwordHash,
        role: "APROVADOR",
        departmentId: departmentA.id,
      },
    });
    const sessionApp = await session.create(approverUser.id);
    approverCookie = sessionApp.sessionCookie;

    // Create Admin
    adminUser = await prisma.user.create({
      data: {
        name: "Admin Sistema",
        email: "admin.sistema@sisd.com",
        passwordHash,
        role: "ADMIN",
        departmentId: null,
      },
    });
    const sessionAdm = await session.create(adminUser.id);
    adminCookie = sessionAdm.sessionCookie;

    // Create Inactive User
    inactiveUser = await prisma.user.create({
      data: {
        name: "Usuario Inativo",
        email: "inativo@sisd.com",
        passwordHash,
        role: "SOLICITANTE",
        isActive: false,
        departmentId: departmentA.id,
      },
    });
    const sessionInact = await session.create(inactiveUser.id);
    inactiveCookie = sessionInact.sessionCookie;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const validPayload = {
    title: "Aquisição de computadores desktop",
    object: "15 computadores com processador i5 e 16GB RAM",
    description: "Substituição de máquinas obsoletas",
    category: "IT_GOODS",
    detailedJustification:
      "Equipamentos atuais possuem mais de 7 anos e causam lentidão.",
    technicalSpecifications: "Intel i5 12th gen, 16GB DDR4, SSD 512GB",
    urgency: "HIGH",
    responsibleName: "Carlos Mendes",
    responsibleEmail: "carlos.mendes@sisd.com",
    budgetSource: "Dotação 04.122.0032.2000",
    desiredDeadlineDays: 30,
  };

  describe("Authentication and Role Authorization", () => {
    test("Should reject unauthenticated request with 401", async () => {
      const response = await fetch(`${webserver.origin}/api/v1/processes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validPayload),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.name).toBe("UnauthorizedError");
    });

    test("Should reject request with invalid session token with 401", async () => {
      const response = await fetch(`${webserver.origin}/api/v1/processes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: "session_id=invalidtoken123456789",
        },
        body: JSON.stringify(validPayload),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.name).toBe("UnauthorizedError");
    });

    test("Should reject request from inactive user with 401", async () => {
      const response = await fetch(`${webserver.origin}/api/v1/processes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: inactiveCookie,
        },
        body: JSON.stringify(validPayload),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.name).toBe("UnauthorizedError");
    });

    test("Should reject request from unauthorized role (APROVADOR) with 403", async () => {
      const response = await fetch(`${webserver.origin}/api/v1/processes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: approverCookie,
        },
        body: JSON.stringify(validPayload),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.name).toBe("ForbiddenError");
    });
  });

  describe("Request Body and Field Validation", () => {
    test("Should reject malformed body (not an object) with 400", async () => {
      const response = await fetch(`${webserver.origin}/api/v1/processes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: solicitanteCookieA,
        },
        body: JSON.stringify("plain string not object"),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.name).toBe("ValidationError");
    });

    test("Should reject missing or empty title with 400", async () => {
      const payload = { ...validPayload, title: "   " };
      const response = await fetch(`${webserver.origin}/api/v1/processes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: solicitanteCookieA,
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.name).toBe("ValidationError");
    });

    test("Should reject missing or empty object with 400", async () => {
      const payload = { ...validPayload, object: "" };
      const response = await fetch(`${webserver.origin}/api/v1/processes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: solicitanteCookieA,
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.name).toBe("ValidationError");
    });

    test("Should reject invalid category enum with 400", async () => {
      const payload = { ...validPayload, category: "VEHICLES" };
      const response = await fetch(`${webserver.origin}/api/v1/processes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: solicitanteCookieA,
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.name).toBe("ValidationError");
    });

    test("Should reject missing detailedJustification with 400", async () => {
      const payload = { ...validPayload, detailedJustification: "" };
      const response = await fetch(`${webserver.origin}/api/v1/processes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: solicitanteCookieA,
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.name).toBe("ValidationError");
    });

    test("Should reject invalid urgency enum with 400", async () => {
      const payload = { ...validPayload, urgency: "EXTREME" };
      const response = await fetch(`${webserver.origin}/api/v1/processes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: solicitanteCookieA,
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.name).toBe("ValidationError");
    });

    test("Should reject missing responsibleName with 400", async () => {
      const payload = { ...validPayload, responsibleName: "   " };
      const response = await fetch(`${webserver.origin}/api/v1/processes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: solicitanteCookieA,
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.name).toBe("ValidationError");
    });

    test("Should reject invalid responsibleEmail format with 400", async () => {
      const payload = { ...validPayload, responsibleEmail: "not-an-email" };
      const response = await fetch(`${webserver.origin}/api/v1/processes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: solicitanteCookieA,
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.name).toBe("ValidationError");
    });

    test("Should reject invalid desiredDeadlineDays (0 or negative or non-integer) with 400", async () => {
      for (const invalidDays of [0, -5, 2.5, "30"]) {
        const payload = { ...validPayload, desiredDeadlineDays: invalidDays };
        const response = await fetch(`${webserver.origin}/api/v1/processes`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: solicitanteCookieA,
          },
          body: JSON.stringify(payload),
        });

        expect(response.status).toBe(400);
        const data = await response.json();
        expect(data.name).toBe("ValidationError");
      }
    });

    test("Should reject invalid departmentId format (non-UUID) with 400", async () => {
      const payload = { ...validPayload, departmentId: "123-abc-not-uuid" };
      const response = await fetch(`${webserver.origin}/api/v1/processes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: solicitanteCookieA,
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.name).toBe("ValidationError");
    });

    test("Should reject invalid type for optional description with 400", async () => {
      const payload = { ...validPayload, description: 12345 };
      const response = await fetch(`${webserver.origin}/api/v1/processes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: solicitanteCookieA,
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.name).toBe("ValidationError");
    });
  });

  describe("Department Resolution and Authorization", () => {
    test("Should reject nonexistent departmentId with 404", async () => {
      const payload = {
        ...validPayload,
        departmentId: crypto.randomUUID(),
      };
      const response = await fetch(`${webserver.origin}/api/v1/processes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: adminCookie,
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.name).toBe("NotFoundError");
    });

    test("Should reject unauthorized cross-department creation from SOLICITANTE with 403", async () => {
      // Solicitante A attempts to create process in Department B
      const payload = { ...validPayload, departmentId: departmentB.id };
      const response = await fetch(`${webserver.origin}/api/v1/processes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: solicitanteCookieA,
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.name).toBe("ForbiddenError");
    });

    test("Should reject user without assigned department when departmentId is omitted with 400", async () => {
      const response = await fetch(`${webserver.origin}/api/v1/processes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: solicitanteWithoutDeptCookie,
        },
        body: JSON.stringify(validPayload),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.name).toBe("ValidationError");
    });

    test("Admin can create a process for any department explicitly", async () => {
      const payload = { ...validPayload, departmentId: departmentB.id };
      const response = await fetch(`${webserver.origin}/api/v1/processes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: adminCookie,
        },
        body: JSON.stringify(payload),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.departmentId).toBe(departmentB.id);
      expect(data.department.name).toBe("Secretaria de Saúde");
    });
  });

  describe("Successful Process and DFD Creation", () => {
    test("Creates process with status DRAFT, DFD and AuditLog, resolving user department automatically", async () => {
      const currentYear = new Date().getFullYear();

      const response = await fetch(`${webserver.origin}/api/v1/processes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: solicitanteCookieA,
        },
        body: JSON.stringify(validPayload),
      });

      expect(response.status).toBe(201);
      const data = await response.json();

      expect(data.id).toBeDefined();
      expect(typeof data.number).toBe("number");
      expect(data.year).toBe(currentYear);
      expect(data.title).toBe(validPayload.title);
      expect(data.object).toBe(validPayload.object);
      expect(data.description).toBe(validPayload.description);
      expect(data.status).toBe("DRAFT");
      expect(data.departmentId).toBe(departmentA.id);
      expect(data.department).toEqual({
        id: departmentA.id,
        name: departmentA.name,
      });
      expect(data.requesterId).toBe(solicitanteUserA.id);

      // Verify DFD information in response
      expect(data.demandDocument).toBeDefined();
      expect(data.demandDocument.processId).toBe(data.id);
      expect(data.demandDocument.category).toBe("IT_GOODS");
      expect(data.demandDocument.detailedJustification).toBe(
        validPayload.detailedJustification,
      );
      expect(data.demandDocument.technicalSpecifications).toBe(
        validPayload.technicalSpecifications,
      );
      expect(data.demandDocument.urgency).toBe("HIGH");
      expect(data.demandDocument.budgetSource).toBe(validPayload.budgetSource);
      expect(data.demandDocument.desiredDeadlineDays).toBe(30);
      expect(data.demandDocument.responsibleName).toBe("Carlos Mendes");
      expect(data.demandDocument.responsibleEmail).toBe(
        "carlos.mendes@sisd.com",
      );

      // Verify records in database
      const dbProcess = await prisma.process.findUnique({
        where: { id: data.id },
      });
      expect(dbProcess).not.toBeNull();
      expect(dbProcess.status).toBe("DRAFT");
      expect(dbProcess.requesterId).toBe(solicitanteUserA.id);

      const dbDfd = await prisma.demandDocument.findUnique({
        where: { processId: data.id },
      });
      expect(dbDfd).not.toBeNull();
      expect(dbDfd.category).toBe("IT_GOODS");
      expect(dbDfd.urgency).toBe("HIGH");

      const dbAudit = await prisma.auditLog.findFirst({
        where: {
          processId: data.id,
          action: "DEMAND_DOCUMENT_CREATED",
        },
      });
      expect(dbAudit).not.toBeNull();
      expect(dbAudit.userId).toBe(solicitanteUserA.id);
    });

    test("Creates process with default urgency and omitted optional fields", async () => {
      const minimalPayload = {
        title: "Contratação de limpeza",
        object: "Serviço de limpeza predial contínuo",
        category: "GENERAL_SERVICES",
        detailedJustification:
          "Necessidade de higienização das áreas administrativas.",
        responsibleName: "Mariana Costa",
      };

      const response = await fetch(`${webserver.origin}/api/v1/processes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: solicitanteCookieA,
        },
        body: JSON.stringify(minimalPayload),
      });

      expect(response.status).toBe(201);
      const data = await response.json();

      expect(data.description).toBeNull();
      expect(data.demandDocument.urgency).toBe("MEDIUM");
      expect(data.demandDocument.technicalSpecifications).toBeNull();
      expect(data.demandDocument.responsibleEmail).toBeNull();
      expect(data.demandDocument.budgetSource).toBeNull();
      expect(data.demandDocument.desiredDeadlineDays).toBeNull();
    });
  });

  describe("Process Numbering Behavior", () => {
    test("Generates sequentially incrementing process numbers for the same year", async () => {
      const currentYear = new Date().getFullYear();

      // Find current max number for this year
      const last = await prisma.process.findFirst({
        where: { year: currentYear },
        orderBy: { number: "desc" },
        select: { number: true },
      });
      const startNumber = last?.number ?? 0;

      const response1 = await fetch(`${webserver.origin}/api/v1/processes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: solicitanteCookieB,
        },
        body: JSON.stringify({
          ...validPayload,
          title: "Sequencial 1",
        }),
      });
      expect(response1.status).toBe(201);
      const data1 = await response1.json();
      expect(data1.number).toBe(startNumber + 1);

      const response2 = await fetch(`${webserver.origin}/api/v1/processes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: solicitanteCookieB,
        },
        body: JSON.stringify({
          ...validPayload,
          title: "Sequencial 2",
        }),
      });
      expect(response2.status).toBe(201);
      const data2 = await response2.json();
      expect(data2.number).toBe(startNumber + 2);
    });
  });

  describe("Transaction Integrity and Atomicity", () => {
    test("Failed request leaves no orphan records in database", async () => {
      const initialProcessesCount = await prisma.process.count();
      const initialDfdCount = await prisma.demandDocument.count();
      const initialAuditCount = await prisma.auditLog.count();

      const response = await fetch(`${webserver.origin}/api/v1/processes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: adminCookie,
        },
        body: JSON.stringify({
          ...validPayload,
          departmentId: crypto.randomUUID(),
        }),
      });

      expect(response.status).toBe(404);

      // Verify no records were inserted into the database
      const finalProcessesCount = await prisma.process.count();
      const finalDfdCount = await prisma.demandDocument.count();
      const finalAuditCount = await prisma.auditLog.count();

      expect(finalProcessesCount).toBe(initialProcessesCount);
      expect(finalDfdCount).toBe(initialDfdCount);
      expect(finalAuditCount).toBe(initialAuditCount);
    });

    test("Prisma transaction rolls back process and DFD creation if an operation fails", async () => {
      const currentYear = new Date().getFullYear();
      const initialProcesses = await prisma.process.count();
      const initialDfds = await prisma.demandDocument.count();

      await expect(
        prisma.$transaction(async (tx) => {
          await tx.process.create({
            data: {
              number: 99999,
              year: currentYear,
              title: "Rollback Test",
              object: "Rollback Object",
              status: "DRAFT",
              departmentId: departmentA.id,
              requesterId: solicitanteUserA.id,
              demandDocument: {
                create: {
                  category: "OTHER",
                  detailedJustification: "Rollback Justification",
                  responsibleName: "Rollback User",
                },
              },
            },
          });

          // Simulate an error inside the transaction boundary
          throw new Error("Simulated transactional step failure");
        }),
      ).rejects.toThrow("Simulated transactional step failure");

      expect(await prisma.process.count()).toBe(initialProcesses);
      expect(await prisma.demandDocument.count()).toBe(initialDfds);
    });
  });
});
