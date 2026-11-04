import password from "@/infra/password.js";
import { prisma } from "@/infra/prisma.cjs";
import session from "@/infra/session.js";
import webserver from "@/infra/webserver.mjs";
import orchestrator from "@/tests/orchestrator/orchestrator.mjs";

describe("API v1 Process Documents", () => {
  let department;
  let adminUser;
  let adminCookie;
  let agenteUser;
  let agenteCookie;
  let processRecord;

  beforeAll(async () => {
    await orchestrator.clearDatabase();
    const passwordHash = await password.hash("TestPass123!");

    department = await prisma.department.create({
      data: { name: "Secretaria de Saúde" },
    });

    adminUser = await prisma.user.create({
      data: {
        name: "Admin Documentos",
        email: "admin.doc@sisd.com",
        passwordHash,
        role: "ADMIN",
        departmentId: department.id,
      },
    });
    const adminSess = await session.create(adminUser.id);
    adminCookie = adminSess.sessionCookie;

    agenteUser = await prisma.user.create({
      data: {
        name: "Agente Documentos",
        email: "agente.doc@sisd.com",
        passwordHash,
        role: "AGENTE_CONTRATACAO",
        departmentId: department.id,
      },
    });
    const agenteSess = await session.create(agenteUser.id);
    agenteCookie = agenteSess.sessionCookie;

    processRecord = await prisma.process.create({
      data: {
        number: 10,
        year: 2026,
        title: "Aquisição de Insumos Hospitalares",
        object: "Compra de luvas e seringas",
        status: "PRICE_RESEARCH",
        departmentId: department.id,
        requesterId: agenteUser.id,
      },
    });
  }, 60000);

  describe("POST /api/v1/processes/[processId]/documents", () => {
    it("uploads a document with valid PDF content and records DOCUMENT_UPLOADED audit log", async () => {
      const pdfContent =
        "%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF";
      const base64Content = Buffer.from(pdfContent).toString("base64");

      const response = await fetch(
        `${webserver.origin}/api/v1/processes/${processRecord.id}/documents`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: agenteCookie,
          },
          body: JSON.stringify({
            filename: "termo_de_referencia.pdf",
            type: "TERMO_REFERENCIA",
            declaredMimeType: "application/pdf",
            base64Content,
          }),
        },
      );

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.id).toBeDefined();
      expect(body.filename).toBe("termo_de_referencia.pdf");
      expect(body.type).toBe("TERMO_REFERENCIA");
      expect(body.storageKey).toBeDefined();
      expect(body.storageKey.startsWith("doc_")).toBe(true);
      expect(body.isActive).toBe(true);

      // Verify audit log
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          processId: processRecord.id,
          action: "DOCUMENT_UPLOADED",
        },
      });
      expect(auditLog).toBeDefined();
      expect(auditLog.description).toContain("termo_de_referencia.pdf");
    });

    it("rejects corrupted/fake PDF file lacking magic bytes", async () => {
      const fakePdfContent = "Plain text pretending to be a pdf file";
      const base64Content = Buffer.from(fakePdfContent).toString("base64");

      const response = await fetch(
        `${webserver.origin}/api/v1/processes/${processRecord.id}/documents`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: agenteCookie,
          },
          body: JSON.stringify({
            filename: "fake_file.pdf",
            type: "TERMO_REFERENCIA",
            declaredMimeType: "application/pdf",
            base64Content,
          }),
        },
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.name).toBe("ValidationError");
    });
  });

  describe("GET /api/v1/processes/[processId]/documents", () => {
    it("lists active documents for the process", async () => {
      const response = await fetch(
        `${webserver.origin}/api/v1/processes/${processRecord.id}/documents`,
        {
          headers: { Cookie: agenteCookie },
        },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data).toBeDefined();
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      expect(body.data[0].typeLabel).toBe("Termo de Referência (TR)");
    });
  });

  describe("GET and DELETE /api/v1/processes/[processId]/documents/[documentId]", () => {
    let uploadedDocId;

    beforeAll(async () => {
      const docs = await prisma.document.findMany({
        where: { processId: processRecord.id },
      });
      uploadedDocId = docs[0].id;
    });

    it("downloads document with correct headers and stream content", async () => {
      const response = await fetch(
        `${webserver.origin}/api/v1/processes/${processRecord.id}/documents/${uploadedDocId}`,
        {
          headers: { Cookie: adminCookie },
        },
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("application/pdf");
      expect(response.headers.get("content-disposition")).toContain(
        "attachment",
      );
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");

      const text = await response.text();
      expect(text).toContain("%PDF-1.4");
    });

    it("deactivates document with DELETE", async () => {
      const response = await fetch(
        `${webserver.origin}/api/v1/processes/${processRecord.id}/documents/${uploadedDocId}`,
        {
          method: "DELETE",
          headers: { Cookie: agenteCookie },
        },
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.isActive).toBe(false);

      // Verify it no longer appears in active list
      const listRes = await fetch(
        `${webserver.origin}/api/v1/processes/${processRecord.id}/documents`,
        {
          headers: { Cookie: agenteCookie },
        },
      );
      const listBody = await listRes.json();
      const found = listBody.data.find((d) => d.id === uploadedDocId);
      expect(found).toBeUndefined();
    });
  });
});
