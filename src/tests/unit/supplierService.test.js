import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/infra/errors.js";
import supplierService from "@/services/supplier.service.js";

describe("supplierService", () => {
  const adminUser = {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Admin User",
    role: "ADMIN",
  };

  const agenteUser = {
    id: "00000000-0000-0000-0000-000000000002",
    name: "Agente User",
    role: "AGENTE_CONTRATACAO",
  };

  const solicitanteUser = {
    id: "00000000-0000-0000-0000-000000000003",
    name: "Solicitante User",
    role: "SOLICITANTE",
  };

  describe("CNPJ validation and normalization", () => {
    it("validates valid CNPJs correctly", () => {
      expect(supplierService.isValidCnpj("00.000.000/0001-91")).toBe(true);
      expect(supplierService.isValidCnpj("33.000.167/0001-01")).toBe(true);
      expect(supplierService.isValidCnpj("00000000000191")).toBe(true);
    });

    it("rejects invalid check digits or malformed CNPJs", () => {
      expect(supplierService.isValidCnpj("00.000.000/0001-90")).toBe(false);
      expect(supplierService.isValidCnpj("11.111.111/1111-11")).toBe(false);
      expect(supplierService.isValidCnpj("123")).toBe(false);
      expect(supplierService.isValidCnpj("")).toBe(false);
      expect(supplierService.isValidCnpj(null)).toBe(false);
    });

    it("normalizes CNPJ to 14 numeric digits", () => {
      expect(supplierService.normalizeCnpj("00.000.000/0001-91")).toBe(
        "00000000000191",
      );
      expect(supplierService.normalizeCnpj("123.456-abc")).toBe("123456");
    });

    it("formats 14 digits to CNPJ mask", () => {
      expect(supplierService.formatCnpj("00000000000191")).toBe(
        "00.000.000/0001-91",
      );
    });
  });

  describe("createSupplier", () => {
    it("blocks SOLICITANTE from creating suppliers with ForbiddenError", async () => {
      await expect(
        supplierService.createSupplier(
          {
            legalName: "Fornecedor Teste",
            cnpj: "00.000.000/0001-91",
          },
          solicitanteUser,
        ),
      ).rejects.toThrow(ForbiddenError);
    });

    it("rejects invalid CNPJ with ValidationError", async () => {
      await expect(
        supplierService.createSupplier(
          {
            legalName: "Fornecedor Teste",
            cnpj: "00.000.000/0001-90", // invalid check digits
          },
          agenteUser,
        ),
      ).rejects.toThrow(ValidationError);
    });

    it("rejects missing legalName with ValidationError", async () => {
      await expect(
        supplierService.createSupplier(
          {
            legalName: " ",
            cnpj: "00.000.000/0001-91",
          },
          adminUser,
        ),
      ).rejects.toThrow(ValidationError);
    });

    it("rejects invalid email format with ValidationError", async () => {
      await expect(
        supplierService.createSupplier(
          {
            legalName: "Fornecedor Teste",
            cnpj: "00.000.000/0001-91",
            email: "invalid-email-format",
          },
          adminUser,
        ),
      ).rejects.toThrow(ValidationError);
    });

    it("creates a supplier with normalized CNPJ and returns formatted details", async () => {
      const uniqueCnpj = "33.000.167/0001-01";
      // Try to create or find
      try {
        const created = await supplierService.createSupplier(
          {
            legalName: "Petróleo Brasileiro S.A. Teste",
            tradeName: "Petrobras Teste",
            cnpj: uniqueCnpj,
            email: "contato@petrobras.teste.br",
            phone: "(21) 3224-4477",
          },
          agenteUser,
        );

        expect(created.id).toBeDefined();
        expect(created.cnpj).toBe("33000167000101");
        expect(created.formattedCnpj).toBe("33.000.167/0001-01");
        expect(created.legalName).toBe("Petróleo Brasileiro S.A. Teste");
      } catch (err) {
        if (!(err instanceof ConflictError)) {
          throw err;
        }
      }
    });

    it("detects duplicate CNPJ and throws ConflictError", async () => {
      const cnpj = "00.000.000/0001-91";
      // Ensure one exists
      try {
        await supplierService.createSupplier(
          {
            legalName: "Banco do Brasil S.A.",
            cnpj,
          },
          adminUser,
        );
      } catch (e) {
        // May already exist
      }

      await expect(
        supplierService.createSupplier(
          {
            legalName: "Outro Banco",
            cnpj,
          },
          agenteUser,
        ),
      ).rejects.toThrow(ConflictError);
    });
  });

  describe("getSupplierById and updateSupplier", () => {
    it("rejects invalid UUID with ValidationError", async () => {
      await expect(
        supplierService.getSupplierById("not-a-uuid", adminUser),
      ).rejects.toThrow(ValidationError);
    });

    it("throws NotFoundError when supplier does not exist", async () => {
      await expect(
        supplierService.getSupplierById(
          "99999999-9999-9999-9999-999999999999",
          adminUser,
        ),
      ).rejects.toThrow(NotFoundError);
    });
  });
});
