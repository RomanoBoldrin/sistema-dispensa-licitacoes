import {
  ALL_PROCESS_STATUSES,
  ALLOWED_TRANSITIONS,
  FINAL_AUTHORIZATION_DECISION,
  PROCESS_STATUS,
  PUBLICATION_TYPE,
  TERMINAL_STATUSES,
  assertValidTransition,
  canUserActOnFinalAuthorization,
  canUserRegisterPublication,
  isValidTransition,
  validateFinalAuthorizationPayload,
  validatePublicationRecordPayload,
  calculateNextWorkflowCycle,
} from "@/domain/process-lifecycle.js";
import { ConflictError, ValidationError } from "@/infra/errors.js";

describe("Phase 5.1 Domain Foundation (Unit Tests)", () => {
  const deptA = "11111111-1111-1111-1111-111111111111";
  const deptB = "22222222-2222-2222-2222-222222222222";

  const authorityDeptA = {
    id: "user-auth-1",
    role: "AUTORIDADE_COMPETENTE",
    departmentId: deptA,
    isActive: true,
  };

  const authorityDeptB = {
    id: "user-auth-2",
    role: "AUTORIDADE_COMPETENTE",
    departmentId: deptB,
    isActive: true,
  };

  const authorityNullDept = {
    id: "user-auth-null",
    role: "AUTORIDADE_COMPETENTE",
    departmentId: null,
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

  const approverDeptA = {
    id: "user-app-1",
    role: "APROVADOR",
    departmentId: deptA,
    isActive: true,
  };

  const adminUser = {
    id: "user-admin-1",
    role: "ADMIN",
    departmentId: deptA,
    isActive: true,
  };

  const requesterUser = {
    id: "user-req-1",
    role: "SOLICITANTE",
    departmentId: deptA,
    isActive: true,
  };

  describe("Process Lifecycle and Statuses", () => {
    it("recognizes all 12 canonical statuses including Phase 5 additions", () => {
      expect(ALL_PROCESS_STATUSES).toHaveLength(12);
      expect(ALL_PROCESS_STATUSES).toContain(
        PROCESS_STATUS.AWAITING_FINAL_AUTHORIZATION,
      );
      expect(ALL_PROCESS_STATUSES).toContain(
        PROCESS_STATUS.AWAITING_PUBLICATION,
      );
      expect(ALL_PROCESS_STATUSES).toContain(
        PROCESS_STATUS.FINAL_AUTHORIZATION_REFUSED,
      );
      expect(ALL_PROCESS_STATUSES).toContain(PROCESS_STATUS.APPROVED);
      expect(ALL_PROCESS_STATUSES).toContain(PROCESS_STATUS.COMPLETED);
    });

    it("verifies explicit Phase 5 state transitions", () => {
      // 1. APPROVED -> AWAITING_FINAL_AUTHORIZATION
      expect(
        isValidTransition(
          PROCESS_STATUS.APPROVED,
          PROCESS_STATUS.AWAITING_FINAL_AUTHORIZATION,
        ),
      ).toBe(true);

      // 2. AWAITING_FINAL_AUTHORIZATION -> AWAITING_PUBLICATION
      expect(
        isValidTransition(
          PROCESS_STATUS.AWAITING_FINAL_AUTHORIZATION,
          PROCESS_STATUS.AWAITING_PUBLICATION,
        ),
      ).toBe(true);

      // 3. AWAITING_FINAL_AUTHORIZATION -> FINAL_AUTHORIZATION_REFUSED
      expect(
        isValidTransition(
          PROCESS_STATUS.AWAITING_FINAL_AUTHORIZATION,
          PROCESS_STATUS.FINAL_AUTHORIZATION_REFUSED,
        ),
      ).toBe(true);

      // 4. AWAITING_FINAL_AUTHORIZATION -> RETURNED_FOR_ADJUSTMENT
      expect(
        isValidTransition(
          PROCESS_STATUS.AWAITING_FINAL_AUTHORIZATION,
          PROCESS_STATUS.RETURNED_FOR_ADJUSTMENT,
        ),
      ).toBe(true);

      // 5. AWAITING_PUBLICATION -> COMPLETED
      expect(
        isValidTransition(
          PROCESS_STATUS.AWAITING_PUBLICATION,
          PROCESS_STATUS.COMPLETED,
        ),
      ).toBe(true);
    });

    it("preserves Phase 1 through 4 transitions and resubmission loop", () => {
      // Requester submission
      expect(
        isValidTransition(PROCESS_STATUS.DRAFT, PROCESS_STATUS.IN_ANALYSIS),
      ).toBe(true);

      // Technical analysis approval
      expect(
        isValidTransition(
          PROCESS_STATUS.IN_ANALYSIS,
          PROCESS_STATUS.AWAITING_APPROVAL,
        ),
      ).toBe(true);

      // Technical analysis adjustment request
      expect(
        isValidTransition(
          PROCESS_STATUS.IN_ANALYSIS,
          PROCESS_STATUS.RETURNED_FOR_ADJUSTMENT,
        ),
      ).toBe(true);

      // Internal approval
      expect(
        isValidTransition(
          PROCESS_STATUS.AWAITING_APPROVAL,
          PROCESS_STATUS.APPROVED,
        ),
      ).toBe(true);

      // Internal rejection
      expect(
        isValidTransition(
          PROCESS_STATUS.AWAITING_APPROVAL,
          PROCESS_STATUS.REJECTED,
        ),
      ).toBe(true);

      // Internal adjustment request
      expect(
        isValidTransition(
          PROCESS_STATUS.AWAITING_APPROVAL,
          PROCESS_STATUS.RETURNED_FOR_ADJUSTMENT,
        ),
      ).toBe(true);

      // Resubmission from adjustment returns strictly to IN_ANALYSIS
      expect(
        isValidTransition(
          PROCESS_STATUS.RETURNED_FOR_ADJUSTMENT,
          PROCESS_STATUS.IN_ANALYSIS,
        ),
      ).toBe(true);
    });

    it("rejects invalid, skipped, or shortcut transitions", () => {
      // Cannot skip directly from DRAFT to APPROVED or COMPLETED
      expect(
        isValidTransition(PROCESS_STATUS.DRAFT, PROCESS_STATUS.APPROVED),
      ).toBe(false);
      expect(
        isValidTransition(PROCESS_STATUS.DRAFT, PROCESS_STATUS.COMPLETED),
      ).toBe(false);

      // Cannot skip directly from APPROVED to COMPLETED without publication
      expect(
        isValidTransition(PROCESS_STATUS.APPROVED, PROCESS_STATUS.COMPLETED),
      ).toBe(false);

      // Cannot skip directly from APPROVED to AWAITING_PUBLICATION without final authorization
      expect(
        isValidTransition(
          PROCESS_STATUS.APPROVED,
          PROCESS_STATUS.AWAITING_PUBLICATION,
        ),
      ).toBe(false);

      // Cannot return directly from RETURNED_FOR_ADJUSTMENT to AWAITING_FINAL_AUTHORIZATION
      expect(
        isValidTransition(
          PROCESS_STATUS.RETURNED_FOR_ADJUSTMENT,
          PROCESS_STATUS.AWAITING_FINAL_AUTHORIZATION,
        ),
      ).toBe(false);
    });

    it("identifies terminal statuses and rejects transitions from them", () => {
      expect(TERMINAL_STATUSES).toEqual([
        PROCESS_STATUS.REJECTED,
        PROCESS_STATUS.FINAL_AUTHORIZATION_REFUSED,
        PROCESS_STATUS.COMPLETED,
      ]);

      for (const terminal of TERMINAL_STATUSES) {
        expect(ALLOWED_TRANSITIONS[terminal]).toEqual([]);
        expect(isValidTransition(terminal, PROCESS_STATUS.DRAFT)).toBe(false);
        expect(isValidTransition(terminal, PROCESS_STATUS.IN_ANALYSIS)).toBe(
          false,
        );
        expect(() =>
          assertValidTransition(terminal, PROCESS_STATUS.IN_ANALYSIS),
        ).toThrow(ConflictError);
      }
    });

    it("assertValidTransition throws ValidationError on unknown statuses", () => {
      expect(() =>
        assertValidTransition("UNKNOWN_SOURCE", PROCESS_STATUS.IN_ANALYSIS),
      ).toThrow(ValidationError);
      expect(() =>
        assertValidTransition(PROCESS_STATUS.DRAFT, "UNKNOWN_TARGET"),
      ).toThrow(ValidationError);
    });
  });

  describe("Final Authorization Authorization Guards (canUserActOnFinalAuthorization)", () => {
    const processAwaitingFinal = {
      id: "proc-final-1",
      status: PROCESS_STATUS.AWAITING_FINAL_AUTHORIZATION,
      departmentId: deptA,
      requesterId: requesterUser.id,
      deletedAt: null,
    };

    it("allows AUTORIDADE_COMPETENTE from the same department to act", () => {
      expect(
        canUserActOnFinalAuthorization(authorityDeptA, processAwaitingFinal),
      ).toBe(true);
    });

    it("denies cross-department authority: AUTORIDADE_COMPETENTE from Dept B cannot act on Dept A process", () => {
      expect(
        canUserActOnFinalAuthorization(authorityDeptB, processAwaitingFinal),
      ).toBe(false);
    });

    it("denies fail-closed when authority has no assigned department", () => {
      expect(
        canUserActOnFinalAuthorization(authorityNullDept, processAwaitingFinal),
      ).toBe(false);
    });

    it("denies ADMIN from substituting for the competent authority", () => {
      expect(
        canUserActOnFinalAuthorization(adminUser, processAwaitingFinal),
      ).toBe(false);
    });

    it("denies APROVADOR and AGENTE_CONTRATACAO from granting final authorization", () => {
      expect(
        canUserActOnFinalAuthorization(approverDeptA, processAwaitingFinal),
      ).toBe(false);
      expect(
        canUserActOnFinalAuthorization(agentDeptA, processAwaitingFinal),
      ).toBe(false);
    });

    it("enforces segregation of duties: authority cannot authorize a process they requested", () => {
      const ownProcess = {
        ...processAwaitingFinal,
        requesterId: authorityDeptA.id,
      };
      expect(canUserActOnFinalAuthorization(authorityDeptA, ownProcess)).toBe(
        false,
      );
    });

    it("denies when process is not in AWAITING_FINAL_AUTHORIZATION", () => {
      const approvedProcess = {
        ...processAwaitingFinal,
        status: PROCESS_STATUS.APPROVED,
      };
      expect(
        canUserActOnFinalAuthorization(authorityDeptA, approvedProcess),
      ).toBe(false);
    });

    it("denies when process is soft-deleted", () => {
      const deletedProcess = {
        ...processAwaitingFinal,
        deletedAt: new Date(),
      };
      expect(
        canUserActOnFinalAuthorization(authorityDeptA, deletedProcess),
      ).toBe(false);
    });
  });

  describe("Publication Registration Guards (canUserRegisterPublication)", () => {
    const processAwaitingPub = {
      id: "proc-pub-1",
      status: PROCESS_STATUS.AWAITING_PUBLICATION,
      departmentId: deptA,
      requesterId: requesterUser.id,
      deletedAt: null,
    };

    it("allows AGENTE_CONTRATACAO from the same department to register publication", () => {
      expect(canUserRegisterPublication(agentDeptA, processAwaitingPub)).toBe(
        true,
      );
    });

    it("denies AGENTE_CONTRATACAO from another department", () => {
      expect(canUserRegisterPublication(agentDeptB, processAwaitingPub)).toBe(
        false,
      );
    });

    it("denies ADMIN, APROVADOR, and AUTORIDADE_COMPETENTE from registering publication", () => {
      expect(canUserRegisterPublication(adminUser, processAwaitingPub)).toBe(
        false,
      );
      expect(
        canUserRegisterPublication(approverDeptA, processAwaitingPub),
      ).toBe(false);
      expect(
        canUserRegisterPublication(authorityDeptA, processAwaitingPub),
      ).toBe(false);
    });

    it("enforces segregation of duties: agent cannot register publication on own requested process", () => {
      const ownProcess = {
        ...processAwaitingPub,
        requesterId: agentDeptA.id,
      };
      expect(canUserRegisterPublication(agentDeptA, ownProcess)).toBe(false);
    });

    it("denies when process is not in AWAITING_PUBLICATION", () => {
      const approvedProcess = {
        ...processAwaitingPub,
        status: PROCESS_STATUS.APPROVED,
      };
      expect(canUserRegisterPublication(agentDeptA, approvedProcess)).toBe(
        false,
      );
    });
  });

  describe("Payload Validation (validateFinalAuthorizationPayload)", () => {
    it("validates successful AUTHORIZED decision without justification", () => {
      const result = validateFinalAuthorizationPayload({
        decision: FINAL_AUTHORIZATION_DECISION.AUTHORIZED,
      });
      expect(result.decision).toBe("AUTHORIZED");
      expect(result.justification).toBeNull();
    });

    it("validates AUTHORIZED decision with optional justification", () => {
      const result = validateFinalAuthorizationPayload({
        decision: FINAL_AUTHORIZATION_DECISION.AUTHORIZED,
        justification: "Atendidas todas as exigências legais.",
      });
      expect(result.decision).toBe("AUTHORIZED");
      expect(result.justification).toBe(
        "Atendidas todas as exigências legais.",
      );
    });

    it("requires justification when REFUSED (minimum 10 chars)", () => {
      expect(() =>
        validateFinalAuthorizationPayload({
          decision: FINAL_AUTHORIZATION_DECISION.REFUSED,
        }),
      ).toThrow(ValidationError);

      expect(() =>
        validateFinalAuthorizationPayload({
          decision: FINAL_AUTHORIZATION_DECISION.REFUSED,
          justification: "Curto",
        }),
      ).toThrow(ValidationError);

      const valid = validateFinalAuthorizationPayload({
        decision: FINAL_AUTHORIZATION_DECISION.REFUSED,
        justification: "Preços manifestamente superiores aos praticados.",
      });
      expect(valid.decision).toBe("REFUSED");
      expect(valid.justification).toBe(
        "Preços manifestamente superiores aos praticados.",
      );
    });

    it("requires justification when ADJUSTMENT_REQUESTED (minimum 10 chars)", () => {
      expect(() =>
        validateFinalAuthorizationPayload({
          decision: FINAL_AUTHORIZATION_DECISION.ADJUSTMENT_REQUESTED,
          justification: "   ",
        }),
      ).toThrow(ValidationError);

      const valid = validateFinalAuthorizationPayload({
        decision: FINAL_AUTHORIZATION_DECISION.ADJUSTMENT_REQUESTED,
        justification:
          "Complementar pesquisa de preços com novos fornecedores.",
      });
      expect(valid.decision).toBe("ADJUSTMENT_REQUESTED");
      expect(valid.justification).toBe(
        "Complementar pesquisa de preços com novos fornecedores.",
      );
    });

    it("rejects unknown decision enum value", () => {
      expect(() =>
        validateFinalAuthorizationPayload({
          decision: "ARBITRARY_DECISION",
        }),
      ).toThrow(ValidationError);
    });
  });

  describe("Payload Validation (validatePublicationRecordPayload)", () => {
    it("validates a complete valid publication payload", () => {
      const result = validatePublicationRecordPayload({
        publicationType: PUBLICATION_TYPE.AUTHORIZATION_EXTRACT,
        destination: "Diário Oficial do Município",
        publishedAt: "2026-11-05T12:00:00.000Z",
        referenceNumber: "EXT-001/2026",
        url: "https://transparencia.municipio.gov.br/atos/123",
      });

      expect(result.publicationType).toBe("AUTHORIZATION_EXTRACT");
      expect(result.destination).toBe("Diário Oficial do Município");
      expect(result.referenceNumber).toBe("EXT-001/2026");
      expect(result.url).toBe(
        "https://transparencia.municipio.gov.br/atos/123",
      );
      expect(result.publishedAt).toBeInstanceOf(Date);
    });

    it("validates simulation publication payload without URL or referenceNumber", () => {
      const result = validatePublicationRecordPayload({
        publicationType: PUBLICATION_TYPE.DIRECT_AWARD_NOTICE,
        destination: "PNCP (Simulado Acadêmico)",
        publishedAt: new Date(),
      });

      expect(result.publicationType).toBe("DIRECT_AWARD_NOTICE");
      expect(result.destination).toBe("PNCP (Simulado Acadêmico)");
      expect(result.referenceNumber).toBeNull();
      expect(result.url).toBeNull();
    });

    it("rejects payload missing destination", () => {
      expect(() =>
        validatePublicationRecordPayload({
          publicationType: PUBLICATION_TYPE.CONTRACT_EXTRACT,
          destination: "   ",
          publishedAt: new Date(),
        }),
      ).toThrow(ValidationError);
    });

    it("rejects invalid date", () => {
      expect(() =>
        validatePublicationRecordPayload({
          publicationType: PUBLICATION_TYPE.OTHER,
          destination: "Portal Institucional",
          publishedAt: "invalid-date-string",
        }),
      ).toThrow(ValidationError);
    });

    it("rejects malformed URL", () => {
      expect(() =>
        validatePublicationRecordPayload({
          publicationType: PUBLICATION_TYPE.AUTHORIZATION_EXTRACT,
          destination: "DOM",
          publishedAt: new Date(),
          url: "not-a-valid-url",
        }),
      ).toThrow(ValidationError);
    });
  });

  describe("Workflow Cycle Synchronization & Two-Cycle Lifecycle Audit", () => {
    it("computes cycle correctly on initial submission and subsequent cycles", () => {
      // 1. Initial submission: no approvals or finalAuthorizations
      expect(
        calculateNextWorkflowCycle({
          approvals: [],
          finalAuthorizations: [],
          isResubmission: false,
        }),
      ).toBe(1);

      // 2. Resubmission after internal approval adjustments in cycle 1
      expect(
        calculateNextWorkflowCycle({
          approvals: [{ cycle: 1, deletedAt: null }],
          finalAuthorizations: [],
          isResubmission: true,
        }),
      ).toBe(2);

      // 3. Resubmission after competent authority adjustments in cycle 1
      expect(
        calculateNextWorkflowCycle({
          approvals: [{ cycle: 1, deletedAt: null }],
          finalAuthorizations: [{ cycle: 1, deletedAt: null }],
          isResubmission: true,
        }),
      ).toBe(2);

      // 4. Soft-deleted cycle entries are ignored
      expect(
        calculateNextWorkflowCycle({
          approvals: [
            { cycle: 1, deletedAt: null },
            { cycle: 2, deletedAt: new Date() },
          ],
          finalAuthorizations: [],
          isResubmission: true,
        }),
      ).toBe(2);
    });

    it("successfully traces complete workflow through two full cycles with segregation and authorization", () => {
      // Step 1: Initial Submission (Cycle 1)
      let currentStatus = PROCESS_STATUS.DRAFT;
      const cycle1 = calculateNextWorkflowCycle({
        approvals: [],
        finalAuthorizations: [],
        isResubmission: false,
      });
      expect(cycle1).toBe(1);

      assertValidTransition(currentStatus, PROCESS_STATUS.IN_ANALYSIS);
      currentStatus = PROCESS_STATUS.IN_ANALYSIS;

      // Step 2: Phase 4 Stage 1 Analysis & Stage 2 Internal Approval
      assertValidTransition(currentStatus, PROCESS_STATUS.AWAITING_APPROVAL);
      currentStatus = PROCESS_STATUS.AWAITING_APPROVAL;

      assertValidTransition(currentStatus, PROCESS_STATUS.APPROVED);
      currentStatus = PROCESS_STATUS.APPROVED;

      // Step 3: Final Authorization Initiated
      assertValidTransition(
        currentStatus,
        PROCESS_STATUS.AWAITING_FINAL_AUTHORIZATION,
      );
      currentStatus = PROCESS_STATUS.AWAITING_FINAL_AUTHORIZATION;

      // Process object in AWAITING_FINAL_AUTHORIZATION
      const processObj = {
        id: "proc-cycle-test",
        departmentId: deptA,
        userId: requesterUser.id,
        status: currentStatus,
      };

      // Step 4: Competent authority checks & requests adjustments in Cycle 1
      expect(canUserActOnFinalAuthorization(authorityDeptA, processObj)).toBe(
        true,
      );
      expect(canUserActOnFinalAuthorization(authorityDeptB, processObj)).toBe(
        false,
      ); // Cross-dept blocked
      expect(canUserActOnFinalAuthorization(adminUser, processObj)).toBe(false); // Admin cannot substitute

      const cycle1Decision = {
        cycle: 1,
        decision: FINAL_AUTHORIZATION_DECISION.ADJUSTMENT_REQUESTED,
        justification:
          "Adequar o termo de referência com detalhamento do cronograma físico-financeiro.",
        decidedById: authorityDeptA.id,
      };
      expect(validateFinalAuthorizationPayload(cycle1Decision).decision).toBe(
        "ADJUSTMENT_REQUESTED",
      );

      assertValidTransition(
        currentStatus,
        PROCESS_STATUS.RETURNED_FOR_ADJUSTMENT,
      );
      currentStatus = PROCESS_STATUS.RETURNED_FOR_ADJUSTMENT;
      processObj.status = currentStatus;

      // Step 5: Requester adjusts and resubmits -> Cycle 2 begins
      const cycle2 = calculateNextWorkflowCycle({
        approvals: [{ cycle: 1, deletedAt: null }],
        finalAuthorizations: [cycle1Decision],
        isResubmission: true,
      });
      expect(cycle2).toBe(2);

      assertValidTransition(currentStatus, PROCESS_STATUS.IN_ANALYSIS);
      currentStatus = PROCESS_STATUS.IN_ANALYSIS;
      processObj.status = currentStatus;

      // Step 6: Phase 4 Analysis and Approval repeat in Cycle 2
      assertValidTransition(currentStatus, PROCESS_STATUS.AWAITING_APPROVAL);
      currentStatus = PROCESS_STATUS.AWAITING_APPROVAL;

      assertValidTransition(currentStatus, PROCESS_STATUS.APPROVED);
      currentStatus = PROCESS_STATUS.APPROVED;

      // Step 7: Final Authorization initiated again in Cycle 2
      assertValidTransition(
        currentStatus,
        PROCESS_STATUS.AWAITING_FINAL_AUTHORIZATION,
      );
      currentStatus = PROCESS_STATUS.AWAITING_FINAL_AUTHORIZATION;
      processObj.status = currentStatus;

      // Step 8: Competent Authority grants final authorization in Cycle 2
      expect(canUserActOnFinalAuthorization(authorityDeptA, processObj)).toBe(
        true,
      );

      const cycle2Decision = {
        cycle: 2,
        decision: FINAL_AUTHORIZATION_DECISION.AUTHORIZED,
        justification: "Cronograma revisado e aprovado integralmente.",
        decidedById: authorityDeptA.id,
      };
      expect(validateFinalAuthorizationPayload(cycle2Decision).decision).toBe(
        "AUTHORIZED",
      );

      // Verify that cycle 1 decision is still preserved and distinct from cycle 2
      expect(cycle1Decision.cycle).toBe(1);
      expect(cycle1Decision.decision).toBe("ADJUSTMENT_REQUESTED");
      expect(cycle2Decision.cycle).toBe(2);
      expect(cycle2Decision.decision).toBe("AUTHORIZED");
      expect(cycle1Decision.cycle).not.toBe(cycle2Decision.cycle);

      assertValidTransition(currentStatus, PROCESS_STATUS.AWAITING_PUBLICATION);
      currentStatus = PROCESS_STATUS.AWAITING_PUBLICATION;
      processObj.status = currentStatus;

      // Step 9: Publication registration by Agente de Contratação
      expect(canUserRegisterPublication(agentDeptA, processObj)).toBe(true);
      expect(canUserRegisterPublication(authorityDeptA, processObj)).toBe(
        false,
      ); // Authority cannot publish
      expect(canUserRegisterPublication(adminUser, processObj)).toBe(false); // Admin cannot publish

      const pubPayload = validatePublicationRecordPayload({
        publicationType: PUBLICATION_TYPE.DIRECT_AWARD_NOTICE,
        destination: "PNCP (Simulado)",
        publishedAt: new Date(),
      });
      expect(pubPayload.publicationType).toBe("DIRECT_AWARD_NOTICE");

      assertValidTransition(currentStatus, PROCESS_STATUS.COMPLETED);
      currentStatus = PROCESS_STATUS.COMPLETED;
      processObj.status = currentStatus;

      // Step 10: Process reached terminal COMPLETED status; no further transitions allowed
      expect(TERMINAL_STATUSES).toContain(currentStatus);
      expect(() =>
        assertValidTransition(
          currentStatus,
          PROCESS_STATUS.AWAITING_FINAL_AUTHORIZATION,
        ),
      ).toThrow(ConflictError);
    });
  });
});
