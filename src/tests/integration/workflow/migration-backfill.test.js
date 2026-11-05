import password from "@/infra/password.js";
import { prisma } from "@/infra/prisma.cjs";
import orchestrator from "@/tests/orchestrator/orchestrator.mjs";

describe("Migration & Database Integrity Constraints (Integration Tests)", () => {
  let department;
  let userRequester;
  let userAgent;
  let userApprover;
  let sampleProcess;

  beforeAll(async () => {
    await orchestrator.clearDatabase();

    const passwordHash = await password.hash("DbTest123!");

    department = await prisma.department.create({
      data: { name: "Secretaria de Administração e Finanças" },
    });

    userRequester = await prisma.user.create({
      data: {
        name: "Renato Requester",
        email: "renato.db@sisd.com",
        passwordHash,
        role: "SOLICITANTE",
        departmentId: department.id,
      },
    });

    userAgent = await prisma.user.create({
      data: {
        name: "Amanda Agent",
        email: "amanda.db@sisd.com",
        passwordHash,
        role: "AGENTE_CONTRATACAO",
        departmentId: department.id,
      },
    });

    userApprover = await prisma.user.create({
      data: {
        name: "Alberto Approver",
        email: "alberto.db@sisd.com",
        passwordHash,
        role: "APROVADOR",
        departmentId: department.id,
      },
    });

    sampleProcess = await prisma.process.create({
      data: {
        number: 101,
        year: 2026,
        title: "Processo Teste de Integridade DB",
        object: "Serviços de Manutenção Predial",
        status: "DRAFT",
        departmentId: department.id,
        requesterId: userRequester.id,
      },
    });
  });

  describe("Database Constraints: chk_approval_stage_role", () => {
    it("allows valid stage and role combinations", async () => {
      // 1. ANALYSIS with AGENTE_CONTRATACAO
      const task1 = await prisma.approval.create({
        data: {
          processId: sampleProcess.id,
          stage: "ANALYSIS",
          assignedRole: "AGENTE_CONTRATACAO",
          cycle: 1,
        },
      });
      expect(task1.id).toBeDefined();

      // Clean up for next test
      await prisma.approval.delete({ where: { id: task1.id } });

      // 2. APPROVAL with APROVADOR
      const task2 = await prisma.approval.create({
        data: {
          processId: sampleProcess.id,
          stage: "APPROVAL",
          assignedRole: "APROVADOR",
          cycle: 1,
        },
      });
      expect(task2.id).toBeDefined();

      await prisma.approval.delete({ where: { id: task2.id } });
    });

    it("rejects invalid stage-role pairing: ANALYSIS with APROVADOR", async () => {
      let error;
      try {
        await prisma.approval.create({
          data: {
            processId: sampleProcess.id,
            stage: "ANALYSIS",
            assignedRole: "APROVADOR", // Invalid!
            cycle: 1,
          },
        });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error.message).toContain("chk_approval_stage_role");
    });

    it("rejects invalid stage-role pairing: APPROVAL with AGENTE_CONTRATACAO", async () => {
      let error;
      try {
        await prisma.approval.create({
          data: {
            processId: sampleProcess.id,
            stage: "APPROVAL",
            assignedRole: "AGENTE_CONTRATACAO", // Invalid!
            cycle: 1,
          },
        });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error.message).toContain("chk_approval_stage_role");
    });
  });

  describe("Database Constraints: chk_approval_decision_consistency", () => {
    it("allows consistent pending state: decision = null, userId = null, decidedAt = null", async () => {
      const pendingTask = await prisma.approval.create({
        data: {
          processId: sampleProcess.id,
          stage: "ANALYSIS",
          assignedRole: "AGENTE_CONTRATACAO",
          cycle: 1,
          decision: null,
          userId: null,
          decidedAt: null,
        },
      });
      expect(pendingTask.id).toBeDefined();
      await prisma.approval.delete({ where: { id: pendingTask.id } });
    });

    it("allows consistent completed state: decision != null, userId != null, decidedAt != null", async () => {
      const completedTask = await prisma.approval.create({
        data: {
          processId: sampleProcess.id,
          stage: "ANALYSIS",
          assignedRole: "AGENTE_CONTRATACAO",
          cycle: 1,
          decision: "APPROVED",
          userId: userAgent.id,
          decidedAt: new Date(),
          comment: "Parecer consistente.",
        },
      });
      expect(completedTask.id).toBeDefined();
      await prisma.approval.delete({ where: { id: completedTask.id } });
    });

    it("rejects inconsistent state: decision is set but userId is null", async () => {
      let error;
      try {
        await prisma.approval.create({
          data: {
            processId: sampleProcess.id,
            stage: "ANALYSIS",
            assignedRole: "AGENTE_CONTRATACAO",
            cycle: 1,
            decision: "APPROVED",
            userId: null, // Inconsistent!
            decidedAt: new Date(),
          },
        });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error.message).toContain("chk_approval_decision_consistency");
    });

    it("rejects inconsistent state: decision is null but decidedAt is set", async () => {
      let error;
      try {
        await prisma.approval.create({
          data: {
            processId: sampleProcess.id,
            stage: "ANALYSIS",
            assignedRole: "AGENTE_CONTRATACAO",
            cycle: 1,
            decision: null, // Inconsistent!
            userId: userAgent.id,
            decidedAt: new Date(),
          },
        });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error.message).toContain("chk_approval_decision_consistency");
    });
  });

  describe("Database Constraints: idx_approval_pending_unique", () => {
    it("enforces partial unique index: rejects duplicate pending tasks for same process, cycle, and stage", async () => {
      // First pending task succeeds
      const task1 = await prisma.approval.create({
        data: {
          processId: sampleProcess.id,
          stage: "ANALYSIS",
          assignedRole: "AGENTE_CONTRATACAO",
          cycle: 1,
          decision: null,
        },
      });
      expect(task1.id).toBeDefined();

      // Second pending task for the same process, cycle, and stage must fail with unique collision
      let error;
      try {
        await prisma.approval.create({
          data: {
            processId: sampleProcess.id,
            stage: "ANALYSIS",
            assignedRole: "AGENTE_CONTRATACAO",
            cycle: 1,
            decision: null,
          },
        });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
      expect(error.message).toMatch(
        /Unique constraint failed|idx_approval_pending_unique|duplicate key/i,
      );

      // Clean up
      await prisma.approval.delete({ where: { id: task1.id } });
    });

    it("allows multiple completed tasks across different stages or cycles", async () => {
      const taskStage1 = await prisma.approval.create({
        data: {
          processId: sampleProcess.id,
          stage: "ANALYSIS",
          assignedRole: "AGENTE_CONTRATACAO",
          cycle: 1,
          decision: "APPROVED",
          userId: userAgent.id,
          decidedAt: new Date(),
        },
      });

      const taskStage2 = await prisma.approval.create({
        data: {
          processId: sampleProcess.id,
          stage: "APPROVAL",
          assignedRole: "APROVADOR",
          cycle: 1,
          decision: "APPROVED",
          userId: userApprover.id,
          decidedAt: new Date(),
        },
      });

      expect(taskStage1.id).toBeDefined();
      expect(taskStage2.id).toBeDefined();

      await prisma.approval.deleteMany({
        where: { id: { in: [taskStage1.id, taskStage2.id] } },
      });
    });
  });
});
