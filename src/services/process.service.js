import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/infra/errors.js";
import { prisma } from "@/infra/prisma.js";
import {
  DOCUMENT_TYPE_LABELS,
  canUserManageDocuments,
} from "./document.service.js";
import { validateLegalClassification } from "./legal.service.js";
import {
  buildComparativePriceMap,
  canUserManageQuotations,
} from "./quotation.service.js";
import {
  canUserSubmitProcess,
  validateProcessCompleteness,
} from "./submission.service.js";

export const ALLOWED_CREATE_ROLES = [
  "ADMIN",
  "SOLICITANTE",
  "AGENTE_CONTRATACAO",
];

export const ALLOWED_EDIT_ROLES = [
  "ADMIN",
  "SOLICITANTE",
  "AGENTE_CONTRATACAO",
];

export const PROCESS_STATUSES = [
  "DRAFT",
  "IN_ANALYSIS",
  "PRICE_RESEARCH",
  "SUPPLIER_SELECTED",
  "AWAITING_APPROVAL",
  "REJECTED",
  "APPROVED",
  "COMPLETED",
];

export const OBJECT_CATEGORIES = [
  "COMMON_GOODS",
  "ENGINEERING_WORKS",
  "GENERAL_SERVICES",
  "IT_GOODS",
  "HEALTH_SUPPLIES",
  "OTHER",
];

export const URGENCY_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const PROTECTED_UPDATE_FIELDS = [
  "id",
  "number",
  "year",
  "status",
  "requesterId",
  "requester",
  "departmentId",
  "department",
  "selectedSupplierId",
  "selectedSupplier",
  "createdAt",
  "updatedAt",
  "deletedAt",
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PROCESS_DETAIL_SELECT = {
  id: true,
  number: true,
  year: true,
  title: true,
  object: true,
  description: true,
  legalBasis: true,
  estimatedValue: true,
  status: true,
  departmentId: true,
  department: {
    select: {
      id: true,
      name: true,
    },
  },
  requesterId: true,
  requester: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  },
  selectedSupplierId: true,
  selectedSupplier: {
    select: {
      id: true,
      legalName: true,
      tradeName: true,
      cnpj: true,
    },
  },
  supplierJustification: true,
  legalJustification: true,
  priceJustification: true,
  demandDocument: true,
  quotations: {
    orderBy: {
      value: "asc",
    },
    select: {
      id: true,
      processId: true,
      supplierId: true,
      value: true,
      description: true,
      quotedAt: true,
      createdAt: true,
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
  },
  documents: {
    where: {
      isActive: true,
      deletedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
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
  },
  auditLogs: {
    where: {
      deletedAt: null,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      action: true,
      description: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          name: true,
          role: true,
        },
      },
    },
  },
  createdAt: true,
  updatedAt: true,
};

export function isValidUuid(value) {
  return typeof value === "string" && UUID_REGEX.test(value.trim());
}

export function canUserAccessProcess(user, processRecord) {
  if (!user || !processRecord) return false;
  if (user.role === "SOLICITANTE") {
    return processRecord.requesterId === user.id;
  }
  return true;
}

export function canUserEditProcess(user, processRecord) {
  if (!user || !processRecord) return false;
  if (!ALLOWED_EDIT_ROLES.includes(user.role)) return false;
  if (processRecord.status !== "DRAFT") return false;

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

  return true;
}

export function canUserSelectSupplier(user, processRecord) {
  if (!user || !processRecord) return false;
  if (processRecord.deletedAt) return false;
  if (
    ["AWAITING_APPROVAL", "APPROVED", "COMPLETED", "REJECTED"].includes(
      processRecord.status,
    )
  ) {
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
      if (
        user.departmentId &&
        processRecord.departmentId !== user.departmentId
      ) {
        return false;
      }
      return true;
    }
  }
  return false;
}

function validateEstimatedValue(estimatedValue) {
  if (
    estimatedValue === undefined ||
    estimatedValue === null ||
    estimatedValue === ""
  ) {
    return null;
  }

  if (typeof estimatedValue === "boolean") {
    throw new ValidationError({
      message: "Invalid estimatedValue.",
      action: "Provide a non-negative monetary value for estimatedValue.",
    });
  }

  const parsed =
    typeof estimatedValue === "number"
      ? estimatedValue
      : typeof estimatedValue === "string" && estimatedValue.trim() !== ""
        ? Number(estimatedValue.trim())
        : NaN;

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new ValidationError({
      message: "Invalid estimatedValue.",
      action: "Provide a non-negative monetary value for estimatedValue.",
    });
  }

  if (parsed > 9999999999999.99) {
    throw new ValidationError({
      message: "estimatedValue exceeds maximum allowed value.",
      action: "Provide a valid monetary value within limits.",
    });
  }

  return Math.round(parsed * 100) / 100;
}

function validateOptionalString(value, fieldName) {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "string") {
    throw new ValidationError({
      message: `Invalid ${fieldName} format.`,
      action: `Provide a string for ${fieldName} if informed.`,
    });
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function validateRequiredString(value, label, fieldName) {
  if (typeof value !== "string" || !value.trim()) {
    throw new ValidationError({
      message: `${label} is required.`,
      action: `Provide a non-empty string for ${fieldName}.`,
    });
  }
  return value.trim();
}

function validateResponsibleEmail(responsibleEmail) {
  if (responsibleEmail === undefined || responsibleEmail === null) {
    return null;
  }
  if (typeof responsibleEmail !== "string") {
    throw new ValidationError({
      message: "Invalid responsibleEmail format.",
      action: "Provide a valid email string if informed.",
    });
  }
  const trimmedEmail = responsibleEmail.trim().toLowerCase();
  if (!trimmedEmail) {
    return null;
  }
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    throw new ValidationError({
      message: "Invalid responsibleEmail format.",
      action: "Provide a valid email address.",
    });
  }
  return trimmedEmail;
}

function validateDesiredDeadlineDays(desiredDeadlineDays) {
  if (desiredDeadlineDays === undefined || desiredDeadlineDays === null) {
    return null;
  }
  if (
    typeof desiredDeadlineDays !== "number" ||
    !Number.isInteger(desiredDeadlineDays) ||
    desiredDeadlineDays <= 0
  ) {
    throw new ValidationError({
      message: "Invalid desiredDeadlineDays.",
      action: "Provide a positive integer for desiredDeadlineDays.",
    });
  }
  return desiredDeadlineDays;
}

function serializeDemandDocument(dfd) {
  if (!dfd) return null;
  return {
    id: dfd.id,
    processId: dfd.processId,
    category: dfd.category,
    detailedJustification: dfd.detailedJustification,
    technicalSpecifications: dfd.technicalSpecifications,
    urgency: dfd.urgency,
    budgetSource: dfd.budgetSource,
    desiredDeadlineDays: dfd.desiredDeadlineDays,
    responsibleName: dfd.responsibleName,
    responsibleEmail: dfd.responsibleEmail,
    createdAt: dfd.createdAt.toISOString(),
    updatedAt: dfd.updatedAt.toISOString(),
  };
}

function serializeProcessDetail(processRecord, user) {
  return {
    id: processRecord.id,
    number: processRecord.number,
    year: processRecord.year,
    title: processRecord.title,
    object: processRecord.object,
    description: processRecord.description,
    legalBasis: processRecord.legalBasis ?? null,
    estimatedValue:
      processRecord.estimatedValue === null ||
      processRecord.estimatedValue === undefined
        ? null
        : Number(processRecord.estimatedValue),
    status: processRecord.status,
    departmentId: processRecord.departmentId,
    department: processRecord.department
      ? {
          id: processRecord.department.id,
          name: processRecord.department.name,
        }
      : null,
    requesterId: processRecord.requesterId,
    requester: processRecord.requester
      ? {
          id: processRecord.requester.id,
          name: processRecord.requester.name,
          email: processRecord.requester.email,
          role: processRecord.requester.role,
        }
      : undefined,
    selectedSupplierId: processRecord.selectedSupplierId ?? null,
    selectedSupplier: processRecord.selectedSupplier ?? null,
    supplierJustification: processRecord.supplierJustification ?? null,
    legalJustification: processRecord.legalJustification ?? null,
    priceJustification: processRecord.priceJustification ?? null,
    createdAt: processRecord.createdAt.toISOString(),
    updatedAt: processRecord.updatedAt.toISOString(),
    demandDocument: serializeDemandDocument(processRecord.demandDocument),
    auditLogs: processRecord.auditLogs
      ? processRecord.auditLogs.map((log) => ({
          id: log.id,
          action: log.action,
          description: log.description,
          createdAt: log.createdAt.toISOString(),
          user: log.user
            ? {
                id: log.user.id,
                name: log.user.name,
                role: log.user.role,
              }
            : null,
        }))
      : undefined,
    quotations: processRecord.quotations
      ? processRecord.quotations.map((q) => ({
          id: q.id,
          processId: q.processId,
          supplierId: q.supplierId,
          value: Number(q.value).toFixed(2),
          description: q.description ?? null,
          quotedAt: q.quotedAt ? q.quotedAt.toISOString() : null,
          createdAt: q.createdAt.toISOString(),
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
        }))
      : [],
    comparativeMap: processRecord.quotations
      ? buildComparativePriceMap(processRecord.quotations)
      : null,
    documents: processRecord.documents
      ? processRecord.documents.map((doc) => ({
          id: doc.id,
          processId: doc.processId,
          type: doc.type,
          typeLabel: DOCUMENT_TYPE_LABELS[doc.type] || doc.type,
          filename: doc.filename,
          mimeType: doc.mimeType,
          size: doc.size,
          isActive: doc.isActive,
          createdAt: doc.createdAt.toISOString(),
          uploadedBy: doc.uploadedBy
            ? {
                id: doc.uploadedBy.id,
                name: doc.uploadedBy.name,
                email: doc.uploadedBy.email,
                role: doc.uploadedBy.role,
              }
            : null,
        }))
      : [],
    legalValidation: validateLegalClassification(processRecord),
    completeness: validateProcessCompleteness(processRecord),
    permissions: user
      ? {
          canEdit: canUserEditProcess(user, processRecord),
          canManageQuotations: canUserManageQuotations(user, processRecord),
          canManageDocuments: canUserManageDocuments(user, processRecord),
        }
      : undefined,
    canSubmit: user ? canUserSubmitProcess(user, processRecord) : false,
    canSelectSupplier: user
      ? canUserSelectSupplier(user, processRecord)
      : false,
  };
}

/**
 * Creates a new procurement process in DRAFT status along with its
 * Demand Formalization Document (DFD) and audit trail.
 *
 * Numbering strategy:
 * Uses a PostgreSQL transaction-scoped advisory lock (`pg_advisory_xact_lock`)
 * keyed by `(424242, currentYear)` inside an interactive Prisma transaction,
 * combined with retry handling for uniqueness conflicts on `(number, year)`.
 */
async function createProcess(body, user) {
  if (!ALLOWED_CREATE_ROLES.includes(user.role)) {
    throw new ForbiddenError({
      message: "You are not authorized to create processes.",
      action: "Contact an administrator if you need access.",
    });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ValidationError({
      message: "Invalid request body.",
      action: "Send a JSON object with the required process fields.",
    });
  }

  const dfdSource =
    body.demandDocument &&
    typeof body.demandDocument === "object" &&
    !Array.isArray(body.demandDocument)
      ? body.demandDocument
      : {};

  const title = body.title;
  const object = body.object;
  const description = body.description;
  const legalBasis = body.legalBasis;
  const estimatedValue = body.estimatedValue;
  const departmentId = body.departmentId;

  const category = body.category ?? dfdSource.category;
  const detailedJustification =
    body.detailedJustification ?? dfdSource.detailedJustification;
  const technicalSpecifications =
    body.technicalSpecifications !== undefined
      ? body.technicalSpecifications
      : dfdSource.technicalSpecifications;
  const urgency =
    body.urgency !== undefined
      ? body.urgency
      : dfdSource.urgency !== undefined
        ? dfdSource.urgency
        : "MEDIUM";
  const responsibleName = body.responsibleName ?? dfdSource.responsibleName;
  const responsibleEmail =
    body.responsibleEmail !== undefined
      ? body.responsibleEmail
      : dfdSource.responsibleEmail;
  const budgetSource =
    body.budgetSource !== undefined
      ? body.budgetSource
      : dfdSource.budgetSource;
  const desiredDeadlineDays =
    body.desiredDeadlineDays !== undefined
      ? body.desiredDeadlineDays
      : dfdSource.desiredDeadlineDays;

  const normalizedTitle = validateRequiredString(title, "Title", "title");
  const normalizedObject = validateRequiredString(object, "Object", "object");
  const normalizedDescription = validateOptionalString(
    description,
    "description",
  );
  const normalizedLegalBasis = validateOptionalString(legalBasis, "legalBasis");
  const normalizedEstimatedValue = validateEstimatedValue(estimatedValue);

  if (
    typeof category !== "string" ||
    !OBJECT_CATEGORIES.includes(category.trim())
  ) {
    throw new ValidationError({
      message: "Invalid or missing category.",
      action: `Choose a valid category from: ${OBJECT_CATEGORIES.join(", ")}.`,
    });
  }
  const normalizedCategory = category.trim();

  const normalizedJustification = validateRequiredString(
    detailedJustification,
    "Detailed justification",
    "detailedJustification",
  );

  const normalizedTechSpecs = validateOptionalString(
    technicalSpecifications,
    "technicalSpecifications",
  );

  const targetUrgency = urgency ?? "MEDIUM";
  if (
    typeof targetUrgency !== "string" ||
    !URGENCY_LEVELS.includes(targetUrgency.trim())
  ) {
    throw new ValidationError({
      message: "Invalid urgency level.",
      action: `Choose a valid urgency level from: ${URGENCY_LEVELS.join(", ")}.`,
    });
  }
  const normalizedUrgency = targetUrgency.trim();

  const normalizedResponsibleName = validateRequiredString(
    responsibleName,
    "Responsible name",
    "responsibleName",
  );

  const normalizedResponsibleEmail = validateResponsibleEmail(responsibleEmail);
  const normalizedBudgetSource = validateOptionalString(
    budgetSource,
    "budgetSource",
  );
  const normalizedDeadlineDays =
    validateDesiredDeadlineDays(desiredDeadlineDays);

  // Resolve and authorize department
  let resolvedDepartmentId = null;
  if (departmentId !== undefined && departmentId !== null) {
    if (!isValidUuid(departmentId)) {
      throw new ValidationError({
        message: "Invalid departmentId format.",
        action: "Provide a valid UUID for departmentId.",
      });
    }
    const normalizedDepartmentId = departmentId.trim();

    if (user.role !== "ADMIN") {
      if (!user.departmentId || user.departmentId !== normalizedDepartmentId) {
        throw new ForbiddenError({
          message:
            "You are not authorized to create a process for another department.",
          action: "Create processes only for your assigned department.",
        });
      }
    }

    const departmentExists = await prisma.department.findUnique({
      where: { id: normalizedDepartmentId },
      select: { id: true },
    });

    if (!departmentExists) {
      throw new NotFoundError({
        message: "Department not found.",
        action: "Verify the department ID and try again.",
      });
    }

    resolvedDepartmentId = normalizedDepartmentId;
  } else {
    if (!user.departmentId) {
      throw new ValidationError({
        message: "No valid department could be resolved for the user.",
        action:
          "Specify a departmentId or ensure the user has an assigned department.",
      });
    }

    const departmentExists = await prisma.department.findUnique({
      where: { id: user.departmentId },
      select: { id: true },
    });

    if (!departmentExists) {
      throw new NotFoundError({
        message: "Assigned department not found.",
        action: "Verify user department assignment.",
      });
    }

    resolvedDepartmentId = user.departmentId;
  }

  const currentYear = new Date().getFullYear();
  const maxAttempts = 3;
  let createdProcess = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      createdProcess = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(424242, ${currentYear})`;

        const lastProcess = await tx.process.findFirst({
          where: { year: currentYear },
          orderBy: { number: "desc" },
          select: { number: true },
        });

        const nextNumber = (lastProcess?.number ?? 0) + 1;

        const processRecord = await tx.process.create({
          data: {
            number: nextNumber,
            year: currentYear,
            title: normalizedTitle,
            object: normalizedObject,
            description: normalizedDescription,
            legalBasis: normalizedLegalBasis,
            estimatedValue: normalizedEstimatedValue,
            status: "DRAFT",
            departmentId: resolvedDepartmentId,
            requesterId: user.id,
            demandDocument: {
              create: {
                category: normalizedCategory,
                detailedJustification: normalizedJustification,
                technicalSpecifications: normalizedTechSpecs,
                urgency: normalizedUrgency,
                budgetSource: normalizedBudgetSource,
                desiredDeadlineDays: normalizedDeadlineDays,
                responsibleName: normalizedResponsibleName,
                responsibleEmail: normalizedResponsibleEmail,
              },
            },
          },
          include: {
            department: {
              select: {
                id: true,
                name: true,
              },
            },
            requester: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
            demandDocument: true,
          },
        });

        await tx.auditLog.create({
          data: {
            processId: processRecord.id,
            userId: user.id,
            action: "PROCESS_CREATED",
            description: `Processo DP-${String(nextNumber).padStart(3, "0")}/${currentYear} criado em rascunho.`,
          },
        });

        await tx.auditLog.create({
          data: {
            processId: processRecord.id,
            userId: user.id,
            action: "DEMAND_DOCUMENT_CREATED",
            description: "Documento de Formalização da Demanda criado.",
          },
        });

        return processRecord;
      });
      break;
    } catch (error) {
      if (error?.code === "P2002" && attempt < maxAttempts) {
        continue;
      }
      throw error;
    }
  }

  return serializeProcessDetail(createdProcess, user);
}

/**
 * Lists processes visible to the authenticated user with server-side filtering
 * and pagination.
 */
async function listProcesses(query = {}, user) {
  const where = {
    deletedAt: null,
  };

  if (user.role === "SOLICITANTE") {
    where.requesterId = user.id;
  }

  // 1. Filter by status
  if (
    query.status !== undefined &&
    query.status !== null &&
    String(query.status).trim() !== ""
  ) {
    const rawStatuses = String(query.status)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    for (const st of rawStatuses) {
      if (!PROCESS_STATUSES.includes(st)) {
        throw new ValidationError({
          message: "Invalid status filter.",
          action: `Choose a valid status from: ${PROCESS_STATUSES.join(", ")}.`,
        });
      }
    }

    if (rawStatuses.length === 1) {
      where.status = rawStatuses[0];
    } else if (rawStatuses.length > 1) {
      where.status = { in: rawStatuses };
    }
  }

  // 2. Filter by departmentId (respecting authorization)
  if (
    query.departmentId !== undefined &&
    query.departmentId !== null &&
    String(query.departmentId).trim() !== ""
  ) {
    const deptId = String(query.departmentId).trim();
    if (!isValidUuid(deptId)) {
      throw new ValidationError({
        message: "Invalid departmentId filter.",
        action: "Provide a valid UUID for departmentId.",
      });
    }

    if (user.role === "SOLICITANTE") {
      if (!user.departmentId || user.departmentId !== deptId) {
        throw new ForbiddenError({
          message:
            "You are not authorized to list processes from another department.",
          action: "Filter only by your assigned department.",
        });
      }
    }

    where.departmentId = deptId;
  }

  // 3. Filter by year
  if (
    query.year !== undefined &&
    query.year !== null &&
    String(query.year).trim() !== ""
  ) {
    const yearStr = String(query.year).trim();
    const yearNum = Number(yearStr);
    if (
      !Number.isInteger(yearNum) ||
      yearNum < 2000 ||
      yearNum > 2100 ||
      !/^\d{4}$/.test(yearStr)
    ) {
      throw new ValidationError({
        message: "Invalid year filter.",
        action: "Provide a valid four-digit year (e.g., 2026).",
      });
    }
    where.year = yearNum;
  }

  // 4. Filter by period (createdFrom / createdTo)
  let fromDate = null;
  let toDate = null;

  if (
    query.createdFrom !== undefined &&
    query.createdFrom !== null &&
    String(query.createdFrom).trim() !== ""
  ) {
    const rawFrom = String(query.createdFrom).trim();
    const parsedFrom = new Date(rawFrom);
    if (Number.isNaN(parsedFrom.getTime())) {
      throw new ValidationError({
        message: "Invalid createdFrom date filter.",
        action: "Provide a valid ISO date string for createdFrom.",
      });
    }
    fromDate = parsedFrom;
  }

  if (
    query.createdTo !== undefined &&
    query.createdTo !== null &&
    String(query.createdTo).trim() !== ""
  ) {
    const rawTo = String(query.createdTo).trim();
    const parsedTo = new Date(rawTo);
    if (Number.isNaN(parsedTo.getTime())) {
      throw new ValidationError({
        message: "Invalid createdTo date filter.",
        action: "Provide a valid ISO date string for createdTo.",
      });
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawTo)) {
      parsedTo.setUTCHours(23, 59, 59, 999);
    }
    toDate = parsedTo;
  }

  if (fromDate && toDate && fromDate > toDate) {
    throw new ValidationError({
      message: "Invalid date range.",
      action: "createdFrom must not be later than createdTo.",
    });
  }

  if (fromDate || toDate) {
    where.createdAt = {};
    if (fromDate) where.createdAt.gte = fromDate;
    if (toDate) where.createdAt.lte = toDate;
  }

  // 5. Filter by search term (title, object, or process number)
  if (
    query.search !== undefined &&
    query.search !== null &&
    String(query.search).trim() !== ""
  ) {
    const searchStr = String(query.search).trim();
    const orFilters = [
      { title: { contains: searchStr, mode: "insensitive" } },
      { object: { contains: searchStr, mode: "insensitive" } },
    ];

    const normalizedNumMatch = searchStr.match(
      /^(?:DP-)?#?0*(\d+)(?:\/(\d{4}))?$/i,
    );
    if (normalizedNumMatch) {
      const numVal = Number(normalizedNumMatch[1]);
      if (Number.isInteger(numVal) && numVal > 0) {
        if (normalizedNumMatch[2]) {
          orFilters.push({
            number: numVal,
            year: Number(normalizedNumMatch[2]),
          });
        } else {
          orFilters.push({ number: numVal });
        }
      }
    }

    where.OR = orFilters;
  }

  // 6. Pagination
  let page = 1;
  let pageSize = 20;

  if (
    query.page !== undefined &&
    query.page !== null &&
    String(query.page).trim() !== ""
  ) {
    const parsedPage = Number(query.page);
    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
      throw new ValidationError({
        message: "Invalid page parameter.",
        action: "Provide a positive integer for page.",
      });
    }
    page = parsedPage;
  }

  if (
    query.pageSize !== undefined &&
    query.pageSize !== null &&
    String(query.pageSize).trim() !== ""
  ) {
    const parsedPageSize = Number(query.pageSize);
    if (
      !Number.isInteger(parsedPageSize) ||
      parsedPageSize < 1 ||
      parsedPageSize > 100
    ) {
      throw new ValidationError({
        message: "Invalid pageSize parameter.",
        action: "Provide an integer between 1 and 100 for pageSize.",
      });
    }
    pageSize = parsedPageSize;
  }

  const skip = (page - 1) * pageSize;

  const [total, processesRaw, availableDepartments] = await Promise.all([
    prisma.process.count({ where }),
    prisma.process.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip,
      take: pageSize,
      select: {
        id: true,
        number: true,
        year: true,
        title: true,
        object: true,
        description: true,
        legalBasis: true,
        estimatedValue: true,
        status: true,
        departmentId: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        requesterId: true,
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        demandDocument: {
          select: {
            id: true,
            category: true,
            urgency: true,
            responsibleName: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.department.findMany({
      where:
        user.role === "SOLICITANTE"
          ? user.departmentId
            ? { id: user.departmentId }
            : { id: "00000000-0000-0000-0000-000000000000" }
          : undefined,
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  const serializedProcesses = processesRaw.map((proc) => ({
    id: proc.id,
    number: proc.number,
    year: proc.year,
    title: proc.title,
    object: proc.object,
    description: proc.description,
    legalBasis: proc.legalBasis ?? null,
    estimatedValue:
      proc.estimatedValue === null ? null : Number(proc.estimatedValue),
    status: proc.status,
    departmentId: proc.departmentId,
    department: proc.department.name,
    departmentInfo: {
      id: proc.department.id,
      name: proc.department.name,
    },
    requesterId: proc.requesterId,
    requester: proc.requester,
    demandDocument: proc.demandDocument,
    createdAt: proc.createdAt.toISOString(),
    updatedAt: proc.updatedAt.toISOString(),
  }));

  return {
    processes: serializedProcesses,
    data: serializedProcesses,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
    departments: availableDepartments,
  };
}

/**
 * Retrieves the complete details of a single process if the user is authorized.
 */
async function getProcessById(processId, user) {
  if (!isValidUuid(processId)) {
    throw new ValidationError({
      message: "Invalid processId format.",
      action: "Provide a valid UUID for processId.",
    });
  }

  const processRecord = await prisma.process.findFirst({
    where: {
      id: processId.trim(),
      deletedAt: null,
    },
    select: PROCESS_DETAIL_SELECT,
  });

  if (!processRecord) {
    throw new NotFoundError({
      message: "Process not found.",
      action: "Verify if the process ID is correct.",
    });
  }

  if (!canUserAccessProcess(user, processRecord)) {
    throw new ForbiddenError({
      message: "You are not authorized to access this process.",
      action: "Verify if your user has access to this resource.",
    });
  }

  return serializeProcessDetail(processRecord, user);
}

/**
 * Partially updates an editable process and/or its associated DFD.
 * Enforces role permissions, ownership/department boundaries, DRAFT status
 * restrictions, and rejects protected fields.
 */
async function updateProcess(processId, body, user) {
  if (!isValidUuid(processId)) {
    throw new ValidationError({
      message: "Invalid processId format.",
      action: "Provide a valid UUID for processId.",
    });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ValidationError({
      message: "Invalid request body.",
      action: "Send a JSON object with the fields to update.",
    });
  }

  // Reject attempts to modify protected process fields
  for (const protectedField of PROTECTED_UPDATE_FIELDS) {
    if (body[protectedField] !== undefined) {
      throw new ValidationError({
        message: `Field '${protectedField}' cannot be modified.`,
        action:
          "Do not send protected fields (such as status, number, year, departmentId, or requesterId) in edit requests.",
      });
    }
  }

  const existingProcess = await prisma.process.findFirst({
    where: {
      id: processId.trim(),
      deletedAt: null,
    },
    include: {
      demandDocument: true,
    },
  });

  if (!existingProcess) {
    throw new NotFoundError({
      message: "Process not found.",
      action: "Verify if the process ID is correct.",
    });
  }

  // Check role and ownership/department authorization
  if (!ALLOWED_EDIT_ROLES.includes(user.role)) {
    throw new ForbiddenError({
      message: "You are not authorized to edit processes.",
      action: "Verify if your user role has permission to edit processes.",
    });
  }

  if (user.role === "SOLICITANTE") {
    if (existingProcess.requesterId !== user.id) {
      throw new ForbiddenError({
        message: "You can only edit processes that you requested.",
        action: "Verify process ownership before attempting to edit.",
      });
    }
    if (
      user.departmentId &&
      existingProcess.departmentId !== user.departmentId
    ) {
      throw new ForbiddenError({
        message:
          "You are not authorized to edit a process from another department.",
        action: "Verify your department permissions.",
      });
    }
  }

  if (user.role === "AGENTE_CONTRATACAO") {
    if (
      user.departmentId &&
      existingProcess.departmentId !== user.departmentId &&
      existingProcess.requesterId !== user.id
    ) {
      throw new ForbiddenError({
        message:
          "You are not authorized to edit a process from another department.",
        action: "Verify your department permissions.",
      });
    }
  }

  // Enforce DRAFT status requirement for editing
  if (existingProcess.status !== "DRAFT") {
    throw new ConflictError({
      message: "Only processes in DRAFT status can be edited.",
      action:
        "This process has already left DRAFT status and cannot be modified through ordinary editing.",
    });
  }

  const processUpdateData = {};
  const dfdUpdateData = {};

  if (body.title !== undefined) {
    processUpdateData.title = validateRequiredString(
      body.title,
      "Title",
      "title",
    );
  }

  if (body.object !== undefined) {
    processUpdateData.object = validateRequiredString(
      body.object,
      "Object",
      "object",
    );
  }

  if (body.description !== undefined) {
    processUpdateData.description = validateOptionalString(
      body.description,
      "description",
    );
  }

  if (body.legalBasis !== undefined) {
    processUpdateData.legalBasis = validateOptionalString(
      body.legalBasis,
      "legalBasis",
    );
  }

  if (body.legalJustification !== undefined) {
    processUpdateData.legalJustification = validateOptionalString(
      body.legalJustification,
      "legalJustification",
    );
  }

  if (body.priceJustification !== undefined) {
    processUpdateData.priceJustification = validateOptionalString(
      body.priceJustification,
      "priceJustification",
    );
  }

  if (body.supplierJustification !== undefined) {
    processUpdateData.supplierJustification = validateOptionalString(
      body.supplierJustification,
      "supplierJustification",
    );
  }

  if (body.estimatedValue !== undefined) {
    processUpdateData.estimatedValue = validateEstimatedValue(
      body.estimatedValue,
    );
  }

  // Extract DFD fields from top-level or nested demandDocument object
  const dfdSource =
    body.demandDocument &&
    typeof body.demandDocument === "object" &&
    !Array.isArray(body.demandDocument)
      ? body.demandDocument
      : {};

  if (
    body.demandDocument !== undefined &&
    (body.demandDocument === null ||
      typeof body.demandDocument !== "object" ||
      Array.isArray(body.demandDocument))
  ) {
    throw new ValidationError({
      message: "Invalid demandDocument format.",
      action: "Provide a valid object for demandDocument.",
    });
  }

  const rawCategory =
    body.category !== undefined ? body.category : dfdSource.category;
  if (rawCategory !== undefined) {
    if (
      typeof rawCategory !== "string" ||
      !OBJECT_CATEGORIES.includes(rawCategory.trim())
    ) {
      throw new ValidationError({
        message: "Invalid category.",
        action: `Choose a valid category from: ${OBJECT_CATEGORIES.join(", ")}.`,
      });
    }
    dfdUpdateData.category = rawCategory.trim();
  }

  const rawJustification =
    body.detailedJustification !== undefined
      ? body.detailedJustification
      : dfdSource.detailedJustification;
  if (rawJustification !== undefined) {
    dfdUpdateData.detailedJustification = validateRequiredString(
      rawJustification,
      "Detailed justification",
      "detailedJustification",
    );
  }

  const rawTechSpecs =
    body.technicalSpecifications !== undefined
      ? body.technicalSpecifications
      : dfdSource.technicalSpecifications;
  if (rawTechSpecs !== undefined) {
    dfdUpdateData.technicalSpecifications = validateOptionalString(
      rawTechSpecs,
      "technicalSpecifications",
    );
  }

  const rawUrgency =
    body.urgency !== undefined ? body.urgency : dfdSource.urgency;
  if (rawUrgency !== undefined) {
    if (
      typeof rawUrgency !== "string" ||
      !URGENCY_LEVELS.includes(rawUrgency.trim())
    ) {
      throw new ValidationError({
        message: "Invalid urgency level.",
        action: `Choose a valid urgency level from: ${URGENCY_LEVELS.join(", ")}.`,
      });
    }
    dfdUpdateData.urgency = rawUrgency.trim();
  }

  const rawResponsibleName =
    body.responsibleName !== undefined
      ? body.responsibleName
      : dfdSource.responsibleName;
  if (rawResponsibleName !== undefined) {
    dfdUpdateData.responsibleName = validateRequiredString(
      rawResponsibleName,
      "Responsible name",
      "responsibleName",
    );
  }

  const rawResponsibleEmail =
    body.responsibleEmail !== undefined
      ? body.responsibleEmail
      : dfdSource.responsibleEmail;
  if (rawResponsibleEmail !== undefined) {
    dfdUpdateData.responsibleEmail =
      validateResponsibleEmail(rawResponsibleEmail);
  }

  const rawBudgetSource =
    body.budgetSource !== undefined
      ? body.budgetSource
      : dfdSource.budgetSource;
  if (rawBudgetSource !== undefined) {
    dfdUpdateData.budgetSource = validateOptionalString(
      rawBudgetSource,
      "budgetSource",
    );
  }

  const rawDeadlineDays =
    body.desiredDeadlineDays !== undefined
      ? body.desiredDeadlineDays
      : dfdSource.desiredDeadlineDays;
  if (rawDeadlineDays !== undefined) {
    dfdUpdateData.desiredDeadlineDays =
      validateDesiredDeadlineDays(rawDeadlineDays);
  }

  const hasProcessChanges = Object.keys(processUpdateData).length > 0;
  const hasDfdChanges = Object.keys(dfdUpdateData).length > 0;

  if (!hasProcessChanges && !hasDfdChanges) {
    throw new ValidationError({
      message: "No editable fields were provided.",
      action: "Provide at least one valid process or DFD field to update.",
    });
  }

  const updatedProcess = await prisma.$transaction(async (tx) => {
    if (hasDfdChanges) {
      if (existingProcess.demandDocument) {
        await tx.demandDocument.update({
          where: { processId: existingProcess.id },
          data: dfdUpdateData,
        });

        await tx.auditLog.create({
          data: {
            processId: existingProcess.id,
            userId: user.id,
            action: "DEMAND_DOCUMENT_UPDATED",
            description:
              "Documento de Formalização da Demanda (DFD) atualizado.",
          },
        });
      } else {
        await tx.demandDocument.create({
          data: {
            processId: existingProcess.id,
            category: dfdUpdateData.category || "OTHER",
            detailedJustification:
              dfdUpdateData.detailedJustification || existingProcess.object,
            technicalSpecifications:
              dfdUpdateData.technicalSpecifications ?? null,
            urgency: dfdUpdateData.urgency || "MEDIUM",
            budgetSource: dfdUpdateData.budgetSource ?? null,
            desiredDeadlineDays: dfdUpdateData.desiredDeadlineDays ?? null,
            responsibleName: dfdUpdateData.responsibleName || user.name,
            responsibleEmail: dfdUpdateData.responsibleEmail ?? null,
          },
        });

        await tx.auditLog.create({
          data: {
            processId: existingProcess.id,
            userId: user.id,
            action: "DEMAND_DOCUMENT_CREATED",
            description: "Documento de Formalização da Demanda criado.",
          },
        });
      }
    }

    if (hasProcessChanges) {
      if (processUpdateData.priceJustification !== undefined) {
        await tx.auditLog.create({
          data: {
            processId: existingProcess.id,
            userId: user.id,
            action: "PRICE_JUSTIFICATION_UPDATED",
            description: "Justificativa de preço registrada/atualizada.",
          },
        });
      }

      if (processUpdateData.supplierJustification !== undefined) {
        await tx.auditLog.create({
          data: {
            processId: existingProcess.id,
            userId: user.id,
            action: "SUPPLIER_JUSTIFICATION_UPDATED",
            description: "Justificativa da escolha do fornecedor atualizada.",
          },
        });
      }

      if (
        processUpdateData.legalBasis !== undefined ||
        processUpdateData.legalJustification !== undefined
      ) {
        await tx.auditLog.create({
          data: {
            processId: existingProcess.id,
            userId: user.id,
            action: "LEGAL_CLASSIFICATION_UPDATED",
            description:
              "Enquadramento legal / fundamentação jurídica atualizada.",
          },
        });
      }

      const generalFields = [
        "title",
        "object",
        "description",
        "estimatedValue",
      ];
      const hasOtherGeneralChanges = generalFields.some(
        (f) => processUpdateData[f] !== undefined,
      );

      if (hasOtherGeneralChanges) {
        await tx.auditLog.create({
          data: {
            processId: existingProcess.id,
            userId: user.id,
            action: "PROCESS_UPDATED",
            description: "Dados gerais do processo atualizados.",
          },
        });
      }
    }

    return await tx.process.update({
      where: { id: existingProcess.id },
      data: hasProcessChanges ? processUpdateData : { updatedAt: new Date() },
      select: PROCESS_DETAIL_SELECT,
    });
  });

  return serializeProcessDetail(updatedProcess, user);
}

/**
 * Formally selects or proposes a supplier for a process and records the selection justification.
 * Enforces that the supplier has a quotation registered on the process.
 */
async function selectProcessSupplier(processId, body, user) {
  if (!isValidUuid(processId)) {
    throw new ValidationError({
      message: "Formato inválido para processId.",
      action: "Forneça um UUID válido para processId.",
    });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ValidationError({
      message: "Corpo da requisição inválido.",
      action: "Envie um objeto JSON com supplierId e justificativa opcional.",
    });
  }

  const { supplierId, supplierJustification } = body;
  if (!isValidUuid(supplierId)) {
    throw new ValidationError({
      message: "Formato inválido para supplierId.",
      action: "Forneça um UUID válido para supplierId.",
    });
  }

  const existingProcess = await prisma.process.findFirst({
    where: {
      id: processId.trim(),
      deletedAt: null,
    },
    include: {
      quotations: {
        include: {
          supplier: true,
        },
      },
    },
  });

  if (!existingProcess) {
    throw new NotFoundError({
      message: "Processo não encontrado.",
      action: "Verifique o identificador do processo.",
    });
  }

  if (!canUserSelectSupplier(user, existingProcess)) {
    throw new ForbiddenError({
      message:
        "Você não tem autorização para selecionar o fornecedor deste processo.",
      action:
        "Apenas administradores, agentes de contratação ou o solicitante em rascunho podem selecionar o fornecedor.",
    });
  }

  const matchingQuotation = existingProcess.quotations.find(
    (q) => q.supplierId === supplierId.trim(),
  );

  if (!matchingQuotation) {
    throw new ValidationError({
      message:
        "O fornecedor selecionado deve possuir uma cotação registrada neste processo.",
      action: "Cadastre uma cotação para o fornecedor antes de selecioná-lo.",
    });
  }

  const normalizedSupplierJustification =
    supplierJustification !== undefined && supplierJustification !== null
      ? String(supplierJustification).trim() || null
      : existingProcess.supplierJustification;

  const supplierName =
    matchingQuotation.supplier?.tradeName ||
    matchingQuotation.supplier?.legalName ||
    "Fornecedor";

  const updatedProcess = await prisma.$transaction(async (tx) => {
    const updated = await tx.process.update({
      where: { id: existingProcess.id },
      data: {
        selectedSupplierId: supplierId.trim(),
        supplierJustification: normalizedSupplierJustification,
      },
      select: PROCESS_DETAIL_SELECT,
    });

    await tx.auditLog.create({
      data: {
        processId: existingProcess.id,
        userId: user.id,
        action: "SUPPLIER_SELECTED",
        description: `Fornecedor ${supplierName} (${matchingQuotation.supplier?.cnpj || ""}) selecionado para a contratação.`,
      },
    });

    if (
      supplierJustification !== undefined &&
      supplierJustification !== null &&
      String(supplierJustification).trim()
    ) {
      await tx.auditLog.create({
        data: {
          processId: existingProcess.id,
          userId: user.id,
          action: "SUPPLIER_JUSTIFICATION_UPDATED",
          description:
            "Justificativa da escolha do fornecedor registrada/atualizada.",
        },
      });
    }

    return updated;
  });

  return serializeProcessDetail(updatedProcess, user);
}

/**
 * Updates formal justifications (price justification and/or supplier selection justification).
 */
async function updateProcessJustifications(processId, body, user) {
  if (!isValidUuid(processId)) {
    throw new ValidationError({
      message: "Formato inválido para processId.",
      action: "Forneça um UUID válido para processId.",
    });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ValidationError({
      message: "Corpo da requisição inválido.",
      action:
        "Envie um objeto JSON com priceJustification e/ou supplierJustification.",
    });
  }

  const existingProcess = await prisma.process.findFirst({
    where: {
      id: processId.trim(),
      deletedAt: null,
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
        "Você não tem autorização para atualizar justificativas deste processo.",
      action:
        "Apenas usuários autorizados podem editar justificativas em rascunho.",
    });
  }

  const { priceJustification, supplierJustification } = body;
  if (priceJustification === undefined && supplierJustification === undefined) {
    throw new ValidationError({
      message: "Nenhuma justificativa fornecida para atualização.",
      action: "Forneça priceJustification e/ou supplierJustification.",
    });
  }

  const updateData = {};
  if (priceJustification !== undefined) {
    updateData.priceJustification = validateOptionalString(
      priceJustification,
      "priceJustification",
    );
  }
  if (supplierJustification !== undefined) {
    updateData.supplierJustification = validateOptionalString(
      supplierJustification,
      "supplierJustification",
    );
  }

  const updatedProcess = await prisma.$transaction(async (tx) => {
    if (updateData.priceJustification !== undefined) {
      await tx.auditLog.create({
        data: {
          processId: existingProcess.id,
          userId: user.id,
          action: "PRICE_JUSTIFICATION_UPDATED",
          description: "Justificativa de preços registrada/atualizada.",
        },
      });
    }

    if (updateData.supplierJustification !== undefined) {
      await tx.auditLog.create({
        data: {
          processId: existingProcess.id,
          userId: user.id,
          action: "SUPPLIER_JUSTIFICATION_UPDATED",
          description: "Justificativa da escolha do fornecedor atualizada.",
        },
      });
    }

    return await tx.process.update({
      where: { id: existingProcess.id },
      data: updateData,
      select: PROCESS_DETAIL_SELECT,
    });
  });

  return serializeProcessDetail(updatedProcess, user);
}

const processService = {
  createProcess,
  listProcesses,
  getProcessById,
  updateProcess,
  selectProcessSupplier,
  updateProcessJustifications,
  canUserAccessProcess,
  canUserEditProcess,
  canUserSelectSupplier,
  canUserSubmitProcess,
  isValidUuid,
  PROCESS_STATUSES,
  OBJECT_CATEGORIES,
  URGENCY_LEVELS,
};

export default processService;
