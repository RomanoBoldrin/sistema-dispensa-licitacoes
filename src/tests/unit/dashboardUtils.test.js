import {
  STATUS_LABELS,
  STATUS_BADGE_STYLES,
  ROLE_LABELS,
  CATEGORY_LABELS,
  URGENCY_LABELS,
  URGENCY_BADGE_STYLES,
  AUDIT_ACTION_LABELS,
  LIFECYCLE_STAGES,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatProcessNumber,
  formatPhone,
  normalizePhone,
} from "@/components/dashboard/dashboardUtils";
import processService from "@/services/process.service.js";

describe("Dashboard Utilities", () => {
  describe("formatCurrency", () => {
    test("formats valid numeric value to Brazilian Real (BRL)", () => {
      const result = formatCurrency(45200);
      expect(result).toMatch(/R\$\s?45\.200,00/);
    });

    test("formats 0 to R$ 0,00", () => {
      const result = formatCurrency(0);
      expect(result).toMatch(/R\$\s?0,00/);
    });

    test("handles null or undefined gracefully", () => {
      expect(formatCurrency(null)).toBe("—");
      expect(formatCurrency(undefined)).toBe("—");
    });
  });

  describe("formatDate", () => {
    test("formats ISO date string to pt-BR format (DD/MM/YYYY)", () => {
      const result = formatDate("2026-10-12T15:30:00.000Z");
      expect(result).toMatch(/\d{2}\/\d{2}\/2026/);
    });

    test("handles invalid date strings gracefully", () => {
      expect(formatDate(null)).toBe("—");
      expect(formatDate("invalid-date")).toBe("—");
    });
  });

  describe("formatProcessNumber", () => {
    test("formats process number and year with leading zeroes", () => {
      expect(formatProcessNumber(1, 2026)).toBe("DP-001/2026");
      expect(formatProcessNumber(42, 2026)).toBe("DP-042/2026");
      expect(formatProcessNumber(100, 2026)).toBe("DP-100/2026");
    });

    test("handles missing values", () => {
      expect(formatProcessNumber(null, null)).toBe("DP-—/—");
    });
  });

  describe("formatPhone and normalizePhone", () => {
    test("normalizes Brazilian phone numbers by removing non-digits and leading +55", () => {
      expect(normalizePhone("(11) 98765-4321")).toBe("11987654321");
      expect(normalizePhone("+55 (11) 98765-4321")).toBe("11987654321");
      expect(normalizePhone("+55 11 3456-7890")).toBe("1134567890");
      expect(normalizePhone(null)).toBe("");
      expect(normalizePhone(undefined)).toBe("");
    });

    test("formats 11-digit mobile phones to (XX) XXXXX-XXXX", () => {
      expect(formatPhone("11987654321")).toBe("(11) 98765-4321");
      expect(formatPhone("(11) 98765-4321")).toBe("(11) 98765-4321");
    });

    test("formats 10-digit landline phones to (XX) XXXX-XXXX", () => {
      expect(formatPhone("1134567890")).toBe("(11) 3456-7890");
    });

    test("formats partial inputs progressively while typing", () => {
      expect(formatPhone("11")).toBe("(11");
      expect(formatPhone("119")).toBe("(11) 9");
      expect(formatPhone("119876")).toBe("(11) 9876");
      expect(formatPhone("1198765")).toBe("(11) 9876-5");
    });

    test("handles empty and null phone gracefully", () => {
      expect(formatPhone("")).toBe("");
      expect(formatPhone(null)).toBe("");
      expect(formatPhone(undefined)).toBe("");
    });
  });

  describe("Domain Enums and Constants", () => {
    test("contains all required ProcessStatus labels matching prisma schema", () => {
      const expectedStatuses = [
        "DRAFT",
        "IN_ANALYSIS",
        "PRICE_RESEARCH",
        "SUPPLIER_SELECTED",
        "AWAITING_APPROVAL",
        "REJECTED",
        "APPROVED",
        "COMPLETED",
      ];

      expectedStatuses.forEach((status) => {
        expect(STATUS_LABELS[status]).toBeDefined();
        expect(typeof STATUS_LABELS[status]).toBe("string");
        expect(STATUS_BADGE_STYLES[status]).toBeDefined();
      });
    });

    test("contains all UserRole labels", () => {
      const expectedRoles = [
        "ADMIN",
        "SOLICITANTE",
        "AGENTE_CONTRATACAO",
        "APROVADOR",
      ];

      expectedRoles.forEach((role) => {
        expect(ROLE_LABELS[role]).toBeDefined();
        expect(typeof ROLE_LABELS[role]).toBe("string");
      });
    });

    test("defines the 8 procurement lifecycle stages in sequence", () => {
      expect(LIFECYCLE_STAGES).toHaveLength(8);
      LIFECYCLE_STAGES.forEach((stage, index) => {
        expect(stage.step).toBe(index + 1);
        expect(stage.title).toBeDefined();
        expect(stage.description).toBeDefined();
        expect(stage.icon).toBeDefined();
      });
    });

    test("contains DFD category, urgency, and audit action labels", () => {
      expect(CATEGORY_LABELS.IT_GOODS).toBeDefined();
      expect(CATEGORY_LABELS.COMMON_GOODS).toBeDefined();
      expect(CATEGORY_LABELS.GENERAL_SERVICES).toBeDefined();
      expect(CATEGORY_LABELS.ENGINEERING_WORKS).toBeDefined();
      expect(CATEGORY_LABELS.HEALTH_SUPPLIES).toBeDefined();
      expect(CATEGORY_LABELS.OTHER).toBeDefined();

      expect(URGENCY_LABELS.LOW).toBeDefined();
      expect(URGENCY_LABELS.MEDIUM).toBeDefined();
      expect(URGENCY_LABELS.HIGH).toBeDefined();
      expect(URGENCY_LABELS.CRITICAL).toBeDefined();
      expect(URGENCY_BADGE_STYLES.HIGH).toBeDefined();

      expect(AUDIT_ACTION_LABELS.PROCESS_CREATED).toBeDefined();
      expect(AUDIT_ACTION_LABELS.PROCESS_UPDATED).toBeDefined();
      expect(AUDIT_ACTION_LABELS.DEMAND_DOCUMENT_CREATED).toBeDefined();
      expect(AUDIT_ACTION_LABELS.DEMAND_DOCUMENT_UPDATED).toBeDefined();
    });
  });

  describe("formatDateTime", () => {
    test("formats ISO date-time string to pt-BR format", () => {
      const result = formatDateTime("2026-10-12T15:30:00.000Z");
      expect(result).toMatch(/\d{2}\/\d{2}\/2026/);
    });

    test("handles invalid values gracefully", () => {
      expect(formatDateTime(null)).toBe("—");
      expect(formatDateTime("not-a-date")).toBe("—");
    });
  });

  describe("processService authorization helpers", () => {
    const sampleProcess = {
      id: "11111111-1111-4111-8111-111111111111",
      status: "DRAFT",
      requesterId: "22222222-2222-4222-8222-222222222222",
      departmentId: "33333333-3333-4333-8333-333333333333",
    };

    test("isValidUuid validates UUID v1-v5 format", () => {
      expect(
        processService.isValidUuid("11111111-1111-4111-8111-111111111111"),
      ).toBe(true);
      expect(processService.isValidUuid("invalid-uuid")).toBe(false);
    });

    test("canUserAccessProcess enforces SOLICITANTE scoping and allows staff roles", () => {
      expect(
        processService.canUserAccessProcess(
          {
            id: sampleProcess.requesterId,
            role: "SOLICITANTE",
            departmentId: sampleProcess.departmentId,
          },
          sampleProcess,
        ),
      ).toBe(true);

      expect(
        processService.canUserAccessProcess(
          {
            id: "other-user",
            role: "SOLICITANTE",
            departmentId: sampleProcess.departmentId,
          },
          sampleProcess,
        ),
      ).toBe(false);

      expect(
        processService.canUserAccessProcess(
          {
            id: "aprovador-id",
            role: "APROVADOR",
            departmentId: "other-dept",
          },
          sampleProcess,
        ),
      ).toBe(true);
    });

    test("canUserEditProcess enforces role, ownership, and status", () => {
      expect(
        processService.canUserEditProcess(
          {
            id: sampleProcess.requesterId,
            role: "SOLICITANTE",
            departmentId: sampleProcess.departmentId,
          },
          sampleProcess,
        ),
      ).toBe(true);

      expect(
        processService.canUserEditProcess(
          {
            id: "other-user",
            role: "SOLICITANTE",
            departmentId: sampleProcess.departmentId,
          },
          sampleProcess,
        ),
      ).toBe(false);

      expect(
        processService.canUserEditProcess(
          {
            id: "aprovador-id",
            role: "APROVADOR",
            departmentId: sampleProcess.departmentId,
          },
          sampleProcess,
        ),
      ).toBe(false);

      expect(
        processService.canUserEditProcess(
          {
            id: "admin-id",
            role: "ADMIN",
            departmentId: "other-dept",
          },
          sampleProcess,
        ),
      ).toBe(true);
    });
  });
});
