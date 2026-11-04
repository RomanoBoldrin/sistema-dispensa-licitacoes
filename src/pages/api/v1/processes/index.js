import { createRouter } from "next-connect";

import authentication from "@/infra/authentication";
import controller from "@/infra/controller";
import { ForbiddenError, NotFoundError, ValidationError } from "@/infra/errors";
import { prisma } from "@/infra/prisma.js";

const router = createRouter();

router.get(getHandler);
router.post(postHandler);

export default router.handler(controller.errorHandlers);

const ALLOWED_CREATE_ROLES = ["ADMIN", "SOLICITANTE", "AGENTE_CONTRATACAO"];

const OBJECT_CATEGORIES = [
  "COMMON_GOODS",
  "ENGINEERING_WORKS",
  "GENERAL_SERVICES",
  "IT_GOODS",
  "HEALTH_SUPPLIES",
  "OTHER",
];

const URGENCY_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getHandler(request, response) {
  response.setHeader(
    "Cache-Control",
    "no-store, no-cache, max-age=0, must-revalidate",
  );
  response.setHeader("Pragma", "no-cache");
  response.setHeader("Expires", "0");

  const { user } =
    await authentication.getAuthenticatedUserFromRequest(request);

  const where = {
    deletedAt: null,
  };

  if (user.role === "SOLICITANTE") {
    where.requesterId = user.id;
  }

  const processes = await prisma.process.findMany({
    where,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      number: true,
      year: true,
      title: true,
      object: true,
      estimatedValue: true,
      status: true,
      createdAt: true,
      department: {
        select: {
          name: true,
        },
      },
    },
  });

  return response.status(200).json({
    processes: processes.map((process) => ({
      ...process,
      estimatedValue:
        process.estimatedValue === null ? null : Number(process.estimatedValue),
      createdAt: process.createdAt.toISOString(),
      department: process.department.name,
    })),
  });
}

async function postHandler(request, response) {
  // 1. Authenticate user
  const { user } =
    await authentication.getAuthenticatedUserFromRequest(request);

  // 2. Authorize user role
  if (!ALLOWED_CREATE_ROLES.includes(user.role)) {
    throw new ForbiddenError({
      message: "You are not authorized to create processes.",
      action: "Contact an administrator if you need access.",
    });
  }

  // 3. Validate request body presence and type
  const body = request.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ValidationError({
      message: "Invalid request body.",
      action: "Send a JSON object with the required process fields.",
    });
  }

  const {
    title,
    object,
    description,
    category,
    detailedJustification,
    technicalSpecifications,
    urgency = "MEDIUM",
    responsibleName,
    responsibleEmail,
    budgetSource,
    desiredDeadlineDays,
    departmentId,
  } = body;

  // 4. Validate required and optional fields
  if (typeof title !== "string" || !title.trim()) {
    throw new ValidationError({
      message: "Title is required.",
      action: "Provide a non-empty string for title.",
    });
  }

  if (typeof object !== "string" || !object.trim()) {
    throw new ValidationError({
      message: "Object is required.",
      action: "Provide a non-empty string for object.",
    });
  }

  if (
    description !== undefined &&
    description !== null &&
    typeof description !== "string"
  ) {
    throw new ValidationError({
      message: "Invalid description format.",
      action: "Provide a string for description if informed.",
    });
  }
  const normalizedDescription =
    typeof description === "string" && description.trim()
      ? description.trim()
      : null;

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

  if (
    typeof detailedJustification !== "string" ||
    !detailedJustification.trim()
  ) {
    throw new ValidationError({
      message: "Detailed justification is required.",
      action: "Provide a non-empty string for detailedJustification.",
    });
  }
  const normalizedJustification = detailedJustification.trim();

  if (
    technicalSpecifications !== undefined &&
    technicalSpecifications !== null &&
    typeof technicalSpecifications !== "string"
  ) {
    throw new ValidationError({
      message: "Invalid technicalSpecifications format.",
      action: "Provide a string for technicalSpecifications if informed.",
    });
  }
  const normalizedTechSpecs =
    typeof technicalSpecifications === "string" &&
    technicalSpecifications.trim()
      ? technicalSpecifications.trim()
      : null;

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

  if (typeof responsibleName !== "string" || !responsibleName.trim()) {
    throw new ValidationError({
      message: "Responsible name is required.",
      action: "Provide a non-empty string for responsibleName.",
    });
  }
  const normalizedResponsibleName = responsibleName.trim();

  let normalizedResponsibleEmail = null;
  if (responsibleEmail !== undefined && responsibleEmail !== null) {
    if (typeof responsibleEmail !== "string") {
      throw new ValidationError({
        message: "Invalid responsibleEmail format.",
        action: "Provide a valid email string if informed.",
      });
    }
    const trimmedEmail = responsibleEmail.trim().toLowerCase();
    if (trimmedEmail) {
      if (!EMAIL_REGEX.test(trimmedEmail)) {
        throw new ValidationError({
          message: "Invalid responsibleEmail format.",
          action: "Provide a valid email address.",
        });
      }
      normalizedResponsibleEmail = trimmedEmail;
    }
  }

  if (
    budgetSource !== undefined &&
    budgetSource !== null &&
    typeof budgetSource !== "string"
  ) {
    throw new ValidationError({
      message: "Invalid budgetSource format.",
      action: "Provide a string for budgetSource if informed.",
    });
  }
  const normalizedBudgetSource =
    typeof budgetSource === "string" && budgetSource.trim()
      ? budgetSource.trim()
      : null;

  let normalizedDeadlineDays = null;
  if (desiredDeadlineDays !== undefined && desiredDeadlineDays !== null) {
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
    normalizedDeadlineDays = desiredDeadlineDays;
  }

  // 5. Resolve and authorize department
  let resolvedDepartmentId = null;
  if (departmentId !== undefined && departmentId !== null) {
    if (
      typeof departmentId !== "string" ||
      !UUID_REGEX.test(departmentId.trim())
    ) {
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

  // 6. Concurrency-safe process numbering & transactional creation
  const currentYear = new Date().getFullYear();

  const createdProcess = await prisma.$transaction(async (tx) => {
    // Acquire PostgreSQL advisory lock on (classid, year) for transaction duration
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
        title: title.trim(),
        object: object.trim(),
        description: normalizedDescription,
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
        demandDocument: true,
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

  return response.status(201).json({
    id: createdProcess.id,
    number: createdProcess.number,
    year: createdProcess.year,
    title: createdProcess.title,
    object: createdProcess.object,
    description: createdProcess.description,
    status: createdProcess.status,
    departmentId: createdProcess.departmentId,
    department: {
      id: createdProcess.department.id,
      name: createdProcess.department.name,
    },
    requesterId: createdProcess.requesterId,
    createdAt: createdProcess.createdAt.toISOString(),
    updatedAt: createdProcess.updatedAt.toISOString(),
    demandDocument: {
      id: createdProcess.demandDocument.id,
      processId: createdProcess.demandDocument.processId,
      category: createdProcess.demandDocument.category,
      detailedJustification:
        createdProcess.demandDocument.detailedJustification,
      technicalSpecifications:
        createdProcess.demandDocument.technicalSpecifications,
      urgency: createdProcess.demandDocument.urgency,
      budgetSource: createdProcess.demandDocument.budgetSource,
      desiredDeadlineDays: createdProcess.demandDocument.desiredDeadlineDays,
      responsibleName: createdProcess.demandDocument.responsibleName,
      responsibleEmail: createdProcess.demandDocument.responsibleEmail,
      createdAt: createdProcess.demandDocument.createdAt.toISOString(),
      updatedAt: createdProcess.demandDocument.updatedAt.toISOString(),
    },
  });
}
