import password from "@/infra/password.js";
import { prisma } from "@/infra/prisma.cjs";
import orchestrator from "@/tests/orchestrator/orchestrator.mjs";
import {
  DEMO_USERS,
  seedDemoUsers,
} from "../../../../scripts/seed-demo-users.mjs";
import {
  DEMO_SCENARIOS,
  seedDemoScenarios,
} from "../../../../scripts/seed-demo-scenarios.mjs";

describe("Development Seeding & Workflow Scenarios (Integration Tests)", () => {
  jest.setTimeout(60000);

  beforeAll(async () => {
    process.env.ENABLE_DEMO_SEED = "true";
    await orchestrator.clearDatabase();
  }, 60000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("seedDemoUsers()", () => {
    it("provisions the expected departments and demo users", async () => {
      const result = await seedDemoUsers();
      expect(result.created.length).toBe(9);
      expect(result.conflicts.length).toBe(0);

      // Verify departments in database
      const adminDept = await prisma.department.findUnique({
        where: { name: "Secretaria de Administração" },
      });
      const healthDept = await prisma.department.findUnique({
        where: { name: "Secretaria de Saúde" },
      });
      expect(adminDept).toBeDefined();
      expect(healthDept).toBeDefined();

      // Verify all demo users exist with correct roles and departments
      for (const uDef of DEMO_USERS) {
        const dbUser = await prisma.user.findUnique({
          where: { email: uDef.email },
          include: { department: true },
        });

        expect(dbUser).toBeDefined();
        expect(dbUser.role).toBe(uDef.role);
        expect(dbUser.isActive).toBe(true);

        if (uDef.departmentName) {
          expect(dbUser.department?.name).toBe(uDef.departmentName);
        } else {
          expect(dbUser.departmentId).toBeNull();
        }
      }
    });

    it("is idempotent: subsequent execution preserves accounts and passwords", async () => {
      // Modify a user's password to a custom hash
      const targetUser = await prisma.user.findUnique({
        where: { email: "solicitante@sisd.local" },
      });
      const customHash = await password.hash("CustomPassword999!");
      await prisma.user.update({
        where: { id: targetUser.id },
        data: { passwordHash: customHash },
      });

      // Re-run seedDemoUsers
      const reResult = await seedDemoUsers();
      expect(reResult.created.length).toBe(0);
      expect(reResult.preserved.length).toBe(DEMO_USERS.length);

      // Verify password hash was NOT overwritten
      const checkUser = await prisma.user.findUnique({
        where: { email: "solicitante@sisd.local" },
      });
      expect(checkUser.passwordHash).toBe(customHash);
    });

    it("safely reports conflict without altering an account if an unexpected role exists", async () => {
      // Create a dummy conflicting user
      const conflictingEmail = "conflict.test@sisd.local";
      const pwHash = await password.hash("Test1234!");
      await prisma.user.create({
        data: {
          name: "Conflicting User",
          email: conflictingEmail,
          passwordHash: pwHash,
          role: "ADMIN",
        },
      });

      // Temporarily mock DEMO_USERS to include this email with SOLICITANTE
      DEMO_USERS.push({
        name: "Conflicting Demo Solicitante",
        email: conflictingEmail,
        role: "SOLICITANTE",
        departmentName: "Secretaria de Administração",
      });

      try {
        const res = await seedDemoUsers();
        expect(res.conflicts.length).toBe(1);
        expect(res.conflicts[0].email).toBe(conflictingEmail);

        // Verify account role was NOT changed
        const dbConf = await prisma.user.findUnique({
          where: { email: conflictingEmail },
        });
        expect(dbConf.role).toBe("ADMIN");
      } finally {
        DEMO_USERS.pop();
        await prisma.user.delete({ where: { email: conflictingEmail } });
      }
    });
  });

  describe("seedDemoScenarios()", () => {
    it("provisions all 6 representative Phase 4 workflow scenarios", async () => {
      const res = await seedDemoScenarios();
      expect(res.failed.length).toBe(0);
      expect(res.created.length).toBe(6);

      const adminDept = await prisma.department.findUnique({
        where: { name: "Secretaria de Administração" },
      });

      // 1. Verify Draft scenario
      const draftProc = await prisma.process.findFirst({
        where: { title: DEMO_SCENARIOS[0].title, departmentId: adminDept.id },
        include: { approvals: true, demandDocument: true },
      });
      expect(draftProc).toBeDefined();
      expect(draftProc.status).toBe("DRAFT");
      expect(draftProc.approvals.length).toBe(0);
      expect(draftProc.demandDocument).toBeDefined();

      // 2. Verify Analysis scenario
      const analysisProc = await prisma.process.findFirst({
        where: { title: DEMO_SCENARIOS[1].title, departmentId: adminDept.id },
        include: { approvals: true, quotations: true, selectedSupplier: true },
      });
      expect(analysisProc).toBeDefined();
      expect(analysisProc.status).toBe("IN_ANALYSIS");
      expect(analysisProc.quotations.length).toBe(3);
      expect(analysisProc.selectedSupplier).toBeDefined();
      expect(analysisProc.approvals.length).toBe(1);
      expect(analysisProc.approvals[0].stage).toBe("ANALYSIS");
      expect(analysisProc.approvals[0].assignedRole).toBe("AGENTE_CONTRATACAO");
      expect(analysisProc.approvals[0].decision).toBeNull(); // Pending

      // 3. Verify Approval scenario
      const approvalProc = await prisma.process.findFirst({
        where: { title: DEMO_SCENARIOS[2].title, departmentId: adminDept.id },
        include: { approvals: { orderBy: { createdAt: "asc" } } },
      });
      expect(approvalProc).toBeDefined();
      expect(approvalProc.status).toBe("AWAITING_APPROVAL");
      expect(approvalProc.approvals.length).toBe(2);
      expect(approvalProc.approvals[0].stage).toBe("ANALYSIS");
      expect(approvalProc.approvals[0].decision).toBe("APPROVED");
      expect(approvalProc.approvals[1].stage).toBe("APPROVAL");
      expect(approvalProc.approvals[1].assignedRole).toBe("APROVADOR");
      expect(approvalProc.approvals[1].decision).toBeNull(); // Pending

      // 4. Verify Returned for Adjustment scenario
      const returnedProc = await prisma.process.findFirst({
        where: { title: DEMO_SCENARIOS[3].title, departmentId: adminDept.id },
        include: { approvals: true },
      });
      expect(returnedProc).toBeDefined();
      expect(returnedProc.status).toBe("RETURNED_FOR_ADJUSTMENT");
      expect(returnedProc.approvals.length).toBe(1);
      expect(returnedProc.approvals[0].stage).toBe("ANALYSIS");
      expect(returnedProc.approvals[0].decision).toBe("ADJUSTMENT_REQUESTED");
      expect(returnedProc.approvals[0].comment).toContain(
        "Necessário retificar",
      );

      // 5. Verify Approved scenario
      const approvedProc = await prisma.process.findFirst({
        where: { title: DEMO_SCENARIOS[4].title, departmentId: adminDept.id },
        include: { approvals: { orderBy: { createdAt: "asc" } } },
      });
      expect(approvedProc).toBeDefined();
      expect(approvedProc.status).toBe("APPROVED");
      expect(approvedProc.approvals.length).toBe(2);
      expect(approvedProc.approvals[0].stage).toBe("ANALYSIS");
      expect(approvedProc.approvals[0].decision).toBe("APPROVED");
      expect(approvedProc.approvals[1].stage).toBe("APPROVAL");
      expect(approvedProc.approvals[1].decision).toBe("APPROVED");

      // 6. Verify Rejected scenario
      const rejectedProc = await prisma.process.findFirst({
        where: { title: DEMO_SCENARIOS[5].title, departmentId: adminDept.id },
        include: { approvals: { orderBy: { createdAt: "asc" } } },
      });
      expect(rejectedProc).toBeDefined();
      expect(rejectedProc.status).toBe("REJECTED");
      expect(rejectedProc.approvals.length).toBe(2);
      expect(rejectedProc.approvals[0].stage).toBe("ANALYSIS");
      expect(rejectedProc.approvals[0].decision).toBe("APPROVED");
      expect(rejectedProc.approvals[1].stage).toBe("APPROVAL");
      expect(rejectedProc.approvals[1].decision).toBe("REJECTED");
      expect(rejectedProc.approvals[1].comment).toContain(
        "Rejeito formalmente",
      );
    });

    it("is idempotent: subsequent execution does not duplicate scenarios", async () => {
      const reResult = await seedDemoScenarios();
      expect(reResult.created.length).toBe(0);
      expect(reResult.preserved.length).toBe(6);
      expect(reResult.failed.length).toBe(0);

      // Verify total processes count in Secretaria de Administração is exactly 6
      const adminDept = await prisma.department.findUnique({
        where: { name: "Secretaria de Administração" },
      });
      const count = await prisma.process.count({
        where: { departmentId: adminDept.id, deletedAt: null },
      });
      expect(count).toBe(6);
    });
  });
});
