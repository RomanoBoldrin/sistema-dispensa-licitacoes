/**
 * Official monetary thresholds for Lei nº 14.133/2021, Art. 75, Incisos I and II.
 *
 * Legal references:
 * - Base law: Lei Federal nº 14.133/2021, Art. 75, I e II c/c Art. 182.
 * - Exercício 2024: Decreto Federal nº 11.871, de 29 de dezembro de 2023 (DOU 29/12/2023, vigência a partir de 01/01/2024).
 *   - Inciso I: R$ 119.812,02
 *   - Inciso II: R$ 59.906,02
 * - Exercício 2025: Decreto Federal nº 12.343, de 30 de dezembro de 2024 (DOU 31/12/2024, vigência a partir de 01/01/2025).
 *   - Inciso I: R$ 125.451,15
 *   - Inciso II: R$ 62.725,59
 * - Exercício 2026: Decreto Federal nº 12.807, de 29 de dezembro de 2025 (DOU 30/12/2025, vigência a partir de 01/01/2026).
 *   - Inciso I: R$ 130.984,20
 *   - Inciso II: R$ 65.492,11
 */
export const ANNUAL_THRESHOLDS = {
  2024: {
    incisoI: {
      limit: 119812.02,
      decree: "Decreto Federal nº 11.871/2023",
      effectiveDate: "2024-01-01",
    },
    incisoII: {
      limit: 59906.02,
      decree: "Decreto Federal nº 11.871/2023",
      effectiveDate: "2024-01-01",
    },
  },
  2025: {
    incisoI: {
      limit: 125451.15,
      decree: "Decreto Federal nº 12.343/2024",
      effectiveDate: "2025-01-01",
    },
    incisoII: {
      limit: 62725.59,
      decree: "Decreto Federal nº 12.343/2024",
      effectiveDate: "2025-01-01",
    },
  },
  2026: {
    incisoI: {
      limit: 130984.2,
      decree: "Decreto Federal nº 12.807/2025",
      effectiveDate: "2026-01-01",
    },
    incisoII: {
      limit: 65492.11,
      decree: "Decreto Federal nº 12.807/2025",
      effectiveDate: "2026-01-01",
    },
  },
};

export const DEFAULT_THRESHOLD_YEAR = 2026;

/**
 * Returns threshold configuration for a specific inciso and year.
 * Falls back to DEFAULT_THRESHOLD_YEAR if year is not explicitly mapped.
 */
export function getThresholdForYear(incisoKey, year) {
  const targetYear = ANNUAL_THRESHOLDS[year] ? year : DEFAULT_THRESHOLD_YEAR;
  const yearData = ANNUAL_THRESHOLDS[targetYear];

  if (incisoKey === "ART_75_I" || incisoKey === "I") {
    return {
      year: targetYear,
      ...yearData.incisoI,
    };
  }

  if (incisoKey === "ART_75_II" || incisoKey === "II") {
    return {
      year: targetYear,
      ...yearData.incisoII,
    };
  }

  return null;
}

/**
 * Supported legal hypotheses under Art. 75 of Lei nº 14.133/2021.
 */
export const LEGAL_HYPOTHESES = {
  ART_75_I: {
    key: "ART_75_I",
    shortLabel: "Art. 75, Inciso I",
    title: "Obras e Serviços de Engenharia / Manutenção de Veículos",
    lawReference: "Lei Federal nº 14.133/2021, art. 75, inciso I",
    description:
      "Contratação de obras e serviços de engenharia ou de serviços de manutenção de veículos automotores até o limite legal anual.",
    isMonetary: true,
    matchingRegex: /art(?:\.|igo)?\s*75[,\s]+(?:inciso\s+)?I(?!\w)/i,
    compatibleCategories: ["ENGINEERING_WORKS", "GENERAL_SERVICES"],
  },
  ART_75_II: {
    key: "ART_75_II",
    shortLabel: "Art. 75, Inciso II",
    title: "Compras e Outros Serviços em Geral",
    lawReference: "Lei Federal nº 14.133/2021, art. 75, inciso II",
    description:
      "Contratação de outros serviços e compras em geral até o limite legal anual.",
    isMonetary: true,
    matchingRegex: /art(?:\.|igo)?\s*75[,\s]+(?:inciso\s+)?II(?!\w)/i,
    compatibleCategories: [
      "COMMON_GOODS",
      "GENERAL_SERVICES",
      "IT_GOODS",
      "HEALTH_SUPPLIES",
      "OTHER",
    ],
  },
  ART_75_III: {
    key: "ART_75_III",
    shortLabel: "Art. 75, Inciso III",
    title: "Licitação Deserta ou Fracassada",
    lawReference: "Lei Federal nº 14.133/2021, art. 75, inciso III",
    description:
      "Contratação decorrente de licitação deserta ou fracassada realizada há menos de 1 ano, mantidas todas as condições preestabelecidas.",
    isMonetary: false,
    matchingRegex: /art(?:\.|igo)?\s*75[,\s]+(?:inciso\s+)?III(?!\w)/i,
  },
  ART_75_VIII: {
    key: "ART_75_VIII",
    shortLabel: "Art. 75, Inciso VIII",
    title: "Emergência ou Calamidade Pública",
    lawReference: "Lei Federal nº 14.133/2021, art. 75, inciso VIII",
    description:
      "Atendimento de urgência para evitar prejuízo ou interrupção de serviços públicos essenciais, com parcelas concluíveis em até 1 ano.",
    isMonetary: false,
    matchingRegex: /art(?:\.|igo)?\s*75[,\s]+(?:inciso\s+)?VIII(?!\w)/i,
  },
  ART_75_OUTROS: {
    key: "ART_75_OUTROS",
    shortLabel: "Art. 75, Outros Incisos",
    title: "Demais Hipóteses do Artigo 75",
    lawReference: "Lei Federal nº 14.133/2021, art. 75",
    description:
      "Outras hipóteses específicas previstas no rol do Artigo 75 da Lei nº 14.133/2021 (ex.: incisos IV, V, VII, etc.).",
    isMonetary: false,
    matchingRegex: /art(?:\.|igo)?\s*75/i,
  },
};

/**
 * Normalizes an arbitrary legalBasis string or key into a recognized hypothesis key.
 */
export function identifyHypothesis(rawBasis) {
  if (!rawBasis || typeof rawBasis !== "string") {
    return null;
  }

  const trimmed = rawBasis.trim();

  // 1. Direct key match
  if (LEGAL_HYPOTHESES[trimmed]) {
    return trimmed;
  }

  // 2. Specific Roman numeral checks
  if (LEGAL_HYPOTHESES.ART_75_VIII.matchingRegex.test(trimmed)) {
    return "ART_75_VIII";
  }
  if (LEGAL_HYPOTHESES.ART_75_III.matchingRegex.test(trimmed)) {
    return "ART_75_III";
  }
  if (LEGAL_HYPOTHESES.ART_75_II.matchingRegex.test(trimmed)) {
    return "ART_75_II";
  }
  if (LEGAL_HYPOTHESES.ART_75_I.matchingRegex.test(trimmed)) {
    return "ART_75_I";
  }
  if (LEGAL_HYPOTHESES.ART_75_OUTROS.matchingRegex.test(trimmed)) {
    return "ART_75_OUTROS";
  }

  return null;
}

/**
 * Validates the legal classification of a process.
 * Pure domain logic (no DB dependencies).
 */
export function validateLegalClassification(processData) {
  const hardErrors = [];
  const warnings = [];
  const humanReviewItems = [
    {
      code: "FRACIONAMENTO_DESPESA",
      title: "Vedação ao Fracionamento Indevido de Despesa",
      description:
        "O solicitante e a autoridade competente devem atestar que o valor total acumulado no exercício financeiro para contratações do mesmo ramo/natureza não ultrapassa o limite do Art. 75 (art. 75, § 1º).",
      status: "REQUIRES_HUMAN_CHECK",
    },
    {
      code: "QUALIFICACAO_FORNECEDOR",
      title: "Habilitação e Regularidade Fiscal / Trabalhista",
      description:
        "Verificar certidões de regularidade perante a Seguridade Social, FGTS, Justiça do Trabalho e Receita Federal conforme aplicável.",
      status: "REQUIRES_HUMAN_CHECK",
    },
  ];

  if (!processData) {
    hardErrors.push({
      field: "legalBasis",
      message: "Dados do processo não informados para validação jurídica.",
    });
    return {
      isValid: false,
      hypothesis: null,
      hardErrors,
      warnings,
      humanReviewItems,
    };
  }

  const rawBasis = processData.legalBasis;
  if (!rawBasis || (typeof rawBasis === "string" && !rawBasis.trim())) {
    hardErrors.push({
      field: "legalBasis",
      message:
        "Enquadramento legal obrigatório. Selecione uma hipótese do Artigo 75 da Lei nº 14.133/2021.",
    });
    return {
      isValid: false,
      hypothesis: null,
      hardErrors,
      warnings,
      humanReviewItems,
    };
  }

  const hypothesisKey = identifyHypothesis(rawBasis);
  const hypothesis = hypothesisKey ? LEGAL_HYPOTHESES[hypothesisKey] : null;

  if (!hypothesis) {
    hardErrors.push({
      field: "legalBasis",
      message: `Enquadramento legal '${rawBasis}' não reconhecido nas hipóteses de dispensa do Artigo 75 da Lei nº 14.133/2021.`,
    });
    return {
      isValid: false,
      hypothesis: null,
      hardErrors,
      warnings,
      humanReviewItems,
    };
  }

  const processYear =
    Number(processData.year) ||
    (processData.createdAt
      ? new Date(processData.createdAt).getFullYear()
      : DEFAULT_THRESHOLD_YEAR);

  const rawEstimatedValue = processData.estimatedValue;
  const estimatedValue =
    rawEstimatedValue !== null &&
    rawEstimatedValue !== undefined &&
    rawEstimatedValue !== ""
      ? Number(rawEstimatedValue)
      : null;

  // Rule 1: Value-based checks for Incisos I and II
  if (hypothesis.isMonetary) {
    if (estimatedValue === null || Number.isNaN(estimatedValue)) {
      hardErrors.push({
        field: "estimatedValue",
        message: `Para a dispensa fundamentada no ${hypothesis.shortLabel}, o valor estimado da contratação é obrigatório.`,
      });
    } else {
      const thresholdInfo = getThresholdForYear(hypothesis.key, processYear);
      if (thresholdInfo) {
        const diff =
          Math.round((estimatedValue - thresholdInfo.limit) * 100) / 100;
        if (diff > 0) {
          const formattedEstimated = estimatedValue.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          });
          const formattedLimit = thresholdInfo.limit.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          });

          hardErrors.push({
            field: "estimatedValue",
            message: `O valor estimado (${formattedEstimated}) excede o limite legal de ${formattedLimit} para o ${hypothesis.shortLabel} no exercício de ${thresholdInfo.year} (${thresholdInfo.decree}).`,
          });
        } else if (diff > -thresholdInfo.limit * 0.1) {
          warnings.push({
            code: "NEAR_THRESHOLD_LIMIT",
            message: `O valor estimado está próximo ao teto legal de ${thresholdInfo.limit.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} (${thresholdInfo.decree}). Recomenda-se cautela quanto a eventuais acréscimos.`,
          });
        }
      }
    }

    // Category check for Inciso I (Engineering / vehicle maintenance)
    const category = processData.demandDocument?.category;
    if (hypothesis.key === "ART_75_I" && category) {
      if (category !== "ENGINEERING_WORKS" && category !== "GENERAL_SERVICES") {
        warnings.push({
          code: "CATEGORY_ALIGNMENT",
          message:
            "O Art. 75, I aplica-se a obras/serviços de engenharia ou manutenção automotiva. Verifique se a categoria do objeto selecionada no DFD é condizente.",
        });
      }
    }
  }

  // Rule 2: Situational checks for Inciso III (Licitação Deserta/Fracassada)
  if (hypothesis.key === "ART_75_III") {
    humanReviewItems.push({
      code: "CERTIDAO_LICITACAO_ANTERIOR",
      title: "Comprovação de Licitação Anterior Infrutífera",
      description:
        "Anexar ata/edital e certidão demonstrando que a licitação anterior foi realizada há menos de 1 ano e restou deserta ou fracassada, mantidas todas as condições.",
      status: "REQUIRES_HUMAN_CHECK",
    });

    if (
      !processData.legalJustification &&
      (!processData.description || processData.description.length < 20)
    ) {
      warnings.push({
        code: "JUSTIFICATIVA_INCISO_III",
        message:
          "Para o Art. 75, III, recomenda-se registrar a justificativa detalhando o número do processo licitatório anterior e a data em que restou deserto/fracassado.",
      });
    }
  }

  // Rule 3: Situational checks for Inciso VIII (Emergência/Calamidade)
  if (hypothesis.key === "ART_75_VIII") {
    humanReviewItems.push({
      code: "CARACTERIZACAO_EMERGENCIA",
      title: "Caracterização da Situação Emergencial",
      description:
        "Verificar se há instrução formal demonstrando urgência concreta, risco de descontinuidade do serviço público e prazo de execução limitado a 1 ano.",
      status: "REQUIRES_HUMAN_CHECK",
    });

    if (
      !processData.legalJustification &&
      (!processData.description || processData.description.length < 20)
    ) {
      warnings.push({
        code: "JUSTIFICATIVA_EMERGENCIAL",
        message:
          "Para o Art. 75, VIII, é indispensável relatar de forma clara a ocorrência emergencial ou de calamidade que fundamenta a contratação imediata.",
      });
    }
  }

  // Rule 4: Outros incisos
  if (hypothesis.key === "ART_75_OUTROS") {
    if (!processData.legalJustification && !processData.legalBasis) {
      warnings.push({
        code: "JUSTIFICATIVA_OUTROS_INCISOS",
        message:
          "Especifique com precisão o inciso aplicável do Artigo 75 e a fundamentação da subsunção fática nos autos.",
      });
    }
  }

  return {
    isValid: hardErrors.length === 0,
    hypothesis: {
      key: hypothesis.key,
      shortLabel: hypothesis.shortLabel,
      title: hypothesis.title,
      lawReference: hypothesis.lawReference,
      description: hypothesis.description,
      isMonetary: hypothesis.isMonetary,
      threshold: hypothesis.isMonetary
        ? getThresholdForYear(hypothesis.key, processYear)
        : null,
    },
    hardErrors,
    warnings,
    humanReviewItems,
  };
}
