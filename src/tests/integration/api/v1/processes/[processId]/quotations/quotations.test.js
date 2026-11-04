import { Prisma } from "@prisma/client";
import password from "@/infra/password.js";
import { prisma } from "@/infra/prisma.cjs";
import session from "@/infra/session.js";
import webserver from "@/infra/webserver.mjs";
import orchestrator from "@/tests/orchestrator/orchestrator.mjs";

describe("API v1 Process Quotations", () => {
  let department;
  let adminUser;
  let adminCookie;
  let agenteUser;
  let agenteCookie;
  let supplierA;
  let supplierB;
  let processRecord;

  beforeAll(async () => {
    await orchestrator.clearDatabase();
    const passwordHash = await password.hash("TestPass123!");

    department = await prisma.department.create({
      data: { name: "Secretaria de Educação" },
    });

    adminUser = await prisma.user.create({
      data: {
        name: "Admin Geral",
        email: "admin.quote@sisd.com",
        passwordHash,
        role: "ADMIN",
        departmentId: department.id,
      },
    });
    const adminSess = await session.create(adminUser.id);
    adminCookie = adminSess.sessionCookie;

    agenteUser = await prisma.user.create({
      data: {
        name: "Agente Compras",
        email: "agente.quote@sisd.com",
        passwordHash,
        role: "AGENTE_CONTRATACAO",
        departmentId: department.id,
      },
    });
    const agenteSess = await session.create(agenteUser.id);
    agenteCookie = agenteSess.sessionCookie;

    supplierA = await prisma.supplier.create({
      data: {
        legalName: "Fornecedora Alpha Ltda.",
        cnpj: "00000000000191",
        email: "alpha@fornecedor.com",
      },
    });

    supplierB = await prisma.supplier.create({
      data: {
        legalName: "Fornecedora Beta S.A.",
        cnpj: "33000167000101",
        email: "beta@fornecedor.com",
      },
    });

    processRecord = await prisma.process.create({
      data: {
        number: 1,
        year: 2026,
        title: "Aquisição de Livros Didáticos",
        object: "Compra de 500 kits de livros",
        status: "PRICE_RESEARCH",
        departmentId: department.id,
        requesterId: agenteUser.id,
      },
    });
  }, 60000);

  describe("POST /api/v1/processes/[processId]/quotations", () => {
    it("returns 401 when anonymous", async () => {
      const response = await fetch(
        `${webserver.origin}/api/v1/processes/${processRecord.id}/quotations`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            supplierId: supplierA.id,
            value: "25000.00",
          }),
        },
      );

      expect(response.status).toBe(401);
    });

    it("registers quotation and records QUOTATION_ADDED audit log", async () => {
      const response = await fetch(
        `${webserver.origin}/api/v1/processes/${processRecord.id}/quotations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: agenteCookie,
          },
          body: JSON.stringify({
            supplierId: supplierA.id,
            value: "25000.00",
            description: "Proposta inicial de livros didáticos",
            quotedAt: "2026-10-15",
          }),
        },
      );

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.id).toBeDefined();
      expect(body.supplierId).toBe(supplierA.id);
      expect(body.value).toBe("25000.00");
      expect(body.supplier.legalName).toBe("Fornecedora Alpha Ltda.");

      // Verify audit log
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          processId: processRecord.id,
          action: "QUOTATION_ADDED",
        },
      });
      expect(auditLog).toBeDefined();
      expect(auditLog.description).toContain("Alpha");
    });

    it("returns 409 Conflict when adding duplicate quotation for same supplier", async () => {
      const response = await fetch(
        `${webserver.origin}/api/v1/processes/${processRecord.id}/quotations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: agenteCookie,
          },
          body: JSON.stringify({
            supplierId: supplierA.id,
            value: "24000.00",
          }),
        },
      );

      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body.name).toBe("ConflictError");
    });

    it("allows adding second quotation from supplier B", async () => {
      const response = await fetch(
        `${webserver.origin}/api/v1/processes/${processRecord.id}/quotations`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: adminCookie,
          },
          body: JSON.stringify({
            supplierId: supplierB.id,
            value: "22500.50",
            description: "Proposta concorrente com desconto",
            quotedAt: "2026-10-16",
          }),
        },
      );

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.supplierId).toBe(supplierB.id);
      expect(body.value).toBe("22500.50");
    });
  });

  describe("GET /api/v1/processes/[processId]/quotations", () => {
    it("returns quotation list and comparative price map", async () => {
      const response = await fetch(
        `${webserver.origin}/api/v1/processes/${processRecord.id}/quotations`,
        {
          headers: { Cookie: agenteCookie },
        },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.length).toBe(2);
      expect(body.map).toBeDefined();
      expect(body.map.hasQuotations).toBe(true);
      expect(body.map.lowestValue).toBe("22500.50");
      expect(body.map.items[0].supplier.legalName).toBe(
        "Fornecedora Beta S.A.",
      );
      expect(body.map.items[0].isLowest).toBe(true);
    });
  });

  describe("PATCH /api/v1/processes/[processId]/quotations/[quotationId]", () => {
    it("updates quotation value and records QUOTATION_UPDATED audit log", async () => {
      const quotations = await prisma.quotation.findMany({
        where: { processId: processRecord.id },
      });
      const targetQuotation = quotations.find(
        (q) => q.supplierId === supplierA.id,
      );

      const response = await fetch(
        `${webserver.origin}/api/v1/processes/${processRecord.id}/quotations/${targetQuotation.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: agenteCookie,
          },
          body: JSON.stringify({
            value: "21900.00",
            description: "Proposta com contraproposta aceita",
          }),
        },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.value).toBe("21900.00");

      const updateLog = await prisma.auditLog.findFirst({
        where: {
          processId: processRecord.id,
          action: "QUOTATION_UPDATED",
        },
        orderBy: { createdAt: "desc" },
      });
      expect(updateLog).toBeDefined();
      expect(updateLog.description).toContain("Alpha");
    });
  });
});
