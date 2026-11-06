import {
  canUserActOnFinalAuthorization,
  canUserInitiateFinalAuthorization,
  validateFinalAuthorizationPayload,
} from "@/domain/process-lifecycle.js";
import { ValidationError } from "@/infra/errors.js";

describe("Final Authorization Service & Domain Guards (Unit Tests)", () => {
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

  const adminUser = {
    id: "user-admin-1",
    role: "ADMIN",
    departmentId: deptA,
    isActive: true,
  };

  describe("canUserInitiateFinalAuthorization", () => {
    const approvedProcess = {
      id: "proc-1",
      status: "APPROVED",
      departmentId: deptA,
      requesterId: requesterUser.id,
      deletedAt: null,
    };

    it("allows AGENTE_CONTRATACAO in the same department to initiate", () => {
      expect(
        canUserInitiateFinalAuthorization(agentDeptA, approvedProcess),
      ).toBe(true);
    });

    it("disallows AGENTE_CONTRATACAO from a different department", () => {
      expect(
        canUserInitiateFinalAuthorization(agentDeptB, approvedProcess),
      ).toBe(false);
    });

    it("disallows SOLICITANTE, APROVADOR, AUTORIDADE_COMPETENTE, and ADMIN from initiating", () => {
      expect(
        canUserInitiateFinalAuthorization(requesterUser, approvedProcess),
      ).toBe(false);
      expect(
        canUserInitiateFinalAuthorization(approverDeptA, approvedProcess),
      ).toBe(false);
      expect(
        canUserInitiateFinalAuthorization(authorityDeptA, approvedProcess),
      ).toBe(false);
      expect(
        canUserInitiateFinalAuthorization(adminUser, approvedProcess),
      ).toBe(false);
    });

    it("enforces segregation of duties: agent cannot initiate if they originally requested the process", () => {
      const ownProcess = {
        ...approvedProcess,
        requesterId: agentDeptA.id,
      };
      expect(canUserInitiateFinalAuthorization(agentDeptA, ownProcess)).toBe(
        false,
      );
    });

    it("disallows initiation when process is not in APPROVED status", () => {
      const draftProcess = { ...approvedProcess, status: "DRAFT" };
      const inAnalysis = { ...approvedProcess, status: "IN_ANALYSIS" };
      const awaitingApproval = {
        ...approvedProcess,
        status: "AWAITING_APPROVAL",
      };
      const awaitingAuth = {
        ...approvedProcess,
        status: "AWAITING_FINAL_AUTHORIZATION",
      };

      expect(canUserInitiateFinalAuthorization(agentDeptA, draftProcess)).toBe(
        false,
      );
      expect(canUserInitiateFinalAuthorization(agentDeptA, inAnalysis)).toBe(
        false,
      );
      expect(
        canUserInitiateFinalAuthorization(agentDeptA, awaitingApproval),
      ).toBe(false);
      expect(canUserInitiateFinalAuthorization(agentDeptA, awaitingAuth)).toBe(
        false,
      );
    });

    it("disallows initiation when process is soft-deleted", () => {
      const deletedProc = {
        ...approvedProcess,
        deletedAt: new Date(),
      };
      expect(canUserInitiateFinalAuthorization(agentDeptA, deletedProc)).toBe(
        false,
      );
    });
  });

  describe("canUserActOnFinalAuthorization", () => {
    const awaitingAuthProcess = {
      id: "proc-1",
      status: "AWAITING_FINAL_AUTHORIZATION",
      departmentId: deptA,
      requesterId: requesterUser.id,
      deletedAt: null,
    };

    it("allows AUTORIDADE_COMPETENTE in the same department to act", () => {
      expect(
        canUserActOnFinalAuthorization(authorityDeptA, awaitingAuthProcess),
      ).toBe(true);
    });

    it("disallows AUTORIDADE_COMPETENTE from another department (department isolation)", () => {
      expect(
        canUserActOnFinalAuthorization(authorityDeptB, awaitingAuthProcess),
      ).toBe(false);
    });

    it("disallows fail-closed when authority has no department assigned", () => {
      expect(
        canUserActOnFinalAuthorization(authorityNullDept, awaitingAuthProcess),
      ).toBe(false);
    });

    it("enforces segregation of duties: authority cannot authorize own requested process", () => {
      const ownProcess = {
        ...awaitingAuthProcess,
        requesterId: authorityDeptA.id,
      };
      expect(canUserActOnFinalAuthorization(authorityDeptA, ownProcess)).toBe(
        false,
      );
    });

    it("disallows ADMIN, APROVADOR, AGENTE_CONTRATACAO, and SOLICITANTE from acting", () => {
      expect(
        canUserActOnFinalAuthorization(adminUser, awaitingAuthProcess),
      ).toBe(false);
      expect(
        canUserActOnFinalAuthorization(approverDeptA, awaitingAuthProcess),
      ).toBe(false);
      expect(
        canUserActOnFinalAuthorization(agentDeptA, awaitingAuthProcess),
      ).toBe(false);
      expect(
        canUserActOnFinalAuthorization(requesterUser, awaitingAuthProcess),
      ).toBe(false);
    });

    it("disallows acting when process is not in AWAITING_FINAL_AUTHORIZATION status", () => {
      expect(
        canUserActOnFinalAuthorization(authorityDeptA, {
          ...awaitingAuthProcess,
          status: "APPROVED",
        }),
      ).toBe(false);
      expect(
        canUserActOnFinalAuthorization(authorityDeptA, {
          ...awaitingAuthProcess,
          status: "AWAITING_PUBLICATION",
        }),
      ).toBe(false);
      expect(
        canUserActOnFinalAuthorization(authorityDeptA, {
          ...awaitingAuthProcess,
          status: "COMPLETED",
        }),
      ).toBe(false);
    });
  });

  describe("validateFinalAuthorizationPayload", () => {
    it("validates AUTHORIZED decision without justification", () => {
      const result = validateFinalAuthorizationPayload({
        decision: "AUTHORIZED",
      });
      expect(result.decision).toBe("AUTHORIZED");
      expect(result.justification).toBeNull();
    });

    it("validates AUTHORIZED decision with optional justification", () => {
      const result = validateFinalAuthorizationPayload({
        decision: "AUTHORIZED",
        justification: "Homologado e autorizado conforme parecer jurídico.",
      });
      expect(result.decision).toBe("AUTHORIZED");
      expect(result.justification).toBe(
        "Homologado e autorizado conforme parecer jurídico.",
      );
    });

    it("requires non-empty justification (minimum 10 chars) for REFUSED decision", () => {
      expect(() =>
        validateFinalAuthorizationPayload({
          decision: "REFUSED",
          justification: "",
        }),
      ).toThrow(ValidationError);

      expect(() =>
        validateFinalAuthorizationPayload({
          decision: "REFUSED",
          justification: "Curto",
        }),
      ).toThrow(ValidationError);

      const valid = validateFinalAuthorizationPayload({
        decision: "REFUSED",
        justification:
          "Recusado devido à ausência de dotação orçamentária suficiente.",
      });
      expect(valid.decision).toBe("REFUSED");
      expect(valid.justification).toBe(
        "Recusado devido à ausência de dotação orçamentária suficiente.",
      );
    });

    it("requires non-empty justification (minimum 10 chars) for ADJUSTMENT_REQUESTED decision", () => {
      expect(() =>
        validateFinalAuthorizationPayload({
          decision: "ADJUSTMENT_REQUESTED",
        }),
      ).toThrow(ValidationError);

      expect(() =>
        validateFinalAuthorizationPayload({
          decision: "ADJUSTMENT_REQUESTED",
          justification: "    ",
        }),
      ).toThrow(ValidationError);

      const valid = validateFinalAuthorizationPayload({
        decision: "ADJUSTMENT_REQUESTED",
        justification:
          "Adequar o termo de referência para incluir cronograma de entrega detalhado.",
      });
      expect(valid.decision).toBe("ADJUSTMENT_REQUESTED");
      expect(valid.justification).toBe(
        "Adequar o termo de referência para incluir cronograma de entrega detalhado.",
      );
    });

    it("rejects invalid decision enum values", () => {
      expect(() =>
        validateFinalAuthorizationPayload({
          decision: "INVALID_DECISION",
        }),
      ).toThrow(ValidationError);
    });
  });
});
