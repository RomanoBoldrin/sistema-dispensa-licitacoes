import {
  STATUS_LABELS,
  STATUS_BADGE_STYLES,
  ROLE_LABELS,
  LIFECYCLE_STAGES,
  formatCurrency,
  formatDate,
  formatProcessNumber,
} from "@/components/dashboard/dashboardUtils";

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
  });
});
