import legalService, {
  ANNUAL_THRESHOLDS,
  DEFAULT_THRESHOLD_YEAR,
  getThresholdForYear,
  identifyHypothesis,
  validateLegalClassification,
} from "@/services/legal.service.js";

describe("legalService (Unit Tests)", () => {
  describe("thresholds and legal decree references", () => {
    it("defines centralized thresholds with official decree references for 2024, 2025, and 2026", () => {
      expect(ANNUAL_THRESHOLDS[2024]).toBeDefined();
      expect(ANNUAL_THRESHOLDS[2024].incisoI.limit).toBe(119812.02);
      expect(ANNUAL_THRESHOLDS[2024].incisoI.decree).toContain("11.871/2023");
      expect(ANNUAL_THRESHOLDS[2024].incisoII.limit).toBe(59906.02);

      expect(ANNUAL_THRESHOLDS[2025]).toBeDefined();
      expect(ANNUAL_THRESHOLDS[2025].incisoI.limit).toBe(125451.15);
      expect(ANNUAL_THRESHOLDS[2025].incisoI.decree).toContain("12.343/2024");
      expect(ANNUAL_THRESHOLDS[2025].incisoII.limit).toBe(62725.59);

      expect(ANNUAL_THRESHOLDS[2026]).toBeDefined();
      expect(ANNUAL_THRESHOLDS[2026].incisoI.limit).toBe(130984.2);
      expect(ANNUAL_THRESHOLDS[2026].incisoI.decree).toContain("12.807/2025");
      expect(ANNUAL_THRESHOLDS[2026].incisoII.limit).toBe(65492.11);
    });

    it("retrieves threshold by year and falls back to DEFAULT_THRESHOLD_YEAR if year is not mapped", () => {
      const info2025 = getThresholdForYear("ART_75_I", 2025);
      expect(info2025.year).toBe(2025);
      expect(info2025.limit).toBe(125451.15);

      const infoFallback = getThresholdForYear("ART_75_II", 2030);
      expect(infoFallback.year).toBe(DEFAULT_THRESHOLD_YEAR);
      expect(infoFallback.limit).toBe(65492.11);
    });
  });

  describe("identifyHypothesis", () => {
    it("identifies direct hypothesis keys", () => {
      expect(identifyHypothesis("ART_75_I")).toBe("ART_75_I");
      expect(identifyHypothesis("ART_75_II")).toBe("ART_75_II");
      expect(identifyHypothesis("ART_75_III")).toBe("ART_75_III");
      expect(identifyHypothesis("ART_75_VIII")).toBe("ART_75_VIII");
      expect(identifyHypothesis("ART_75_OUTROS")).toBe("ART_75_OUTROS");
    });

    it("identifies standard Brazilian legal string representations", () => {
      expect(identifyHypothesis("Art. 75, I")).toBe("ART_75_I");
      expect(identifyHypothesis("Art. 75, inciso I da Lei 14.133/2021")).toBe(
        "ART_75_I",
      );
      expect(identifyHypothesis("Art. 75, II")).toBe("ART_75_II");
      expect(identifyHypothesis("Art. 75, II da Lei nº 14.133/2021")).toBe(
        "ART_75_II",
      );
      expect(identifyHypothesis("Art. 75, inciso III")).toBe("ART_75_III");
      expect(identifyHypothesis("Art. 75, VIII - emergencial")).toBe(
        "ART_75_VIII",
      );
    });

    it("returns null for invalid or empty inputs", () => {
      expect(identifyHypothesis(null)).toBeNull();
      expect(identifyHypothesis("")).toBeNull();
      expect(identifyHypothesis("Art. 74")).toBeNull();
      expect(identifyHypothesis("Inexigibilidade")).toBeNull();
    });
  });

  describe("validateLegalClassification", () => {
    it("returns hard error when legalBasis is missing", () => {
      const res = validateLegalClassification({
        legalBasis: null,
        year: 2026,
        estimatedValue: 10000,
      });

      expect(res.isValid).toBe(false);
      expect(res.hardErrors).toHaveLength(1);
      expect(res.hardErrors[0].field).toBe("legalBasis");
    });

    it("returns hard error when legalBasis is unrecognized", () => {
      const res = validateLegalClassification({
        legalBasis: "Art. 999 da Lei X",
        year: 2026,
        estimatedValue: 10000,
      });

      expect(res.isValid).toBe(false);
      expect(res.hardErrors[0].message).toContain("não reconhecido");
    });

    it("validates compliant Art. 75, II within 2026 threshold", () => {
      const res = validateLegalClassification({
        legalBasis: "ART_75_II",
        year: 2026,
        estimatedValue: 45000,
        demandDocument: { category: "COMMON_GOODS" },
      });

      expect(res.isValid).toBe(true);
      expect(res.hardErrors).toHaveLength(0);
      expect(res.hypothesis.key).toBe("ART_75_II");
      expect(res.hypothesis.threshold.limit).toBe(65492.11);
    });

    it("returns hard error when estimatedValue exceeds threshold for Art. 75, II", () => {
      const res = validateLegalClassification({
        legalBasis: "ART_75_II",
        year: 2026,
        estimatedValue: 70000, // Limit is 65492.11
        demandDocument: { category: "COMMON_GOODS" },
      });

      expect(res.isValid).toBe(false);
      expect(res.hardErrors).toHaveLength(1);
      expect(res.hardErrors[0].field).toBe("estimatedValue");
      expect(res.hardErrors[0].message).toContain("excede o limite legal");
      expect(res.hardErrors[0].message).toContain(
        "Decreto Federal nº 12.807/2025",
      );
    });

    it("returns hard error when estimatedValue exceeds threshold for Art. 75, I", () => {
      const res = validateLegalClassification({
        legalBasis: "ART_75_I",
        year: 2026,
        estimatedValue: 140000, // Limit is 130984.20
        demandDocument: { category: "ENGINEERING_WORKS" },
      });

      expect(res.isValid).toBe(false);
      expect(res.hardErrors).toHaveLength(1);
      expect(res.hardErrors[0].field).toBe("estimatedValue");
      expect(res.hardErrors[0].message).toContain("excede o limite legal");
    });

    it("emits advisory warning when value is within 10% of threshold limit", () => {
      const res = validateLegalClassification({
        legalBasis: "ART_75_II",
        year: 2026,
        estimatedValue: 64000, // Limit is 65492.11, near limit
        demandDocument: { category: "COMMON_GOODS" },
      });

      expect(res.isValid).toBe(true);
      expect(res.warnings.some((w) => w.code === "NEAR_THRESHOLD_LIMIT")).toBe(
        true,
      );
    });

    it("emits category alignment warning for Inciso I when not engineering works", () => {
      const res = validateLegalClassification({
        legalBasis: "ART_75_I",
        year: 2026,
        estimatedValue: 50000,
        demandDocument: { category: "IT_GOODS" },
      });

      expect(res.isValid).toBe(true);
      expect(res.warnings.some((w) => w.code === "CATEGORY_ALIGNMENT")).toBe(
        true,
      );
    });

    it("requires human review items and warns about justification for Inciso VIII (Emergência)", () => {
      const res = validateLegalClassification({
        legalBasis: "ART_75_VIII",
        year: 2026,
        estimatedValue: 200000,
      });

      expect(res.isValid).toBe(true);
      expect(
        res.humanReviewItems.some(
          (h) => h.code === "CARACTERIZACAO_EMERGENCIA",
        ),
      ).toBe(true);
      expect(
        res.humanReviewItems.some((h) => h.code === "FRACIONAMENTO_DESPESA"),
      ).toBe(true);
      expect(
        res.warnings.some((w) => w.code === "JUSTIFICATIVA_EMERGENCIAL"),
      ).toBe(true);
    });

    it("maintains exact decimal comparisons and does not reject exact limit value", () => {
      const res = validateLegalClassification({
        legalBasis: "ART_75_II",
        year: 2026,
        estimatedValue: 65492.11, // Exactly equal to limit
        demandDocument: { category: "COMMON_GOODS" },
      });

      expect(res.isValid).toBe(true);
      expect(res.hardErrors).toHaveLength(0);
    });
  });
});
