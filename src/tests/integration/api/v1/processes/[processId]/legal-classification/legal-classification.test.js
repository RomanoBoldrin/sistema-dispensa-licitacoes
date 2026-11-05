import password from "@/infra/password.js";
import { prisma } from "@/infra/prisma.cjs";
import session from "@/infra/session.js";
import webserver from "@/infra/webserver.mjs";
import orchestrator from "@/tests/orchestrator/orchestrator.mjs";

describe("PUT /api/v1/processes/[processId]/legal-classification", () => {
  let departmentA;
  let departmentB;
  let solicitanteA;
  let solicitanteCookieA;
  let solicitanteB;
  let solicitanteCookieB;
  let adminUser;
  let adminCookie;
  let draftProcess;

  beforeAll(async () => {
    await orchestrator.clearDatabase();

    const passwordHash = await password.hash("LegalTest123!");

    departmentA = await prisma.department.create({
      data: { name: "Departamento Jurídico" },
    });

    departmentB = await prisma.department.create({
      data: { name: "Departamento de Saúde" },
    });

    solicitanteA = await prisma.user.create({
      data: {
        name: "Solicitante A",
        email: "solicitante.legal.a@sisd.com",
        passwordHash,
        role: "SOLICITANTE",
        departmentId: departmentA.id,
      },
    });
    solicitanteCookieA = (await session.create(solicitanteA.id)).sessionCookie;

    solicitanteB = await prisma.user.create({
      data: {
        name: "Solicitante B",
        email: "solicitante.legal.b@sisd.com",
        passwordHash,
        role: "SOLICITANTE",
        departmentId: departmentB.id,
      },
    });
    solicitanteCookieB = (await session.create(solicitanteB.id)).sessionCookie;

    adminUser = await prisma.user.create({
      data: {
        name: "Admin Legal",
        email: "admin.legal@sisd.com",
        passwordHash,
        role: "ADMIN",
        departmentId: departmentA.id,
      },
    });
    adminCookie = (await session.create(adminUser.id)).sessionCookie;

    // Create process
    const procRes = await fetch(`${webserver.origin}/api/v1/processes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: solicitanteCookieA,
      },
      body: JSON.stringify({
        title: "Aquisição de licenças de software",
        object: "Assinatura anual de softwares de gestão",
        estimatedValue: 40000.0,
        category: "IT_GOODS",
        detailedJustification:
          "Necessidade de renovação das licenças de software.",
        responsibleName: "Solicitante A",
      }),
    });
    draftProcess = await procRes.json();
  });

  it("returns 401 when unauthenticated", async () => {
    const res = await fetch(
      `${webserver.origin}/api/v1/processes/${draftProcess.id}/legal-classification`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ legalBasis: "ART_75_II" }),
      },
    );

    expect(res.status).toBe(401);
  });

  it("returns 403 when user belongs to another department or is not owner", async () => {
    const res = await fetch(
      `${webserver.origin}/api/v1/processes/${draftProcess.id}/legal-classification`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: solicitanteCookieB,
        },
        body: JSON.stringify({ legalBasis: "ART_75_II" }),
      },
    );

    expect(res.status).toBe(403);
  });

  it("returns 400 when legalBasis is missing", async () => {
    const res = await fetch(
      `${webserver.origin}/api/v1/processes/${draftProcess.id}/legal-classification`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: solicitanteCookieA,
        },
        body: JSON.stringify({ legalBasis: "" }),
      },
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("legalBasis");
  });

  it("returns 400 when legalBasis is unrecognized", async () => {
    const res = await fetch(
      `${webserver.origin}/api/v1/processes/${draftProcess.id}/legal-classification`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Cookie: solicitanteCookieA,
        },
        body: JSON.stringify({ legalBasis: "ARTIGO_INVENTADO_999" }),
      },
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.message).toContain("inválido");
  });

  it("updates legal classification and records audit log", async () => {
    const res = await fetch(
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
            "Contratação enquadrada no inciso II do artigo 75 devido ao valor inferior ao teto anual de compras e serviços.",
        }),
      },
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.legalBasis).toBe("ART_75_II");
    expect(body.legalJustification).toContain("inciso II do artigo 75");
    expect(body.validation.isValid).toBe(true);
    expect(body.validation.hypothesis.key).toBe("ART_75_II");

    // Check audit log
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        processId: draftProcess.id,
        action: "LEGAL_CLASSIFICATION_UPDATED",
      },
    });
    expect(auditLogs.length).toBeGreaterThanOrEqual(1);
    expect(auditLogs[0].description).toContain(
      "Classificação legal atualizada",
    );
  });
});
