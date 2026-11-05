import processService, {
  canUserSelectSupplier,
} from "@/services/process.service.js";

describe("justifications and supplier selection (Unit Tests)", () => {
  const deptAId = "11111111-1111-4111-8111-111111111111";
  const deptBId = "22222222-2222-4222-8222-222222222222";
  const requesterId = "33333333-3333-4333-8333-333333333333";

  const adminUser = {
    id: "admin-1",
    role: "ADMIN",
    departmentId: deptAId,
  };

  const agenteInDept = {
    id: "agente-1",
    role: "AGENTE_CONTRATACAO",
    departmentId: deptAId,
  };

  const agenteOtherDept = {
    id: "agente-2",
    role: "AGENTE_CONTRATACAO",
    departmentId: deptBId,
  };

  const solicitanteOwner = {
    id: requesterId,
    role: "SOLICITANTE",
    departmentId: deptAId,
  };

  const solicitanteOther = {
    id: "solicitante-2",
    role: "SOLICITANTE",
    departmentId: deptAId,
  };

  const aprovadorUser = {
    id: "aprovador-1",
    role: "APROVADOR",
    departmentId: deptAId,
  };

  describe("canUserSelectSupplier", () => {
    const draftProcess = {
      id: "p-1",
      status: "DRAFT",
      departmentId: deptAId,
      requesterId: requesterId,
      deletedAt: null,
    };

    it("allows ADMIN regardless of status as long as not locked", () => {
      expect(canUserSelectSupplier(adminUser, draftProcess)).toBe(true);
      expect(
        canUserSelectSupplier(adminUser, {
          ...draftProcess,
          status: "PRICE_RESEARCH",
        }),
      ).toBe(true);
    });

    it("allows AGENTE_CONTRATACAO in the same department", () => {
      expect(canUserSelectSupplier(agenteInDept, draftProcess)).toBe(true);
    });

    it("disallows AGENTE_CONTRATACAO from another department", () => {
      expect(canUserSelectSupplier(agenteOtherDept, draftProcess)).toBe(false);
    });

    it("allows SOLICITANTE for own process while in DRAFT status", () => {
      expect(canUserSelectSupplier(solicitanteOwner, draftProcess)).toBe(true);
    });

    it("disallows SOLICITANTE for another user's process", () => {
      expect(canUserSelectSupplier(solicitanteOther, draftProcess)).toBe(false);
    });

    it("disallows SOLICITANTE once process leaves DRAFT", () => {
      expect(
        canUserSelectSupplier(solicitanteOwner, {
          ...draftProcess,
          status: "IN_ANALYSIS",
        }),
      ).toBe(false);
    });

    it("locks supplier selection when process is in AWAITING_APPROVAL, APPROVED, COMPLETED, or REJECTED", () => {
      for (const st of [
        "AWAITING_APPROVAL",
        "APPROVED",
        "COMPLETED",
        "REJECTED",
      ]) {
        expect(
          canUserSelectSupplier(adminUser, {
            ...draftProcess,
            status: st,
          }),
        ).toBe(false);
      }
    });

    it("disallows APROVADOR role from selecting suppliers", () => {
      expect(canUserSelectSupplier(aprovadorUser, draftProcess)).toBe(false);
    });
  });
});
