import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/infra/errors.js";
import { prisma } from "@/infra/prisma.js";
import { canUserAccessProcess, isValidUuid } from "./process.service.js";
import { validateProcessCompleteness } from "./submission.service.js";

export const STAGE_CONFIG = {
  ANALYSIS: {
    stage: "ANALYSIS",
    label: "Análise Técnica & Instrução",
    role: "AGENTE_CONTRATACAO",
    expectedProcessStatus: "IN_ANALYSIS",
  },
  APPROVAL: {
    stage: "APPROVAL",
    label: "Aprovação Interna",
    role: "APROVADOR",
    expectedProcessStatus: "AWAITING_APPROVAL",
  },
};

/**
 * Validates whether an authenticated user is authorized to act on a given approval task.
 * Enforces stage role match, strict fail-closed department isolation,
 * segregation of duties (cannot review own process), and active task state.
 */
export function canUserActOnApprovalTask(user, processRecord, approvalTask) {
  if (!user || !processRecord || !approvalTask) return false;
  if (processRecord.deletedAt || approvalTask.deletedAt) return false;

  // Task must still be pending
  if (approvalTask.decision !== null) return false;

  const requesterId = processRecord.requesterId || processRecord.requester?.id;
  const departmentId =
    processRecord.departmentId || processRecord.department?.id;

  // Reviewer cannot review a process they requested (Segregation of Duties)
  if (requesterId === user.id) return false;

  // Fail-closed department isolation: user must have an assigned department matching process
  if (!user.departmentId) return false;
  if (user.departmentId !== departmentId) return false;

  // ADMIN cannot act as a reviewer (per RN-007 and fail-closed administrative boundary)
  if (user.role === "ADMIN") return false;

  // Role and status matching per stage
  if (approvalTask.stage === "ANALYSIS") {
    if (user.role !== "AGENTE_CONTRATACAO") return false;
    if (processRecord.status !== "IN_ANALYSIS") return false;
    return true;
  }

  if (approvalTask.stage === "APPROVAL") {
    if (user.role !== "APROVADOR") return false;
    if (processRecord.status !== "AWAITING_APPROVAL") return false;
    return true;
  }

  return false;
}

/**
 * Lists tasks in the internal approval inbox for the authenticated reviewer.
 */
export async function listApprovalInbox(user, query = {}) {
  if (!user) {
    throw new ForbiddenError({
      message: "Usuário não autenticado.",
      action: "Faça login para acessar a caixa de aprovações.",
    });
  }

  if (
    user.role !== "AGENTE_CONTRATACAO" &&
    user.role !== "APROVADOR" &&
    user.role !== "ADMIN"
  ) {
    throw new ForbiddenError({
      message: "Você não tem permissão para acessar a caixa de aprovação.",
      action:
        "Apenas agentes de contratação, aprovadores e administradores têm acesso.",
    });
  }

  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(query.pageSize, 10) || 20),
  );
  const skip = (page - 1) * pageSize;

  const where = {
    deletedAt: null,
    process: {
      deletedAt: null,
    },
  };

  // Status filter (PENDING, COMPLETED, ALL)
  const statusFilter = (query.status || "PENDING").toUpperCase();
  if (statusFilter === "PENDING") {
    where.decision = null;
  } else if (statusFilter === "COMPLETED") {
    where.decision = { not: null };
  } else if (statusFilter !== "ALL") {
    throw new ValidationError({
      message: "Filtro de status inválido.",
      action: "Use PENDING, COMPLETED ou ALL para o filtro de status.",
    });
  }

  // Stage filter (ANALYSIS, APPROVAL)
  if (query.stage) {
    const upperStage = String(query.stage).trim().toUpperCase();
    if (!["ANALYSIS", "APPROVAL"].includes(upperStage)) {
      throw new ValidationError({
        message: "Filtro de etapa inválido.",
        action: "Use ANALYSIS ou APPROVAL para o filtro de etapa.",
      });
    }
    where.stage = upperStage;
  }

  // Role and department-based scoping
  if (user.role === "AGENTE_CONTRATACAO") {
    if (!user.departmentId) {
      return {
        tasks: [],
        meta: { page, pageSize, total: 0, totalPages: 0 },
      };
    }
    where.assignedRole = "AGENTE_CONTRATACAO";
    where.stage = "ANALYSIS";
    where.process.departmentId = user.departmentId;
    where.process.requesterId = { not: user.id };
    if (statusFilter === "PENDING") {
      where.process.status = "IN_ANALYSIS";
    }
  } else if (user.role === "APROVADOR") {
    if (!user.departmentId) {
      return {
        tasks: [],
        meta: { page, pageSize, total: 0, totalPages: 0 },
      };
    }
    where.assignedRole = "APROVADOR";
    where.stage = "APPROVAL";
    where.process.departmentId = user.departmentId;
    where.process.requesterId = { not: user.id };
    if (statusFilter === "PENDING") {
      where.process.status = "AWAITING_APPROVAL";
    }
  } else if (user.role === "ADMIN") {
    // Admin has oversight: can optionally filter by department
    if (query.departmentId) {
      if (!isValidUuid(query.departmentId)) {
        throw new ValidationError({
          message: "departmentId inválido.",
          action: "Forneça um UUID válido para departmentId.",
        });
      }
      where.process.departmentId = query.departmentId.trim();
    }
  }

  // Search filter
  if (query.search && String(query.search).trim()) {
    const term = String(query.search).trim();
    const asNum = parseInt(term.replace(/\D/g, ""), 10);
    const searchConditions = [
      { process: { title: { contains: term, mode: "insensitive" } } },
      { process: { object: { contains: term, mode: "insensitive" } } },
    ];
    if (!isNaN(asNum) && asNum > 0) {
      searchConditions.push({ process: { number: asNum } });
    }
    where.AND = [{ OR: searchConditions }];
  }

  const [total, rawTasks] = await Promise.all([
    prisma.approval.count({ where }),
    prisma.approval.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        process: {
          select: {
            id: true,
            number: true,
            year: true,
            title: true,
            object: true,
            status: true,
            estimatedValue: true,
            departmentId: true,
            requesterId: true,
            department: {
              select: { id: true, name: true },
            },
            requester: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    }),
  ]);

  const tasks = rawTasks.map((t) => {
    const formattedNumber = `DP-${String(t.process.number).padStart(3, "0")}/${t.process.year}`;
    const now = Date.now();
    const createdTime = new Date(t.createdAt).getTime();
    const timePendingHours = Math.max(
      0,
      Math.floor((now - createdTime) / (1000 * 60 * 60)),
    );

    return {
      id: t.id,
      stage: t.stage,
      stageLabel: STAGE_CONFIG[t.stage]?.label || t.stage,
      assignedRole: t.assignedRole,
      cycle: t.cycle,
      decision: t.decision,
      comment: t.comment,
      decidedAt: t.decidedAt ? t.decidedAt.toISOString() : null,
      decidedBy: t.user
        ? { id: t.user.id, name: t.user.name, role: t.user.role }
        : null,
      createdAt: t.createdAt.toISOString(),
      timePendingHours,
      process: {
        id: t.process.id,
        number: t.process.number,
        year: t.process.year,
        formattedNumber,
        title: t.process.title,
        object: t.process.object,
        status: t.process.status,
        estimatedValue: t.process.estimatedValue
          ? Number(t.process.estimatedValue)
          : null,
        department: t.process.department,
        requester: t.process.requester,
      },
      canAct: canUserActOnApprovalTask(user, t.process, t),
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
 * Retrieves the comprehensive workflow state, cycle history, and authorized actions for a process.
 */
export async function getProcessWorkflowState(processId, user) {
  if (!isValidUuid(processId)) {
    throw new ValidationError({
      message: "Formato inválido para processId.",
      action: "Forneça um UUID válido para processId.",
    });
  }

  const processRecord = await prisma.process.findFirst({
    where: { id: processId.trim(), deletedAt: null },
    include: {
      department: true,
      requester: {
        select: { id: true, name: true, email: true, role: true },
      },
      approvals: {
        where: { deletedAt: null },
        orderBy: [{ cycle: "asc" }, { createdAt: "asc" }],
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
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

  if (!canUserAccessProcess(user, processRecord)) {
    throw new ForbiddenError({
      message: "Você não tem permissão para acessar o fluxo deste processo.",
      action: "Verifique seu nível de acesso.",
    });
  }

  const pendingTask =
    processRecord.approvals.find((a) => a.decision === null) || null;
  const canAct = pendingTask
    ? canUserActOnApprovalTask(user, processRecord, pendingTask)
    : false;

  const permissions = {
    canAct,
    canApprove: canAct,
    canRequestAdjustment: canAct,
    canReject: canAct && pendingTask?.stage === "APPROVAL",
  };

  // Group decisions by cycle
  const cyclesMap = new Map();
  for (const item of processRecord.approvals) {
    if (!cyclesMap.has(item.cycle)) {
      cyclesMap.set(item.cycle, []);
    }
    cyclesMap.get(item.cycle).push({
      id: item.id,
      stage: item.stage,
      stageLabel: STAGE_CONFIG[item.stage]?.label || item.stage,
      assignedRole: item.assignedRole,
      cycle: item.cycle,
      decision: item.decision,
      comment: item.comment,
      createdAt: item.createdAt.toISOString(),
      decidedAt: item.decidedAt ? item.decidedAt.toISOString() : null,
      reviewer: item.user
        ? { id: item.user.id, name: item.user.name, role: item.user.role }
        : null,
      isPending: item.decision === null,
    });
  }

  const cycles = Array.from(cyclesMap.entries()).map(
    ([cycleNumber, items]) => ({
      cycleNumber,
      items,
    }),
  );

  return {
    processId: processRecord.id,
    currentStatus: processRecord.status,
    currentStage: pendingTask?.stage || null,
    currentStageLabel: pendingTask
      ? STAGE_CONFIG[pendingTask.stage]?.label
      : null,
    currentCycle:
      pendingTask?.cycle ||
      (cycles.length > 0 ? cycles[cycles.length - 1].cycleNumber : 1),
    pendingTask: pendingTask
      ? {
          id: pendingTask.id,
          stage: pendingTask.stage,
          stageLabel: STAGE_CONFIG[pendingTask.stage]?.label,
          assignedRole: pendingTask.assignedRole,
          cycle: pendingTask.cycle,
          createdAt: pendingTask.createdAt.toISOString(),
        }
      : null,
    permissions,
    cycles,
  };
}

/**
 * Approves the current review stage.
 * If Stage 1 (ANALYSIS), re-validates completeness, forwards to Stage 2 (AWAITING_APPROVAL).
 * If Stage 2 (APPROVAL), formally approves the process (status APPROVED).
 */
export async function approveStage(
  processId,
  { comment, approvalId } = {},
  user,
) {
  if (!isValidUuid(processId)) {
    throw new ValidationError({
      message: "Formato inválido para processId.",
      action: "Forneça um UUID válido para processId.",
    });
  }

  return await prisma.$transaction(async (tx) => {
    const processRecord = await tx.process.findFirst({
      where: { id: processId.trim(), deletedAt: null },
      include: {
        department: true,
        requester: {
          select: { id: true, name: true, email: true, role: true },
        },
        demandDocument: true,
        selectedSupplier: true,
        quotations: { include: { supplier: true } },
        documents: { where: { isActive: true, deletedAt: null } },
        approvals: { where: { deletedAt: null } },
      },
    });

    if (!processRecord) {
      throw new NotFoundError({
        message: "Processo não encontrado.",
        action: "Verifique o identificador do processo.",
      });
    }

    const pendingTask = processRecord.approvals.find(
      (a) => a.decision === null,
    );
    if (!pendingTask) {
      throw new ConflictError({
        message: "Não há tarefa de aprovação pendente para este processo.",
        action: "Verifique se o processo já foi aprovado ou devolvido.",
      });
    }

    if (approvalId && approvalId.trim() !== pendingTask.id) {
      throw new ConflictError({
        message: "A tarefa informada não corresponde à tarefa pendente atual.",
        action: "Atualize os dados do processo e tente novamente.",
      });
    }

    if (!canUserActOnApprovalTask(user, processRecord, pendingTask)) {
      throw new ForbiddenError({
        message: "Você não tem autorização para aprovar esta etapa.",
        action:
          "Verifique se seu papel e departamento correspondem aos da etapa pendente, e se você não é o solicitante.",
      });
    }

    const formattedNumber = `DP-${String(processRecord.number).padStart(3, "0")}/${processRecord.year}`;
    const now = new Date();
    const normalizedComment = comment?.trim() || null;

    if (pendingTask.stage === "ANALYSIS") {
      // Re-validate completeness before allowing AGENTE_CONTRATACAO to forward to APPROVAL
      const completeness = validateProcessCompleteness(processRecord);
      if (!completeness.isComplete) {
        const errorsText = completeness.errors.map((e) => e.message).join(" ");
        throw new ValidationError({
          message: `A análise técnica não pode ser concluída pois o processo apresenta pendências: ${errorsText}`,
          action:
            "Corrija os apontamentos antes de aprovar a etapa de análise técnica.",
          details: completeness.errors,
        });
      }

      // Optimistic conditional update: ensure task is still pending
      const updateResult = await tx.approval.updateMany({
        where: { id: pendingTask.id, decision: null },
        data: {
          decision: "APPROVED",
          userId: user.id,
          decidedAt: now,
          comment: normalizedComment,
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictError({
          message:
            "Esta tarefa de aprovação já foi concluída por outro usuário.",
          action: "Atualize a página para visualizar o status atual.",
        });
      }

      // Advance process status
      await tx.process.update({
        where: { id: processRecord.id },
        data: { status: "AWAITING_APPROVAL" },
      });

      // Create Stage 2 pending task in the same cycle
      const nextTask = await tx.approval.create({
        data: {
          processId: processRecord.id,
          stage: "APPROVAL",
          assignedRole: "APROVADOR",
          cycle: pendingTask.cycle,
        },
      });

      // Audit logs
      await tx.auditLog.create({
        data: {
          processId: processRecord.id,
          userId: user.id,
          action: "APPROVAL_STAGE_APPROVED",
          fromStatus: "IN_ANALYSIS",
          toStatus: "AWAITING_APPROVAL",
          description: `Etapa 1 (Análise Técnica) aprovada por ${user.name} (${user.role}). Processo encaminhado para Aprovação Interna.${normalizedComment ? ` Parecer: "${normalizedComment}"` : ""}`,
        },
      });

      await tx.auditLog.create({
        data: {
          processId: processRecord.id,
          userId: user.id,
          action: "APPROVAL_TASK_ASSIGNED",
          fromStatus: "AWAITING_APPROVAL",
          toStatus: "AWAITING_APPROVAL",
          description: `Tarefa de Aprovação Interna atribuída à equipe de Aprovadores (Ciclo ${pendingTask.cycle}).`,
        },
      });

      return {
        success: true,
        message: `Etapa de análise técnica do processo ${formattedNumber} aprovada com sucesso. Processo encaminhado para aprovação interna.`,
        processStatus: "AWAITING_APPROVAL",
        nextStage: "APPROVAL",
        taskId: nextTask.id,
      };
    }

    if (pendingTask.stage === "APPROVAL") {
      const updateResult = await tx.approval.updateMany({
        where: { id: pendingTask.id, decision: null },
        data: {
          decision: "APPROVED",
          userId: user.id,
          decidedAt: now,
          comment: normalizedComment,
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictError({
          message:
            "Esta tarefa de aprovação já foi concluída por outro usuário.",
          action: "Atualize a página para visualizar o status atual.",
        });
      }

      await tx.process.update({
        where: { id: processRecord.id },
        data: { status: "APPROVED" },
      });

      await tx.auditLog.create({
        data: {
          processId: processRecord.id,
          userId: user.id,
          action: "PROCESS_APPROVED",
          fromStatus: "AWAITING_APPROVAL",
          toStatus: "APPROVED",
          description: `Processo ${formattedNumber} aprovado formalmente por ${user.name} (${user.role}).${normalizedComment ? ` Justificativa: "${normalizedComment}"` : ""}`,
        },
      });

      return {
        success: true,
        message: `Processo ${formattedNumber} aprovado formalmente com sucesso.`,
        processStatus: "APPROVED",
        nextStage: null,
      };
    }

    throw new ValidationError({
      message: `Etapa '${pendingTask.stage}' desconhecida para aprovação.`,
      action: "Contate o suporte técnico.",
    });
  });
}

/**
 * Requests adjustment on the current review stage.
 * Completes pending task with ADJUSTMENT_REQUESTED, transitions process to RETURNED_FOR_ADJUSTMENT.
 */
export async function requestAdjustment(
  processId,
  { comment, approvalId } = {},
  user,
) {
  if (!isValidUuid(processId)) {
    throw new ValidationError({
      message: "Formato inválido para processId.",
      action: "Forneça um UUID válido para processId.",
    });
  }

  if (!comment || typeof comment !== "string" || comment.trim().length < 10) {
    throw new ValidationError({
      message:
        "A justificativa do pedido de ajuste é obrigatória (mínimo de 10 caracteres).",
      action:
        "Descreva com clareza quais correções devem ser realizadas pelo solicitante.",
    });
  }

  return await prisma.$transaction(async (tx) => {
    const processRecord = await tx.process.findFirst({
      where: { id: processId.trim(), deletedAt: null },
      include: {
        department: true,
        requester: {
          select: { id: true, name: true, email: true, role: true },
        },
        approvals: { where: { deletedAt: null } },
      },
    });

    if (!processRecord) {
      throw new NotFoundError({
        message: "Processo não encontrado.",
        action: "Verifique o identificador do processo.",
      });
    }

    const pendingTask = processRecord.approvals.find(
      (a) => a.decision === null,
    );
    if (!pendingTask) {
      throw new ConflictError({
        message: "Não há tarefa de aprovação pendente para este processo.",
        action: "Verifique o status do processo.",
      });
    }

    if (approvalId && approvalId.trim() !== pendingTask.id) {
      throw new ConflictError({
        message: "A tarefa informada não corresponde à tarefa pendente atual.",
        action: "Atualize a página e tente novamente.",
      });
    }

    if (!canUserActOnApprovalTask(user, processRecord, pendingTask)) {
      throw new ForbiddenError({
        message:
          "Você não tem autorização para solicitar ajustes neste processo.",
        action: "Verifique suas permissões e departamento.",
      });
    }

    const now = new Date();
    const trimmedComment = comment.trim();

    const updateResult = await tx.approval.updateMany({
      where: { id: pendingTask.id, decision: null },
      data: {
        decision: "ADJUSTMENT_REQUESTED",
        userId: user.id,
        decidedAt: now,
        comment: trimmedComment,
      },
    });

    if (updateResult.count === 0) {
      throw new ConflictError({
        message: "Esta tarefa de aprovação já foi concluída por outro usuário.",
        action: "Atualize a página para visualizar o status atual.",
      });
    }

    await tx.process.update({
      where: { id: processRecord.id },
      data: { status: "RETURNED_FOR_ADJUSTMENT" },
    });

    const formattedNumber = `DP-${String(processRecord.number).padStart(3, "0")}/${processRecord.year}`;
    const stageName =
      pendingTask.stage === "ANALYSIS"
        ? "Análise Técnica"
        : "Aprovação Interna";

    await tx.auditLog.create({
      data: {
        processId: processRecord.id,
        userId: user.id,
        action: "PROCESS_ADJUSTMENT_REQUESTED",
        fromStatus: processRecord.status,
        toStatus: "RETURNED_FOR_ADJUSTMENT",
        description: `Ajustes solicitados na etapa de ${stageName} por ${user.name} (${user.role}): "${trimmedComment}".`,
      },
    });

    return {
      success: true,
      message: `Processo ${formattedNumber} devolvido para ajustes do solicitante com sucesso.`,
      processStatus: "RETURNED_FOR_ADJUSTMENT",
    };
  });
}

/**
 * Rejects and closes a process.
 * Permitted strictly during Stage 2 (APPROVAL) by an authorized APROVADOR.
 */
export async function rejectProcess(
  processId,
  { comment, approvalId } = {},
  user,
) {
  if (!isValidUuid(processId)) {
    throw new ValidationError({
      message: "Formato inválido para processId.",
      action: "Forneça um UUID válido para processId.",
    });
  }

  if (!comment || typeof comment !== "string" || comment.trim().length < 10) {
    throw new ValidationError({
      message: "O motivo da rejeição é obrigatório (mínimo de 10 caracteres).",
      action: "Forneça uma fundamentação formal para a rejeição do processo.",
    });
  }

  return await prisma.$transaction(async (tx) => {
    const processRecord = await tx.process.findFirst({
      where: { id: processId.trim(), deletedAt: null },
      include: {
        department: true,
        requester: {
          select: { id: true, name: true, email: true, role: true },
        },
        approvals: { where: { deletedAt: null } },
      },
    });

    if (!processRecord) {
      throw new NotFoundError({
        message: "Processo não encontrado.",
        action: "Verifique o identificador do processo.",
      });
    }

    const pendingTask = processRecord.approvals.find(
      (a) => a.decision === null,
    );
    if (!pendingTask) {
      throw new ConflictError({
        message: "Não há tarefa de aprovação pendente para este processo.",
        action: "Verifique o status do processo.",
      });
    }

    if (approvalId && approvalId.trim() !== pendingTask.id) {
      throw new ConflictError({
        message: "A tarefa informada não corresponde à tarefa pendente atual.",
        action: "Atualize a página e tente novamente.",
      });
    }

    if (pendingTask.stage !== "APPROVAL") {
      throw new ForbiddenError({
        message:
          "Rejeição definitiva de processos só é permitida na etapa de Aprovação Interna.",
        action:
          "Na etapa de análise técnica, utilize o pedido de ajustes ao solicitante.",
      });
    }

    if (!canUserActOnApprovalTask(user, processRecord, pendingTask)) {
      throw new ForbiddenError({
        message: "Você não tem autorização para rejeitar este processo.",
        action:
          "Apenas aprovadores autorizados do departamento podem rejeitar o processo.",
      });
    }

    const now = new Date();
    const trimmedComment = comment.trim();

    const updateResult = await tx.approval.updateMany({
      where: { id: pendingTask.id, decision: null },
      data: {
        decision: "REJECTED",
        userId: user.id,
        decidedAt: now,
        comment: trimmedComment,
      },
    });

    if (updateResult.count === 0) {
      throw new ConflictError({
        message: "Esta tarefa de aprovação já foi concluída por outro usuário.",
        action: "Atualize a página para visualizar o status atual.",
      });
    }

    await tx.process.update({
      where: { id: processRecord.id },
      data: { status: "REJECTED" },
    });

    const formattedNumber = `DP-${String(processRecord.number).padStart(3, "0")}/${processRecord.year}`;

    await tx.auditLog.create({
      data: {
        processId: processRecord.id,
        userId: user.id,
        action: "PROCESS_REJECTED",
        fromStatus: "AWAITING_APPROVAL",
        toStatus: "REJECTED",
        description: `Processo ${formattedNumber} rejeitado e concluído negativamente por ${user.name} (${user.role}): "${trimmedComment}".`,
      },
    });

    return {
      success: true,
      message: `Processo ${formattedNumber} rejeitado formalmente.`,
      processStatus: "REJECTED",
    };
  });
}

const workflowService = {
  STAGE_CONFIG,
  canUserActOnApprovalTask,
  listApprovalInbox,
  getProcessWorkflowState,
  approveStage,
  requestAdjustment,
  rejectProcess,
};

export default workflowService;
