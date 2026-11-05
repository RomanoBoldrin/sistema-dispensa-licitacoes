import { canUserActOnApprovalTask } from "@/services/workflow.service.js";
import {
  canUserEditProcess,
  canUserModifyInstructionData,
  canUserSelectSupplier,
} from "@/services/process.service.js";

describe("Workflow Service & Authorization Guards (Unit Tests)", () => {
  const deptA = "11111111-1111-1111-1111-111111111111";
  const deptB = "22222222-2222-2222-2222-222222222222";

  const requesterUser = {
    id: "user-req-1",
    role: "SOLICITANTE",
    departmentId: deptA,
  };

  const agentDeptA = {
    id: "user-agent-1",
    role: "AGENTE_CONTRATACAO",
    departmentId: deptA,
  };

  const agentDeptB = {
    id: "user-agent-2",
    role: "AGENTE_CONTRATACAO",
    departmentId: deptB,
  };

  const approverDeptA = {
    id: "user-app-1",
    role: "APROVADOR",
    departmentId: deptA,
  };

  const approverDeptB = {
    id: "user-app-2",
    role: "APROVADOR",
    departmentId: deptB,
  };

  const approverNullDept = {
    id: "user-app-null",
    role: "APROVADOR",
    departmentId: null,
  };

  const adminUser = {
    id: "user-admin-1",
    role: "ADMIN",
    departmentId: deptA,
  };

  const processInAnalysis = {
    id: "proc-1",
    status: "IN_ANALYSIS",
    departmentId: deptA,
    requesterId: requesterUser.id,
    deletedAt: null,
  };

  const processAwaitingApproval = {
    id: "proc-2",
    status: "AWAITING_APPROVAL",
    departmentId: deptA,
    requesterId: requesterUser.id,
    deletedAt: null,
  };

  const taskAnalysisPending = {
    id: "task-1",
    stage: "ANALYSIS",
    assignedRole: "AGENTE_CONTRATACAO",
    cycle: 1,
    decision: null,
    deletedAt: null,
  };

  const taskApprovalPending = {
    id: "task-2",
    stage: "APPROVAL",
    assignedRole: "APROVADOR",
    cycle: 1,
    decision: null,
    deletedAt: null,
  };

  const taskAlreadyApproved = {
    id: "task-3",
    stage: "ANALYSIS",
    assignedRole: "AGENTE_CONTRATACAO",
    cycle: 1,
    decision: "APPROVED",
    deletedAt: null,
  };

  describe("canUserActOnApprovalTask", () => {
    it("allows AGENTE_CONTRATACAO from the same department to act on pending ANALYSIS task", () => {
      expect(
        canUserActOnApprovalTask(
          agentDeptA,
          processInAnalysis,
          taskAnalysisPending,
        ),
      ).toBe(true);
    });

    it("allows APROVADOR from the same department to act on pending APPROVAL task", () => {
      expect(
        canUserActOnApprovalTask(
          approverDeptA,
          processAwaitingApproval,
          taskApprovalPending,
        ),
      ).toBe(true);
    });

    it("denies access if the review task is already completed (decision != null)", () => {
      expect(
        canUserActOnApprovalTask(
          agentDeptA,
          processInAnalysis,
          taskAlreadyApproved,
        ),
      ).toBe(false);
    });

    it("enforces Segregation of Duties: reviewer cannot review their own requested process", () => {
      const selfRequestedProcess = {
        ...processInAnalysis,
        requesterId: agentDeptA.id,
      };
      expect(
        canUserActOnApprovalTask(
          agentDeptA,
          selfRequestedProcess,
          taskAnalysisPending,
        ),
      ).toBe(false);
    });

    it("enforces fail-closed department isolation: denies reviewer with null department", () => {
      expect(
        canUserActOnApprovalTask(
          approverNullDept,
          processAwaitingApproval,
          taskApprovalPending,
        ),
      ).toBe(false);
    });

    it("enforces department isolation: denies reviewer from a different department", () => {
      expect(
        canUserActOnApprovalTask(
          agentDeptB,
          processInAnalysis,
          taskAnalysisPending,
        ),
      ).toBe(false);
      expect(
        canUserActOnApprovalTask(
          approverDeptB,
          processAwaitingApproval,
          taskApprovalPending,
        ),
      ).toBe(false);
    });

    it("denies ADMIN role from acting as reviewer (no administrative workflow bypass)", () => {
      expect(
        canUserActOnApprovalTask(
          adminUser,
          processInAnalysis,
          taskAnalysisPending,
        ),
      ).toBe(false);
      expect(
        canUserActOnApprovalTask(
          adminUser,
          processAwaitingApproval,
          taskApprovalPending,
        ),
      ).toBe(false);
    });

    it("denies role mismatch: APROVADOR cannot act on Stage 1 (ANALYSIS)", () => {
      expect(
        canUserActOnApprovalTask(
          approverDeptA,
          processInAnalysis,
          taskAnalysisPending,
        ),
      ).toBe(false);
    });

    it("denies role mismatch: AGENTE_CONTRATACAO cannot act on Stage 2 (APPROVAL)", () => {
      expect(
        canUserActOnApprovalTask(
          agentDeptA,
          processAwaitingApproval,
          taskApprovalPending,
        ),
      ).toBe(false);
    });

    it("denies if process status does not match stage expected status", () => {
      const mismatchedProcess = {
        ...processInAnalysis,
        status: "DRAFT",
      };
      expect(
        canUserActOnApprovalTask(
          agentDeptA,
          mismatchedProcess,
          taskAnalysisPending,
        ),
      ).toBe(false);
    });
  });

  describe("canUserEditProcess & Editing Restrictions", () => {
    it("allows editing in DRAFT and RETURNED_FOR_ADJUSTMENT for requester", () => {
      expect(
        canUserEditProcess(requesterUser, {
          status: "DRAFT",
          requesterId: requesterUser.id,
          departmentId: deptA,
        }),
      ).toBe(true);

      expect(
        canUserEditProcess(requesterUser, {
          status: "RETURNED_FOR_ADJUSTMENT",
          requesterId: requesterUser.id,
          departmentId: deptA,
        }),
      ).toBe(true);
    });

    it("locks ordinary editing (PATCH) during IN_ANALYSIS and AWAITING_APPROVAL for all roles including ADMIN", () => {
      for (const user of [
        requesterUser,
        agentDeptA,
        approverDeptA,
        adminUser,
      ]) {
        expect(
          canUserEditProcess(user, {
            status: "IN_ANALYSIS",
            requesterId: requesterUser.id,
            departmentId: deptA,
          }),
        ).toBe(false);

        expect(
          canUserEditProcess(user, {
            status: "AWAITING_APPROVAL",
            requesterId: requesterUser.id,
            departmentId: deptA,
          }),
        ).toBe(false);
      }
    });
  });

  describe("canUserModifyInstructionData during IN_ANALYSIS", () => {
    it("allows AGENTE_CONTRATACAO of the department to adjust instruction data during IN_ANALYSIS", () => {
      expect(canUserModifyInstructionData(agentDeptA, processInAnalysis)).toBe(
        true,
      );
    });

    it("denies ADMIN from adjusting instruction data during IN_ANALYSIS (strictly read-only)", () => {
      expect(canUserModifyInstructionData(adminUser, processInAnalysis)).toBe(
        false,
      );
    });

    it("denies SOLICITANTE from adjusting instruction data during IN_ANALYSIS", () => {
      expect(
        canUserModifyInstructionData(requesterUser, processInAnalysis),
      ).toBe(false);
    });

    it("denies AGENTE_CONTRATACAO from another department during IN_ANALYSIS", () => {
      expect(canUserModifyInstructionData(agentDeptB, processInAnalysis)).toBe(
        false,
      );
    });
  });

  describe("canUserSelectSupplier during workflow stages", () => {
    it("allows AGENTE_CONTRATACAO of the department to select supplier during IN_ANALYSIS", () => {
      expect(canUserSelectSupplier(agentDeptA, processInAnalysis)).toBe(true);
    });

    it("locks supplier selection for ADMIN during IN_ANALYSIS (strictly read-only)", () => {
      expect(canUserSelectSupplier(adminUser, processInAnalysis)).toBe(false);
    });

    it("locks supplier selection during AWAITING_APPROVAL, APPROVED, and REJECTED", () => {
      for (const st of ["AWAITING_APPROVAL", "APPROVED", "REJECTED"]) {
        expect(
          canUserSelectSupplier(agentDeptA, {
            ...processInAnalysis,
            status: st,
          }),
        ).toBe(false);
        expect(
          canUserSelectSupplier(adminUser, {
            ...processInAnalysis,
            status: st,
          }),
        ).toBe(false);
      }
    });

    it("allows SOLICITANTE to select supplier in RETURNED_FOR_ADJUSTMENT on own process", () => {
      expect(
        canUserSelectSupplier(requesterUser, {
          status: "RETURNED_FOR_ADJUSTMENT",
          requesterId: requesterUser.id,
          departmentId: deptA,
        }),
      ).toBe(true);
    });
  });
});
