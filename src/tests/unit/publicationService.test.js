import {
  PUBLICATION_TYPE,
  canUserRegisterPublication,
  validatePublicationRecordPayload,
} from "@/domain/process-lifecycle.js";
import { ValidationError } from "@/infra/errors.js";

describe("Publication Domain & Service Guards (Unit Tests)", () => {
  const deptA = "11111111-1111-1111-1111-111111111111";
  const deptB = "22222222-2222-2222-2222-222222222222";

  const requesterUser = {
    id: "user-req-1",
    role: "SOLICITANTE",
    departmentId: deptA,
    isActive: true,
  };

  const agentDeptA = {
    id: "user-agent-1",
    role: "AGENTE_CONTRATACAO",
    departmentId: deptA,
    isActive: true,
  };

  const agentDeptB = {
    id: "user-agent-2",
    role: "AGENTE_CONTRATACAO",
    departmentId: deptB,
    isActive: true,
  };

  const agentNullDept = {
    id: "user-agent-null",
    role: "AGENTE_CONTRATACAO",
    departmentId: null,
    isActive: true,
  };

  const approverDeptA = {
    id: "user-app-1",
    role: "APROVADOR",
    departmentId: deptA,
    isActive: true,
  };

  const authorityDeptA = {
    id: "user-auth-1",
    role: "AUTORIDADE_COMPETENTE",
    departmentId: deptA,
    isActive: true,
  };

  const adminUser = {
    id: "user-admin-1",
    role: "ADMIN",
    departmentId: deptA,
    isActive: true,
  };

  describe("canUserRegisterPublication", () => {
    const awaitingPublicationProcess = {
      id: "proc-1",
      status: "AWAITING_PUBLICATION",
      departmentId: deptA,
      requesterId: requesterUser.id,
      deletedAt: null,
    };

    it("allows AGENTE_CONTRATACAO in the same department to register publication", () => {
      expect(
        canUserRegisterPublication(agentDeptA, awaitingPublicationProcess),
      ).toBe(true);
    });

    it("disallows AGENTE_CONTRATACAO from another department (department isolation)", () => {
      expect(
        canUserRegisterPublication(agentDeptB, awaitingPublicationProcess),
      ).toBe(false);
    });

    it("disallows fail-closed when agent has no assigned department", () => {
      expect(
        canUserRegisterPublication(agentNullDept, awaitingPublicationProcess),
      ).toBe(false);
    });

    it("enforces segregation of duties: agent cannot register publication on own requested process", () => {
      const ownProcess = {
        ...awaitingPublicationProcess,
        requesterId: agentDeptA.id,
      };
      expect(canUserRegisterPublication(agentDeptA, ownProcess)).toBe(false);
    });

    it("disallows ADMIN from registering publication (academic simulation boundary)", () => {
      expect(
        canUserRegisterPublication(adminUser, awaitingPublicationProcess),
      ).toBe(false);
    });

    it("disallows SOLICITANTE, APROVADOR, and AUTORIDADE_COMPETENTE from registering publication", () => {
      expect(
        canUserRegisterPublication(requesterUser, awaitingPublicationProcess),
      ).toBe(false);
      expect(
        canUserRegisterPublication(approverDeptA, awaitingPublicationProcess),
      ).toBe(false);
      expect(
        canUserRegisterPublication(authorityDeptA, awaitingPublicationProcess),
      ).toBe(false);
    });

    it("disallows when process is not in AWAITING_PUBLICATION status", () => {
      const statuses = [
        "DRAFT",
        "IN_ANALYSIS",
        "AWAITING_APPROVAL",
        "APPROVED",
        "AWAITING_FINAL_AUTHORIZATION",
        "FINAL_AUTHORIZATION_REFUSED",
        "RETURNED_FOR_ADJUSTMENT",
        "COMPLETED",
        "REJECTED",
      ];

      for (const status of statuses) {
        expect(
          canUserRegisterPublication(agentDeptA, {
            ...awaitingPublicationProcess,
            status,
          }),
        ).toBe(false);
      }
    });

    it("disallows when process is soft-deleted", () => {
      expect(
        canUserRegisterPublication(agentDeptA, {
          ...awaitingPublicationProcess,
          deletedAt: new Date(),
        }),
      ).toBe(false);
    });

    it("disallows when user is inactive", () => {
      expect(
        canUserRegisterPublication(
          { ...agentDeptA, isActive: false },
          awaitingPublicationProcess,
        ),
      ).toBe(false);
    });
  });

  describe("validatePublicationRecordPayload", () => {
    const validBasePayload = {
      publicationType: PUBLICATION_TYPE.DIRECT_AWARD_NOTICE,
      destination: "Diário Oficial do Município",
      publishedAt: new Date().toISOString(),
      referenceNumber: "PUB-2026/001",
      url: "https://diario.municipio.gov.br/atos/2026/001",
      documentId: "33333333-3333-3333-3333-333333333333",
    };

    it("validates all 4 publication types correctly", () => {
      for (const pubType of Object.values(PUBLICATION_TYPE)) {
        const validated = validatePublicationRecordPayload({
          ...validBasePayload,
          publicationType: pubType,
        });
        expect(validated.publicationType).toBe(pubType);
      }
    });

    it("normalizes optional fields when omitted or empty", () => {
      const minimalPayload = {
        publicationType: PUBLICATION_TYPE.AUTHORIZATION_EXTRACT,
        destination: "Portal Nacional de Contratações Públicas (PNCP)",
        publishedAt: new Date(),
      };

      const result = validatePublicationRecordPayload(minimalPayload);
      expect(result.publicationType).toBe("AUTHORIZATION_EXTRACT");
      expect(result.destination).toBe(
        "Portal Nacional de Contratações Públicas (PNCP)",
      );
      expect(result.referenceNumber).toBeNull();
      expect(result.url).toBeNull();
      expect(result.documentId).toBeNull();
      expect(result.publishedAt).toBeInstanceOf(Date);
    });

    it("rejects non-object or null payload", () => {
      expect(() => validatePublicationRecordPayload(null)).toThrow(
        ValidationError,
      );
      expect(() => validatePublicationRecordPayload("string")).toThrow(
        ValidationError,
      );
    });

    it("rejects invalid or missing publicationType", () => {
      expect(() =>
        validatePublicationRecordPayload({
          ...validBasePayload,
          publicationType: undefined,
        }),
      ).toThrow(ValidationError);

      expect(() =>
        validatePublicationRecordPayload({
          ...validBasePayload,
          publicationType: "INVALID_TYPE",
        }),
      ).toThrow(ValidationError);
    });

    it("rejects missing, empty, or whitespace-only destination", () => {
      expect(() =>
        validatePublicationRecordPayload({
          ...validBasePayload,
          destination: "",
        }),
      ).toThrow(ValidationError);

      expect(() =>
        validatePublicationRecordPayload({
          ...validBasePayload,
          destination: "    ",
        }),
      ).toThrow(ValidationError);

      expect(() =>
        validatePublicationRecordPayload({
          ...validBasePayload,
          destination: undefined,
        }),
      ).toThrow(ValidationError);
    });

    it("rejects missing or unparseable publication date", () => {
      expect(() =>
        validatePublicationRecordPayload({
          ...validBasePayload,
          publishedAt: undefined,
        }),
      ).toThrow(ValidationError);

      expect(() =>
        validatePublicationRecordPayload({
          ...validBasePayload,
          publishedAt: "not-a-valid-date",
        }),
      ).toThrow(ValidationError);
    });

    it("rejects future publication dates", () => {
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7); // 7 days in future
      expect(() =>
        validatePublicationRecordPayload({
          ...validBasePayload,
          publishedAt: futureDate.toISOString(),
        }),
      ).toThrow(ValidationError);
    });

    it("rejects ancient publication dates (< 2000)", () => {
      expect(() =>
        validatePublicationRecordPayload({
          ...validBasePayload,
          publishedAt: "1999-12-31T23:59:59Z",
        }),
      ).toThrow(ValidationError);
    });

    it("rejects malformed URL or non-http/https protocols", () => {
      expect(() =>
        validatePublicationRecordPayload({
          ...validBasePayload,
          url: "not-a-url",
        }),
      ).toThrow(ValidationError);

      expect(() =>
        validatePublicationRecordPayload({
          ...validBasePayload,
          url: "ftp://example.com/file.pdf",
        }),
      ).toThrow(ValidationError);

      expect(() =>
        validatePublicationRecordPayload({
          ...validBasePayload,
          url: "javascript:alert(1)",
        }),
      ).toThrow(ValidationError);
    });

    it("rejects invalid documentId format", () => {
      expect(() =>
        validatePublicationRecordPayload({
          ...validBasePayload,
          documentId: "invalid-uuid-string",
        }),
      ).toThrow(ValidationError);
    });

    it("accepts valid documentId format", () => {
      const validDocUuid = "12345678-1234-1234-1234-123456789abc";
      const result = validatePublicationRecordPayload({
        ...validBasePayload,
        documentId: validDocUuid,
      });
      expect(result.documentId).toBe(validDocUuid);
    });
  });
});
