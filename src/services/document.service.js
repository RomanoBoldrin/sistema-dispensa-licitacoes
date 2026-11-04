import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/infra/errors.js";
import { prisma } from "@/infra/prisma.js";
import { canUserAccessProcess, isValidUuid } from "./process.service.js";
import storageService from "./storage.service.js";

export const ALLOWED_DOCUMENT_TYPES = [
  "PESQUISA_PRECOS",
  "JUSTIFICATIVA_PRECO",
  "RAZAO_ESCOLHA_FORNECEDOR",
  "DOCUMENTACAO_FORNECEDOR",
  "PARECER_JURIDICO",
  "TERMO_REFERENCIA",
  "OUTRO",
];

export const DOCUMENT_TYPE_LABELS = {
  TERMO_REFERENCIA: "Termo de Referência (TR)",
  PESQUISA_PRECOS: "Pesquisa de Preços",
  DOCUMENTACAO_FORNECEDOR: "Documentação do Fornecedor",
  JUSTIFICATIVA_PRECO: "Justificativa de Preço",
  RAZAO_ESCOLHA_FORNECEDOR: "Razão da Escolha do Fornecedor",
  PARECER_JURIDICO: "Parecer Jurídico",
  OUTRO: "Outro Documento",
};

export const LOCKED_DOCUMENT_STATUSES = ["APPROVED", "COMPLETED", "REJECTED"];

export function canUserManageDocuments(user, processRecord) {
  if (!user || !processRecord) return false;
  if (processRecord.deletedAt) return false;

  if (LOCKED_DOCUMENT_STATUSES.includes(processRecord.status)) {
    return false;
  }

  if (user.role === "ADMIN") return true;

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

  if (user.role === "SOLICITANTE") {
    if (
      processRecord.status === "DRAFT" &&
      processRecord.requesterId === user.id
    ) {
      return true;
    }
  }

  return false;
}

export async function uploadProcessDocument(processId, fileData, user) {
  if (!user) {
    throw new ForbiddenError({
      message: "Usuário não autenticado.",
      action: "Faça login para realizar esta operação.",
    });
  }

  if (!isValidUuid(processId)) {
    throw new ValidationError({
      message: "Identificador de processo inválido.",
      action: "Forneça um UUID válido para o processo.",
    });
  }

  const processRecord = await prisma.process.findUnique({
    where: { id: processId },
  });

  if (!processRecord || processRecord.deletedAt) {
    throw new NotFoundError({
      message: "Processo não encontrado.",
      action: "Verifique o identificador e tente novamente.",
    });
  }

  if (!canUserAccessProcess(user, processRecord)) {
    throw new ForbiddenError({
      message: "Acesso negado a este processo.",
      action: "Verifique suas permissões de acesso.",
    });
  }

  if (!canUserManageDocuments(user, processRecord)) {
    throw new ForbiddenError({
      message: "Permissão negada para anexar documentos a este processo.",
      action:
        "Apenas Agentes de Contratação ou Administradores (ou o solicitante em rascunho) podem anexar documentos.",
    });
  }

  const { buffer, filename, type, declaredMimeType } = fileData || {};

  if (!type || !ALLOWED_DOCUMENT_TYPES.includes(type)) {
    throw new ValidationError({
      message: `Tipo de documento inválido (${type || "não informado"}).`,
      action: `Tipos permitidos: ${ALLOWED_DOCUMENT_TYPES.join(", ")}.`,
    });
  }

  // Validate buffer, magic bytes, extensions, and size
  const validation = storageService.validateFileBuffer({
    buffer,
    declaredMimeType,
    filename,
  });

  const sanitizedFilename = storageService.sanitizeFilename(filename);
  const storageKey = storageService.generateSafeStorageKey(sanitizedFilename);
  const storage = storageService.getStorageProvider();

  // Save file to storage outside Postgres
  await storage.saveFile({
    buffer,
    storageKey,
  });

  try {
    const documentRecord = await prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          processId,
          type,
          filename: sanitizedFilename,
          storageKey,
          mimeType: validation.mimeType,
          size: validation.size,
          uploadedById: user.id,
          isActive: true,
        },
        include: {
          uploadedBy: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      const typeLabel = DOCUMENT_TYPE_LABELS[type] || type;
      await tx.auditLog.create({
        data: {
          processId,
          userId: user.id,
          action: "DOCUMENT_UPLOADED",
          description: `Documento '${sanitizedFilename}' (${typeLabel}) anexado por ${user.name}.`,
        },
      });

      return doc;
    });

    return documentRecord;
  } catch (error) {
    // Rollback file from storage if db transaction fails
    await storage.deleteFile(storageKey);
    throw error;
  }
}

export async function listProcessDocuments(processId, user) {
  if (!user) {
    throw new ForbiddenError({
      message: "Usuário não autenticado.",
      action: "Faça login para realizar esta operação.",
    });
  }

  if (!isValidUuid(processId)) {
    throw new ValidationError({
      message: "Identificador de processo inválido.",
      action: "Forneça um UUID válido para o processo.",
    });
  }

  const processRecord = await prisma.process.findUnique({
    where: { id: processId },
  });

  if (!processRecord || processRecord.deletedAt) {
    throw new NotFoundError({
      message: "Processo não encontrado.",
      action: "Verifique o identificador e tente novamente.",
    });
  }

  if (!canUserAccessProcess(user, processRecord)) {
    throw new ForbiddenError({
      message: "Acesso negado a este processo.",
      action: "Verifique suas permissões de acesso.",
    });
  }

  const documents = await prisma.document.findMany({
    where: {
      processId,
      isActive: true,
      deletedAt: null,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      processId: true,
      type: true,
      filename: true,
      mimeType: true,
      size: true,
      isActive: true,
      createdAt: true,
      uploadedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    },
  });

  return {
    data: documents.map((doc) => ({
      ...doc,
      typeLabel: DOCUMENT_TYPE_LABELS[doc.type] || doc.type,
    })),
  };
}

export async function getDocumentStreamForDownload(
  processId,
  documentId,
  user,
) {
  if (!user) {
    throw new ForbiddenError({
      message: "Usuário não autenticado.",
      action: "Faça login para realizar esta operação.",
    });
  }

  if (!isValidUuid(processId) || !isValidUuid(documentId)) {
    throw new ValidationError({
      message: "Identificador inválido.",
      action: "Forneça UUIDs válidos para o processo e documento.",
    });
  }

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      process: true,
    },
  });

  if (
    !document ||
    document.processId !== processId ||
    document.deletedAt ||
    !document.isActive
  ) {
    throw new NotFoundError({
      message: "Documento não encontrado ou inativo.",
      action: "Verifique o identificador do documento.",
    });
  }

  if (!canUserAccessProcess(user, document.process)) {
    throw new ForbiddenError({
      message: "Acesso negado aos documentos deste processo.",
      action: "Verifique suas permissões.",
    });
  }

  const storage = storageService.getStorageProvider();
  const stream = storage.getFileStream(document.storageKey);

  if (!stream) {
    throw new NotFoundError({
      message: "Arquivo físico não encontrado no armazenamento.",
      action: "O arquivo pode ter sido removido ou corrompido.",
    });
  }

  return {
    document,
    stream,
  };
}

export async function deactivateDocument(processId, documentId, user) {
  if (!user) {
    throw new ForbiddenError({
      message: "Usuário não autenticado.",
      action: "Faça login para realizar esta operação.",
    });
  }

  if (!isValidUuid(processId) || !isValidUuid(documentId)) {
    throw new ValidationError({
      message: "Identificador inválido.",
      action: "Forneça UUIDs válidos para o processo e documento.",
    });
  }

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      process: true,
    },
  });

  if (
    !document ||
    document.processId !== processId ||
    document.deletedAt ||
    !document.isActive
  ) {
    throw new NotFoundError({
      message: "Documento não encontrado.",
      action: "Verifique o identificador do documento.",
    });
  }

  if (LOCKED_DOCUMENT_STATUSES.includes(document.process.status)) {
    throw new ConflictError({
      message:
        "Não é permitido desativar documentos de processos já finalizados ou em fase de aprovação.",
      action: "Documentos de processos concluídos são mantidos para auditoria.",
    });
  }

  const isUploader = document.uploadedById === user.id;
  const isPrivilegedManager =
    user.role === "ADMIN" ||
    (user.role === "AGENTE_CONTRATACAO" &&
      (!user.departmentId ||
        user.departmentId === document.process.departmentId));

  if (!isUploader && !isPrivilegedManager) {
    throw new ForbiddenError({
      message: "Permissão negada para desativar este documento.",
      action: "Apenas quem enviou o arquivo ou um gestor pode removê-lo.",
    });
  }

  const updatedDoc = await prisma.document.update({
    where: { id: documentId },
    data: {
      isActive: false,
      deletedAt: new Date(),
    },
  });

  return {
    id: updatedDoc.id,
    isActive: false,
    deletedAt: updatedDoc.deletedAt,
  };
}

const documentService = {
  uploadProcessDocument,
  listProcessDocuments,
  getDocumentStreamForDownload,
  deactivateDocument,
  canUserManageDocuments,
  ALLOWED_DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
};

export default documentService;
