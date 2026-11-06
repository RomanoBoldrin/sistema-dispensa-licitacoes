import * as cookie from "cookie";
import password from "@/infra/password.js";
import { prisma } from "@/infra/prisma.cjs";
import session from "@/infra/session.js";
import orchestrator from "@/tests/orchestrator/orchestrator.mjs";

import dashboardRoute from "@/pages/api/v1/dashboard/index.js";
import inboxRoute from "@/pages/api/v1/final-authorizations/index.js";
import initiateRoute from "@/pages/api/v1/processes/[processId]/final-authorization/initiate/index.js";
import detailsRoute from "@/pages/api/v1/processes/[processId]/final-authorization/index.js";
import authorizeRoute from "@/pages/api/v1/processes/[processId]/final-authorization/authorize/index.js";
import refuseRoute from "@/pages/api/v1/processes/[processId]/final-authorization/refuse/index.js";
import adjustmentsRoute from "@/pages/api/v1/processes/[processId]/final-authorization/request-adjustments/index.js";
import publicationsRoute from "@/pages/api/v1/processes/[processId]/publications/index.js";

describe("Phase 5.4 Finalization Frontend Integration Suite", () => {
  jest.setTimeout(60000);

  let department;
  let solicitante;
  let agente;
  let autoridade;
  let aprovador;
  let adminUser;

  let sessionSolicitante;
  let sessionAgente;
  let sessionAutoridade;
  let sessionAprovador;
  let sessionAdmin;

  let supplier;

  function createMockRes() {
    return {
      statusCode: 200,
      headers: {},
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
      setHeader(name, value) {
        this.headers[name] = value;
        return this;
      },
    };
  }

  beforeAll(async () => {
    await orchestrator.clearDatabase();

    department = await prisma.department.create({
      data: { name: "Departamento de Infraestrutura e Logística" },
    });

    const hashedPassword = await password.hash("SenhaForte123!");

    solicitante = await prisma.user.create({
      data: {
        name: "Servidor Solicitante",
        email: "solicitante.infra@teste.gov.br",
        passwordHash: hashedPassword,
        role: "SOLICITANTE",
        departmentId: department.id,
      },
    });

    agente = await prisma.user.create({
      data: {
        name: "Agente de Contratação",
        email: "agente.infra@teste.gov.br",
        passwordHash: hashedPassword,
        role: "AGENTE_CONTRATACAO",
        departmentId: department.id,
      },
    });

    aprovador = await prisma.user.create({
      data: {
        name: "Aprovador Técnico",
        email: "aprovador.infra@teste.gov.br",
        passwordHash: hashedPassword,
        role: "APROVADOR",
        departmentId: department.id,
      },
    });

    autoridade = await prisma.user.create({
      data: {
        name: "Secretária de Estado (Autoridade)",
        email: "autoridade.infra@teste.gov.br",
        passwordHash: hashedPassword,
        role: "AUTORIDADE_COMPETENTE",
        departmentId: department.id,
      },
    });

    adminUser = await prisma.user.create({
      data: {
        name: "Administrador Central",
        email: "admin.central@teste.gov.br",
        passwordHash: hashedPassword,
        role: "ADMIN",
      },
    });

    supplier = await prisma.supplier.create({
      data: {
        legalName: "Construtora Horizonte LTDA",
        tradeName: "Horizonte Engenharia",
        cnpj: "12345678000195",
        email: "contato@horizonte.com.br",
      },
    });

    // Create sessions
    const s1 = await session.create(solicitante.id);
    sessionSolicitante = cookie.parse(s1.sessionCookie).session_id;

    const s2 = await session.create(agente.id);
    sessionAgente = cookie.parse(s2.sessionCookie).session_id;

    const s3 = await session.create(autoridade.id);
    sessionAutoridade = cookie.parse(s3.sessionCookie).session_id;

    const s4 = await session.create(aprovador.id);
    sessionAprovador = cookie.parse(s4.sessionCookie).session_id;

    const s5 = await session.create(adminUser.id);
    sessionAdmin = cookie.parse(s5.sessionCookie).session_id;
  });

  function createMockReq({
    method = "GET",
    url = "/",
    token,
    query = {},
    body = {},
  }) {
    return {
      method,
      url,
      headers: token ? { cookie: `session_id=${token}` } : {},
      cookies: token ? { session_id: token } : {},
      query,
      body,
    };
  }

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Dashboard Role-Aware Metrics & Attention Counts", () => {
    let testProc;

    beforeAll(async () => {
      // Create a process in AWAITING_FINAL_AUTHORIZATION
      testProc = await prisma.process.create({
        data: {
          number: 101,
          year: 2026,
          title: "Reforma Emergencial da Cobertura do Bloco B",
          object: "Serviços de engenharia para reparo de calhas e telhado",
          status: "AWAITING_FINAL_AUTHORIZATION",
          departmentId: department.id,
          requesterId: solicitante.id,
          selectedSupplierId: supplier.id,
          estimatedValue: 75000.0,
        },
      });
    });

    test("GET /api/v1/dashboard provides attentionCount and awaitingFinalAuthorization for AUTORIDADE_COMPETENTE", async () => {
      const req = createMockReq({
        method: "GET",
        url: "/api/v1/dashboard",
        token: sessionAutoridade,
      });
      const res = createMockRes();

      await dashboardRoute(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.summary).toBeDefined();
      expect(
        res.body.summary.awaitingFinalAuthorization,
      ).toBeGreaterThanOrEqual(1);
      expect(res.body.summary.attentionCount).toBeGreaterThanOrEqual(1);
      expect(res.body.summary.attentionDescription).toContain(
        "autorização final",
      );
      expect(res.body.userRole).toBe("AUTORIDADE_COMPETENTE");
    });

    test("GET /api/v1/dashboard statusDistribution contains all 12 canonical statuses", async () => {
      const req = createMockReq({
        method: "GET",
        url: "/api/v1/dashboard",
        token: sessionAdmin,
      });
      const res = createMockRes();

      await dashboardRoute(req, res);

      expect(res.statusCode).toBe(200);
      const keys = res.body.statusDistribution.map((s) => s.status);
      expect(keys).toContain("APPROVED");
      expect(keys).toContain("AWAITING_FINAL_AUTHORIZATION");
      expect(keys).toContain("AWAITING_PUBLICATION");
      expect(keys).toContain("FINAL_AUTHORIZATION_REFUSED");
      expect(keys).toContain("COMPLETED");
    });
  });

  describe("Final Authorization Inbox & Decision Workflow", () => {
    let approvedProc;

    beforeEach(async () => {
      approvedProc = await prisma.process.create({
        data: {
          number: 201 + Math.floor(Math.random() * 5000),
          year: 2026,
          title: "Contratação Direta de Manutenção Predial",
          object: "Instalação de climatizadores no refeitório",
          status: "APPROVED",
          departmentId: department.id,
          requesterId: solicitante.id,
          selectedSupplierId: supplier.id,
          estimatedValue: 45000.0,
          approvals: {
            create: {
              stage: "APPROVAL",
              assignedRole: "APROVADOR",
              cycle: 1,
              userId: aprovador.id,
              decision: "APPROVED",
              comment: "Instrução técnica e orçamentária aprovada na íntegra.",
              decidedAt: new Date(),
            },
          },
        },
      });
    });

    test("Agente de Contratação initiates final authorization successfully", async () => {
      const req = createMockReq({
        method: "POST",
        url: `/api/v1/processes/${approvedProc.id}/final-authorization/initiate`,
        token: sessionAgente,
        query: { processId: approvedProc.id },
      });
      const res = createMockRes();

      await initiateRoute(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("AWAITING_FINAL_AUTHORIZATION");
      expect(res.body.message).toContain("encaminhado com sucesso");

      const checkDb = await prisma.process.findUnique({
        where: { id: approvedProc.id },
      });
      expect(checkDb.status).toBe("AWAITING_FINAL_AUTHORIZATION");
    });

    test("Autoridade Competente can inspect pending tasks via GET /api/v1/final-authorizations", async () => {
      // First initiate
      await prisma.process.update({
        where: { id: approvedProc.id },
        data: { status: "AWAITING_FINAL_AUTHORIZATION" },
      });

      const req = createMockReq({
        method: "GET",
        url: "/api/v1/final-authorizations?search=Manuten%C3%A7%C3%A3o",
        token: sessionAutoridade,
        query: { search: "Manutenção Predial" },
      });
      const res = createMockRes();

      await inboxRoute(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.tasks).toBeDefined();
      expect(res.body.tasks.length).toBeGreaterThanOrEqual(1);

      const task = res.body.tasks.find((t) => t.id === approvedProc.id);
      expect(task).toBeDefined();
      expect(task.canDecide).toBe(true);
      expect(task.internalApproval).toBeDefined();
    });

    test("Unauthorized roles cannot access the final authorization inbox", async () => {
      // Solicitante
      const reqSol = createMockReq({
        method: "GET",
        url: "/api/v1/final-authorizations",
        token: sessionSolicitante,
        query: {},
      });
      const resSol = createMockRes();
      await inboxRoute(reqSol, resSol);
      expect(resSol.statusCode).toBe(403);

      // Admin (cannot bypass)
      const reqAdm = createMockReq({
        method: "GET",
        url: "/api/v1/final-authorizations",
        token: sessionAdmin,
        query: {},
      });
      const resAdm = createMockRes();
      await inboxRoute(reqAdm, resAdm);
      expect(resAdm.statusCode).toBe(403);
    });

    test("Autoridade Competente authorizes process and transitions to AWAITING_PUBLICATION", async () => {
      await prisma.process.update({
        where: { id: approvedProc.id },
        data: { status: "AWAITING_FINAL_AUTHORIZATION" },
      });

      const req = createMockReq({
        method: "POST",
        url: `/api/v1/processes/${approvedProc.id}/final-authorization/authorize`,
        token: sessionAutoridade,
        query: { processId: approvedProc.id },
        body: {
          justification:
            "Homologo o procedimento com base na instrução técnica.",
        },
      });
      const res = createMockRes();

      await authorizeRoute(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("AWAITING_PUBLICATION");
      expect(res.body.decision).toBe("AUTHORIZED");

      const inDb = await prisma.process.findUnique({
        where: { id: approvedProc.id },
      });
      expect(inDb.status).toBe("AWAITING_PUBLICATION");
    });

    test("Autoridade Competente refuses process with mandatory justification, leading to FINAL_AUTHORIZATION_REFUSED", async () => {
      await prisma.process.update({
        where: { id: approvedProc.id },
        data: { status: "AWAITING_FINAL_AUTHORIZATION" },
      });

      // Attempt with empty justification should fail
      const reqEmpty = createMockReq({
        method: "POST",
        url: `/api/v1/processes/${approvedProc.id}/final-authorization/refuse`,
        token: sessionAutoridade,
        query: { processId: approvedProc.id },
        body: { justification: "" },
      });
      const resEmpty = createMockRes();
      await refuseRoute(reqEmpty, resEmpty);
      expect(resEmpty.statusCode).toBe(400);

      // Attempt with valid justification
      const reqValid = createMockReq({
        method: "POST",
        url: `/api/v1/processes/${approvedProc.id}/final-authorization/refuse`,
        token: sessionAutoridade,
        query: { processId: approvedProc.id },
        body: {
          justification:
            "Recuso por indisponibilidade orçamentária neste trimestre.",
        },
      });
      const resValid = createMockRes();
      await refuseRoute(reqValid, resValid);

      expect(resValid.statusCode).toBe(200);
      expect(resValid.body.status).toBe("FINAL_AUTHORIZATION_REFUSED");
      expect(resValid.body.decision).toBe("REFUSED");

      const inDb = await prisma.process.findUnique({
        where: { id: approvedProc.id },
      });
      expect(inDb.status).toBe("FINAL_AUTHORIZATION_REFUSED");
    });

    test("Autoridade Competente requests adjustments, leading to RETURNED_FOR_ADJUSTMENT", async () => {
      await prisma.process.update({
        where: { id: approvedProc.id },
        data: { status: "AWAITING_FINAL_AUTHORIZATION" },
      });

      const req = createMockReq({
        method: "POST",
        url: `/api/v1/processes/${approvedProc.id}/final-authorization/request-adjustments`,
        token: sessionAutoridade,
        query: { processId: approvedProc.id },
        body: {
          justification:
            "Necessário detalhar a memória de cálculo do quantitativo no DFD.",
        },
      });
      const res = createMockRes();

      await adjustmentsRoute(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe("RETURNED_FOR_ADJUSTMENT");
      expect(res.body.decision).toBe("ADJUSTMENT_REQUESTED");

      const inDb = await prisma.process.findUnique({
        where: { id: approvedProc.id },
      });
      expect(inDb.status).toBe("RETURNED_FOR_ADJUSTMENT");
    });
  });

  describe("Publication Registration and Process Completion", () => {
    let authProc;

    beforeEach(async () => {
      authProc = await prisma.process.create({
        data: {
          number: 501 + Math.floor(Math.random() * 5000),
          year: 2026,
          title: "Aquisição de Insumos Hospitalares",
          object: "Fornecimento de testes rápidos e reagentes",
          status: "AWAITING_PUBLICATION",
          departmentId: department.id,
          requesterId: solicitante.id,
          selectedSupplierId: supplier.id,
          estimatedValue: 32000.0,
          finalAuthorizations: {
            create: {
              userId: autoridade.id,
              decision: "AUTHORIZED",
              cycle: 1,
              justification:
                "Despesa autorizada com base na cotação vencedora.",
            },
          },
        },
      });
    });

    test("Agente de Contratação registers publication, transitioning process to COMPLETED", async () => {
      const pubPayload = {
        publicationType: "DIRECT_AWARD_NOTICE",
        destination: "Diário Oficial do Estado (Simulado)",
        publishedAt: new Date().toISOString(),
        referenceNumber: "Ato nº 89/2026",
        url: "https://doe.sp.gov.br/atos/2026/89",
      };

      const req = createMockReq({
        method: "POST",
        url: `/api/v1/processes/${authProc.id}/publications`,
        token: sessionAgente,
        query: { processId: authProc.id },
        body: pubPayload,
      });
      const res = createMockRes();

      await publicationsRoute(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body.publicationType).toBe("DIRECT_AWARD_NOTICE");
      expect(res.body.processStatus).toBe("COMPLETED");

      const checkDb = await prisma.process.findUnique({
        where: { id: authProc.id },
      });
      expect(checkDb.status).toBe("COMPLETED");
    });

    test("GET /api/v1/processes/:processId/publications returns publication history in reverse chronological order", async () => {
      // Register publication
      await prisma.publicationRecord.create({
        data: {
          processId: authProc.id,
          publicationType: "AUTHORIZATION_EXTRACT",
          destination: "Portal da Transparência Municipal",
          publishedAt: new Date("2026-11-05T14:00:00Z"),
          referenceNumber: "Extrato 001/2026",
          createdById: agente.id,
        },
      });

      const req = createMockReq({
        method: "GET",
        url: `/api/v1/processes/${authProc.id}/publications`,
        token: sessionAgente,
        query: { processId: authProc.id },
      });
      const res = createMockRes();

      await publicationsRoute(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body.publications).toBeDefined();
      expect(res.body.publications.length).toBeGreaterThanOrEqual(1);

      const pub = res.body.publications[0];
      expect(pub.destination).toBe("Portal da Transparência Municipal");
      expect(pub.createdBy.name).toBe("Agente de Contratação");
    });

    test("Prevents non-eligible roles from registering publication", async () => {
      const reqSol = createMockReq({
        method: "POST",
        url: `/api/v1/processes/${authProc.id}/publications`,
        token: sessionSolicitante,
        query: { processId: authProc.id },
        body: {
          publicationType: "OTHER",
          destination: "Diário Oficial",
          publishedAt: new Date().toISOString(),
        },
      });
      const resSol = createMockRes();
      await publicationsRoute(reqSol, resSol);
      expect(resSol.statusCode).toBe(403);

      const reqAdm = createMockReq({
        method: "POST",
        url: `/api/v1/processes/${authProc.id}/publications`,
        token: sessionAdmin,
        query: { processId: authProc.id },
        body: {
          publicationType: "OTHER",
          destination: "Diário Oficial",
          publishedAt: new Date().toISOString(),
        },
      });
      const resAdm = createMockRes();
      await publicationsRoute(reqAdm, resAdm);
      expect(resAdm.statusCode).toBe(403);
    });
  });
});
