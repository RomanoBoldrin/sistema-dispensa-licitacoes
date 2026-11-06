import processService from "@/services/process.service.js";
import { prisma } from "src/infra/prisma.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "src/infra/errors.js";

jest.mock("src/infra/prisma.js", () => ({
  prisma: {
    department: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    process: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe("processService", () => {
  const deptAId = "11111111-1111-4111-8111-111111111111";
  const deptBId = "22222222-2222-4222-8222-222222222222";
  const processId = "33333333-3333-4333-8333-333333333333";

  const solicitanteUser = {
    id: "44444444-4444-4444-8444-444444444444",
    name: "Ana Solicitante",
    email: "ana@univesp.br",
    role: "SOLICITANTE",
    departmentId: deptAId,
  };

  const adminUser = {
    id: "55555555-5555-4555-8555-555555555555",
    name: "Carlos Admin",
    email: "admin@univesp.br",
    role: "ADMIN",
    departmentId: deptAId,
  };

  const aprovadorUser = {
    id: "66666666-6666-4666-8666-666666666666",
    name: "Beatriz Aprovadora",
    email: "aprovadora@univesp.br",
    role: "APROVADOR",
    departmentId: deptBId,
  };

  const autoridadeUser = {
    id: "77777777-7777-4777-8777-777777777777",
    name: "Dra. Patrícia Autoridade",
    email: "patricia@univesp.br",
    role: "AUTORIDADE_COMPETENTE",
    departmentId: deptAId,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createProcess", () => {
    const validPayload = {
      title: "Aquisição de Monitores 27 polegadas",
      object: "Aquisição de 15 monitores IPS Full HD para laboratórios.",
      description: "Demanda para renovação de equipamentos.",
      legalBasis: "Art. 75, II da Lei 14.133/2021",
      estimatedValue: 22500.5,
      category: "IT_GOODS",
      urgency: "HIGH",
      responsibleName: "Ana Solicitante",
      detailedJustification:
        "Equipamentos atuais fora de garantia e apresentando falhas recorrentes nas aulas práticas.",
    };

    test("blocks APROVADOR role from creating a process", async () => {
      await expect(
        processService.createProcess(validPayload, aprovadorUser),
      ).rejects.toThrow(ForbiddenError);
    });

    test("blocks AUTORIDADE_COMPETENTE role from creating a process", async () => {
      await expect(
        processService.createProcess(validPayload, autoridadeUser),
      ).rejects.toThrow(ForbiddenError);
    });

    test("blocks SOLICITANTE from creating a process for another department", async () => {
      await expect(
        processService.createProcess(
          {
            ...validPayload,
            departmentId: deptBId,
          },
          solicitanteUser,
        ),
      ).rejects.toThrow(ForbiddenError);
    });

    test("rejects negative estimatedValue with ValidationError", async () => {
      await expect(
        processService.createProcess(
          {
            ...validPayload,
            estimatedValue: -50,
          },
          solicitanteUser,
        ),
      ).rejects.toThrow(ValidationError);
    });

    test("creates process with advisory lock, sequential number, DFD, and audit logs", async () => {
      prisma.department.findUnique.mockResolvedValue({
        id: deptAId,
        name: "Departamento de TI",
      });

      const now = new Date("2026-11-04T12:00:00.000Z");
      const mockTx = {
        $executeRaw: jest.fn().mockResolvedValue(1),
        process: {
          findFirst: jest.fn().mockResolvedValue({ number: 4 }),
          create: jest.fn().mockResolvedValue({
            id: processId,
            number: 5,
            year: now.getFullYear(),
            title: validPayload.title,
            object: validPayload.object,
            description: validPayload.description,
            legalBasis: validPayload.legalBasis,
            estimatedValue: 22500.5,
            status: "DRAFT",
            departmentId: deptAId,
            department: { id: deptAId, name: "Departamento de TI" },
            requesterId: solicitanteUser.id,
            requester: {
              id: solicitanteUser.id,
              name: solicitanteUser.name,
              email: solicitanteUser.email,
              role: solicitanteUser.role,
            },
            demandDocument: {
              id: "77777777-7777-4777-8777-777777777777",
              processId,
              category: "IT_GOODS",
              urgencyLevel: "HIGH",
              detailedJustification: validPayload.detailedJustification,
              quantitySummary: null,
              technicalNotes: null,
              budgetCode: null,
              deliveryLocation: null,
              desiredDeadline: null,
              responsibleName: solicitanteUser.name,
              responsibleEmail: solicitanteUser.email,
              createdAt: now,
              updatedAt: now,
            },
            createdAt: now,
            updatedAt: now,
          }),
        },
        auditLog: {
          create: jest.fn().mockResolvedValue({}),
        },
      };

      prisma.$transaction.mockImplementation(async (cb) => cb(mockTx));

      const created = await processService.createProcess(
        validPayload,
        solicitanteUser,
      );

      expect(mockTx.$executeRaw).toHaveBeenCalledTimes(1);
      expect(mockTx.process.findFirst).toHaveBeenCalledTimes(1);
      expect(mockTx.auditLog.create).toHaveBeenCalledTimes(2);
      expect(created.number).toBe(5);
      expect(created.status).toBe("DRAFT");
      expect(created.estimatedValue).toBe(22500.5);
      expect(created.demandDocument.category).toBe("IT_GOODS");
    });
  });

  describe("listProcesses", () => {
    test("forbids SOLICITANTE from filtering by another department", async () => {
      await expect(
        processService.listProcesses(
          {
            departmentId: deptBId,
          },
          solicitanteUser,
        ),
      ).rejects.toThrow(ForbiddenError);
    });

    test("rejects invalid status filter with ValidationError", async () => {
      await expect(
        processService.listProcesses(
          {
            status: "INVALID_STATUS",
          },
          solicitanteUser,
        ),
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("getProcessById", () => {
    test("rejects malformed UUID with ValidationError", async () => {
      await expect(
        processService.getProcessById("not-a-uuid", solicitanteUser),
      ).rejects.toThrow(ValidationError);
    });

    test("throws NotFoundError when process does not exist", async () => {
      prisma.process.findFirst.mockResolvedValue(null);
      await expect(
        processService.getProcessById(processId, solicitanteUser),
      ).rejects.toThrow(NotFoundError);
    });

    test("throws ForbiddenError when SOLICITANTE accesses another requester's process", async () => {
      prisma.process.findFirst.mockResolvedValue({
        id: processId,
        status: "DRAFT",
        departmentId: deptAId,
        requesterId: adminUser.id,
      });

      await expect(
        processService.getProcessById(processId, solicitanteUser),
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe("updateProcess", () => {
    test("rejects attempts to modify protected fields (status, number, year, requesterId, departmentId)", async () => {
      for (const protectedField of [
        "status",
        "number",
        "year",
        "requesterId",
        "departmentId",
      ]) {
        await expect(
          processService.updateProcess(
            processId,
            {
              [protectedField]: "value",
            },
            solicitanteUser,
          ),
        ).rejects.toThrow(ValidationError);
      }
    });

    test("rejects editing when process status is not DRAFT with ConflictError (409)", async () => {
      prisma.process.findFirst.mockResolvedValue({
        id: processId,
        number: 1,
        year: 2026,
        title: "Processo Enviado",
        object: "Objeto válido",
        description: null,
        legalBasis: null,
        estimatedValue: null,
        status: "IN_ANALYSIS",
        departmentId: deptAId,
        requesterId: solicitanteUser.id,
        demandDocument: null,
      });

      await expect(
        processService.updateProcess(
          processId,
          {
            title: "Novo Título",
          },
          solicitanteUser,
        ),
      ).rejects.toThrow(ConflictError);
    });
  });
});
