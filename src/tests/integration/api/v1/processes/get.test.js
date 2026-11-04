import crypto from "node:crypto";

import password from "@/infra/password.js";
import { prisma } from "@/infra/prisma.cjs";
import session from "@/infra/session.js";
import webserver from "@/infra/webserver.mjs";
import orchestrator from "@/tests/orchestrator/orchestrator.mjs";

describe("GET /api/v1/processes", () => {
  let departmentA;
  let departmentB;
  let solicitanteA;
  let solicitanteCookieA;
  let solicitanteB;
  let solicitanteCookieB;
  let agentUser;
  let agentCookie;
  let adminUser;
  let adminCookie;
  let processSolA1;
  let processSolA2;
  let processSolB1;

  beforeAll(async () => {
    await orchestrator.clearDatabase();

    const passwordHash = await password.hash("TestPass123!");

    departmentA = await prisma.department.create({
      data: { name: "Secretaria de Educação" },
    });

    departmentB = await prisma.department.create({
      data: { name: "Secretaria de Saúde" },
    });

    solicitanteA = await prisma.user.create({
      data: {
        name: "Solicitante Educação",
        email: "sol.edu@sisd.com",
        passwordHash,
        role: "SOLICITANTE",
        departmentId: departmentA.id,
      },
    });
    solicitanteCookieA = (await session.create(solicitanteA.id)).sessionCookie;

    solicitanteB = await prisma.user.create({
      data: {
        name: "Solicitante Saúde",
        email: "sol.saude@sisd.com",
        passwordHash,
        role: "SOLICITANTE",
        departmentId: departmentB.id,
      },
    });
    solicitanteCookieB = (await session.create(solicitanteB.id)).sessionCookie;

    agentUser = await prisma.user.create({
      data: {
        name: "Agente Contratação",
        email: "agente@sisd.com",
        passwordHash,
        role: "AGENTE_CONTRATACAO",
        departmentId: departmentA.id,
      },
    });
    agentCookie = (await session.create(agentUser.id)).sessionCookie;

    adminUser = await prisma.user.create({
      data: {
        name: "Administrador",
        email: "admin.list@sisd.com",
        passwordHash,
        role: "ADMIN",
        departmentId: departmentA.id,
      },
    });
    adminCookie = (await session.create(adminUser.id)).sessionCookie;

    // Seed processes
    processSolA1 = await prisma.process.create({
      data: {
        number: 1,
        year: 2026,
        title: "Aquisição de Notebooks Educacionais",
        object: "20 notebooks para laboratório escolar",
        estimatedValue: 65000.0,
        status: "DRAFT",
        departmentId: departmentA.id,
        requesterId: solicitanteA.id,
        createdAt: new Date("2026-03-10T12:00:00.000Z"),
        demandDocument: {
          create: {
            category: "IT_GOODS",
            detailedJustification: "Laboratório de informática escolar.",
            urgency: "HIGH",
            responsibleName: "Solicitante Educação",
          },
        },
      },
    });

    processSolA2 = await prisma.process.create({
      data: {
        number: 2,
        year: 2026,
        title: "Manutenção de Ar Condicionado",
        object: "Serviço de limpeza e recarga de gás",
        estimatedValue: 12000.0,
        status: "IN_ANALYSIS",
        departmentId: departmentA.id,
        requesterId: solicitanteA.id,
        createdAt: new Date("2026-06-15T12:00:00.000Z"),
        demandDocument: {
          create: {
            category: "GENERAL_SERVICES",
            detailedJustification: "Climatização das salas de aula.",
            urgency: "MEDIUM",
            responsibleName: "Solicitante Educação",
          },
        },
      },
    });

    processSolB1 = await prisma.process.create({
      data: {
        number: 1,
        year: 2025,
        title: "Compra de Medicamentos Básicos",
        object: "Insumos farmacêuticos para UBS",
        estimatedValue: 48000.0,
        status: "APPROVED",
        departmentId: departmentB.id,
        requesterId: solicitanteB.id,
        createdAt: new Date("2025-11-20T12:00:00.000Z"),
        demandDocument: {
          create: {
            category: "HEALTH_SUPPLIES",
            detailedJustification: "Reposição de estoque de farmácia.",
            urgency: "CRITICAL",
            responsibleName: "Solicitante Saúde",
          },
        },
      },
    });

    // Soft-deleted process that must never appear
    await prisma.process.create({
      data: {
        number: 99,
        year: 2026,
        title: "Processo Excluído",
        object: "Não deve aparecer na listagem",
        status: "DRAFT",
        departmentId: departmentA.id,
        requesterId: solicitanteA.id,
        deletedAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  test("Rejects unauthenticated request with 401", async () => {
    const response = await fetch(`${webserver.origin}/api/v1/processes`);
    expect(response.status).toBe(401);
  });

  test("SOLICITANTE only receives their own processes", async () => {
    const response = await fetch(`${webserver.origin}/api/v1/processes`, {
      headers: { Cookie: solicitanteCookieA },
    });

    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.processes).toHaveLength(2);
    const ids = body.processes.map((p) => p.id);
    expect(ids).toContain(processSolA1.id);
    expect(ids).toContain(processSolA2.id);
    expect(ids).not.toContain(processSolB1.id);
    expect(body.meta.total).toBe(2);
  });

  test("SOLICITANTE is forbidden from filtering by another department with 403", async () => {
    const response = await fetch(
      `${webserver.origin}/api/v1/processes?departmentId=${departmentB.id}`,
      {
        headers: { Cookie: solicitanteCookieA },
      },
    );

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.name).toBe("ForbiddenError");
  });

  test("AGENTE_CONTRATACAO and ADMIN can list all non-deleted processes and filter by department", async () => {
    const allRes = await fetch(`${webserver.origin}/api/v1/processes`, {
      headers: { Cookie: agentCookie },
    });
    expect(allRes.status).toBe(200);
    const allBody = await allRes.json();
    expect(allBody.processes).toHaveLength(3);

    const deptBRes = await fetch(
      `${webserver.origin}/api/v1/processes?departmentId=${departmentB.id}`,
      {
        headers: { Cookie: adminCookie },
      },
    );
    expect(deptBRes.status).toBe(200);
    const deptBBody = await deptBRes.json();
    expect(deptBBody.processes).toHaveLength(1);
    expect(deptBBody.processes[0].id).toBe(processSolB1.id);
  });

  test("Supports filtering by status, year, period (createdFrom/createdTo), and search", async () => {
    // Filter by status
    const statusRes = await fetch(
      `${webserver.origin}/api/v1/processes?status=IN_ANALYSIS`,
      { headers: { Cookie: adminCookie } },
    );
    expect(statusRes.status).toBe(200);
    const statusBody = await statusRes.json();
    expect(statusBody.processes).toHaveLength(1);
    expect(statusBody.processes[0].id).toBe(processSolA2.id);

    // Filter by year
    const yearRes = await fetch(
      `${webserver.origin}/api/v1/processes?year=2025`,
      { headers: { Cookie: adminCookie } },
    );
    expect(yearRes.status).toBe(200);
    const yearBody = await yearRes.json();
    expect(yearBody.processes).toHaveLength(1);
    expect(yearBody.processes[0].id).toBe(processSolB1.id);

    // Filter by period
    const periodRes = await fetch(
      `${webserver.origin}/api/v1/processes?createdFrom=2026-01-01&createdTo=2026-04-01`,
      { headers: { Cookie: adminCookie } },
    );
    expect(periodRes.status).toBe(200);
    const periodBody = await periodRes.json();
    expect(periodBody.processes).toHaveLength(1);
    expect(periodBody.processes[0].id).toBe(processSolA1.id);

    // Filter by search text
    const searchRes = await fetch(
      `${webserver.origin}/api/v1/processes?search=Notebooks`,
      { headers: { Cookie: adminCookie } },
    );
    expect(searchRes.status).toBe(200);
    const searchBody = await searchRes.json();
    expect(searchBody.processes).toHaveLength(1);
    expect(searchBody.processes[0].id).toBe(processSolA1.id);

    // Filter by formatted process number DP-001/2025
    const numSearchRes = await fetch(
      `${webserver.origin}/api/v1/processes?search=DP-001/2025`,
      { headers: { Cookie: adminCookie } },
    );
    expect(numSearchRes.status).toBe(200);
    const numSearchBody = await numSearchRes.json();
    expect(numSearchBody.processes).toHaveLength(1);
    expect(numSearchBody.processes[0].id).toBe(processSolB1.id);
  });

  test("Supports pagination and rejects invalid filter parameters with 400", async () => {
    const pageRes = await fetch(
      `${webserver.origin}/api/v1/processes?page=1&pageSize=2`,
      { headers: { Cookie: adminCookie } },
    );
    expect(pageRes.status).toBe(200);
    const pageBody = await pageRes.json();
    expect(pageBody.processes).toHaveLength(2);
    expect(pageBody.meta).toEqual({
      page: 1,
      pageSize: 2,
      total: 3,
      totalPages: 2,
    });

    // Invalid status
    const badStatus = await fetch(
      `${webserver.origin}/api/v1/processes?status=NONEXISTENT`,
      { headers: { Cookie: adminCookie } },
    );
    expect(badStatus.status).toBe(400);

    // Invalid departmentId
    const badDept = await fetch(
      `${webserver.origin}/api/v1/processes?departmentId=not-a-uuid`,
      { headers: { Cookie: adminCookie } },
    );
    expect(badDept.status).toBe(400);

    // Invalid year
    const badYear = await fetch(
      `${webserver.origin}/api/v1/processes?year=abcd`,
      { headers: { Cookie: adminCookie } },
    );
    expect(badYear.status).toBe(400);
  });
});
