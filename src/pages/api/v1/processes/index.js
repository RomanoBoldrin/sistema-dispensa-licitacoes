import { createRouter } from "next-connect";

import authentication from "@/infra/authentication";
import controller from "@/infra/controller";
import { ValidationError } from "@/infra/errors";
import { prisma } from "@/infra/prisma.js";

const router = createRouter();

router.post(postHandler);

export default router.handler(controller.errorHandlers);

const VALID_CATEGORIES = [
  "COMMON_GOODS",
  "ENGINEERING_WORKS",
  "GENERAL_SERVICES",
  "IT_GOODS",
  "HEALTH_SUPPLIES",
  "OTHER",
];

const VALID_URGENCY_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

async function postHandler(request, response) {
  // 1. Authenticate the user
  const { user } = await authentication.getAuthenticatedUserFromRequest(request);

  // 2. Validate request body
  const body = request.body;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ValidationError({
      message: "Invalid request body.",
      action: "Send a JSON object with the required fields.",
    });
  }

  const {
    title,
    object,
    description,
    category,
    detailedJustification,
    technicalSpecifications,
    urgency,
    responsibleName,
    responsibleEmail,
    budgetSource,
    desiredDeadlineDays,
    departmentId,
  } = body;

  // Validate required fields
  if (typeof title !== "string" || title.trim().length === 0) {
    throw new ValidationError({
      message: "Title is required.",
      action: "Provide a valid title for the demand.",
    });
  }

  if (typeof object !== "string" || object.trim().length === 0) {
    throw new ValidationError({
      message: "Object description is required.",
      action: "Describe the object of the demand.",
    });
  }

  if (!VALID_CATEGORIES.includes(category)) {
    throw new ValidationError({
      message: "Invalid category.",
      action: `Category must be one of: ${VALID_CATEGORIES.join(", ")}.`,
    });
  }

  if (
    typeof detailedJustification !== "string" ||
    detailedJustification.trim().length === 0
  ) {
    throw new ValidationError({
      message: "Detailed justification is required.",
      action: "Provide a detailed justification for the demand.",
    });
  }

  if (urgency && !VALID_URGENCY_LEVELS.includes(urgency)) {
    throw new ValidationError({
      message: "Invalid urgency level.",
      action: `Urgency must be one of: ${VALID_URGENCY_LEVELS.join(", ")}.`,
    });
  }

  if (typeof responsibleName !== "string" || responsibleName.trim().length === 0) {
    throw new ValidationError({
      message: "Responsible name is required.",
      action: "Provide the name of the responsible person.",
    });
  }

  // 3. Get or create department
  let department;
  if (departmentId) {
    department = await prisma.department.findUnique({
      where: { id: departmentId },
    });

    if (!department) {
      throw new ValidationError({
        message: "Department not found.",
        action: "Provide a valid department ID.",
      });
    }
  } else {
    // Get user's department
    const userWithDepartment = await prisma.user.findUnique({
      where: { id: user.id },
      include: { department: true },
    });

    if (!userWithDepartment.department) {
      throw new ValidationError({
        message: "User department not found.",
        action: "Contact an administrator to assign a department.",
      });
    }

    department = userWithDepartment.department;
  }

  // 4. Generate process number (year + sequential)
  const currentYear = new Date().getFullYear();

  const lastProcessOfYear = await prisma.process.findFirst({
    where: { year: currentYear },
    orderBy: { number: "desc" },
    select: { number: true },
  });

  const processNumber = lastProcessOfYear ? lastProcessOfYear.number + 1 : 1;

  // 5. Create Process and DemandDocument in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create the Process
    const process = await tx.process.create({
      data: {
        number: processNumber,
        year: currentYear,
        title: title.trim(),
        object: object.trim(),
        description: description?.trim() || null,
        status: "DRAFT",
        departmentId: department.id,
        requesterId: user.id,
      },
    });

    // Create the DemandDocument
    const demandDocument = await tx.demandDocument.create({
      data: {
        processId: process.id,
        category,
        detailedJustification: detailedJustification.trim(),
        technicalSpecifications: technicalSpecifications?.trim() || null,
        urgency: urgency || "MEDIUM",
        budgetSource: budgetSource?.trim() || null,
        desiredDeadlineDays: desiredDeadlineDays || null,
        responsibleName: responsibleName.trim(),
        responsibleEmail: responsibleEmail?.trim() || null,
      },
    });

    // Create audit log
    await tx.auditLog.create({
      data: {
        processId: process.id,
        userId: user.id,
        action: "DEMAND_DOCUMENT_CREATED",
        description: `DFD created for process ${processNumber}/${currentYear}`,
      },
    });

    return { process, demandDocument };
  });

  // 6. Return the created process with demand document
  return response.status(201).json({
    id: result.process.id,
    number: result.process.number,
    year: result.process.year,
    title: result.process.title,
    status: result.process.status,
    createdAt: result.process.createdAt,
    demandDocument: {
      id: result.demandDocument.id,
      category: result.demandDocument.category,
      urgency: result.demandDocument.urgency,
    },
  });
}
