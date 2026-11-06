import {
  STATUS_LABELS,
  STATUS_BADGE_STYLES,
  ROLE_LABELS,
  PUBLICATION_TYPE_LABELS,
  FINAL_AUTHORIZATION_DECISION_LABELS,
  FINAL_AUTHORIZATION_BADGES,
} from "@/components/dashboard/dashboardUtils";
import {
  PROCESS_STATUS,
  PUBLICATION_TYPE,
  FINAL_AUTHORIZATION_DECISION,
  validateFinalAuthorizationPayload,
  validatePublicationRecordPayload,
  canUserActOnFinalAuthorization,
  canUserInitiateFinalAuthorization,
  canUserRegisterPublication,
} from "@/domain/process-lifecycle";

describe("Phase 5.4 Finalization Frontend Unit Tests", () => {
  describe("Dashboard Utilities and Domain Constants", () => {
    test("defines labels for all publication types matching domain enums", () => {
      const expectedTypes = Object.values(PUBLICATION_TYPE);
      expectedTypes.forEach((type) => {
        expect(PUBLICATION_TYPE_LABELS[type]).toBeDefined();
        expect(typeof PUBLICATION_TYPE_LABELS[type]).toBe("string");
        expect(PUBLICATION_TYPE_LABELS[type].length).toBeGreaterThan(0);
      });

      expect(PUBLICATION_TYPE_LABELS.DIRECT_AWARD_NOTICE).toBe(
        "Aviso de Contratação Direta",
      );
      expect(PUBLICATION_TYPE_LABELS.AUTHORIZATION_EXTRACT).toBe(
        "Extrato de Autorização",
      );
      expect(PUBLICATION_TYPE_LABELS.CONTRACT_EXTRACT).toBe(
        "Extrato de Contrato",
      );
      expect(PUBLICATION_TYPE_LABELS.OTHER).toBe("Outro");
    });

    test("defines labels for final authorization decisions matching domain enums", () => {
      const expectedDecisions = Object.values(FINAL_AUTHORIZATION_DECISION);
      expectedDecisions.forEach((decision) => {
        expect(FINAL_AUTHORIZATION_DECISION_LABELS[decision]).toBeDefined();
        expect(typeof FINAL_AUTHORIZATION_DECISION_LABELS[decision]).toBe(
          "string",
        );
      });

      expect(FINAL_AUTHORIZATION_DECISION_LABELS.AUTHORIZED).toBe(
        "Autorizado pela autoridade competente",
      );
      expect(FINAL_AUTHORIZATION_DECISION_LABELS.REFUSED).toBe(
        "Autorização recusada",
      );
      expect(FINAL_AUTHORIZATION_DECISION_LABELS.ADJUSTMENT_REQUESTED).toBe(
        "Devolvido para ajustes",
      );
    });

    test("defines badge visual configurations for final authorization states", () => {
      const badgeKeys = [
        "AUTHORIZED",
        "REFUSED",
        "ADJUSTMENT_REQUESTED",
        "AWAITING_FINAL_AUTHORIZATION",
      ];

      badgeKeys.forEach((key) => {
        const badge = FINAL_AUTHORIZATION_BADGES[key];
        expect(badge).toBeDefined();
        expect(badge.label).toBeDefined();
        expect(badge.classes).toBeDefined();
        expect(badge.icon).toBeDefined();
      });

      expect(FINAL_AUTHORIZATION_BADGES.AUTHORIZED.icon).toBe("verified");
      expect(FINAL_AUTHORIZATION_BADGES.REFUSED.icon).toBe("cancel");
      expect(FINAL_AUTHORIZATION_BADGES.ADJUSTMENT_REQUESTED.icon).toBe(
        "assignment_return",
      );
      expect(FINAL_AUTHORIZATION_BADGES.AWAITING_FINAL_AUTHORIZATION.icon).toBe(
        "hourglass_top",
      );
    });

    test("preserves distinct labels and styles for Phase 5 process statuses", () => {
      const phase5Statuses = [
        PROCESS_STATUS.APPROVED,
        PROCESS_STATUS.AWAITING_FINAL_AUTHORIZATION,
        PROCESS_STATUS.AWAITING_PUBLICATION,
        PROCESS_STATUS.FINAL_AUTHORIZATION_REFUSED,
        PROCESS_STATUS.COMPLETED,
      ];

      phase5Statuses.forEach((st) => {
        expect(STATUS_LABELS[st]).toBeDefined();
        expect(STATUS_BADGE_STYLES[st]).toBeDefined();
      });

      // Clear visual distinction: APPROVED vs Final Authorization vs Completed
      expect(STATUS_LABELS[PROCESS_STATUS.APPROVED]).toBe("Aprovado");
      expect(STATUS_LABELS[PROCESS_STATUS.AWAITING_FINAL_AUTHORIZATION]).toBe(
        "Aguardando Autorização Final",
      );
      expect(STATUS_LABELS[PROCESS_STATUS.AWAITING_PUBLICATION]).toBe(
        "Aguardando Publicação",
      );
      expect(STATUS_LABELS[PROCESS_STATUS.FINAL_AUTHORIZATION_REFUSED]).toBe(
        "Autorização Recusada",
      );
      expect(STATUS_LABELS[PROCESS_STATUS.COMPLETED]).toBe("Concluído");

      // Refusal is visually distinct from Phase 4 rejection
      expect(
        STATUS_LABELS[PROCESS_STATUS.FINAL_AUTHORIZATION_REFUSED],
      ).not.toBe(STATUS_LABELS[PROCESS_STATUS.REJECTED]);
    });
  });

  describe("Final Authorization Decision Payload Validation", () => {
    test("validates AUTHORIZED decision with or without justification", () => {
      const noJustification = validateFinalAuthorizationPayload({
        decision: FINAL_AUTHORIZATION_DECISION.AUTHORIZED,
      });
      expect(noJustification.decision).toBe("AUTHORIZED");
      expect(noJustification.justification).toBeNull();

      const withJustification = validateFinalAuthorizationPayload({
        decision: FINAL_AUTHORIZATION_DECISION.AUTHORIZED,
        justification:
          "Contratação plenamente motivada e vantajosa para o erário.",
      });
      expect(withJustification.justification).toBe(
        "Contratação plenamente motivada e vantajosa para o erário.",
      );
    });

    test("requires minimum 10 characters for REFUSED decision", () => {
      expect(() =>
        validateFinalAuthorizationPayload({
          decision: FINAL_AUTHORIZATION_DECISION.REFUSED,
          justification: "Curto",
        }),
      ).toThrow(/mínimo de 10 caracteres/);

      expect(() =>
        validateFinalAuthorizationPayload({
          decision: FINAL_AUTHORIZATION_DECISION.REFUSED,
          justification: "",
        }),
      ).toThrow(/obrigatória/);

      const validRefusal = validateFinalAuthorizationPayload({
        decision: FINAL_AUTHORIZATION_DECISION.REFUSED,
        justification:
          "Inadequação orçamentária e falta de oportunidade pública.",
      });
      expect(validRefusal.decision).toBe("REFUSED");
      expect(validRefusal.justification).toBe(
        "Inadequação orçamentária e falta de oportunidade pública.",
      );
    });

    test("requires minimum 10 characters for ADJUSTMENT_REQUESTED decision", () => {
      expect(() =>
        validateFinalAuthorizationPayload({
          decision: FINAL_AUTHORIZATION_DECISION.ADJUSTMENT_REQUESTED,
          justification: "Ajustar",
        }),
      ).toThrow(/mínimo de 10 caracteres/);

      const validAdjustment = validateFinalAuthorizationPayload({
        decision: FINAL_AUTHORIZATION_DECISION.ADJUSTMENT_REQUESTED,
        justification: "Favor anexar três cotações adicionais atualizadas.",
      });
      expect(validAdjustment.decision).toBe("ADJUSTMENT_REQUESTED");
      expect(validAdjustment.justification).toBe(
        "Favor anexar três cotações adicionais atualizadas.",
      );
    });
  });

  describe("Publication Record Payload Validation", () => {
    const validBasePayload = {
      publicationType: PUBLICATION_TYPE.DIRECT_AWARD_NOTICE,
      destination: "Diário Oficial do Município (Simulado)",
      publishedAt: new Date().toISOString(),
      referenceNumber: "Edição nº 1482, pág. 12",
      url: "https://diario.exemplo.gov.br/atos/123",
      documentId: "11111111-1111-4111-8111-111111111111",
    };

    test("accepts complete valid publication payload", () => {
      const result = validatePublicationRecordPayload(validBasePayload);
      expect(result.publicationType).toBe(PUBLICATION_TYPE.DIRECT_AWARD_NOTICE);
      expect(result.destination).toBe("Diário Oficial do Município (Simulado)");
      expect(result.referenceNumber).toBe("Edição nº 1482, pág. 12");
      expect(result.url).toBe("https://diario.exemplo.gov.br/atos/123");
      expect(result.documentId).toBe("11111111-1111-4111-8111-111111111111");
    });

    test("enforces required fields: publicationType, destination, publishedAt", () => {
      expect(() =>
        validatePublicationRecordPayload({
          ...validBasePayload,
          publicationType: "INVALID_TYPE",
        }),
      ).toThrow(/Tipo de publicação inválido/);

      expect(() =>
        validatePublicationRecordPayload({
          ...validBasePayload,
          destination: "   ",
        }),
      ).toThrow(/veículo\/destino de publicação é obrigatório/);

      expect(() =>
        validatePublicationRecordPayload({
          ...validBasePayload,
          publishedAt: null,
        }),
      ).toThrow(/data da publicação é obrigatória/);
    });

    test("validates optional URL format and handles null optional fields gracefully", () => {
      const minimalPayload = {
        publicationType: PUBLICATION_TYPE.AUTHORIZATION_EXTRACT,
        destination: "Mural da Prefeitura",
        publishedAt: "2026-11-05T12:00:00.000Z",
      };

      const result = validatePublicationRecordPayload(minimalPayload);
      expect(result.referenceNumber).toBeNull();
      expect(result.url).toBeNull();
      expect(result.documentId).toBeNull();

      expect(() =>
        validatePublicationRecordPayload({
          ...minimalPayload,
          url: "not-a-valid-url",
        }),
      ).toThrow(/URL/);
    });
  });

  describe("Role Authorization Guards for Frontend Decision & Initiation", () => {
    const deptId = "33333333-3333-4333-8333-333333333333";
    const requesterId = "22222222-2222-4222-8222-222222222222";

    const approvedProcess = {
      id: "11111111-1111-4111-8111-111111111111",
      status: PROCESS_STATUS.APPROVED,
      departmentId: deptId,
      requesterId,
    };

    const awaitingFinalAuthProcess = {
      id: "11111111-1111-4111-8111-111111111111",
      status: PROCESS_STATUS.AWAITING_FINAL_AUTHORIZATION,
      departmentId: deptId,
      requesterId,
    };

    const awaitingPublicationProcess = {
      id: "11111111-1111-4111-8111-111111111111",
      status: PROCESS_STATUS.AWAITING_PUBLICATION,
      departmentId: deptId,
      requesterId,
    };

    test("canUserInitiateFinalAuthorization allows AGENTE_CONTRATACAO in same department", () => {
      const eligibleAgent = {
        id: "agent-id",
        role: "AGENTE_CONTRATACAO",
        departmentId: deptId,
      };

      expect(
        canUserInitiateFinalAuthorization(eligibleAgent, approvedProcess),
      ).toBe(true);

      // Disallowed for agent from another department
      expect(
        canUserInitiateFinalAuthorization(
          { ...eligibleAgent, departmentId: "other-dept" },
          approvedProcess,
        ),
      ).toBe(false);

      // Disallowed if agent requested the process (segregation of duties)
      expect(
        canUserInitiateFinalAuthorization(
          { ...eligibleAgent, id: requesterId },
          approvedProcess,
        ),
      ).toBe(false);

      // Disallowed for other roles
      expect(
        canUserInitiateFinalAuthorization(
          { id: "admin-id", role: "ADMIN", departmentId: deptId },
          approvedProcess,
        ),
      ).toBe(false);
      expect(
        canUserInitiateFinalAuthorization(
          { id: "aprovador-id", role: "APROVADOR", departmentId: deptId },
          approvedProcess,
        ),
      ).toBe(false);
      expect(
        canUserInitiateFinalAuthorization(
          { id: "solicitante-id", role: "SOLICITANTE", departmentId: deptId },
          approvedProcess,
        ),
      ).toBe(false);
    });

    test("canUserActOnFinalAuthorization allows AUTORIDADE_COMPETENTE and enforces segregation of duties", () => {
      const eligibleAuthority = {
        id: "authority-id",
        role: "AUTORIDADE_COMPETENTE",
        departmentId: deptId,
      };

      expect(
        canUserActOnFinalAuthorization(
          eligibleAuthority,
          awaitingFinalAuthProcess,
        ),
      ).toBe(true);

      // Disallowed for authority from another department
      expect(
        canUserActOnFinalAuthorization(
          { ...eligibleAuthority, departmentId: "other-dept" },
          awaitingFinalAuthProcess,
        ),
      ).toBe(false);

      // Disallowed if authority is requester (segregation of duties)
      expect(
        canUserActOnFinalAuthorization(
          { ...eligibleAuthority, id: requesterId },
          awaitingFinalAuthProcess,
        ),
      ).toBe(false);

      // ADMIN and APROVADOR cannot decide final authorization
      expect(
        canUserActOnFinalAuthorization(
          { id: "admin-id", role: "ADMIN", departmentId: deptId },
          awaitingFinalAuthProcess,
        ),
      ).toBe(false);
      expect(
        canUserActOnFinalAuthorization(
          { id: "aprovador-id", role: "APROVADOR", departmentId: deptId },
          awaitingFinalAuthProcess,
        ),
      ).toBe(false);
    });

    test("canUserRegisterPublication allows AGENTE_CONTRATACAO and enforces segregation of duties", () => {
      const eligibleAgent = {
        id: "agent-id",
        role: "AGENTE_CONTRATACAO",
        departmentId: deptId,
      };

      expect(
        canUserRegisterPublication(eligibleAgent, awaitingPublicationProcess),
      ).toBe(true);

      // Disallowed if status is not AWAITING_PUBLICATION
      expect(canUserRegisterPublication(eligibleAgent, approvedProcess)).toBe(
        false,
      );

      // Disallowed if agent requested process
      expect(
        canUserRegisterPublication(
          { ...eligibleAgent, id: requesterId },
          awaitingPublicationProcess,
        ),
      ).toBe(false);

      // Disallowed for ADMIN and AUTORIDADE_COMPETENTE
      expect(
        canUserRegisterPublication(
          { id: "admin-id", role: "ADMIN", departmentId: deptId },
          awaitingPublicationProcess,
        ),
      ).toBe(false);
      expect(
        canUserRegisterPublication(
          {
            id: "auth-id",
            role: "AUTORIDADE_COMPETENTE",
            departmentId: deptId,
          },
          awaitingPublicationProcess,
        ),
      ).toBe(false);
    });
  });
});
