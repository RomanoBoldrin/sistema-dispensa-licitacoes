import {
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/infra/errors.js";
import { prisma } from "@/infra/prisma.js";
import {
  ANNUAL_THRESHOLDS,
  DEFAULT_THRESHOLD_YEAR,
  getThresholdForYear,
  LEGAL_HYPOTHESES,
  identifyHypothesis,
  validateLegalClassification,
} from "@/domain/legal-classification.js";
import { canUserEditProcess, isValidUuid } from "./process.service.js";

export {
  ANNUAL_THRESHOLDS,
  DEFAULT_THRESHOLD_YEAR,
  getThresholdForYear,
  LEGAL_HYPOTHESES,
  identifyHypothesis,
  validateLegalClassification,
};

/**
 * Updates the legal classification of a process.
 */
export async function updateProcessLegalClassification(
  processId,
  { legalBasis, legalJustification },
  user,
) {
  if (!isValidUuid(processId)) {
    throw new ValidationError({
      message: "Formato inválido para processId.",
      action: "Forneça um UUID válido para processId.",
    });
  }

  const existingProcess = await prisma.process.findFirst({
    where: {
      id: processId.trim(),
      deletedAt: null,
    },
    include: {
      demandDocument: true,
      quotations: true,
      documents: {
        where: { isActive: true, deletedAt: null },
      },
    },
  });

  if (!existingProcess) {
    throw new NotFoundError({
      message: "Processo não encontrado.",
      action: "Verifique o identificador do processo.",
    });
  }

  if (!canUserEditProcess(user, existingProcess)) {
    throw new ForbiddenError({
      message:
        "Você não tem autorização para atualizar o enquadramento deste processo.",
      action:
        "Somente o solicitante ou agente do departamento pode editar processos em rascunho.",
    });
  }

  if (
    legalBasis === undefined ||
    legalBasis === null ||
    !String(legalBasis).trim()
  ) {
    throw new ValidationError({
      message: "Enquadramento legal (legalBasis) é obrigatório.",
      action:
        "Selecione uma hipótese legal do Artigo 75 da Lei nº 14.133/2021.",
    });
  }

  const trimmedBasis = String(legalBasis).trim();
  const hypothesisKey = identifyHypothesis(trimmedBasis);
  if (!hypothesisKey) {
    throw new ValidationError({
      message: `Enquadramento legal '${trimmedBasis}' inválido.`,
      action:
        "Escolha uma hipótese válida do Art. 75 (ex.: ART_75_I, ART_75_II, ART_75_III, ART_75_VIII).",
    });
  }

  const normalizedJustification =
    legalJustification !== undefined && legalJustification !== null
      ? String(legalJustification).trim() || null
      : existingProcess.legalJustification;

  const validationResult = validateLegalClassification({
    ...existingProcess,
    legalBasis: trimmedBasis,
    legalJustification: normalizedJustification,
  });

  const updatedProcess = await prisma.$transaction(async (tx) => {
    const updated = await tx.process.update({
      where: { id: existingProcess.id },
      data: {
        legalBasis: trimmedBasis,
        legalJustification: normalizedJustification,
      },
    });

    await tx.auditLog.create({
      data: {
        processId: existingProcess.id,
        userId: user.id,
        action: "LEGAL_CLASSIFICATION_UPDATED",
        description: `Classificação legal atualizada para ${LEGAL_HYPOTHESES[hypothesisKey].shortLabel} (${LEGAL_HYPOTHESES[hypothesisKey].title}).`,
      },
    });

    return updated;
  });

  return {
    processId: updatedProcess.id,
    legalBasis: updatedProcess.legalBasis,
    legalJustification: updatedProcess.legalJustification,
    validation: validationResult,
  };
}

const legalService = {
  ANNUAL_THRESHOLDS,
  LEGAL_HYPOTHESES,
  getThresholdForYear,
  identifyHypothesis,
  validateLegalClassification,
  updateProcessLegalClassification,
};

export default legalService;
