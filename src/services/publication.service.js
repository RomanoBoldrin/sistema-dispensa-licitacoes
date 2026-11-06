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
  validatePublicationRecordPayload,
} from "@/domain/process-lifecycle.js";

/**
 * Registers an official publication record for an authorized procurement process
 * and advances the process status from AWAITING_PUBLICATION to COMPLETED.
 *
 * Operational Actor: AGENTE_CONTRATACAO of the process department.
 * Segregation of Duties: Cannot register publication on self-requested process.
 * Lifecycle Transition: AWAITING_PUBLICATION -> COMPLETED.
 *
 * @param {string} processId - Target process UUID
 * @param {object} user - Authenticated operator
 * @param {object} payload - Publication data (publicationType, destination, publishedAt, referenceNumber, url, documentId)
 */
export async function registerPublication(processId, user, payload) {
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

  // 1. Domain payload validation (validates types, non-empty destination, date, URL protocol, documentId format)
  const validatedPayload = validatePublicationRecordPayload(payload);

  if (
    validatedPayload.documentId &&
    !isValidUuid(validatedPayload.documentId)
  ) {
    throw new ValidationError({
      message: "Identificador de documento comprobatório inválido.",
      action: "Forneça um UUID válido para o documento.",
    });
  }

  // 2. Atomic transaction with pessimistic state checks and optimistic concurrency locking
  return await prisma.$transaction(async (tx) => {
    // Fresh read inside transaction
    const processRecord = await tx.process.findFirst({
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
        publicationRecords: {
          where: { deletedAt: null },
          orderBy: [{ createdAt: "asc" }],
        },
      },
    });

    if (!processRecord) {
      throw new NotFoundError({
        message: "Processo não encontrado.",
        action: "Verifique o identificador do processo.",
      });
    }

    // Role verification (strict AGENTE_CONTRATACAO)
    if (user.role !== "AGENTE_CONTRATACAO") {
      throw new ForbiddenError({
        message:
          "Apenas o Agente de Contratação responsável pelo processo pode registrar a publicação.",
        action: "Ação restrita ao perfil AGENTE_CONTRATACAO.",
      });
    }

    // Department isolation (strict fail-closed)
    if (
      !user.departmentId ||
      user.departmentId !== processRecord.departmentId
    ) {
      throw new ForbiddenError({
        message:
          "Você não tem permissão para registrar publicações em processos de outro departamento.",
        action:
          "Apenas agentes de contratação do mesmo departamento podem atuar no processo.",
      });
    }

    // Segregation of duties: cannot register publication on own requested demand
    const requesterId =
      processRecord.requesterId ||
      processRecord.requester?.id ||
      processRecord.userId;
    if (requesterId && requesterId === user.id) {
      throw new ForbiddenError({
        message:
          "O solicitante do processo não pode atuar como agente de contratação para registrar a publicação (Segregação de Funções).",
        action:
          "O registro da publicação deve ser realizado por outro agente de contratação do departamento.",
      });
    }

    // Process status check: must be in AWAITING_PUBLICATION
    if (processRecord.status !== PROCESS_STATUS.AWAITING_PUBLICATION) {
      throw new ConflictError({
        message: `Processo não está aguardando publicação (status atual: ${processRecord.status}).`,
        action:
          "Apenas processos em AWAITING_PUBLICATION podem receber registro de publicação.",
      });
    }

    // Check workflow cycle & verify active final authorization with AUTHORIZED decision
    const currentCycle = calculateNextWorkflowCycle({
      approvals: processRecord.approvals,
      finalAuthorizations: processRecord.finalAuthorizations,
      isResubmission: false,
    });

    const activeFinalAuth = processRecord.finalAuthorizations.find(
      (fa) =>
        fa.cycle === currentCycle &&
        fa.decision === FINAL_AUTHORIZATION_DECISION.AUTHORIZED &&
        !fa.deletedAt,
    );

    if (!activeFinalAuth) {
      throw new ConflictError({
        message:
          "O processo não possui autorização final válida concedida pela Autoridade Competente no ciclo atual.",
        action:
          "A publicação só pode ser registrada após a emissão da autorização final da autoridade competente.",
      });
    }

    // Verify supporting document if provided
    if (validatedPayload.documentId) {
      const document = await tx.document.findUnique({
        where: { id: validatedPayload.documentId },
      });

      if (!document || document.deletedAt || !document.isActive) {
        throw new NotFoundError({
          message: "Documento comprobatório não encontrado ou inativo.",
          action: "Verifique o identificador do documento informado.",
        });
      }

      if (document.processId !== processRecord.id) {
        throw new ValidationError({
          message:
            "O documento comprobatório informado não pertence a este processo.",
          action: "Vincule apenas documentos pertencentes ao mesmo processo.",
        });
      }
    }

    // Publication date sanity check against process creation
    const processCreatedDate = new Date(processRecord.createdAt);
    if (
      validatedPayload.publishedAt.getTime() <
      processCreatedDate.getTime() - 24 * 60 * 60 * 1000
    ) {
      throw new ValidationError({
        message:
          "A data de publicação não pode ser anterior à data de criação do processo.",
        action: "Informe uma data de publicação contemporânea ao processo.",
      });
    }

    // Assert status transition in domain state machine
    assertValidTransition(processRecord.status, PROCESS_STATUS.COMPLETED);

    // Concurrency protection: optimistic lock via conditional update
    const updateResult = await tx.process.updateMany({
      where: {
        id: processRecord.id,
        status: PROCESS_STATUS.AWAITING_PUBLICATION,
      },
      data: {
        status: PROCESS_STATUS.COMPLETED,
      },
    });

    if (updateResult.count === 0) {
      throw new ConflictError({
        message:
          "Conflito de concorrência: o processo já foi concluído ou seu status foi alterado por outra operação.",
        action: "Atualize os dados do processo para verificar o status atual.",
      });
    }

    // Create append-only publication record
    const publicationRecord = await tx.publicationRecord.create({
      data: {
        processId: processRecord.id,
        publicationType: validatedPayload.publicationType,
        destination: validatedPayload.destination,
        publishedAt: validatedPayload.publishedAt,
        referenceNumber: validatedPayload.referenceNumber,
        url: validatedPayload.url,
        documentId: validatedPayload.documentId,
        createdById: user.id,
      },
      include: {
        document: {
          select: {
            id: true,
            type: true,
            filename: true,
            mimeType: true,
            size: true,
            createdAt: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Record audit events atomically: PUBLICATION_REGISTERED and PROCESS_COMPLETED
    await tx.auditLog.create({
      data: {
        processId: processRecord.id,
        userId: user.id,
        action: "PUBLICATION_REGISTERED",
        description: `Publicação registrada (${validatedPayload.publicationType}) no veículo ${validatedPayload.destination}. Ref: ${validatedPayload.referenceNumber || "S/N"}.`,
      },
    });

    await tx.auditLog.create({
      data: {
        processId: processRecord.id,
        userId: user.id,
        action: "PROCESS_COMPLETED",
        fromStatus: processRecord.status,
        toStatus: PROCESS_STATUS.COMPLETED,
        description:
          "Processo de dispensa de licitação concluído com sucesso após registro de publicação oficial.",
      },
    });

    return {
      id: publicationRecord.id,
      processId: publicationRecord.processId,
      processNumber: processRecord.number,
      processYear: processRecord.year,
      processStatus: PROCESS_STATUS.COMPLETED,
      publicationType: publicationRecord.publicationType,
      destination: publicationRecord.destination,
      publishedAt: publicationRecord.publishedAt,
      referenceNumber: publicationRecord.referenceNumber,
      url: publicationRecord.url,
      documentId: publicationRecord.documentId,
      document: publicationRecord.document
        ? {
            id: publicationRecord.document.id,
            filename: publicationRecord.document.filename,
            type: publicationRecord.document.type,
            mimeType: publicationRecord.document.mimeType,
            size: publicationRecord.document.size,
            createdAt: publicationRecord.document.createdAt,
          }
        : null,
      createdBy: publicationRecord.createdBy
        ? {
            id: publicationRecord.createdBy.id,
            name: publicationRecord.createdBy.name,
            email: publicationRecord.createdBy.email,
          }
        : null,
      createdAt: publicationRecord.createdAt,
    };
  });
}

/**
 * Lists publication records for a process in reverse chronological order.
 *
 * @param {string} processId - Target process UUID
 * @param {object} user - Authenticated user
 */
export async function listPublications(processId, user) {
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
  });

  if (!processRecord) {
    throw new NotFoundError({
      message: "Processo não encontrado.",
      action: "Verifique o identificador do processo.",
    });
  }

  // Department isolation: user must belong to same department, be the requester, or ADMIN
  const isDepartmentMember =
    user.departmentId && user.departmentId === processRecord.departmentId;
  const isRequester = processRecord.requesterId === user.id;
  const isAdmin = user.role === "ADMIN";

  if (!isDepartmentMember && !isRequester && !isAdmin) {
    throw new ForbiddenError({
      message:
        "Você não tem permissão para visualizar publicações deste departamento.",
      action: "Acesso restrito ao departamento de lotação do processo.",
    });
  }

  const publicationRecords = await prisma.publicationRecord.findMany({
    where: { processId, deletedAt: null },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    include: {
      document: {
        select: {
          id: true,
          type: true,
          filename: true,
          mimeType: true,
          size: true,
          createdAt: true,
          deletedAt: true,
          isActive: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  return {
    processId: processRecord.id,
    processNumber: processRecord.number,
    processYear: processRecord.year,
    status: processRecord.status,
    publications: publicationRecords.map((pub) => ({
      id: pub.id,
      processId: pub.processId,
      publicationType: pub.publicationType,
      destination: pub.destination,
      publishedAt: pub.publishedAt,
      referenceNumber: pub.referenceNumber,
      url: pub.url,
      documentId: pub.documentId,
      document:
        pub.document && !pub.document.deletedAt && pub.document.isActive
          ? {
              id: pub.document.id,
              filename: pub.document.filename,
              type: pub.document.type,
              mimeType: pub.document.mimeType,
              size: pub.document.size,
              createdAt: pub.document.createdAt,
            }
          : null,
      createdBy: pub.createdBy
        ? {
            id: pub.createdBy.id,
            name: pub.createdBy.name,
            email: pub.createdBy.email,
          }
        : null,
      createdAt: pub.createdAt,
    })),
  };
}

/**
 * Retrieves details of a specific publication record with its associated document metadata.
 *
 * @param {string} publicationId - Target publication UUID
 * @param {object} user - Authenticated user
 */
export async function getPublicationDetails(publicationId, user) {
  if (!isValidUuid(publicationId)) {
    throw new ValidationError({
      message: "Identificador de publicação inválido.",
      action: "Forneça um UUID válido para a publicação.",
    });
  }

  if (!user) {
    throw new ForbiddenError({
      message: "Usuário não autenticado.",
      action: "Faça login para realizar esta operação.",
    });
  }

  const publication = await prisma.publicationRecord.findFirst({
    where: { id: publicationId, deletedAt: null },
    include: {
      process: {
        select: {
          id: true,
          number: true,
          year: true,
          status: true,
          departmentId: true,
          requesterId: true,
          deletedAt: true,
        },
      },
      document: {
        select: {
          id: true,
          type: true,
          filename: true,
          mimeType: true,
          size: true,
          createdAt: true,
          deletedAt: true,
          isActive: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!publication || !publication.process || publication.process.deletedAt) {
    throw new NotFoundError({
      message: "Registro de publicação não encontrado.",
      action: "Verifique o identificador da publicação.",
    });
  }

  // Department isolation: user must belong to same department, be requester, or ADMIN
  const isDepartmentMember =
    user.departmentId && user.departmentId === publication.process.departmentId;
  const isRequester = publication.process.requesterId === user.id;
  const isAdmin = user.role === "ADMIN";

  if (!isDepartmentMember && !isRequester && !isAdmin) {
    throw new ForbiddenError({
      message:
        "Você não tem permissão para visualizar esta publicação de outro departamento.",
      action: "Acesso restrito ao departamento de lotação do processo.",
    });
  }

  return {
    id: publication.id,
    processId: publication.processId,
    processNumber: publication.process.number,
    processYear: publication.process.year,
    processStatus: publication.process.status,
    publicationType: publication.publicationType,
    destination: publication.destination,
    publishedAt: publication.publishedAt,
    referenceNumber: publication.referenceNumber,
    url: publication.url,
    documentId: publication.documentId,
    document:
      publication.document &&
      !publication.document.deletedAt &&
      publication.document.isActive
        ? {
            id: publication.document.id,
            filename: publication.document.filename,
            type: publication.document.type,
            mimeType: publication.document.mimeType,
            size: publication.document.size,
            createdAt: publication.document.createdAt,
          }
        : null,
    createdBy: publication.createdBy
      ? {
          id: publication.createdBy.id,
          name: publication.createdBy.name,
          email: publication.createdBy.email,
        }
      : null,
    createdAt: publication.createdAt,
  };
}

const publicationService = {
  registerPublication,
  listPublications,
  getPublicationDetails,
};

export default publicationService;
