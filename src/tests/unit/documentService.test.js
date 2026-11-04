import { ValidationError } from "@/infra/errors.js";
import documentService, {
  canUserManageDocuments,
} from "@/services/document.service.js";
import storageService from "@/services/storage.service.js";

describe("documentService and storageService", () => {
  const adminUser = {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Admin User",
    role: "ADMIN",
  };

  const solicitanteUser = {
    id: "00000000-0000-0000-0000-000000000003",
    name: "Solicitante User",
    role: "SOLICITANTE",
  };

  describe("canUserManageDocuments", () => {
    it("allows ADMIN on unlocked processes", () => {
      expect(
        canUserManageDocuments(adminUser, {
          status: "PRICE_RESEARCH",
        }),
      ).toBe(true);
    });

    it("locks documents when process is APPROVED, COMPLETED, or REJECTED", () => {
      expect(
        canUserManageDocuments(adminUser, {
          status: "APPROVED",
        }),
      ).toBe(false);
      expect(
        canUserManageDocuments(adminUser, {
          status: "COMPLETED",
        }),
      ).toBe(false);
      expect(
        canUserManageDocuments(adminUser, {
          status: "REJECTED",
        }),
      ).toBe(false);
    });

    it("allows SOLICITANTE only for own process in DRAFT", () => {
      const draftProcess = {
        status: "DRAFT",
        requesterId: solicitanteUser.id,
      };
      expect(canUserManageDocuments(solicitanteUser, draftProcess)).toBe(true);

      const inAnalysis = {
        status: "IN_ANALYSIS",
        requesterId: solicitanteUser.id,
      };
      expect(canUserManageDocuments(solicitanteUser, inAnalysis)).toBe(false);
    });
  });

  describe("storageService file validation", () => {
    it("accepts a valid PDF with %PDF- signature", () => {
      const validPdfBuffer = Buffer.from("%PDF-1.5 test document content");
      const validation = storageService.validateFileBuffer({
        buffer: validPdfBuffer,
        filename: "proposta_precos.pdf",
        declaredMimeType: "application/pdf",
      });

      expect(validation.mimeType).toBe("application/pdf");
      expect(validation.extension).toBe(".pdf");
      expect(validation.size).toBe(validPdfBuffer.length);
    });

    it("rejects an empty buffer with ValidationError", () => {
      expect(() => {
        storageService.validateFileBuffer({
          buffer: Buffer.alloc(0),
          filename: "empty.pdf",
          declaredMimeType: "application/pdf",
        });
      }).toThrow(ValidationError);
    });

    it("rejects files exceeding MAX_FILE_SIZE_BYTES", () => {
      const bigBuffer = Buffer.alloc(storageService.MAX_FILE_SIZE_BYTES + 1);
      expect(() => {
        storageService.validateFileBuffer({
          buffer: bigBuffer,
          filename: "huge.pdf",
          declaredMimeType: "application/pdf",
        });
      }).toThrow(ValidationError);
    });

    it("rejects executable or unsupported file extensions", () => {
      const fakeExeBuffer = Buffer.from("MZ malicious file");
      expect(() => {
        storageService.validateFileBuffer({
          buffer: fakeExeBuffer,
          filename: "script.exe",
          declaredMimeType: "application/octet-stream",
        });
      }).toThrow(ValidationError);
    });

    it("detects fake/corrupted PDF that lacks magic bytes signature", () => {
      const fakePdfBuffer = Buffer.from(
        "This is plain text pretending to be a pdf",
      );
      expect(() => {
        storageService.validateFileBuffer({
          buffer: fakePdfBuffer,
          filename: "fake.pdf",
          declaredMimeType: "application/pdf",
        });
      }).toThrow(ValidationError);
    });

    it("accepts valid PNG image", () => {
      const pngHeader = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]);
      const validPng = Buffer.concat([
        pngHeader,
        Buffer.from("extra png bytes"),
      ]);
      const validation = storageService.validateFileBuffer({
        buffer: validPng,
        filename: "comprovante.png",
        declaredMimeType: "image/png",
      });
      expect(validation.mimeType).toBe("image/png");
    });
  });

  describe("safe storage keys and filename sanitization", () => {
    it("generates safe storage key with doc_ prefix and safe extension", () => {
      const key = storageService.generateSafeStorageKey("my-document.pdf");
      expect(key).toMatch(/^doc_[0-9a-f-]{36}\.pdf$/);
    });

    it("prevents path traversal in filename sanitization", () => {
      const sanitized = storageService.sanitizeFilename(
        "../../../../etc/passwd",
      );
      expect(sanitized).toBe("passwd");
      expect(sanitized).not.toContain("..");
      expect(sanitized).not.toContain("/");
    });

    it("resolves safe paths within storage root and rejects path traversal", () => {
      const provider = storageService.getStorageProvider();
      expect(() => {
        provider.resolveSafePath("../../../outside.txt");
      }).toThrow(ValidationError);

      expect(() => {
        provider.resolveSafePath("/absolute/path.txt");
      }).toThrow(ValidationError);
    });
  });
});
