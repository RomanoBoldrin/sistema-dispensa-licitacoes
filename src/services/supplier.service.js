import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/infra/errors.js";
import { prisma } from "@/infra/prisma.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ALLOWED_SUPPLIER_MANAGER_ROLES = ["ADMIN", "AGENTE_CONTRATACAO"];

export function isValidUuid(value) {
  return typeof value === "string" && UUID_REGEX.test(value.trim());
}

export function normalizeCnpj(cnpj) {
  if (typeof cnpj !== "string") return "";
  return cnpj.replace(/\D/g, "");
}

export function formatCnpj(cnpj) {
  const digits = normalizeCnpj(cnpj);
  if (digits.length !== 14) return cnpj || "";
  return digits.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    "$1.$2.$3/$4-$5",
  );
}

export function isValidCnpj(cnpj) {
  if (typeof cnpj !== "string") return false;
  const clean = normalizeCnpj(cnpj);
  if (clean.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(clean)) return false;

  let sum = 0;
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  for (let i = 0; i < 12; i++) {
    sum += Number(clean[i]) * weights1[i];
  }
  let rem = sum % 11;
  const d1 = rem < 2 ? 0 : 11 - rem;
  if (Number(clean[12]) !== d1) return false;

  sum = 0;
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  for (let i = 0; i < 13; i++) {
    sum += Number(clean[i]) * weights2[i];
  }
  rem = sum % 11;
  const d2 = rem < 2 ? 0 : 11 - rem;
  return Number(clean[13]) === d2;
}

function validateSupplierPayload(payload, { isUpdate = false } = {}) {
  const validated = {};

  if (!isUpdate || payload.legalName !== undefined) {
    if (
      typeof payload.legalName !== "string" ||
      !payload.legalName.trim() ||
      payload.legalName.trim().length < 2
    ) {
      throw new ValidationError({
        message: "Razão social inválida.",
        action: "Forneça uma razão social com pelo menos 2 caracteres.",
      });
    }
    if (payload.legalName.trim().length > 255) {
      throw new ValidationError({
        message: "Razão social excede o limite máximo de caracteres (255).",
        action: "Ajuste a razão social para conter até 255 caracteres.",
      });
    }
    validated.legalName = payload.legalName.trim();
  }

  if (payload.tradeName !== undefined) {
    if (payload.tradeName === null || payload.tradeName === "") {
      validated.tradeName = null;
    } else if (typeof payload.tradeName !== "string") {
      throw new ValidationError({
        message: "Nome fantasia inválido.",
        action: "Forneça um texto válido para o nome fantasia se preenchido.",
      });
    } else if (payload.tradeName.trim().length > 255) {
      throw new ValidationError({
        message: "Nome fantasia excede o limite máximo de caracteres (255).",
        action: "Ajuste o nome fantasia para conter até 255 caracteres.",
      });
    } else {
      validated.tradeName = payload.tradeName.trim();
    }
  }

  if (!isUpdate || payload.cnpj !== undefined) {
    if (typeof payload.cnpj !== "string" || !payload.cnpj.trim()) {
      throw new ValidationError({
        message: "CNPJ é obrigatório.",
        action: "Forneça um CNPJ válido com 14 dígitos.",
      });
    }
    if (!isValidCnpj(payload.cnpj)) {
      throw new ValidationError({
        message: "CNPJ inválido ou dígitos verificadores incorretos.",
        action: "Verifique o número do CNPJ informado e tente novamente.",
      });
    }
    validated.cnpj = normalizeCnpj(payload.cnpj);
  }

  if (payload.email !== undefined) {
    if (payload.email === null || payload.email === "") {
      validated.email = null;
    } else if (typeof payload.email !== "string") {
      throw new ValidationError({
        message: "E-mail inválido.",
        action: "Forneça um e-mail válido se preenchido.",
      });
    } else {
      const trimmedEmail = payload.email.trim().toLowerCase();
      if (!EMAIL_REGEX.test(trimmedEmail)) {
        throw new ValidationError({
          message: "Formato de e-mail inválido.",
          action: "Forneça um endereço de e-mail válido.",
        });
      }
      if (trimmedEmail.length > 255) {
        throw new ValidationError({
          message: "E-mail excede o limite máximo de caracteres (255).",
          action: "Ajuste o endereço de e-mail.",
        });
      }
      validated.email = trimmedEmail;
    }
  }

  if (payload.phone !== undefined) {
    if (payload.phone === null || payload.phone === "") {
      validated.phone = null;
    } else if (typeof payload.phone !== "string") {
      throw new ValidationError({
        message: "Telefone inválido.",
        action: "Forneça um número de telefone válido se preenchido.",
      });
    } else {
      const trimmedPhone = payload.phone.trim();
      const digitsOnly = trimmedPhone.replace(/\D/g, "");
      if (digitsOnly.length < 8 || digitsOnly.length > 15) {
        throw new ValidationError({
          message: "Número de telefone deve conter entre 8 e 15 dígitos.",
          action: "Forneça um telefone válido.",
        });
      }
      validated.phone = trimmedPhone;
    }
  }

  return validated;
}

export async function createSupplier(rawPayload, user) {
  if (!user) {
    throw new ForbiddenError({
      message: "Usuário não autenticado.",
      action: "Faça login para realizar esta operação.",
    });
  }

  if (!ALLOWED_SUPPLIER_MANAGER_ROLES.includes(user.role)) {
    throw new ForbiddenError({
      message: "Permissão negada para cadastrar fornecedor.",
      action:
        "Apenas Agentes de Contratação ou Administradores podem gerenciar fornecedores.",
    });
  }

  const validatedData = validateSupplierPayload(rawPayload, {
    isUpdate: false,
  });

  const existingSupplier = await prisma.supplier.findUnique({
    where: { cnpj: validatedData.cnpj },
  });

  if (existingSupplier) {
    throw new ConflictError({
      message: "Já existe um fornecedor cadastrado com este CNPJ.",
      action: "Consulte o fornecedor existente ou utilize outro CNPJ.",
    });
  }

  try {
    const supplier = await prisma.supplier.create({
      data: validatedData,
      select: {
        id: true,
        legalName: true,
        tradeName: true,
        cnpj: true,
        email: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ...supplier,
      formattedCnpj: formatCnpj(supplier.cnpj),
    };
  } catch (error) {
    if (error.code === "P2002") {
      throw new ConflictError({
        message: "Já existe um fornecedor cadastrado com este CNPJ.",
        action: "Consulte o fornecedor existente ou utilize outro CNPJ.",
      });
    }
    throw error;
  }
}

export async function listSuppliers(query = {}, user) {
  if (!user) {
    throw new ForbiddenError({
      message: "Usuário não autenticado.",
      action: "Faça login para realizar esta operação.",
    });
  }

  const { search } = query;
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(query.pageSize || query.limit, 10) || 20),
  );
  const skip = (page - 1) * pageSize;

  const where = {};

  if (search && typeof search === "string" && search.trim()) {
    const term = search.trim();
    const digits = normalizeCnpj(term);

    const conditions = [
      { legalName: { contains: term, mode: "insensitive" } },
      { tradeName: { contains: term, mode: "insensitive" } },
    ];

    if (digits) {
      conditions.push({ cnpj: { contains: digits } });
    }

    where.OR = conditions;
  }

  const [total, suppliers] = await Promise.all([
    prisma.supplier.count({ where }),
    prisma.supplier.findMany({
      where,
      orderBy: { legalName: "asc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        legalName: true,
        tradeName: true,
        cnpj: true,
        email: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            quotations: true,
          },
        },
      },
    }),
  ]);

  return {
    data: suppliers.map((s) => ({
      ...s,
      formattedCnpj: formatCnpj(s.cnpj),
      quotationCount: s._count?.quotations ?? 0,
    })),
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

export async function getSupplierById(supplierId, user) {
  if (!user) {
    throw new ForbiddenError({
      message: "Usuário não autenticado.",
      action: "Faça login para realizar esta operação.",
    });
  }

  if (!isValidUuid(supplierId)) {
    throw new ValidationError({
      message: "Identificador de fornecedor inválido.",
      action: "Forneça um UUID válido para o fornecedor.",
    });
  }

  const supplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
    select: {
      id: true,
      legalName: true,
      tradeName: true,
      cnpj: true,
      email: true,
      phone: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          quotations: true,
          selectedInProcesses: true,
        },
      },
    },
  });

  if (!supplier) {
    throw new NotFoundError({
      message: "Fornecedor não encontrado.",
      action: "Verifique o identificador e tente novamente.",
    });
  }

  return {
    ...supplier,
    formattedCnpj: formatCnpj(supplier.cnpj),
    quotationCount: supplier._count?.quotations ?? 0,
    selectedCount: supplier._count?.selectedInProcesses ?? 0,
  };
}

export async function updateSupplier(supplierId, rawPayload, user) {
  if (!user) {
    throw new ForbiddenError({
      message: "Usuário não autenticado.",
      action: "Faça login para realizar esta operação.",
    });
  }

  if (!ALLOWED_SUPPLIER_MANAGER_ROLES.includes(user.role)) {
    throw new ForbiddenError({
      message: "Permissão negada para atualizar fornecedor.",
      action:
        "Apenas Agentes de Contratação ou Administradores podem gerenciar fornecedores.",
    });
  }

  if (!isValidUuid(supplierId)) {
    throw new ValidationError({
      message: "Identificador de fornecedor inválido.",
      action: "Forneça um UUID válido para o fornecedor.",
    });
  }

  const existingSupplier = await prisma.supplier.findUnique({
    where: { id: supplierId },
  });

  if (!existingSupplier) {
    throw new NotFoundError({
      message: "Fornecedor não encontrado.",
      action: "Verifique o identificador e tente novamente.",
    });
  }

  const validatedData = validateSupplierPayload(rawPayload, {
    isUpdate: true,
  });

  if (validatedData.cnpj && validatedData.cnpj !== existingSupplier.cnpj) {
    const conflictingSupplier = await prisma.supplier.findUnique({
      where: { cnpj: validatedData.cnpj },
    });

    if (conflictingSupplier && conflictingSupplier.id !== supplierId) {
      throw new ConflictError({
        message: "Já existe outro fornecedor cadastrado com este CNPJ.",
        action: "Verifique o número do CNPJ informado.",
      });
    }
  }

  try {
    const updated = await prisma.supplier.update({
      where: { id: supplierId },
      data: validatedData,
      select: {
        id: true,
        legalName: true,
        tradeName: true,
        cnpj: true,
        email: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      ...updated,
      formattedCnpj: formatCnpj(updated.cnpj),
    };
  } catch (error) {
    if (error.code === "P2002") {
      throw new ConflictError({
        message: "Já existe outro fornecedor cadastrado com este CNPJ.",
        action: "Verifique o número do CNPJ informado.",
      });
    }
    throw error;
  }
}

const supplierService = {
  createSupplier,
  listSuppliers,
  getSupplierById,
  updateSupplier,
  isValidCnpj,
  normalizeCnpj,
  formatCnpj,
  isValidUuid,
};

export default supplierService;
