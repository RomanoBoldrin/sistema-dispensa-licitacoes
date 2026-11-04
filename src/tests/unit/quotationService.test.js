import { Prisma } from "@prisma/client";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/infra/errors.js";
import quotationService, {
  buildComparativePriceMap,
  canUserManageQuotations,
} from "@/services/quotation.service.js";

describe("quotationService", () => {
  const adminUser = {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Admin User",
    role: "ADMIN",
  };

  const agenteUser = {
    id: "00000000-0000-0000-0000-000000000002",
    name: "Agente User",
    role: "AGENTE_CONTRATACAO",
    departmentId: "11111111-1111-1111-1111-111111111111",
  };

  const solicitanteUser = {
    id: "00000000-0000-0000-0000-000000000003",
    name: "Solicitante User",
    role: "SOLICITANTE",
    departmentId: "11111111-1111-1111-1111-111111111111",
  };

  describe("canUserManageQuotations", () => {
    it("allows ADMIN on any unlocked process", () => {
      const process = {
        status: "PRICE_RESEARCH",
        departmentId: "22222222-2222-2222-2222-222222222222",
      };
      expect(canUserManageQuotations(adminUser, process)).toBe(true);
    });

    it("allows AGENTE_CONTRATACAO in the same department", () => {
      const process = {
        status: "PRICE_RESEARCH",
        departmentId: "11111111-1111-1111-1111-111111111111",
      };
      expect(canUserManageQuotations(agenteUser, process)).toBe(true);
    });

    it("disallows AGENTE_CONTRATACAO in a different department", () => {
      const process = {
        status: "PRICE_RESEARCH",
        departmentId: "22222222-2222-2222-2222-222222222222",
        requesterId: "other-id",
      };
      expect(canUserManageQuotations(agenteUser, process)).toBe(false);
    });

    it("allows SOLICITANTE only for own process in DRAFT status", () => {
      const draftProcess = {
        status: "DRAFT",
        departmentId: "11111111-1111-1111-1111-111111111111",
        requesterId: solicitanteUser.id,
      };
      expect(canUserManageQuotations(solicitanteUser, draftProcess)).toBe(true);

      const researchProcess = {
        status: "PRICE_RESEARCH",
        departmentId: "11111111-1111-1111-1111-111111111111",
        requesterId: solicitanteUser.id,
      };
      expect(canUserManageQuotations(solicitanteUser, researchProcess)).toBe(
        false,
      );
    });

    it("locks quotations when process is in AWAITING_APPROVAL, APPROVED, or COMPLETED", () => {
      expect(
        canUserManageQuotations(adminUser, { status: "AWAITING_APPROVAL" }),
      ).toBe(false);
      expect(canUserManageQuotations(adminUser, { status: "APPROVED" })).toBe(
        false,
      );
      expect(canUserManageQuotations(adminUser, { status: "COMPLETED" })).toBe(
        false,
      );
      expect(canUserManageQuotations(adminUser, { status: "REJECTED" })).toBe(
        false,
      );
    });
  });

  describe("buildComparativePriceMap", () => {
    it("handles empty quotations list correctly", () => {
      const map = buildComparativePriceMap([]);
      expect(map.totalQuotations).toBe(0);
      expect(map.hasQuotations).toBe(false);
      expect(map.lowestValue).toBeNull();
      expect(map.averageValue).toBeNull();
      expect(map.lowestQuotationIds).toEqual([]);
      expect(map.items).toEqual([]);
    });

    it("handles a single quotation", () => {
      const quotations = [
        {
          id: "q-1",
          processId: "p-1",
          supplierId: "s-1",
          value: new Prisma.Decimal("1500.50"),
          description: "Proposta inicial",
          quotedAt: new Date("2026-10-01"),
          supplier: {
            id: "s-1",
            legalName: "Fornecedor Alpha",
            cnpj: "00000000000191",
          },
        },
      ];

      const map = buildComparativePriceMap(quotations);
      expect(map.totalQuotations).toBe(1);
      expect(map.hasQuotations).toBe(true);
      expect(map.lowestValue).toBe("1500.50");
      expect(map.averageValue).toBe("1500.50");
      expect(map.lowestQuotationIds).toEqual(["q-1"]);
      expect(map.items[0].isLowest).toBe(true);
      expect(map.items[0].varianceFromLowestPercent).toBe(0);
      expect(map.items[0].differenceFromLowest).toBe("0.00");
    });

    it("identifies lowest quotation among multiple and calculates average and variance", () => {
      const quotations = [
        {
          id: "q-1",
          value: new Prisma.Decimal("1000.00"),
          supplier: { legalName: "Fornecedor Barato" },
        },
        {
          id: "q-2",
          value: new Prisma.Decimal("1200.00"),
          supplier: { legalName: "Fornecedor Médio" },
        },
        {
          id: "q-3",
          value: new Prisma.Decimal("1500.00"),
          supplier: { legalName: "Fornecedor Caro" },
        },
      ];

      const map = buildComparativePriceMap(quotations);
      expect(map.totalQuotations).toBe(3);
      expect(map.lowestValue).toBe("1000.00");
      // Average: (1000 + 1200 + 1500) / 3 = 3700 / 3 = 1233.33
      expect(map.averageValue).toBe("1233.33");
      expect(map.lowestQuotationIds).toEqual(["q-1"]);

      const item1 = map.items.find((it) => it.id === "q-1");
      const item2 = map.items.find((it) => it.id === "q-2");
      const item3 = map.items.find((it) => it.id === "q-3");

      expect(item1.isLowest).toBe(true);
      expect(item1.varianceFromLowestPercent).toBe(0);

      expect(item2.isLowest).toBe(false);
      expect(item2.differenceFromLowest).toBe("200.00");
      expect(item2.varianceFromLowestPercent).toBe(20);

      expect(item3.isLowest).toBe(false);
      expect(item3.differenceFromLowest).toBe("500.00");
      expect(item3.varianceFromLowestPercent).toBe(50);
    });

    it("handles ties for lowest quotation gracefully", () => {
      const quotations = [
        {
          id: "q-1",
          value: new Prisma.Decimal("800.00"),
          supplier: { legalName: "Fornecedor 1" },
        },
        {
          id: "q-2",
          value: new Prisma.Decimal("800.00"),
          supplier: { legalName: "Fornecedor 2" },
        },
        {
          id: "q-3",
          value: new Prisma.Decimal("1000.00"),
          supplier: { legalName: "Fornecedor 3" },
        },
      ];

      const map = buildComparativePriceMap(quotations);
      expect(map.lowestValue).toBe("800.00");
      expect(map.lowestQuotationIds).toEqual(["q-1", "q-2"]);

      const lowestItems = map.items.filter((it) => it.isLowest);
      expect(lowestItems.length).toBe(2);
    });
  });

  describe("validation of quotation inputs", () => {
    it("rejects invalid UUIDs", async () => {
      await expect(
        quotationService.createQuotation(
          "invalid-uuid",
          {
            supplierId: "invalid-uuid",
            value: 100,
          },
          adminUser,
        ),
      ).rejects.toThrow(ValidationError);
    });

    it("rejects negative or zero values with ValidationError", async () => {
      await expect(
        quotationService.createQuotation(
          "00000000-0000-0000-0000-000000000001",
          {
            supplierId: "00000000-0000-0000-0000-000000000002",
            value: -50,
          },
          adminUser,
        ),
      ).rejects.toThrow(ValidationError);

      await expect(
        quotationService.createQuotation(
          "00000000-0000-0000-0000-000000000001",
          {
            supplierId: "00000000-0000-0000-0000-000000000002",
            value: 0,
          },
          adminUser,
        ),
      ).rejects.toThrow(ValidationError);
    });
  });
});
