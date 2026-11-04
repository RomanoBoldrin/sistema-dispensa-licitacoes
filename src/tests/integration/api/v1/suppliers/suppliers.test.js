import password from "@/infra/password.js";
import { prisma } from "@/infra/prisma.cjs";
import session from "@/infra/session.js";
import webserver from "@/infra/webserver.mjs";
import orchestrator from "@/tests/orchestrator/orchestrator.mjs";

describe("API v1 Suppliers", () => {
  let adminUser;
  let adminCookie;
  let agenteUser;
  let agenteCookie;
  let solicitanteUser;
  let solicitanteCookie;

  beforeAll(async () => {
    await orchestrator.clearDatabase();
    const passwordHash = await password.hash("TestPass123!");

    const dept = await prisma.department.create({
      data: { name: "Secretaria de Administração" },
    });

    adminUser = await prisma.user.create({
      data: {
        name: "Admin Geral",
        email: "admin.supp@sisd.com",
        passwordHash,
        role: "ADMIN",
        departmentId: dept.id,
      },
    });
    const adminSess = await session.create(adminUser.id);
    adminCookie = adminSess.sessionCookie;

    agenteUser = await prisma.user.create({
      data: {
        name: "Agente Fornecedores",
        email: "agente.supp@sisd.com",
        passwordHash,
        role: "AGENTE_CONTRATACAO",
        departmentId: dept.id,
      },
    });
    const agenteSess = await session.create(agenteUser.id);
    agenteCookie = agenteSess.sessionCookie;

    solicitanteUser = await prisma.user.create({
      data: {
        name: "Solicitante Sem Acesso",
        email: "solicitante.supp@sisd.com",
        passwordHash,
        role: "SOLICITANTE",
        departmentId: dept.id,
      },
    });
    const solSess = await session.create(solicitanteUser.id);
    solicitanteCookie = solSess.sessionCookie;
  }, 60000);

  describe("POST /api/v1/suppliers", () => {
    it("returns 401 when not authenticated", async () => {
      const response = await fetch(`${webserver.origin}/api/v1/suppliers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legalName: "Fornecedor Anônimo",
          cnpj: "00.000.000/0001-91",
        }),
      });

      expect(response.status).toBe(401);
    });

    it("returns 403 when user is SOLICITANTE", async () => {
      const response = await fetch(`${webserver.origin}/api/v1/suppliers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: solicitanteCookie,
        },
        body: JSON.stringify({
          legalName: "Tentativa Solicitante",
          cnpj: "00.000.000/0001-91",
        }),
      });

      expect(response.status).toBe(403);
    });

    it("returns 400 when CNPJ check digits are invalid", async () => {
      const response = await fetch(`${webserver.origin}/api/v1/suppliers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: agenteCookie,
        },
        body: JSON.stringify({
          legalName: "Fornecedor CNPJ Ruim",
          cnpj: "00.000.000/0001-99", // invalid
        }),
      });

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.name).toBe("ValidationError");
    });

    it("creates a supplier with 201 when called by AGENTE_CONTRATACAO", async () => {
      const response = await fetch(`${webserver.origin}/api/v1/suppliers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: agenteCookie,
        },
        body: JSON.stringify({
          legalName: "Empresa Alfa Tecnologia Ltda.",
          tradeName: "Alfa Tech",
          cnpj: "00.000.000/0001-91",
          email: "contato@alfatech.com.br",
          phone: "(11) 3456-7890",
        }),
      });

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.id).toBeDefined();
      expect(body.legalName).toBe("Empresa Alfa Tecnologia Ltda.");
      expect(body.cnpj).toBe("00000000000191");
      expect(body.formattedCnpj).toBe("00.000.000/0001-91");
    });

    it("returns 409 Conflict when attempting to register duplicate CNPJ", async () => {
      const response = await fetch(`${webserver.origin}/api/v1/suppliers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: adminCookie,
        },
        body: JSON.stringify({
          legalName: "Outra Empresa Com Mesmo CNPJ",
          cnpj: "00000000000191",
        }),
      });

      expect(response.status).toBe(409);
      const body = await response.json();
      expect(body.name).toBe("ConflictError");
    });
  });

  describe("GET /api/v1/suppliers", () => {
    it("lists suppliers with pagination and supports search", async () => {
      const response = await fetch(
        `${webserver.origin}/api/v1/suppliers?search=Alfa`,
        {
          headers: { Cookie: solicitanteCookie },
        },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toBeDefined();
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      expect(body.data[0].legalName).toContain("Alfa");
      expect(body.meta).toBeDefined();
    });
  });

  describe("GET and PATCH /api/v1/suppliers/[supplierId]", () => {
    let createdSupplierId;

    beforeAll(async () => {
      const supplier = await prisma.supplier.create({
        data: {
          legalName: "Beta Materiais de Construção",
          tradeName: "Beta Materiais",
          cnpj: "33000167000101",
          email: "beta@materiais.com.br",
        },
      });
      createdSupplierId = supplier.id;
    });

    it("retrieves supplier details by ID", async () => {
      const response = await fetch(
        `${webserver.origin}/api/v1/suppliers/${createdSupplierId}`,
        {
          headers: { Cookie: solicitanteCookie },
        },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.id).toBe(createdSupplierId);
      expect(body.legalName).toBe("Beta Materiais de Construção");
      expect(body.formattedCnpj).toBe("33.000.167/0001-01");
    });

    it("updates supplier details when called by ADMIN", async () => {
      const response = await fetch(
        `${webserver.origin}/api/v1/suppliers/${createdSupplierId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Cookie: adminCookie,
          },
          body: JSON.stringify({
            tradeName: "Beta Materiais e Ferramentas",
            phone: "(11) 98765-4321",
          }),
        },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.tradeName).toBe("Beta Materiais e Ferramentas");
      expect(body.phone).toBe("(11) 98765-4321");
    });
  });
});
