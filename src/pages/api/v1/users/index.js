import { createRouter } from "next-connect";

import authentication from "@/infra/authentication";
import controller from "@/infra/controller";
import { ForbiddenError } from "@/infra/errors";
import { ValidationError } from "@/infra/errors";
import password from "@/infra/password";
import { prisma } from "@/infra/prisma.js";

const router = createRouter();

const ASSIGNABLE_ROLES = ["SOLICITANTE", "AGENTE_CONTRATACAO", "APROVADOR"];

router.post(postHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(request, response) {
  // 1. Authenticate and authorize the requester.
  const { user: currentUser } =
    await authentication.getAuthenticatedUserFromRequest(request);

  if (currentUser.role !== "ADMIN") {
    throw new ForbiddenError({
      message: "You are not allowed to create users.",
      action: "Contact an administrator if you need access.",
    });
  }

  // 2. Validate the request body.
  const body = request.body;

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return response.status(400).json({
      name: "ValidationError",
      message: "Invalid request body.",
      action: "Send a JSON object with the required fields.",
      status_code: 400,
    });
  }

  const { name, email, password: rawPassword, role } = body;

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof rawPassword !== "string" ||
    typeof role !== "string"
  ) {
    return response.status(400).json({
      name: "ValidationError",
      message: "Invalid or missing fields.",
      action: "Send name, email, password and role as strings.",
      status_code: 400,
    });
  }

  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedName || !normalizedEmail || !rawPassword) {
    return response.status(400).json({
      name: "ValidationError",
      message: "Required fields cannot be empty.",
      action: "Provide a name, email, password and role.",
      status_code: 400,
    });
  }

  if (!ASSIGNABLE_ROLES.includes(role)) {
    throw new ValidationError({
      message: "Invalid or unauthorized access level.",
      action: "Choose an assignable user role.",
    });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new ValidationError({
      message: "Invalid email address.",
      action: "Provide a valid email address.",
    });
  }

  // 3. Hash the password.
  const passwordHash = await password.hash(rawPassword);

  // 4. Create the user.
  try {
    const createdUser = await prisma.user.create({
      data: {
        name: normalizedName,
        email: normalizedEmail,
        passwordHash,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return response.status(201).json({
      id: createdUser.id,
      name: createdUser.name,
      email: createdUser.email,
      role: createdUser.role,
      isActive: createdUser.isActive,
      createdAt: createdUser.createdAt.toISOString(),
      updatedAt: createdUser.updatedAt.toISOString(),
    });
  } catch (error) {
    if (error.code === "P2002") {
      return response.status(409).json({
        name: "ConflictError",
        message: "An account with this email already exists.",
        action: "Use a different email address.",
        status_code: 409,
      });
    }

    throw error;
  }
}
