import { createRouter } from "next-connect";

import controller from "@/infra/controller";
import { ValidationError } from "@/infra/errors";
import password from "@/infra/password";
import { prisma } from "@/infra/prisma.js";

const router = createRouter();

router.post(postHandler);

export default router.handler(controller.errorHandlers);

async function postHandler(request, response) {
  const { name, email, password: rawPassword, role } = request.body;

  if (!name || !email || !rawPassword || !role) {
    const publicErrorObject = new ValidationError();

    return response.status(publicErrorObject.statusCode).json({
      name: "ValidationError",
      message: "Missing required fields.",
      action: "Send name, email, password and role.",
      status_code: 400,
    });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName = name.trim();

  if (
    !["ADMIN", "SOLICITANTE", "AGENTE_CONTRATACAO", "APROVADOR"].includes(role)
  ) {
    const publicErrorObject = new ValidationError();

    return response.status(publicErrorObject.statusCode).json({
      name: "ValidationError",
      message: "Invalid access level.",
      action: "Use a valid user role.",
      status_code: 400,
    });
  }

  const passwordHash = await password.hash(rawPassword);

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
      const duplicatedField = error.meta?.target?.[0];

      return response.status(400).json({
        name: "ValidationError",
        message: `The ${duplicatedField || "field"} informed is already being used.`,
        action: "Use another value to perform this operation.",
        status_code: 400,
      });
    }

    throw error;
  }
}
