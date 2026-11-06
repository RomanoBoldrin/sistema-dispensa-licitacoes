import * as cookie from "cookie";
import password from "@/infra/password.js";
import { prisma } from "@/infra/prisma.cjs";
import session from "@/infra/session.js";
import orchestrator from "@/tests/orchestrator/orchestrator.mjs";

import processPublicationsRoute from "@/pages/api/v1/processes/[processId]/publications/index.js";
import publicationDetailsRoute from "@/pages/api/v1/publications/[publicationId]/index.js";

describe("Publication API Routes (Integration Tests)", () => {
  jest.setTimeout(60000);

  let departmentA;
  let departmentB;
  let solicitanteA;
  let agenteA;
  let agenteB;
  let autoridadeA;
  let adminUser;
  let sessionAgenteA;
  let sessionAgenteB;
  let sessionSolicitanteA;
  let sessionAdmin;
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
      data: { name: "Secretaria de Transportes" },
    });

    departmentB = await prisma.department.create({
      data: { name: "Secretaria de Educação" },
    });

    solicitanteA = await prisma.user.create({
      data: {
        name: "Sofia Solicitante",
        email: "sofia.sol@sisd.gov.br",
        passwordHash,
        role: "SOLICITANTE",
        departmentId: departmentA.id,
      },
    });
    const s1 = await session.create(solicitanteA.id);
    sessionSolicitanteA = cookie.parse(s1.sessionCookie).session_id;

    agenteA = await prisma.user.create({
      data: {
        name: "Antonio Agente A",
        email: "antonio.agente@sisd.gov.br",
        passwordHash,
        role: "AGENTE_CONTRATACAO",
        departmentId: departmentA.id,
      },
    });
    const s2 = await session.create(agenteA.id);
    sessionAgenteA = cookie.parse(s2.sessionCookie).session_id;

    agenteB = await prisma.user.create({
      data: {
        name: "Bruno Agente B",
        email: "bruno.agente@sisd.gov.br",
        passwordHash,
        role: "AGENTE_CONTRATACAO",
        departmentId: departmentB.id,
      },
    });
    const s3 = await session.create(agenteB.id);
    sessionAgenteB = cookie.parse(s3.sessionCookie).session_id;

    autoridadeA = await prisma.user.create({
      data: {
        name: "Aristeu Autoridade",
        email: "aristeu.auth@sisd.gov.br",
        passwordHash,
        role: "AUTORIDADE_COMPETENTE",
        departmentId: departmentA.id,
      },
    });

    adminUser = await prisma.user.create({
      data: {
        name: "Aline Admin",
        email: "aline.admin@sisd.gov.br",
        passwordHash,
        role: "ADMIN",
        departmentId: departmentA.id,
      },
    });
    const s4 = await session.create(adminUser.id);
    sessionAdmin = cookie.parse(s4.sessionCookie).session_id;

    supplierA = await prisma.supplier.create({
      data: {
        legalName: "Fornecedora Transp LTDA",
        tradeName: "Transp Comércio",
        cnpj: "77888999000100",
        email: "transp@fornecedora.com.br",
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function createAwaitingPublicationProcess() {
    const count = await prisma.process.count();
    const proc = await prisma.process.create({
      data: {
        number: count + 1,
        year: 2026,
        title: `Processo API Publicação ${count + 1}`,
        object: "Contratação de serviços de transporte e logística",
        legalBasis: "ART_75_II",
        legalJustification: "Enquadramento nos termos da Lei 14.133.",
        estimatedValue: 22000.0,
        priceJustification: "Preço condizente com o mercado.",
        status: "AWAITING_PUBLICATION",
        departmentId: departmentA.id,
        requesterId: solicitanteA.id,
        selectedSupplierId: supplierA.id,
        supplierJustification: "Menor cotação obtida.",
      },
    });

    // Phase 4 approval
    await prisma.approval.create({
      data: {
        processId: proc.id,
        stage: "APPROVAL",
        assignedRole: "APROVADOR",
        cycle: 1,
        decision: "APPROVED",
        userId: agenteA.id,
        decidedAt: new Date(),
      },
    });

    // Phase 5.2 final authorization
    await prisma.finalAuthorization.create({
      data: {
        processId: proc.id,
        userId: autoridadeA.id,
        decision: "AUTHORIZED",
        cycle: 1,
        decidedAt: new Date(),
      },
    });

    return proc;
  }

  describe("POST /api/v1/processes/:processId/publications", () => {
    it("returns 201 for AGENTE_CONTRATACAO registering valid publication", async () => {
      const proc = await createAwaitingPublicationProcess();

      const req = {
        method: "POST",
        url: `/api/v1/processes/${proc.id}/publications`,
        headers: { cookie: `session_id=${sessionAgenteA}` },
        cookies: { session_id: sessionAgenteA },
        query: { processId: proc.id },
        body: {
          publicationType: "DIRECT_AWARD_NOTICE",
          destination: "Diário Oficial do Estado",
          publishedAt: new Date().toISOString(),
          referenceNumber: "PUB-DOE-2026",
          url: "https://doe.sp.gov.br/atos/123",
        },
      };
      const res = createMockRes();

      await processPublicationsRoute(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.processStatus).toBe("COMPLETED");
      expect(res.body.destination).toBe("Diário Oficial do Estado");
      expect(res.body.referenceNumber).toBe("PUB-DOE-2026");
    });

    it("returns 401 when request is unauthenticated", async () => {
      const proc = await createAwaitingPublicationProcess();

      const req = {
        method: "POST",
        url: `/api/v1/processes/${proc.id}/publications`,
        headers: {},
        cookies: {},
        query: { processId: proc.id },
        body: {
          publicationType: "DIRECT_AWARD_NOTICE",
          destination: "Diário Oficial",
          publishedAt: new Date().toISOString(),
        },
      };
      const res = createMockRes();

      await processPublicationsRoute(req, res);
      expect(res.statusCode).toBe(401);
    });

    it("returns 403 for unauthorized roles (SOLICITANTE or ADMIN)", async () => {
      const proc = await createAwaitingPublicationProcess();

      const reqSol = {
        method: "POST",
        url: `/api/v1/processes/${proc.id}/publications`,
        headers: { cookie: `session_id=${sessionSolicitanteA}` },
        cookies: { session_id: sessionSolicitanteA },
        query: { processId: proc.id },
        body: {
          publicationType: "DIRECT_AWARD_NOTICE",
          destination: "Diário Oficial",
          publishedAt: new Date().toISOString(),
        },
      };
      const resSol = createMockRes();
      await processPublicationsRoute(reqSol, resSol);
      expect(resSol.statusCode).toBe(403);

      const reqAdmin = {
        method: "POST",
        url: `/api/v1/processes/${proc.id}/publications`,
        headers: { cookie: `session_id=${sessionAdmin}` },
        cookies: { session_id: sessionAdmin },
        query: { processId: proc.id },
        body: {
          publicationType: "DIRECT_AWARD_NOTICE",
          destination: "Diário Oficial",
          publishedAt: new Date().toISOString(),
        },
      };
      const resAdmin = createMockRes();
      await processPublicationsRoute(reqAdmin, resAdmin);
      expect(resAdmin.statusCode).toBe(403);
    });

    it("returns 400 when publication payload is invalid", async () => {
      const proc = await createAwaitingPublicationProcess();

      const req = {
        method: "POST",
        url: `/api/v1/processes/${proc.id}/publications`,
        headers: { cookie: `session_id=${sessionAgenteA}` },
        cookies: { session_id: sessionAgenteA },
        query: { processId: proc.id },
        body: {
          publicationType: "INVALID_PUB_TYPE",
          destination: "   ",
        },
      };
      const res = createMockRes();

      await processPublicationsRoute(req, res);
      expect(res.statusCode).toBe(400);
    });

    it("returns 409 when process is not in AWAITING_PUBLICATION", async () => {
      const proc = await createAwaitingPublicationProcess();
      await prisma.process.update({
        where: { id: proc.id },
        data: { status: "APPROVED" },
      });

      const req = {
        method: "POST",
        url: `/api/v1/processes/${proc.id}/publications`,
        headers: { cookie: `session_id=${sessionAgenteA}` },
        cookies: { session_id: sessionAgenteA },
        query: { processId: proc.id },
        body: {
          publicationType: "DIRECT_AWARD_NOTICE",
          destination: "Diário Oficial",
          publishedAt: new Date().toISOString(),
        },
      };
      const res = createMockRes();

      await processPublicationsRoute(req, res);
      expect(res.statusCode).toBe(409);
    });
  });

  describe("GET /api/v1/processes/:processId/publications", () => {
    it("returns 200 with publications list for authorized agent", async () => {
      const proc = await createAwaitingPublicationProcess();

      // Register a publication first
      const reqPost = {
        method: "POST",
        url: `/api/v1/processes/${proc.id}/publications`,
        headers: { cookie: `session_id=${sessionAgenteA}` },
        cookies: { session_id: sessionAgenteA },
        query: { processId: proc.id },
        body: {
          publicationType: "DIRECT_AWARD_NOTICE",
          destination: "Portal da Transparência",
          publishedAt: new Date().toISOString(),
          referenceNumber: "LIST-001",
        },
      };
      const resPost = createMockRes();
      await processPublicationsRoute(reqPost, resPost);
      expect(resPost.statusCode).toBe(201);

      // List publications
      const reqGet = {
        method: "GET",
        url: `/api/v1/processes/${proc.id}/publications`,
        headers: { cookie: `session_id=${sessionAgenteA}` },
        cookies: { session_id: sessionAgenteA },
        query: { processId: proc.id },
      };
      const resGet = createMockRes();
      await processPublicationsRoute(reqGet, resGet);

      expect(resGet.statusCode).toBe(200);
      expect(resGet.body.publications).toHaveLength(1);
      expect(resGet.body.publications[0].referenceNumber).toBe("LIST-001");
      expect(resGet.body.status).toBe("COMPLETED");
    });

    it("returns 403 for agent from another department", async () => {
      const proc = await createAwaitingPublicationProcess();

      const reqGet = {
        method: "GET",
        url: `/api/v1/processes/${proc.id}/publications`,
        headers: { cookie: `session_id=${sessionAgenteB}` },
        cookies: { session_id: sessionAgenteB },
        query: { processId: proc.id },
      };
      const resGet = createMockRes();
      await processPublicationsRoute(reqGet, resGet);

      expect(resGet.statusCode).toBe(403);
    });
  });

  describe("GET /api/v1/publications/:publicationId", () => {
    it("returns 200 with publication details for authorized department member", async () => {
      const proc = await createAwaitingPublicationProcess();

      // Register publication
      const reqPost = {
        method: "POST",
        url: `/api/v1/processes/${proc.id}/publications`,
        headers: { cookie: `session_id=${sessionAgenteA}` },
        cookies: { session_id: sessionAgenteA },
        query: { processId: proc.id },
        body: {
          publicationType: "CONTRACT_EXTRACT",
          destination: "Diário Oficial do Município",
          publishedAt: new Date().toISOString(),
          referenceNumber: "EXT-CONTRATO-01",
        },
      };
      const resPost = createMockRes();
      await processPublicationsRoute(reqPost, resPost);
      const pubId = resPost.body.id;

      // Retrieve details
      const reqDetails = {
        method: "GET",
        url: `/api/v1/publications/${pubId}`,
        headers: { cookie: `session_id=${sessionAgenteA}` },
        cookies: { session_id: sessionAgenteA },
        query: { publicationId: pubId },
      };
      const resDetails = createMockRes();
      await publicationDetailsRoute(reqDetails, resDetails);

      expect(resDetails.statusCode).toBe(200);
      expect(resDetails.body.id).toBe(pubId);
      expect(resDetails.body.referenceNumber).toBe("EXT-CONTRATO-01");
      expect(resDetails.body.publicationType).toBe("CONTRACT_EXTRACT");
      expect(resDetails.body.processStatus).toBe("COMPLETED");
    });

    it("returns 404 for nonexistent publicationId", async () => {
      const reqDetails = {
        method: "GET",
        url: "/api/v1/publications/99999999-9999-9999-9999-999999999999",
        headers: { cookie: `session_id=${sessionAgenteA}` },
        cookies: { session_id: sessionAgenteA },
        query: { publicationId: "99999999-9999-9999-9999-999999999999" },
      };
      const resDetails = createMockRes();
      await publicationDetailsRoute(reqDetails, resDetails);

      expect(resDetails.statusCode).toBe(404);
    });
  });
});
