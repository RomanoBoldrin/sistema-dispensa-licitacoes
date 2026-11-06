import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/infra/errors.js";
import { prisma } from "@/infra/prisma.js";
import { isValidUuid } from "./process.service.js";
import {
  FINAL_AUTHORIZATION_DECISION,
  PROCESS_STATUS,
  assertValidTransition,
  calculateNextWorkflowCycle,
  canUserActOnFinalAuthorization,
  canUserInitiateFinalAuthorization,
  validateFinalAuthorizationPayload,
} from "@/domain/process-lifecycle.js";

/**
 * Initiates the final authorization stage for a process that has completed
 * Phase 4 internal approval (status APPROVED).
 *
 * Operational Actor: AGENTE_CONTRATACAO of the process department.
 * Transitions: APPROVED -> AWAITING_FINAL_AUTHORIZATION.
 */
export async function initiateFinalAuthorization(processId, user) {
  if (!isValidUuid(processId)) {
    throw new ValidationError({
      message: "Identificador de processo inválido.",
      action: "Forneça um UUID válido para o processo.",
    });
  }

  if (!user) {
    throw new ForbiddenError({
      message: "Usuário não autenticado.",
      action: "Faça login para realizar esta operação.",
    });
  }

  const processRecord = await prisma.process.findFirst({
    where: { id: processId, deletedAt: null },
    include: {
      department: true,
      requester: { select: { id: true, name: true, email: true } },
      approvals: {
        where: { deletedAt: null },
        orderBy: [{ cycle: "desc" }, { createdAt: "desc" }],
      },
      finalAuthorizations: {
        where: { deletedAt: null },
        orderBy: [{ cycle: "desc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!processRecord) {
    throw new NotFoundError({
      message: "Processo não encontrado.",
      action: "Verifique o identificador do processo.",
    });
  }

  // 1. Role verification
  if (user.role !== "AGENTE_CONTRATACAO") {
    throw new ForbiddenError({
      message:
        "Apenas o Agente de Contratação responsável pelo processo pode encaminhá-lo para a Autoridade Competente.",
      action:
        "Solicite ao Agente de Contratação do departamento para iniciar a autorização final.",
    });
  }

  // 2. Department isolation (fail-closed)
  if (!user.departmentId || user.departmentId !== processRecord.departmentId) {
    throw new ForbiddenError({
      message:
        "Você não tem permissão para atuar em processos de outro departamento.",
      action:
        "Apenas agentes de contratação do mesmo departamento podem atuar no processo.",
    });
  }

  // 3. Segregation of duties: cannot initiate on own requested process
  const requesterId =
    processRecord.requesterId ||
    processRecord.requester?.id ||
    processRecord.userId;
  if (requesterId && requesterId === user.id) {
    throw new ForbiddenError({
      message:
        "O solicitante do processo não pode atuar como agente de contratação para encaminhá-lo à autoridade competente.",
      action:
        "A ação deve ser realizada por outro agente de contratação do departamento.",
    });
  }

  // 4. Lifecycle status validation
  if (processRecord.status !== PROCESS_STATUS.APPROVED) {
    throw new ConflictError({
      message: `Processo em status '${processRecord.status}' não pode ser encaminhado para autorização final.`,
      action:
        "O processo deve estar com a aprovação interna concluída (status APPROVED).",
    });
  }

  // 5. Phase 4 internal approval verification
  const hasApprovedInternal = processRecord.approvals?.some(
    (a) => a.stage === "APPROVAL" && a.decision === "APPROVED",
  );
  if (!hasApprovedInternal) {
    throw new ConflictError({
      message: "O processo não possui aprovação interna concluída.",
      action:
        "Conclua todas as etapas da aprovação interna antes de encaminhar à autoridade competente.",
    });
  }

  // 6. Workflow cycle calculation
  const currentCycle = calculateNextWorkflowCycle({
    approvals: processRecord.approvals,
    finalAuthorizations: processRecord.finalAuthorizations,
    isResubmission: false,
  });

  // 7. Verify no existing final authorization decision for this cycle
  const existingDecision = processRecord.finalAuthorizations?.find(
    (fa) => fa.cycle === currentCycle && !fa.deletedAt,
  );
  if (existingDecision) {
    throw new ConflictError({
      message: `Já existe uma deliberação registrada para o ciclo atual (${currentCycle}).`,
      action:
        "Não é permitido iniciar novamente a autorização final no mesmo ciclo.",
    });
  }

  // 8. Atomic transition and audit logging
  const updatedProcess = await prisma.$transaction(async (tx) => {
    const freshProcess = await tx.process.findFirst({
      where: { id: processId, deletedAt: null },
    });

    if (!freshProcess || freshProcess.status !== PROCESS_STATUS.APPROVED) {
      throw new ConflictError({
        message:
          "O status do processo mudou concorrentemente e não permite encaminhamento para autorização final.",
        action: "Atualize a página para consultar o status atual.",
      });
    }

    assertValidTransition(
      freshProcess.status,
      PROCESS_STATUS.AWAITING_FINAL_AUTHORIZATION,
    );

    const updated = await tx.process.update({
      where: { id: processId },
      data: { status: PROCESS_STATUS.AWAITING_FINAL_AUTHORIZATION },
    });

    await tx.auditLog.create({
      data: {
        processId,
        userId: user.id,
        action: "FINAL_AUTHORIZATION_INITIATED",
        fromStatus: PROCESS_STATUS.APPROVED,
        toStatus: PROCESS_STATUS.AWAITING_FINAL_AUTHORIZATION,
        description: `Processo encaminhado para deliberação da Autoridade Competente (Ciclo ${currentCycle}).`,
      },
    });

    return updated;
  });

  return {
    success: true,
    processId: updatedProcess.id,
    status: updatedProcess.status,
    cycle: currentCycle,
    message: "Processo encaminhado com sucesso para a Autoridade Competente.",
  };
}

/**
 * Lists pending final authorization tasks for the authenticated AUTORIDADE_COMPETENTE.
 * Enforces strict department isolation and restricts access exclusively to AUTORIDADE_COMPETENTE.
 * ADMIN cannot access the decision inbox.
 */
export async function listPendingFinalAuthorizations(user, query = {}) {
  if (!user) {
    throw new ForbiddenError({
      message: "Usuário não autenticado.",
      action: "Faça login para acessar a caixa de deliberação final.",
    });
  }

  if (user.role !== "AUTORIDADE_COMPETENTE") {
    throw new ForbiddenError({
      message:
        "Apenas a Autoridade Competente tem acesso à caixa de deliberação final.",
      action: "Acesso restrito ao perfil AUTORIDADE_COMPETENTE.",
    });
  }

  if (!user.departmentId) {
    return {
      tasks: [],
      meta: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
    };
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(query.pageSize, 10) || 20),
  );
  const skip = (page - 1) * pageSize;

  const where = {
    deletedAt: null,
    status: PROCESS_STATUS.AWAITING_FINAL_AUTHORIZATION,
    departmentId: user.departmentId,
  };

  if (query.search) {
    const term = String(query.search).trim();
    const num = parseInt(term, 10);
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { object: { contains: term, mode: "insensitive" } },
      ...(!isNaN(num) ? [{ number: num }] : []),
    ];
  }

  const [total, processes] = await Promise.all([
    prisma.process.count({ where }),
    prisma.process.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: [{ year: "desc" }, { number: "desc" }],
      include: {
        department: { select: { id: true, name: true } },
        requester: { select: { id: true, name: true, email: true } },
        selectedSupplier: {
          select: { id: true, legalName: true, tradeName: true, cnpj: true },
        },
        approvals: {
          where: { deletedAt: null },
          orderBy: [{ cycle: "desc" }, { createdAt: "desc" }],
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
        finalAuthorizations: {
          where: { deletedAt: null },
          orderBy: [{ cycle: "desc" }, { createdAt: "desc" }],
        },
      },
    }),
  ]);

  const tasks = processes.map((p) => {
    const currentCycle = calculateNextWorkflowCycle({
      approvals: p.approvals,
      finalAuthorizations: p.finalAuthorizations,
      isResubmission: false,
    });

    const lastApproval = p.approvals.find(
      (a) => a.stage === "APPROVAL" && a.decision === "APPROVED",
    );

    const requesterId = p.requesterId || p.requester?.id || p.userId;
    const isRequester = requesterId === user.id;

    return {
      id: p.id,
      number: p.number,
      year: p.year,
      formattedNumber: `DP-${String(p.number).padStart(3, "0")}/${p.year}`,
      title: p.title,
      object: p.object,
      estimatedValue: p.estimatedValue ? Number(p.estimatedValue) : null,
      status: p.status,
      department: p.department,
      requester: p.requester,
      selectedSupplier: p.selectedSupplier,
      currentCycle,
      canDecide: !isRequester,
      internalApproval: lastApproval
        ? {
            decidedAt: lastApproval.decidedAt,
            decidedBy: lastApproval.user ? lastApproval.user.name : null,
            comment: lastApproval.comment,
            cycle: lastApproval.cycle,
          }
        : null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  });

  return {
    tasks,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * Retrieves full final authorization details for an authenticated AUTORIDADE_COMPETENTE.
 * Strictly department-isolated. ADMIN cannot bypass.
 */
export async function getFinalAuthorizationDetails(processId, user) {
  if (!isValidUuid(processId)) {
    throw new ValidationError({
      message: "Identificador de processo inválido.",
      action: "Forneça um UUID válido para o processo.",
    });
  }

  if (!user) {
    throw new ForbiddenError({
      message: "Usuário não autenticado.",
      action: "Faça login para consultar este processo.",
    });
  }

  if (user.role !== "AUTORIDADE_COMPETENTE") {
    throw new ForbiddenError({
      message:
        "Apenas a Autoridade Competente pode consultar os detalhes de deliberação final.",
      action: "Acesso restrito ao perfil AUTORIDADE_COMPETENTE.",
    });
  }

  if (!user.departmentId) {
    throw new ForbiddenError({
      message: "Usuário sem departamento atribuído.",
      action:
        "Contate o administrador para vincular seu perfil a um departamento.",
    });
  }

  const processRecord = await prisma.process.findFirst({
    where: { id: processId, deletedAt: null },
    include: {
      department: true,
      requester: { select: { id: true, name: true, email: true } },
      selectedSupplier: true,
      demandDocument: true,
      quotations: {
        include: { supplier: true },
        orderBy: { value: "asc" },
      },
      documents: {
        where: { isActive: true, deletedAt: null },
        select: {
          id: true,
          type: true,
          filename: true,
          size: true,
          createdAt: true,
        },
      },
      approvals: {
        where: { deletedAt: null },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: [{ cycle: "asc" }, { createdAt: "asc" }],
      },
      finalAuthorizations: {
        where: { deletedAt: null },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
        orderBy: [{ cycle: "asc" }, { createdAt: "asc" }],
      },
    },
  });

  if (!processRecord) {
    throw new NotFoundError({
      message: "Processo não encontrado.",
      action: "Verifique o identificador do processo.",
    });
  }

  if (processRecord.departmentId !== user.departmentId) {
    throw new ForbiddenError({
      message:
        "Você não tem permissão para acessar processos de outro departamento.",
      action:
        "Acesso restrito ao departamento de lotação da Autoridade Competente.",
    });
  }

  const currentCycle = calculateNextWorkflowCycle({
    approvals: processRecord.approvals,
    finalAuthorizations: processRecord.finalAuthorizations,
    isResubmission: false,
  });

  const canDecide = canUserActOnFinalAuthorization(user, processRecord);
  const requesterId =
    processRecord.requesterId ||
    processRecord.requester?.id ||
    processRecord.userId;
  const isRequester = requesterId === user.id;

  // Separate historical decisions from current cycle decision
  const historicalDecisions = processRecord.finalAuthorizations
    .filter((fa) => fa.cycle < currentCycle)
    .map((fa) => ({
      id: fa.id,
      cycle: fa.cycle,
      decision: fa.decision,
      justification: fa.justification,
      decidedAt: fa.decidedAt,
      decidedBy: fa.user ? { id: fa.user.id, name: fa.user.name } : null,
    }));

  const currentCycleDecision =
    processRecord.finalAuthorizations
      .filter((fa) => fa.cycle === currentCycle)
      .map((fa) => ({
        id: fa.id,
        cycle: fa.cycle,
        decision: fa.decision,
        justification: fa.justification,
        decidedAt: fa.decidedAt,
        decidedBy: fa.user ? { id: fa.user.id, name: fa.user.name } : null,
      }))[0] || null;

  return {
    id: processRecord.id,
    number: processRecord.number,
    year: processRecord.year,
    formattedNumber: `DP-${String(processRecord.number).padStart(3, "0")}/${processRecord.year}`,
    title: processRecord.title,
    object: processRecord.object,
    description: processRecord.description,
    estimatedValue: processRecord.estimatedValue
      ? Number(processRecord.estimatedValue)
      : null,
    status: processRecord.status,
    legalBasis: processRecord.legalBasis,
    legalJustification: processRecord.legalJustification,
    department: processRecord.department,
    requester: processRecord.requester,
    selectedSupplier: processRecord.selectedSupplier,
    currentCycle,
    canDecide,
    decisionRestrictionReason: !canDecide
      ? isRequester
        ? "A autoridade competente solicitou o processo e não pode deliberar (Segregação de Funções)."
        : processRecord.status !== PROCESS_STATUS.AWAITING_FINAL_AUTHORIZATION
          ? `Processo não está aguardando autorização final (status atual: ${processRecord.status}).`
          : "Usuário não autorizado a deliberar sobre este processo."
      : null,
    approvals: processRecord.approvals.map((a) => ({
      id: a.id,
      stage: a.stage,
      cycle: a.cycle,
      decision: a.decision,
      comment: a.comment,
      decidedAt: a.decidedAt,
      decidedBy: a.user ? { id: a.user.id, name: a.user.name } : null,
    })),
    historicalDecisions,
    currentCycleDecision,
    documents: processRecord.documents,
    quotationsCount: processRecord.quotations.length,
    createdAt: processRecord.createdAt,
    updatedAt: processRecord.updatedAt,
  };
}

/**
 * Grants final authorization for a process.
 * Status transition: AWAITING_FINAL_AUTHORIZATION -> AWAITING_PUBLICATION.
 */
export async function authorizeProcess(processId, user, payload = {}) {
  return await recordFinalAuthorizationDecision({
    processId,
    user,
    decision: FINAL_AUTHORIZATION_DECISION.AUTHORIZED,
    payload,
    targetStatus: PROCESS_STATUS.AWAITING_PUBLICATION,
    auditAction: "FINAL_AUTHORIZATION_GRANTED",
    defaultDescription:
      "Autorização final concedida pela Autoridade Competente.",
  });
}

/**
 * Refuses final authorization for a process.
 * Status transition: AWAITING_FINAL_AUTHORIZATION -> FINAL_AUTHORIZATION_REFUSED (Terminal).
 * Mandatory justification (minimum 10 chars).
 */
export async function refuseFinalAuthorization(processId, user, payload = {}) {
  return await recordFinalAuthorizationDecision({
    processId,
    user,
    decision: FINAL_AUTHORIZATION_DECISION.REFUSED,
    payload,
    targetStatus: PROCESS_STATUS.FINAL_AUTHORIZATION_REFUSED,
    auditAction: "FINAL_AUTHORIZATION_REFUSED",
    defaultDescription:
      "Autorização final recusada pela Autoridade Competente.",
  });
}

/**
 * Requests adjustments on a process during final authorization.
 * Status transition: AWAITING_FINAL_AUTHORIZATION -> RETURNED_FOR_ADJUSTMENT.
 * Mandatory justification (minimum 10 chars).
 */
export async function requestFinalAuthorizationAdjustments(
  processId,
  user,
  payload = {},
) {
  return await recordFinalAuthorizationDecision({
    processId,
    user,
    decision: FINAL_AUTHORIZATION_DECISION.ADJUSTMENT_REQUESTED,
    payload,
    targetStatus: PROCESS_STATUS.RETURNED_FOR_ADJUSTMENT,
    auditAction: "FINAL_AUTHORIZATION_ADJUSTMENT_REQUESTED",
    defaultDescription: "Ajustes solicitados pela Autoridade Competente.",
  });
}

/**
 * Shared atomic transaction implementation for final authorization decisions.
 * Enforces pessimistic state validation, department isolation, segregation of duties,
 * cycle synchronization, conflict error handling, and audit trail consistency.
 */
async function recordFinalAuthorizationDecision({
  processId,
  user,
  decision,
  payload,
  targetStatus,
  auditAction,
  defaultDescription,
}) {
  if (!isValidUuid(processId)) {
    throw new ValidationError({
      message: "Identificador de processo inválido.",
      action: "Forneça um UUID válido para o processo.",
    });
  }

  if (!user) {
    throw new ForbiddenError({
      message: "Usuário não autenticado.",
      action: "Faça login para realizar esta operação.",
    });
  }

  // 1. Domain payload validation (enforces minimum justification lengths per decision type)
  const validatedPayload = validateFinalAuthorizationPayload({
    decision,
    justification: payload?.justification,
  });

  // 2. Atomic transaction with optimistic/pessimistic concurrency checks
  return await prisma.$transaction(async (tx) => {
    // Fresh read inside the transaction
    const processRecord = await tx.process.findFirst({
      where: { id: processId, deletedAt: null },
      include: {
        department: true,
        requester: { select: { id: true, name: true, email: true } },
        approvals: { where: { deletedAt: null } },
        finalAuthorizations: { where: { deletedAt: null } },
      },
    });

    if (!processRecord) {
      throw new NotFoundError({
        message: "Processo não encontrado.",
        action: "Verifique o identificador do processo.",
      });
    }

    // Role check
    if (user.role !== "AUTORIDADE_COMPETENTE") {
      throw new ForbiddenError({
        message:
          "Apenas a Autoridade Competente pode deliberar sobre a autorização final.",
        action: "Ação restrita ao perfil AUTORIDADE_COMPETENTE.",
      });
    }

    // Department check
    if (
      !user.departmentId ||
      user.departmentId !== processRecord.departmentId
    ) {
      throw new ForbiddenError({
        message:
          "Você não tem permissão para deliberar sobre processos de outro departamento.",
        action:
          "Apenas a autoridade competente do departamento do processo pode deliberar.",
      });
    }

    // Segregation of duties: cannot deliberate on own requested process
    const requesterId =
      processRecord.requesterId ||
      processRecord.requester?.id ||
      processRecord.userId;
    if (requesterId && requesterId === user.id) {
      throw new ForbiddenError({
        message:
          "A autoridade competente não pode deliberar sobre um processo que ela mesma solicitou (Segregação de Funções).",
        action:
          "A deliberação deve ser realizada por outra autoridade competente do departamento.",
      });
    }

    // Process status check
    if (processRecord.status !== PROCESS_STATUS.AWAITING_FINAL_AUTHORIZATION) {
      throw new ConflictError({
        message: `Processo não está aguardando autorização final (status atual: ${processRecord.status}).`,
        action:
          "Apenas processos em AWAITING_FINAL_AUTHORIZATION podem receber deliberação final.",
      });
    }

    // Calculate current workflow cycle
    const currentCycle = calculateNextWorkflowCycle({
      approvals: processRecord.approvals,
      finalAuthorizations: processRecord.finalAuthorizations,
      isResubmission: false,
    });

    // Verify no existing decision for this cycle
    const existingDecision = processRecord.finalAuthorizations.find(
      (fa) => fa.cycle === currentCycle && !fa.deletedAt,
    );
    if (existingDecision) {
      throw new ConflictError({
        message: `Já existe uma deliberação registrada para o ciclo atual (${currentCycle}).`,
        action:
          "Não é permitido registrar deliberações conflitantes no mesmo ciclo.",
      });
    }

    // Validate lifecycle transition
    assertValidTransition(processRecord.status, targetStatus);

    // Create FinalAuthorization record with unique constraint protection
    let finalAuth;
    try {
      finalAuth = await tx.finalAuthorization.create({
        data: {
          processId: processRecord.id,
          userId: user.id,
          decision,
          justification: validatedPayload.justification || null,
          cycle: currentCycle,
          decidedAt: new Date(),
        },
      });
    } catch (dbError) {
      if (dbError.code === "P2002") {
        throw new ConflictError({
          message:
            "Conflito de concorrência: deliberação já registrada para este processo e ciclo.",
          action: "Atualize a página para consultar a deliberação existente.",
        });
      }
      throw dbError;
    }

    // Advance process status
    const updatedProcess = await tx.process.update({
      where: { id: processRecord.id },
      data: { status: targetStatus },
    });

    // Record audit event in the same transaction
    const auditDescription = validatedPayload.justification
      ? `${defaultDescription} (Ciclo ${currentCycle}): ${validatedPayload.justification}`
      : `${defaultDescription} (Ciclo ${currentCycle}).`;

    await tx.auditLog.create({
      data: {
        processId: processRecord.id,
        userId: user.id,
        action: auditAction,
        fromStatus: PROCESS_STATUS.AWAITING_FINAL_AUTHORIZATION,
        toStatus: targetStatus,
        description: auditDescription,
      },
    });

    return {
      success: true,
      processId: updatedProcess.id,
      status: updatedProcess.status,
      decision,
      cycle: currentCycle,
      finalAuthorization: {
        id: finalAuth.id,
        decision: finalAuth.decision,
        justification: finalAuth.justification,
        cycle: finalAuth.cycle,
        decidedAt: finalAuth.decidedAt,
      },
      message: defaultDescription,
    };
  });
}

const finalAuthorizationService = {
  initiateFinalAuthorization,
  listPendingFinalAuthorizations,
  getFinalAuthorizationDetails,
  authorizeProcess,
  refuseFinalAuthorization,
  requestFinalAuthorizationAdjustments,
};

export default finalAuthorizationService;
