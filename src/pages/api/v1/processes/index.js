import { createRouter } from "next-connect";

import authentication from "@/infra/authentication";
import controller from "@/infra/controller";
import { prisma } from "@/infra/prisma.js";

const router = createRouter();

router.get(getHandler);

export default router.handler(controller.errorHandlers);

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
