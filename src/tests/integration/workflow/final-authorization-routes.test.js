import * as cookie from "cookie";
import password from "@/infra/password.js";
import { prisma } from "@/infra/prisma.cjs";
import session from "@/infra/session.js";
import orchestrator from "@/tests/orchestrator/orchestrator.mjs";

import initiateRoute from "@/pages/api/v1/processes/[processId]/final-authorization/initiate/index.js";
import inboxRoute from "@/pages/api/v1/final-authorizations/index.js";
import detailsRoute from "@/pages/api/v1/processes/[processId]/final-authorization/index.js";
import authorizeRoute from "@/pages/api/v1/processes/[processId]/final-authorization/authorize/index.js";
import refuseRoute from "@/pages/api/v1/processes/[processId]/final-authorization/refuse/index.js";
import adjustmentsRoute from "@/pages/api/v1/processes/[processId]/final-authorization/request-adjustments/index.js";

describe("Final Authorization API Routes (Direct Handler Integration Tests)", () => {
  jest.setTimeout(60000);

  let departmentA;
  let solicitanteA;
  let agenteA;
  let aprovadorA;
  let autoridadeA;
  let adminUser;
  let sessionAgenteA;
  let sessionAutoridadeA;
  let sessionAdmin;
  let sessionSolicitanteA;
  let supplierA;

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
    const passwordHash = await password.hash("ApiTest123!");

    departmentA = await prisma.department.create({
      data: { name: "Secretaria de Fazenda" },
    });

    solicitanteA = await prisma.user.create({
      data: {
        name: "Sara Solicitante",
        email: "sara.sol@sisd.gov.br",
        passwordHash,
        role: "SOLICITANTE",
        departmentId: departmentA.id,
      },
    });
    const s1 = await session.create(solicitanteA.id);
    sessionSolicitanteA = cookie.parse(s1.sessionCookie).session_id;

    agenteA = await prisma.user.create({
      data: {
        name: "Andre Agente",
        email: "andre.agente@sisd.gov.br",
        passwordHash,
        role: "AGENTE_CONTRATACAO",
        departmentId: departmentA.id,
      },
    });
    const s2 = await session.create(agenteA.id);
    sessionAgenteA = cookie.parse(s2.sessionCookie).session_id;

    aprovadorA = await prisma.user.create({
      data: {
        name: "Aparicio Aprovador",
        email: "aparicio.app@sisd.gov.br",
        passwordHash,
        role: "APROVADOR",
        departmentId: departmentA.id,
      },
    });

    autoridadeA = await prisma.user.create({
      data: {
        name: "Augusto Autoridade",
        email: "augusto.auth@sisd.gov.br",
        passwordHash,
        role: "AUTORIDADE_COMPETENTE",
        departmentId: departmentA.id,
      },
    });
    const s3 = await session.create(autoridadeA.id);
    sessionAutoridadeA = cookie.parse(s3.sessionCookie).session_id;

    adminUser = await prisma.user.create({
      data: {
        name: "Admin Geral",
        email: "admin.api@sisd.gov.br",
        passwordHash,
        role: "ADMIN",
        departmentId: departmentA.id,
      },
    });
    const s4 = await session.create(adminUser.id);
    sessionAdmin = cookie.parse(s4.sessionCookie).session_id;

    supplierA = await prisma.supplier.create({
      data: {
        legalName: "Fornecedora Alpha LTDA",
        tradeName: "Alpha Comércio",
        cnpj: "44555666000199",
        email: "alpha@fornecedora.com.br",
      },
    });
  });

  async function createApprovedProcess() {
    const count = await prisma.process.count();
    const proc = await prisma.process.create({
      data: {
        number: count + 1,
        year: 2026,
        title: `Processo API Final Auth ${count + 1}`,
        object: "Contratação direta para serviços essenciais",
        legalBasis: "ART_75_II",
        legalJustification: "Enquadramento nos termos da Lei 14.133.",
        estimatedValue: 15000.0,
        priceJustification: "Compatível com a média de mercado obtida.",
        status: "APPROVED",
        departmentId: departmentA.id,
        requesterId: solicitanteA.id,
        selectedSupplierId: supplierA.id,
        supplierJustification: "Menor valor apresentado.",
      },
    });

    await prisma.approval.create({
      data: {
        processId: proc.id,
        stage: "APPROVAL",
        assignedRole: "APROVADOR",
        cycle: 1,
        decision: "APPROVED",
        userId: aprovadorA.id,
        decidedAt: new Date(),
      },
    });

    return proc;
  }

  it("POST /processes/:id/final-authorization/initiate returns 200 for Agente de Contratação", async () => {
    const proc = await createApprovedProcess();

    const req = {
      method: "POST",
      url: `/api/v1/processes/${proc.id}/final-authorization/initiate`,
      headers: { cookie: `session_id=${sessionAgenteA}` },
      cookies: { session_id: sessionAgenteA },
      query: { processId: proc.id },
      body: {},
    };
    const res = createMockRes();

    await initiateRoute(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe("AWAITING_FINAL_AUTHORIZATION");
  });

  it("GET /final-authorizations returns 200 for Autoridade Competente and 403 for Admin", async () => {
    // 1. Autoridade Competente succeeds
    const reqAuth = {
      method: "GET",
      url: "/api/v1/final-authorizations",
      headers: { cookie: `session_id=${sessionAutoridadeA}` },
      cookies: { session_id: sessionAutoridadeA },
      query: {},
    };
    const resAuth = createMockRes();

    await inboxRoute(reqAuth, resAuth);
    expect(resAuth.statusCode).toBe(200);
    expect(resAuth.body.tasks).toBeDefined();

    // 2. Admin fails with 403 Forbidden
    const reqAdmin = {
      method: "GET",
      url: "/api/v1/final-authorizations",
      headers: { cookie: `session_id=${sessionAdmin}` },
      cookies: { session_id: sessionAdmin },
      query: {},
    };
    const resAdmin = createMockRes();

    await inboxRoute(reqAdmin, resAdmin);
    expect(resAdmin.statusCode).toBe(403);
  });

  it("GET /processes/:id/final-authorization returns 200 with details for Autoridade Competente", async () => {
    const proc = await createApprovedProcess();
    // Initiate
    const reqInit = {
      method: "POST",
      url: `/api/v1/processes/${proc.id}/final-authorization/initiate`,
      headers: { cookie: `session_id=${sessionAgenteA}` },
      cookies: { session_id: sessionAgenteA },
      query: { processId: proc.id },
      body: {},
    };
    await initiateRoute(reqInit, createMockRes());

    const req = {
      method: "GET",
      url: `/api/v1/processes/${proc.id}/final-authorization`,
      headers: { cookie: `session_id=${sessionAutoridadeA}` },
      cookies: { session_id: sessionAutoridadeA },
      query: { processId: proc.id },
    };
    const res = createMockRes();

    await detailsRoute(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.id).toBe(proc.id);
    expect(res.body.status).toBe("AWAITING_FINAL_AUTHORIZATION");
    expect(res.body.canDecide).toBe(true);
  });

  it("POST /processes/:id/final-authorization/authorize returns 200 and advances to AWAITING_PUBLICATION", async () => {
    const proc = await createApprovedProcess();
    const reqInit = {
      method: "POST",
      url: `/api/v1/processes/${proc.id}/final-authorization/initiate`,
      headers: { cookie: `session_id=${sessionAgenteA}` },
      cookies: { session_id: sessionAgenteA },
      query: { processId: proc.id },
      body: {},
    };
    await initiateRoute(reqInit, createMockRes());

    const req = {
      method: "POST",
      url: `/api/v1/processes/${proc.id}/final-authorization/authorize`,
      headers: { cookie: `session_id=${sessionAutoridadeA}` },
      cookies: { session_id: sessionAutoridadeA },
      query: { processId: proc.id },
      body: {
        justification: "Homologado e autorizado conforme pareceres dos autos.",
      },
    };
    const res = createMockRes();

    await authorizeRoute(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("AWAITING_PUBLICATION");
    expect(res.body.decision).toBe("AUTHORIZED");
  });

  it("POST /processes/:id/final-authorization/refuse returns 200 and advances to FINAL_AUTHORIZATION_REFUSED", async () => {
    const proc = await createApprovedProcess();
    const reqInit = {
      method: "POST",
      url: `/api/v1/processes/${proc.id}/final-authorization/initiate`,
      headers: { cookie: `session_id=${sessionAgenteA}` },
      cookies: { session_id: sessionAgenteA },
      query: { processId: proc.id },
      body: {},
    };
    await initiateRoute(reqInit, createMockRes());

    const req = {
      method: "POST",
      url: `/api/v1/processes/${proc.id}/final-authorization/refuse`,
      headers: { cookie: `session_id=${sessionAutoridadeA}` },
      cookies: { session_id: sessionAutoridadeA },
      query: { processId: proc.id },
      body: {
        justification:
          "Recusado devido à conveniência e oportunidade da administração.",
      },
    };
    const res = createMockRes();

    await refuseRoute(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("FINAL_AUTHORIZATION_REFUSED");
    expect(res.body.decision).toBe("REFUSED");
  });

  it("POST /processes/:id/final-authorization/request-adjustments returns 200 and advances to RETURNED_FOR_ADJUSTMENT", async () => {
    const proc = await createApprovedProcess();
    const reqInit = {
      method: "POST",
      url: `/api/v1/processes/${proc.id}/final-authorization/initiate`,
      headers: { cookie: `session_id=${sessionAgenteA}` },
      cookies: { session_id: sessionAgenteA },
      query: { processId: proc.id },
      body: {},
    };
    await initiateRoute(reqInit, createMockRes());

    const req = {
      method: "POST",
      url: `/api/v1/processes/${proc.id}/final-authorization/request-adjustments`,
      headers: { cookie: `session_id=${sessionAutoridadeA}` },
      cookies: { session_id: sessionAutoridadeA },
      query: { processId: proc.id },
      body: {
        justification:
          "Adequar o termo de referência para complementar os requisitos técnicos.",
      },
    };
    const res = createMockRes();

    await adjustmentsRoute(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("RETURNED_FOR_ADJUSTMENT");
    expect(res.body.decision).toBe("ADJUSTMENT_REQUESTED");
  });
});
