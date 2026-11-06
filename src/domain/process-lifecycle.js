import {
  ConflictError,
  ForbiddenError,
  ValidationError,
} from "@/infra/errors.js";

/**
 * Domain constants for Process Statuses.
 */
export const PROCESS_STATUS = Object.freeze({
  DRAFT: "DRAFT",
  IN_ANALYSIS: "IN_ANALYSIS",
  PRICE_RESEARCH: "PRICE_RESEARCH",
  SUPPLIER_SELECTED: "SUPPLIER_SELECTED",
  AWAITING_APPROVAL: "AWAITING_APPROVAL",
  RETURNED_FOR_ADJUSTMENT: "RETURNED_FOR_ADJUSTMENT",
  REJECTED: "REJECTED",
  APPROVED: "APPROVED",
  AWAITING_FINAL_AUTHORIZATION: "AWAITING_FINAL_AUTHORIZATION",
  AWAITING_PUBLICATION: "AWAITING_PUBLICATION",
  FINAL_AUTHORIZATION_REFUSED: "FINAL_AUTHORIZATION_REFUSED",
  COMPLETED: "COMPLETED",
});

/**
 * Canonical array of all recognized process statuses.
 */
export const ALL_PROCESS_STATUSES = Object.freeze(
  Object.values(PROCESS_STATUS),
);

/**
 * Terminal statuses that represent closed lifecycles with no further transitions.
 */
export const TERMINAL_STATUSES = Object.freeze([
  PROCESS_STATUS.REJECTED,
  PROCESS_STATUS.FINAL_AUTHORIZATION_REFUSED,
  PROCESS_STATUS.COMPLETED,
]);

/**
 * Allowed status transitions matrix.
 * Enforces strict, non-arbitrary state changes across Phases 1 through 5.
 */
export const ALLOWED_TRANSITIONS = Object.freeze({
  [PROCESS_STATUS.DRAFT]: Object.freeze([PROCESS_STATUS.IN_ANALYSIS]),
  [PROCESS_STATUS.IN_ANALYSIS]: Object.freeze([
    PROCESS_STATUS.AWAITING_APPROVAL,
    PROCESS_STATUS.RETURNED_FOR_ADJUSTMENT,
  ]),
  [PROCESS_STATUS.PRICE_RESEARCH]: Object.freeze([
    PROCESS_STATUS.SUPPLIER_SELECTED,
    PROCESS_STATUS.IN_ANALYSIS,
  ]),
  [PROCESS_STATUS.SUPPLIER_SELECTED]: Object.freeze([
    PROCESS_STATUS.IN_ANALYSIS,
  ]),
  [PROCESS_STATUS.AWAITING_APPROVAL]: Object.freeze([
    PROCESS_STATUS.APPROVED,
    PROCESS_STATUS.RETURNED_FOR_ADJUSTMENT,
    PROCESS_STATUS.REJECTED,
  ]),
  [PROCESS_STATUS.RETURNED_FOR_ADJUSTMENT]: Object.freeze([
    PROCESS_STATUS.IN_ANALYSIS,
  ]),
  [PROCESS_STATUS.APPROVED]: Object.freeze([
    PROCESS_STATUS.AWAITING_FINAL_AUTHORIZATION,
  ]),
  [PROCESS_STATUS.AWAITING_FINAL_AUTHORIZATION]: Object.freeze([
    PROCESS_STATUS.AWAITING_PUBLICATION,
    PROCESS_STATUS.FINAL_AUTHORIZATION_REFUSED,
    PROCESS_STATUS.RETURNED_FOR_ADJUSTMENT,
  ]),
  [PROCESS_STATUS.AWAITING_PUBLICATION]: Object.freeze([
    PROCESS_STATUS.COMPLETED,
  ]),
  [PROCESS_STATUS.REJECTED]: Object.freeze([]),
  [PROCESS_STATUS.FINAL_AUTHORIZATION_REFUSED]: Object.freeze([]),
  [PROCESS_STATUS.COMPLETED]: Object.freeze([]),
});

/**
 * Valid final authorization decisions.
 */
export const FINAL_AUTHORIZATION_DECISION = Object.freeze({
  AUTHORIZED: "AUTHORIZED",
  REFUSED: "REFUSED",
  ADJUSTMENT_REQUESTED: "ADJUSTMENT_REQUESTED",
});

/**
 * Valid publication types for academic simulation of Brazilian procurement (Lei 14.133/2021).
 */
export const PUBLICATION_TYPE = Object.freeze({
  DIRECT_AWARD_NOTICE: "DIRECT_AWARD_NOTICE",
  AUTHORIZATION_EXTRACT: "AUTHORIZATION_EXTRACT",
  CONTRACT_EXTRACT: "CONTRACT_EXTRACT",
  OTHER: "OTHER",
});

/**
 * Checks whether a given status transition is valid in the domain state machine.
 */
export function isValidTransition(fromStatus, toStatus) {
  if (!fromStatus || !toStatus) return false;
  const allowed = ALLOWED_TRANSITIONS[fromStatus];
  if (!allowed) return false;
  return allowed.includes(toStatus);
}

/**
 * Asserts that a transition from `fromStatus` to `toStatus` is valid, throwing an informative error otherwise.
 */
export function assertValidTransition(fromStatus, toStatus) {
  if (!ALL_PROCESS_STATUSES.includes(fromStatus)) {
    throw new ValidationError({
      message: `Status de origem '${fromStatus}' não é reconhecido.`,
      action: `Status válidos: ${ALL_PROCESS_STATUSES.join(", ")}.`,
    });
  }

  if (!ALL_PROCESS_STATUSES.includes(toStatus)) {
    throw new ValidationError({
      message: `Status de destino '${toStatus}' não é reconhecido.`,
      action: `Status válidos: ${ALL_PROCESS_STATUSES.join(", ")}.`,
    });
  }

  if (TERMINAL_STATUSES.includes(fromStatus)) {
    throw new ConflictError({
      message: `Processo em status terminal '${fromStatus}' não permite novas transições.`,
      action:
        "Processos concluídos ou recusados definitivamente estão encerrados.",
    });
  }

  if (!isValidTransition(fromStatus, toStatus)) {
    const allowed = ALLOWED_TRANSITIONS[fromStatus] || [];
    throw new ConflictError({
      message: `Transição de status inválida: de '${fromStatus}' para '${toStatus}'.`,
      action:
        allowed.length > 0
          ? `Transições permitidas a partir de '${fromStatus}': ${allowed.join(", ")}.`
          : `O status '${fromStatus}' não permite transições.`,
    });
  }
}

/**
 * Authoritative workflow cycle calculation.
 * Ensures consistent cycle incrementing across Phase 4 internal approvals
 * and Phase 5 final authorization cycles.
 */
export function calculateNextWorkflowCycle({
  approvals = [],
  finalAuthorizations = [],
  isResubmission = false,
} = {}) {
  const approvalCycles = approvals
    .filter((a) => !a.deletedAt)
    .map((a) => a.cycle)
    .filter(Number.isInteger);
  const finalAuthCycles = finalAuthorizations
    .filter((f) => !f.deletedAt)
    .map((f) => f.cycle)
    .filter(Number.isInteger);
  const allCycles = [...approvalCycles, ...finalAuthCycles];
  const maxCycle = allCycles.length > 0 ? Math.max(...allCycles) : 0;
  return isResubmission ? maxCycle + 1 : Math.max(1, maxCycle);
}

/**
 * Checks whether an authenticated user is authorized to initiate final authorization.
 * Under Phase 5 responsibility model: AGENTE_CONTRATACAO initiates final authorization
 * for an APPROVED process in their department.
 */
export function canUserInitiateFinalAuthorization(user, processRecord) {
  if (!user || !processRecord) return false;
  if (processRecord.deletedAt || user.isActive === false) return false;

  // Process must be in APPROVED status (completed Phase 4 internal approval)
  if (processRecord.status !== PROCESS_STATUS.APPROVED) {
    return false;
  }

  // Strictly AGENTE_CONTRATACAO role
  if (user.role !== "AGENTE_CONTRATACAO") return false;

  // Department must be assigned and match process department (strict fail-closed isolation)
  const processDepartmentId =
    processRecord.departmentId || processRecord.department?.id;
  if (!user.departmentId || !processDepartmentId) return false;
  if (user.departmentId !== processDepartmentId) return false;

  // Segregation of duties: cannot act on a process they originally requested
  const requesterId =
    processRecord.requesterId ||
    processRecord.requester?.id ||
    processRecord.userId ||
    processRecord.user?.id;
  if (requesterId && requesterId === user.id) return false;

  return true;
}

/**
 * Checks whether an authenticated user is authorized to act as AUTORIDADE_COMPETENTE on a process.
 * Enforces role match, strict fail-closed department scoping, segregation of duties, and status.
 */
export function canUserActOnFinalAuthorization(user, processRecord) {
  if (!user || !processRecord) return false;
  if (processRecord.deletedAt || user.isActive === false) return false;

  // Process must be explicitly awaiting final authorization
  if (processRecord.status !== PROCESS_STATUS.AWAITING_FINAL_AUTHORIZATION) {
    return false;
  }

  // Strictly AUTORIDADE_COMPETENTE role
  if (user.role !== "AUTORIDADE_COMPETENTE") return false;

  // Department must be assigned and match process department (strict fail-closed isolation)
  const processDepartmentId =
    processRecord.departmentId || processRecord.department?.id;
  if (!user.departmentId || !processDepartmentId) return false;
  if (user.departmentId !== processDepartmentId) return false;

  // Segregation of duties: authority cannot review or authorize a process they originally requested
  const requesterId =
    processRecord.requesterId ||
    processRecord.requester?.id ||
    processRecord.userId ||
    processRecord.user?.id;
  if (requesterId && requesterId === user.id) return false;

  return true;
}

/**
 * Checks whether an authenticated user is authorized to register publication data on an authorized process.
 * Under Phase 5 responsibility model: AGENTE_CONTRATACAO performs publication registration for their department.
 */
export function canUserRegisterPublication(user, processRecord) {
  if (!user || !processRecord) return false;
  if (processRecord.deletedAt || user.isActive === false) return false;

  // Process must be awaiting publication
  if (processRecord.status !== PROCESS_STATUS.AWAITING_PUBLICATION) {
    return false;
  }

  // AGENTE_CONTRATACAO role
  if (user.role !== "AGENTE_CONTRATACAO") return false;

  // Department must match
  const processDepartmentId =
    processRecord.departmentId || processRecord.department?.id;
  if (!user.departmentId || !processDepartmentId) return false;
  if (user.departmentId !== processDepartmentId) return false;

  // Segregation of duties: cannot publish own requested process
  const requesterId =
    processRecord.requesterId ||
    processRecord.requester?.id ||
    processRecord.userId ||
    processRecord.user?.id;
  if (requesterId && requesterId === user.id) return false;

  return true;
}

/**
 * Validates a final authorization decision payload according to decision type.
 */
export function validateFinalAuthorizationPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new ValidationError({
      message: "Dados de autorização final inválidos.",
      action: "Envie um objeto com decision e justification.",
    });
  }

  const { decision, justification } = payload;
  const validDecisions = Object.values(FINAL_AUTHORIZATION_DECISION);

  if (!decision || !validDecisions.includes(decision)) {
    throw new ValidationError({
      message: `Decisão de autorização final inválida: '${decision}'.`,
      action: `Decisões válidas: ${validDecisions.join(", ")}.`,
    });
  }

  const normalizedJustification =
    typeof justification === "string" ? justification.trim() : "";

  if (
    decision === FINAL_AUTHORIZATION_DECISION.REFUSED ||
    decision === FINAL_AUTHORIZATION_DECISION.ADJUSTMENT_REQUESTED
  ) {
    if (!normalizedJustification || normalizedJustification.length < 10) {
      throw new ValidationError({
        message:
          decision === FINAL_AUTHORIZATION_DECISION.REFUSED
            ? "A fundamentação formal da recusa é obrigatória (mínimo de 10 caracteres)."
            : "A justificativa do pedido de ajuste é obrigatória (mínimo de 10 caracteres).",
        action: "Forneça uma fundamentação detalhada para a decisão.",
      });
    }
  }

  return {
    decision,
    justification: normalizedJustification || null,
  };
}

/**
 * Validates a publication record payload.
 */
export function validatePublicationRecordPayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new ValidationError({
      message: "Dados de registro de publicação inválidos.",
      action: "Envie um objeto com os dados da publicação.",
    });
  }

  const {
    publicationType,
    destination,
    publishedAt,
    referenceNumber,
    url,
    documentId,
  } = payload;

  const validTypes = Object.values(PUBLICATION_TYPE);
  if (!publicationType || !validTypes.includes(publicationType)) {
    throw new ValidationError({
      message: `Tipo de publicação inválido: '${publicationType}'.`,
      action: `Tipos válidos: ${validTypes.join(", ")}.`,
    });
  }

  if (!destination || typeof destination !== "string" || !destination.trim()) {
    throw new ValidationError({
      message: "O veículo/destino de publicação é obrigatório.",
      action:
        "Informe o destino da publicação (ex: PNCP, Diário Oficial, Portal da Transparência).",
    });
  }

  if (!publishedAt) {
    throw new ValidationError({
      message: "A data da publicação é obrigatória.",
      action: "Informe a data em que o ato foi publicado.",
    });
  }

  const parsedDate = new Date(publishedAt);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new ValidationError({
      message: "Data de publicação inválida.",
      action: "Envie uma data no formato ISO válido.",
    });
  }

  const now = new Date();
  if (parsedDate.getTime() > now.getTime() + 24 * 60 * 60 * 1000) {
    throw new ValidationError({
      message: "A data de publicação não pode ser uma data futura.",
      action: "Informe a data em que o ato foi efetivamente publicado.",
    });
  }

  if (parsedDate.getFullYear() < 2000) {
    throw new ValidationError({
      message: "Data de publicação inválida.",
      action: "Informe uma data de publicação contemporânea.",
    });
  }

  if (
    url !== undefined &&
    url !== null &&
    typeof url === "string" &&
    url.trim()
  ) {
    try {
      const parsedUrl = new URL(url.trim());
      if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
        throw new Error("Invalid protocol");
      }
    } catch {
      throw new ValidationError({
        message: "URL de publicação inválida.",
        action: "Informe uma URL válida com protocolo HTTP ou HTTPS.",
      });
    }
  }

  if (
    documentId !== undefined &&
    documentId !== null &&
    typeof documentId === "string" &&
    documentId.trim()
  ) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(documentId.trim())) {
      throw new ValidationError({
        message: "Identificador de documento inválido.",
        action: "Forneça um UUID válido para o documento comprobatório.",
      });
    }
  }

  return {
    publicationType,
    destination: destination.trim(),
    publishedAt: parsedDate,
    referenceNumber: referenceNumber?.trim() || null,
    url: url?.trim() || null,
    documentId: documentId?.trim() || null,
  };
}
