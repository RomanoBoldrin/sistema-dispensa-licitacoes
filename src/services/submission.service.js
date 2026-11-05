import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/infra/errors.js";
import { prisma } from "@/infra/prisma.js";
import { validateLegalClassification } from "./legal.service.js";
import { canUserAccessProcess, isValidUuid } from "./process.service.js";
import { buildComparativePriceMap } from "./quotation.service.js";

export const SUBMITTABLE_SOURCE_STATUSES = [
  "DRAFT",
  "IN_ANALYSIS",
  "PRICE_RESEARCH",
  "SUPPLIER_SELECTED",
];

export const LOCKED_SUBMISSION_STATUSES = [
  "AWAITING_APPROVAL",
  "APPROVED",
  "COMPLETED",
  "REJECTED",
];

/**
 * Validates whether an authenticated user is authorized to submit the process.
 */
export function canUserSubmitProcess(user, processRecord) {
  if (!user || !processRecord) return false;
  if (processRecord.deletedAt) return false;

  if (user.role === "ADMIN") return true;

  if (user.role === "SOLICITANTE") {
    if (processRecord.requesterId !== user.id) return false;
    if (user.departmentId && processRecord.departmentId !== user.departmentId) {
      return false;
    }
    return true;
  }

  if (user.role === "AGENTE_CONTRATACAO") {
    if (
      user.departmentId &&
      processRecord.departmentId !== user.departmentId &&
      processRecord.requesterId !== user.id
    ) {
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Evaluates completeness of a procurement process across all mandatory domain sections.
 * Returns structured errors, warnings, human review items, and section-by-section checklist.
 */
export function validateProcessCompleteness(processRecord) {
  const errors = [];
  const warnings = [];

  const checklist = {
    general: {
      label: "Dados Gerais do Processo",
      complete: true,
      items: [],
    },
    dfd: {
      label: "Documento de Formalização da Demanda (DFD)",
      complete: true,
      items: [],
    },
    legal: {
      label: "Enquadramento Legal (Art. 75)",
      complete: true,
      items: [],
    },
    quotations: {
      label: "Pesquisa de Preços & Cotações",
      complete: true,
      items: [],
    },
    priceJustification: {
      label: "Justificativa de Preço",
      complete: true,
      items: [],
    },
    supplierSelection: {
      label: "Seleção e Justificativa do Fornecedor",
      complete: true,
      items: [],
    },
    documents: {
      label: "Documentação Instrutória",
      complete: true,
      items: [],
    },
  };

  if (!processRecord) {
    errors.push({
      section: "general",
      field: "process",
      message: "Registro do processo não fornecido para validação.",
    });
    return {
      isComplete: false,
      canSubmit: false,
      errors,
      warnings,
      humanReviewItems: [],
      checklist,
    };
  }

  // 1. General Process Data
  const hasTitle = Boolean(processRecord.title && processRecord.title.trim());
  const hasObject = Boolean(
    processRecord.object && processRecord.object.trim(),
  );
  const hasEstimatedValue =
    processRecord.estimatedValue !== null &&
    processRecord.estimatedValue !== undefined &&
    Number(processRecord.estimatedValue) > 0;

  checklist.general.items.push({
    code: "TITLE",
    label: "Título do processo preenchido",
    passed: hasTitle,
  });
  checklist.general.items.push({
    code: "OBJECT",
    label: "Descrição do objeto da contratação preenchida",
    passed: hasObject,
  });
  checklist.general.items.push({
    code: "ESTIMATED_VALUE",
    label: "Valor estimado positivo e definido",
    passed: hasEstimatedValue,
  });

  if (!hasTitle) {
    errors.push({
      section: "general",
      field: "title",
      message: "O título do processo é obrigatório.",
    });
    checklist.general.complete = false;
  }
  if (!hasObject) {
    errors.push({
      section: "general",
      field: "object",
      message: "A descrição do objeto é obrigatória.",
    });
    checklist.general.complete = false;
  }
  if (!hasEstimatedValue) {
    errors.push({
      section: "general",
      field: "estimatedValue",
      message: "O valor estimado da contratação deve ser maior que R$ 0,00.",
    });
    checklist.general.complete = false;
  }

  // 2. DFD Data
  const dfd = processRecord.demandDocument;
  const hasDfd = Boolean(dfd);
  const hasDfdCategory = Boolean(dfd?.category);
  const hasDfdJustification = Boolean(
    dfd?.detailedJustification && dfd.detailedJustification.trim(),
  );
  const hasDfdResponsible = Boolean(
    dfd?.responsibleName && dfd.responsibleName.trim(),
  );

  checklist.dfd.items.push({
    code: "DFD_EXISTS",
    label: "DFD formalizado no processo",
    passed: hasDfd,
  });
  checklist.dfd.items.push({
    code: "DFD_CATEGORY",
    label: "Categoria do objeto selecionada",
    passed: hasDfdCategory,
  });
  checklist.dfd.items.push({
    code: "DFD_JUSTIFICATION",
    label: "Justificativa da necessidade preenchida",
    passed: hasDfdJustification,
  });
  checklist.dfd.items.push({
    code: "DFD_RESPONSIBLE",
    label: "Responsável pela demanda identificado",
    passed: hasDfdResponsible,
  });

  if (
    !hasDfd ||
    !hasDfdCategory ||
    !hasDfdJustification ||
    !hasDfdResponsible
  ) {
    checklist.dfd.complete = false;
    if (!hasDfd) {
      errors.push({
        section: "dfd",
        field: "demandDocument",
        message: "O Documento de Formalização da Demanda (DFD) é obrigatório.",
      });
    } else {
      if (!hasDfdCategory) {
        errors.push({
          section: "dfd",
          field: "category",
          message: "A categoria do objeto no DFD é obrigatória.",
        });
      }
      if (!hasDfdJustification) {
        errors.push({
          section: "dfd",
          field: "detailedJustification",
          message: "A justificativa detalhada da demanda é obrigatória no DFD.",
        });
      }
      if (!hasDfdResponsible) {
        errors.push({
          section: "dfd",
          field: "responsibleName",
          message: "O nome do responsável pela demanda é obrigatório no DFD.",
        });
      }
    }
  }

  // 3. Legal Classification
  const legalValidation = validateLegalClassification(processRecord);
  checklist.legal.complete = legalValidation.isValid;

  checklist.legal.items.push({
    code: "LEGAL_BASIS_INFORMED",
    label: "Enquadramento em hipótese do Art. 75 da Lei nº 14.133/2021",
    passed: Boolean(legalValidation.hypothesis),
  });
  checklist.legal.items.push({
    code: "LEGAL_THRESHOLD_CHECK",
    label: "Valor estimado compatível com limite legal do exercício",
    passed: !legalValidation.hardErrors.some(
      (e) => e.field === "estimatedValue",
    ),
  });

  for (const err of legalValidation.hardErrors) {
    errors.push({
      section: "legal",
      field: err.field,
      message: err.message,
    });
  }

  for (const warn of legalValidation.warnings) {
    warnings.push({
      section: "legal",
      code: warn.code,
      message: warn.message,
    });
  }

  // 4. Quotations & Price Research
  const quotations = Array.isArray(processRecord.quotations)
    ? processRecord.quotations
    : [];
  const quotationCount = quotations.length;
  const hasQuotations = quotationCount > 0;

  checklist.quotations.items.push({
    code: "HAS_QUOTATIONS",
    label: `Cotações cadastradas (${quotationCount} registrada${quotationCount === 1 ? "" : "s"})`,
    passed: hasQuotations,
  });

  if (!hasQuotations) {
    errors.push({
      section: "quotations",
      field: "quotations",
      message:
        "É obrigatório cadastrar ao menos uma cotação de preços para o processo.",
    });
    checklist.quotations.complete = false;
  } else if (quotationCount < 3) {
    warnings.push({
      section: "quotations",
      code: "FEWER_THAN_THREE_QUOTATIONS",
      message: `Foram registradas ${quotationCount} cotação(ões). Recomenda-se obter 3 ou mais cotações válidas, salvo justificativa de limitação de mercado.`,
    });
  }

  // 5. Price Justification
  const hasPriceJustification = Boolean(
    processRecord.priceJustification &&
    processRecord.priceJustification.trim().length >= 10,
  );

  checklist.priceJustification.items.push({
    code: "PRICE_JUSTIFICATION_INFORMED",
    label: "Justificativa da razoabilidade dos preços registrada",
    passed: hasPriceJustification,
  });

  if (!hasPriceJustification) {
    errors.push({
      section: "priceJustification",
      field: "priceJustification",
      message:
        "A justificativa de preços é obrigatória para demonstrar a compatibilidade dos valores com o mercado.",
    });
    checklist.priceJustification.complete = false;
  }

  // 6. Supplier Selection & Justification
  const selectedSupplierId = processRecord.selectedSupplierId;
  const hasSelectedSupplier = Boolean(selectedSupplierId);
  const selectedQuotation = hasSelectedSupplier
    ? quotations.find((q) => q.supplierId === selectedSupplierId)
    : null;
  const hasQuotationForSelectedSupplier = Boolean(selectedQuotation);

  const hasSupplierJustification = Boolean(
    processRecord.supplierJustification &&
    processRecord.supplierJustification.trim().length >= 10,
  );

  checklist.supplierSelection.items.push({
    code: "SUPPLIER_SELECTED",
    label: "Fornecedor selecionado/proposto",
    passed: hasSelectedSupplier,
  });
  checklist.supplierSelection.items.push({
    code: "SUPPLIER_HAS_QUOTATION",
    label: "Fornecedor selecionado possui cotação registrada no processo",
    passed: hasQuotationForSelectedSupplier,
  });
  checklist.supplierSelection.items.push({
    code: "SUPPLIER_JUSTIFICATION_INFORMED",
    label: "Justificativa da escolha do fornecedor registrada",
    passed: hasSupplierJustification,
  });

  if (!hasSelectedSupplier) {
    errors.push({
      section: "supplierSelection",
      field: "selectedSupplierId",
      message: "É obrigatório selecionar o fornecedor da contratação.",
    });
    checklist.supplierSelection.complete = false;
  } else if (!hasQuotationForSelectedSupplier) {
    errors.push({
      section: "supplierSelection",
      field: "selectedSupplierId",
      message:
        "O fornecedor selecionado não possui cotação cadastrada neste processo.",
    });
    checklist.supplierSelection.complete = false;
  }

  if (!hasSupplierJustification) {
    errors.push({
      section: "supplierSelection",
      field: "supplierJustification",
      message:
        "A justificativa da escolha do fornecedor (razão da escolha) é obrigatória.",
    });
    checklist.supplierSelection.complete = false;
  }

  // Check comparative price map variance if supplier is chosen and quotations exist
  if (
    hasSelectedSupplier &&
    hasQuotationForSelectedSupplier &&
    quotations.length > 1
  ) {
    const comparativeMap = buildComparativePriceMap(quotations);
    if (comparativeMap?.lowestValue) {
      const lowestValue = Number(comparativeMap.lowestValue);
      const selectedValue = Number(selectedQuotation.value);
      if (selectedValue > lowestValue) {
        warnings.push({
          section: "supplierSelection",
          code: "NOT_LOWEST_PRICE",
          message: `O fornecedor selecionado (R$ ${selectedValue.toFixed(2)}) não apresentou a menor proposta do mapa comparativo (menor: R$ ${lowestValue.toFixed(2)}). Certifique-se de fundamentar as razões técnicas/operacionais na justificativa da escolha.`,
        });
      }
    }
  }

  // 7. Required Documents
  const activeDocuments = Array.isArray(processRecord.documents)
    ? processRecord.documents.filter((d) => d.isActive && !d.deletedAt)
    : [];

  const hasTR = activeDocuments.some((d) => d.type === "TERMO_REFERENCIA");
  const hasAnyDoc = activeDocuments.length > 0;

  checklist.documents.items.push({
    code: "TERMO_REFERENCIA_ATTACHED",
    label: "Termo de Referência (TR) anexado",
    passed: hasTR,
  });
  checklist.documents.items.push({
    code: "DOCUMENTS_ATTACHED",
    label: `Documentos instrutórios anexados (${activeDocuments.length} ativo${activeDocuments.length === 1 ? "" : "s"})`,
    passed: hasAnyDoc,
  });

  if (!hasTR && !hasAnyDoc) {
    errors.push({
      section: "documents",
      field: "documents",
      message:
        "É obrigatório anexar os documentos instrutórios do processo (Termo de Referência e/ou comprovantes de pesquisa de preços).",
    });
    checklist.documents.complete = false;
  } else if (!hasTR) {
    warnings.push({
      section: "documents",
      code: "MISSING_TERMO_REFERENCIA",
      message:
        "Termo de Referência (TR) não identificado entre os arquivos anexados. Recomenda-se a inclusão formal do TR para a instrução processual.",
    });
  }

  const isComplete = errors.length === 0;

  return {
    isComplete,
    canSubmit: isComplete,
    errors,
    warnings,
    humanReviewItems: legalValidation.humanReviewItems || [],
    hypothesis: legalValidation.hypothesis,
    checklist,
  };
}

/**
 * Submits a procurement process for internal analysis.
 * Performs atomical status transition and creates audit log.
 */
export async function submitProcess(processId, user) {
  if (!isValidUuid(processId)) {
    throw new ValidationError({
      message: "Formato inválido para processId.",
      action: "Forneça um UUID válido para processId.",
    });
  }

  const processRecord = await prisma.process.findFirst({
    where: {
      id: processId.trim(),
      deletedAt: null,
    },
    include: {
      department: true,
      requester: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      demandDocument: true,
      selectedSupplier: true,
      quotations: {
        include: {
          supplier: true,
        },
      },
      documents: {
        where: {
          isActive: true,
          deletedAt: null,
        },
      },
    },
  });

  if (!processRecord) {
    throw new NotFoundError({
      message: "Processo não encontrado.",
      action: "Verifique o identificador do processo.",
    });
  }

  // 1. Authorization check
  if (!canUserSubmitProcess(user, processRecord)) {
    throw new ForbiddenError({
      message:
        "Você não tem autorização para submeter este processo para análise.",
      action:
        "Apenas o solicitante responsável ou agentes de contratação autorizados do departamento podem submeter o processo.",
    });
  }

  // 2. Lifecycle status check
  if (processRecord.status === "AWAITING_APPROVAL") {
    throw new ConflictError({
      message: "O processo já foi submetido e está aguardando aprovação.",
      action: "Acompanhe a tramitação do processo na aba de aprovações.",
    });
  }

  if (["APPROVED", "COMPLETED"].includes(processRecord.status)) {
    throw new ConflictError({
      message: `Processo em status '${processRecord.status}' não pode ser submetido novamente.`,
      action: "Processos já aprovados ou concluídos não podem ser reenviados.",
    });
  }

  if (processRecord.status === "REJECTED") {
    throw new ConflictError({
      message:
        "Processos rejeitados não podem ser submetidos diretamente para análise.",
      action:
        "Consulte o histórico de rejeição e as orientações da administração.",
    });
  }

  if (!SUBMITTABLE_SOURCE_STATUSES.includes(processRecord.status)) {
    throw new ConflictError({
      message: `Status atual do processo (${processRecord.status}) não permite submissão.`,
      action: `Apenas processos em status ${SUBMITTABLE_SOURCE_STATUSES.join(", ")} podem ser submetidos.`,
    });
  }

  // 3. Completeness validation check
  const completeness = validateProcessCompleteness(processRecord);
  if (!completeness.isComplete) {
    const errorDetails = completeness.errors.map((e) => e.message).join(" ");
    throw new ValidationError({
      message: `O processo não pode ser submetido pois apresenta pendências: ${errorDetails}`,
      action:
        "Preencha todas as seções obrigatórias antes de submeter o processo para análise.",
      details: completeness.errors,
    });
  }

  // 4. Atomic transaction: update status and log audit event
  const formattedNumber = `DP-${String(processRecord.number).padStart(3, "0")}/${processRecord.year}`;

  const updatedProcess = await prisma.$transaction(async (tx) => {
    const updated = await tx.process.update({
      where: { id: processRecord.id },
      data: {
        status: "AWAITING_APPROVAL",
      },
      include: {
        department: true,
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        demandDocument: true,
        selectedSupplier: true,
        quotations: {
          include: {
            supplier: true,
          },
        },
        documents: {
          where: {
            isActive: true,
            deletedAt: null,
          },
        },
      },
    });

    await tx.auditLog.create({
      data: {
        processId: processRecord.id,
        userId: user.id,
        action: "PROCESS_SUBMITTED",
        description: `Processo ${formattedNumber} submetido para análise interna / aprovação por ${user.name} (${user.role}).`,
      },
    });

    return updated;
  });

  return {
    success: true,
    message: `Processo ${formattedNumber} submetido com sucesso para análise interna.`,
    process: {
      id: updatedProcess.id,
      number: updatedProcess.number,
      year: updatedProcess.year,
      status: updatedProcess.status,
      title: updatedProcess.title,
      updatedAt: updatedProcess.updatedAt.toISOString(),
    },
    completeness,
  };
}

const submissionService = {
  SUBMITTABLE_SOURCE_STATUSES,
  LOCKED_SUBMISSION_STATUSES,
  canUserSubmitProcess,
  validateProcessCompleteness,
  submitProcess,
};

export default submissionService;
