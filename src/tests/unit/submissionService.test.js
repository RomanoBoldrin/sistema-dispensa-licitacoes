import submissionService, {
  canUserSubmitProcess,
  validateProcessCompleteness,
} from "@/services/submission.service.js";

describe("submissionService (Unit Tests)", () => {
  const deptAId = "11111111-1111-4111-8111-111111111111";
  const deptBId = "22222222-2222-4222-8222-222222222222";
  const requesterId = "33333333-3333-4333-8333-333333333333";
  const supplierAId = "44444444-4444-4444-8444-444444444444";
  const supplierBId = "55555555-5555-4555-8555-555555555555";

  const adminUser = {
    id: "admin-id",
    role: "ADMIN",
    departmentId: deptAId,
  };

  const solicitanteOwner = {
    id: requesterId,
    role: "SOLICITANTE",
    departmentId: deptAId,
  };

  const solicitanteOther = {
    id: "other-solicitante-id",
    role: "SOLICITANTE",
    departmentId: deptAId,
  };

  const agenteInDept = {
    id: "agente-id",
    role: "AGENTE_CONTRATACAO",
    departmentId: deptAId,
  };

  const aprovadorUser = {
    id: "aprovador-id",
    role: "APROVADOR",
    departmentId: deptAId,
  };

  function createValidProcess() {
    return {
      id: "proc-1",
      number: 1,
      year: 2026,
      title: "Aquisição de computadores para o laboratório",
      object: "Aquisição de computadores desktop e periféricos",
      estimatedValue: 45000.0,
      status: "DRAFT",
      departmentId: deptAId,
      requesterId: requesterId,
      legalBasis: "ART_75_II",
      priceJustification:
        "O valor estimado de R$ 45.000,00 foi apurado com base em três orçamentos de fornecedores locais, sendo condizente com a média de mercado.",
      selectedSupplierId: supplierAId,
      supplierJustification:
        "A empresa Alfa Informática apresentou a proposta mais vantajosa (menor preço) e atendeu integralmente aos requisitos técnicos do TR.",
      demandDocument: {
        category: "IT_GOODS",
        detailedJustification:
          "Necessidade de renovar o laboratório de informática para aulas práticas.",
        responsibleName: "Prof. Roberto Santos",
        urgency: "HIGH",
      },
      quotations: [
        {
          id: "q-1",
          supplierId: supplierAId,
          value: 42000.0,
          supplier: {
            id: supplierAId,
            legalName: "Alfa Informática Ltda",
            cnpj: "12.345.678/0001-90",
          },
        },
        {
          id: "q-2",
          supplierId: supplierBId,
          value: 44500.0,
          supplier: {
            id: supplierBId,
            legalName: "Beta Tecnologia Eireli",
            cnpj: "98.765.432/0001-10",
          },
        },
        {
          id: "q-3",
          supplierId: "sup-3",
          value: 46000.0,
          supplier: {
            id: "sup-3",
            legalName: "Gama Suprimentos Ltda",
            cnpj: "11.222.333/0001-44",
          },
        },
      ],
      documents: [
        {
          id: "d-1",
          type: "TERMO_REFERENCIA",
          filename: "tr_computadores.pdf",
          isActive: true,
          deletedAt: null,
        },
      ],
    };
  }

  describe("canUserSubmitProcess", () => {
    const processRecord = {
      id: "p-1",
      departmentId: deptAId,
      requesterId: requesterId,
      deletedAt: null,
    };

    it("allows ADMIN unconditionally", () => {
      expect(canUserSubmitProcess(adminUser, processRecord)).toBe(true);
    });

    it("allows SOLICITANTE if they are the requester and in the same department", () => {
      expect(canUserSubmitProcess(solicitanteOwner, processRecord)).toBe(true);
    });

    it("disallows SOLICITANTE if they are not the process requester", () => {
      expect(canUserSubmitProcess(solicitanteOther, processRecord)).toBe(false);
    });

    it("allows AGENTE_CONTRATACAO in the same department", () => {
      expect(canUserSubmitProcess(agenteInDept, processRecord)).toBe(true);
    });

    it("disallows APROVADOR role from submitting processes", () => {
      expect(canUserSubmitProcess(aprovadorUser, processRecord)).toBe(false);
    });

    it("disallows submission when process is soft-deleted", () => {
      expect(
        canUserSubmitProcess(adminUser, {
          ...processRecord,
          deletedAt: new Date(),
        }),
      ).toBe(false);
    });
  });

  describe("validateProcessCompleteness", () => {
    it("returns isComplete: true and canSubmit: true for a fully instructed process", () => {
      const processRecord = createValidProcess();
      const res = validateProcessCompleteness(processRecord);

      expect(res.isComplete).toBe(true);
      expect(res.canSubmit).toBe(true);
      expect(res.errors).toHaveLength(0);
      expect(res.checklist.general.complete).toBe(true);
      expect(res.checklist.dfd.complete).toBe(true);
      expect(res.checklist.legal.complete).toBe(true);
      expect(res.checklist.quotations.complete).toBe(true);
      expect(res.checklist.priceJustification.complete).toBe(true);
      expect(res.checklist.supplierSelection.complete).toBe(true);
      expect(res.checklist.documents.complete).toBe(true);
    });

    it("blocks submission when title or object is missing", () => {
      const processRecord = createValidProcess();
      processRecord.title = "";
      processRecord.object = "";

      const res = validateProcessCompleteness(processRecord);
      expect(res.isComplete).toBe(false);
      expect(res.checklist.general.complete).toBe(false);
      expect(res.errors.some((e) => e.field === "title")).toBe(true);
      expect(res.errors.some((e) => e.field === "object")).toBe(true);
    });

    it("blocks submission when estimatedValue is zero or negative", () => {
      const processRecord = createValidProcess();
      processRecord.estimatedValue = 0;

      const res = validateProcessCompleteness(processRecord);
      expect(res.isComplete).toBe(false);
      expect(res.errors.some((e) => e.field === "estimatedValue")).toBe(true);
    });

    it("blocks submission when DFD is missing or incomplete", () => {
      const processRecord = createValidProcess();
      processRecord.demandDocument = null;

      const res = validateProcessCompleteness(processRecord);
      expect(res.isComplete).toBe(false);
      expect(res.checklist.dfd.complete).toBe(false);
      expect(res.errors.some((e) => e.field === "demandDocument")).toBe(true);
    });

    it("blocks submission when legalBasis is missing or invalid", () => {
      const processRecord = createValidProcess();
      processRecord.legalBasis = null;

      const res = validateProcessCompleteness(processRecord);
      expect(res.isComplete).toBe(false);
      expect(res.checklist.legal.complete).toBe(false);
      expect(res.errors.some((e) => e.field === "legalBasis")).toBe(true);
    });

    it("blocks submission when estimatedValue exceeds legal threshold for Art. 75, II", () => {
      const processRecord = createValidProcess();
      processRecord.legalBasis = "ART_75_II";
      processRecord.estimatedValue = 75000; // Limit is 65492.11 for 2026

      const res = validateProcessCompleteness(processRecord);
      expect(res.isComplete).toBe(false);
      expect(res.errors.some((e) => e.field === "estimatedValue")).toBe(true);
    });

    it("blocks submission when there are no quotations", () => {
      const processRecord = createValidProcess();
      processRecord.quotations = [];

      const res = validateProcessCompleteness(processRecord);
      expect(res.isComplete).toBe(false);
      expect(res.checklist.quotations.complete).toBe(false);
      expect(res.errors.some((e) => e.field === "quotations")).toBe(true);
    });

    it("emits advisory warning when quotations count is less than 3 but does not block", () => {
      const processRecord = createValidProcess();
      processRecord.quotations = processRecord.quotations.slice(0, 2);

      const res = validateProcessCompleteness(processRecord);
      expect(res.isComplete).toBe(true);
      expect(
        res.warnings.some((w) => w.code === "FEWER_THAN_THREE_QUOTATIONS"),
      ).toBe(true);
    });

    it("blocks submission when priceJustification is missing or empty", () => {
      const processRecord = createValidProcess();
      processRecord.priceJustification = "";

      const res = validateProcessCompleteness(processRecord);
      expect(res.isComplete).toBe(false);
      expect(res.checklist.priceJustification.complete).toBe(false);
      expect(res.errors.some((e) => e.field === "priceJustification")).toBe(
        true,
      );
    });

    it("blocks submission when selectedSupplierId is missing", () => {
      const processRecord = createValidProcess();
      processRecord.selectedSupplierId = null;

      const res = validateProcessCompleteness(processRecord);
      expect(res.isComplete).toBe(false);
      expect(res.checklist.supplierSelection.complete).toBe(false);
      expect(res.errors.some((e) => e.field === "selectedSupplierId")).toBe(
        true,
      );
    });

    it("blocks submission when selected supplier has no registered quotation", () => {
      const processRecord = createValidProcess();
      processRecord.selectedSupplierId = "unrelated-supplier-id";

      const res = validateProcessCompleteness(processRecord);
      expect(res.isComplete).toBe(false);
      expect(
        res.errors.some(
          (e) =>
            e.field === "selectedSupplierId" &&
            e.message.includes("não possui cotação cadastrada"),
        ),
      ).toBe(true);
    });

    it("blocks submission when supplierJustification is missing or empty", () => {
      const processRecord = createValidProcess();
      processRecord.supplierJustification = "";

      const res = validateProcessCompleteness(processRecord);
      expect(res.isComplete).toBe(false);
      expect(res.checklist.supplierSelection.complete).toBe(false);
      expect(res.errors.some((e) => e.field === "supplierJustification")).toBe(
        true,
      );
    });

    it("blocks submission when no documents are attached", () => {
      const processRecord = createValidProcess();
      processRecord.documents = [];

      const res = validateProcessCompleteness(processRecord);
      expect(res.isComplete).toBe(false);
      expect(res.checklist.documents.complete).toBe(false);
      expect(res.errors.some((e) => e.field === "documents")).toBe(true);
    });

    it("allows non-lowest quotation to be selected but emits advisory warning", () => {
      const processRecord = createValidProcess();
      // Supplier B has value 44500 (higher than supplier A 42000)
      processRecord.selectedSupplierId = supplierBId;

      const res = validateProcessCompleteness(processRecord);
      expect(res.isComplete).toBe(true);
      expect(res.canSubmit).toBe(true);
      expect(res.warnings.some((w) => w.code === "NOT_LOWEST_PRICE")).toBe(
        true,
      );
    });
  });
});
