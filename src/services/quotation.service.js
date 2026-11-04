import { Prisma } from "@prisma/client";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/infra/errors.js";
import { prisma } from "@/infra/prisma.js";
import { canUserAccessProcess, isValidUuid } from "./process.service.js";

export const EDITABLE_QUOTATION_STATUSES = [
  "DRAFT",
  "IN_ANALYSIS",
  "PRICE_RESEARCH",
  "SUPPLIER_SELECTED",
];

export const LOCKED_QUOTATION_STATUSES = [
  "AWAITING_APPROVAL",
  "APPROVED",
  "COMPLETED",
  "REJECTED",
];

export function canUserManageQuotations(user, processRecord) {
  if (!user || !processRecord) return false;
  if (processRecord.deletedAt) return false;

  if (LOCKED_QUOTATION_STATUSES.includes(processRecord.status)) {
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
    // Solicitante can only register quotes while process is still in DRAFT
    if (
      processRecord.status === "DRAFT" &&
      processRecord.requesterId === user.id
    ) {
      return true;
    }
  }

  return false;
}

function parseAndValidateMonetaryValue(value) {
  if (value === undefined || value === null || value === "") {
    throw new ValidationError({
      message: "Valor da cotação é obrigatório.",
      action: "Forneça um valor monetário positivo para a cotação.",
    });
  }

  if (typeof value === "boolean") {
    throw new ValidationError({
      message: "Valor da cotação inválido.",
      action: "Forneça um número ou texto representativo de valor.",
    });
  }

  let numValue;
  if (typeof value === "number") {
    numValue = value;
  } else if (typeof value === "string") {
    const cleaned = value.trim().replace(/\s/g, "").replace(",", ".");
    numValue = Number(cleaned);
  } else if (value instanceof Prisma.Decimal) {
    numValue = value.toNumber();
  } else {
    numValue = NaN;
  }

  if (!Number.isFinite(numValue) || numValue <= 0) {
    throw new ValidationError({
      message: "O valor da cotação deve ser maior que zero.",
      action: "Informe um valor monetário válido maior que R$ 0,00.",
    });
  }

  if (numValue > 9999999999999.99) {
    throw new ValidationError({
      message: "Valor da cotação excede o limite máximo permitido.",
      action: "Informe um valor compatível com os limites do sistema.",
    });
  }

  // Exact 2 decimal places representation
  const cents = Math.round(numValue * 100);
  const roundedString = (cents / 100).toFixed(2);
  return new Prisma.Decimal(roundedString);
}

function parseAndValidateQuotedDate(quotedAt) {
  if (quotedAt === undefined || quotedAt === null || quotedAt === "") {
    return null;
  }

  const date = new Date(quotedAt);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError({
      message: "Data da cotação inválida.",
      action: "Informe uma data válida no formato YYYY-MM-DD.",
    });
  }

  // Reject future dates beyond tomorrow (timezone leeway)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date > tomorrow) {
    throw new ValidationError({
      message: "A data da cotação não pode ser uma data futura.",
      action: "Informe a data efetiva de realização da cotação de preços.",
    });
  }

  return date;
}

export function buildComparativePriceMap(quotations = []) {
  if (!Array.isArray(quotations) || quotations.length === 0) {
    return {
      totalQuotations: 0,
      hasQuotations: false,
      lowestValue: null,
      averageValue: null,
      lowestQuotationIds: [],
      items: [],
    };
  }

  const itemsWithNumeric = quotations.map((q) => {
    const rawVal =
      q.value instanceof Prisma.Decimal
        ? q.value.toNumber()
        : typeof q.value === "number"
          ? q.value
          : Number(q.value);

    const safeVal = Number.isFinite(rawVal) ? rawVal : 0;
    const cents = Math.round(safeVal * 100);

    return {
      id: q.id,
      processId: q.processId,
      supplierId: q.supplierId,
      supplier: q.supplier
        ? {
            id: q.supplier.id,
            legalName: q.supplier.legalName,
            tradeName: q.supplier.tradeName,
            cnpj: q.supplier.cnpj,
            email: q.supplier.email,
            phone: q.supplier.phone,
          }
        : null,
      value: (cents / 100).toFixed(2),
      cents,
      description: q.description || null,
      quotedAt: q.quotedAt ? new Date(q.quotedAt).toISOString() : null,
      createdAt: q.createdAt ? new Date(q.createdAt).toISOString() : null,
    };
  });

  const validItems = itemsWithNumeric.filter((it) => it.cents > 0);

  if (validItems.length === 0) {
    return {
      totalQuotations: quotations.length,
      hasQuotations: false,
      lowestValue: null,
      averageValue: null,
      lowestQuotationIds: [],
      items: itemsWithNumeric,
    };
  }

  // Sort by lowest price first
  validItems.sort((a, b) => a.cents - b.cents);

  const lowestCents = validItems[0].cents;
  const lowestQuotationIds = validItems
    .filter((it) => it.cents === lowestCents)
    .map((it) => it.id);

  const totalCents = validItems.reduce((acc, curr) => acc + curr.cents, 0);
  const averageCents = Math.round(totalCents / validItems.length);

  const annotatedItems = validItems.map((item) => {
    const diffCents = item.cents - lowestCents;
    const diffValue = (diffCents / 100).toFixed(2);
    const variancePercent =
      lowestCents > 0
        ? Math.round(((item.cents - lowestCents) / lowestCents) * 1000) / 10
        : 0;

    return {
      id: item.id,
      processId: item.processId,
      supplierId: item.supplierId,
      supplier: item.supplier,
      value: item.value,
      description: item.description,
      quotedAt: item.quotedAt,
      createdAt: item.createdAt,
      isLowest: item.cents === lowestCents,
      differenceFromLowest: diffValue,
      varianceFromLowestPercent: variancePercent,
    };
  });

  return {
    totalQuotations: validItems.length,
    hasQuotations: true,
    lowestValue: (lowestCents / 100).toFixed(2),
    averageValue: (averageCents / 100).toFixed(2),
    lowestQuotationIds,
    items: annotatedItems,
  };
}

export async function createQuotation(processId, rawPayload, user) {
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

  const { supplierId, value, description, quotedAt } = rawPayload || {};

  if (!supplierId || !isValidUuid(supplierId)) {
    throw new ValidationError({
      message: "Identificador de fornecedor obrigatório e deve ser um UUID.",
      action: "Selecione um fornecedor cadastrado.",
    });
  }

  const decimalValue = parseAndValidateMonetaryValue(value);
  const validatedQuotedAt = parseAndValidateQuotedDate(quotedAt);

  const processRecord = await prisma.process.findUnique({
    where: { id: processId },
  });

  if (!processRecord || processRecord.deletedAt) {
    throw new NotFoundError({
      message: "Processo não encontrado.",
      action: "Verifique o identificador e tente novamente.",
    });
  }

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
  });

  if (!supplier) {
    throw new NotFoundError({
      message: "Fornecedor não encontrado.",
      action: "Selecione um fornecedor cadastrado no sistema.",
    });
  }

  // Prevent duplicate supplier quote for this process
  const existingQuotation = await prisma.quotation.findUnique({
    where: {
      processId_supplierId: {
        processId,
        supplierId,
      },
    },
  });

  if (existingQuotation) {
    throw new ConflictError({
      message:
        "Este fornecedor já possui uma proposta de cotação cadastrada para este processo.",
      action:
        "Edite a cotação existente ou remova-a antes de cadastrar uma nova.",
    });
  }

  let cleanDescription = null;
  if (description !== undefined && description !== null) {
    if (typeof description !== "string") {
      throw new ValidationError({
        message: "Descrição da cotação inválida.",
        action: "Forneça um texto explicativo para a cotação se preenchido.",
      });
    }
    cleanDescription = description.trim() || null;
    if (cleanDescription && cleanDescription.length > 1000) {
      throw new ValidationError({
        message: "Descrição da cotação excede 1000 caracteres.",
        action: "Reduza o texto da descrição da cotação.",
      });
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const createdQuotation = await tx.quotation.create({
      data: {
        processId,
        supplierId,
        value: decimalValue,
        description: cleanDescription,
        quotedAt: validatedQuotedAt,
      },
      include: {
        supplier: {
          select: {
            id: true,
            legalName: true,
            tradeName: true,
            cnpj: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    const formattedVal = Number(createdQuotation.value).toLocaleString(
      "pt-BR",
      {
        style: "currency",
        currency: "BRL",
      },
    );

    await tx.auditLog.create({
      data: {
        processId,
        userId: user.id,
        action: "QUOTATION_ADDED",
        description: `Cotação de ${formattedVal} registrada para o fornecedor ${supplier.legalName}.`,
      },
    });

    return createdQuotation;
  });

  return {
    ...result,
    value: Number(result.value).toFixed(2),
  };
}

export async function listQuotationsByProcess(processId, user) {
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
      action: "Verifique suas permissões.",
    });
  }

  const quotations = await prisma.quotation.findMany({
    where: { processId },
    orderBy: { value: "asc" },
    include: {
      supplier: {
        select: {
          id: true,
          legalName: true,
          tradeName: true,
          cnpj: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  const comparisonMap = buildComparativePriceMap(quotations);

  return {
    data: quotations.map((q) => ({
      ...q,
      value: Number(q.value).toFixed(2),
    })),
    map: comparisonMap,
  };
}

export async function getQuotationById(processId, quotationId, user) {
  if (!user) {
    throw new ForbiddenError({
      message: "Usuário não autenticado.",
      action: "Faça login para realizar esta operação.",
    });
  }

  if (!isValidUuid(processId) || !isValidUuid(quotationId)) {
    throw new ValidationError({
      message: "Identificador inválido.",
      action: "Forneça UUIDs válidos para o processo e a cotação.",
    });
  }

  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: {
      process: true,
      supplier: {
        select: {
          id: true,
          legalName: true,
          tradeName: true,
          cnpj: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  if (
    !quotation ||
    quotation.processId !== processId ||
    quotation.process?.deletedAt
  ) {
    throw new NotFoundError({
      message: "Cotação não encontrada para este processo.",
      action: "Verifique os parâmetros e tente novamente.",
    });
  }

  if (!canUserAccessProcess(user, quotation.process)) {
    throw new ForbiddenError({
      message: "Acesso negado a este processo.",
      action: "Verifique suas permissões.",
    });
  }

  return {
    ...quotation,
    value: Number(quotation.value).toFixed(2),
  };
}

export async function updateQuotation(
  processId,
  quotationId,
  rawPayload,
  user,
) {
  if (!user) {
    throw new ForbiddenError({
      message: "Usuário não autenticado.",
      action: "Faça login para realizar esta operação.",
    });
  }

  if (!isValidUuid(processId) || !isValidUuid(quotationId)) {
    throw new ValidationError({
      message: "Identificador inválido.",
      action: "Forneça UUIDs válidos para o processo e a cotação.",
    });
  }

  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: {
      process: true,
      supplier: true,
    },
  });

  if (
    !quotation ||
    quotation.processId !== processId ||
    quotation.process?.deletedAt
  ) {
    throw new NotFoundError({
      message: "Cotação não encontrada.",
      action: "Verifique os dados e tente novamente.",
    });
  }

  if (LOCKED_QUOTATION_STATUSES.includes(quotation.process.status)) {
    throw new ConflictError({
      message:
        "Não é permitido editar cotações em processos na fase atual de aprovação ou conclusão.",
      action: "Apenas processos em instrução podem ser editados.",
    });
  }

  if (!canUserManageQuotations(user, quotation.process)) {
    throw new ForbiddenError({
      message: "Permissão negada para editar cotações neste processo.",
      action: "Verifique suas permissões de acesso.",
    });
  }

  const updateData = {};

  if (rawPayload.value !== undefined) {
    updateData.value = parseAndValidateMonetaryValue(rawPayload.value);
  }

  if (rawPayload.quotedAt !== undefined) {
    updateData.quotedAt = parseAndValidateQuotedDate(rawPayload.quotedAt);
  }

  if (rawPayload.description !== undefined) {
    if (rawPayload.description === null || rawPayload.description === "") {
      updateData.description = null;
    } else if (typeof rawPayload.description !== "string") {
      throw new ValidationError({
        message: "Descrição da cotação inválida.",
        action: "Forneça um texto explicativo para a cotação se preenchido.",
      });
    } else {
      const cleanDesc = rawPayload.description.trim();
      if (cleanDesc.length > 1000) {
        throw new ValidationError({
          message: "Descrição da cotação excede 1000 caracteres.",
          action: "Reduza o texto da descrição.",
        });
      }
      updateData.description = cleanDesc || null;
    }
  }

  const updatedQuotation = await prisma.$transaction(async (tx) => {
    const updated = await tx.quotation.update({
      where: { id: quotationId },
      data: updateData,
      include: {
        supplier: {
          select: {
            id: true,
            legalName: true,
            tradeName: true,
            cnpj: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    const formattedVal = Number(updated.value).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

    await tx.auditLog.create({
      data: {
        processId,
        userId: user.id,
        action: "QUOTATION_UPDATED",
        description: `Cotação do fornecedor ${quotation.supplier.legalName} atualizada para ${formattedVal}.`,
      },
    });

    return updated;
  });

  return {
    ...updatedQuotation,
    value: Number(updatedQuotation.value).toFixed(2),
  };
}

export async function deleteQuotation(processId, quotationId, user) {
  if (!user) {
    throw new ForbiddenError({
      message: "Usuário não autenticado.",
      action: "Faça login para realizar esta operação.",
    });
  }

  if (!isValidUuid(processId) || !isValidUuid(quotationId)) {
    throw new ValidationError({
      message: "Identificador inválido.",
      action: "Forneça UUIDs válidos para o processo e a cotação.",
    });
  }

  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: {
      process: true,
      supplier: true,
    },
  });

  if (
    !quotation ||
    quotation.processId !== processId ||
    quotation.process?.deletedAt
  ) {
    throw new NotFoundError({
      message: "Cotação não encontrada.",
      action: "Verifique os dados e tente novamente.",
    });
  }

  if (LOCKED_QUOTATION_STATUSES.includes(quotation.process.status)) {
    throw new ConflictError({
      message:
        "Não é permitido excluir cotações em processos na fase atual de aprovação ou conclusão.",
      action: "Apenas processos em instrução podem ser alterados.",
    });
  }

  if (!canUserManageQuotations(user, quotation.process)) {
    throw new ForbiddenError({
      message: "Permissão negada para excluir cotação deste processo.",
      action: "Verifique suas permissões de acesso.",
    });
  }

  await prisma.quotation.delete({
    where: { id: quotationId },
  });

  return { success: true };
}

const quotationService = {
  createQuotation,
  listQuotationsByProcess,
  getQuotationById,
  updateQuotation,
  deleteQuotation,
  buildComparativePriceMap,
  canUserManageQuotations,
};

export default quotationService;
